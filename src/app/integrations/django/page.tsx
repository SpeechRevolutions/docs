import { CodeBlock } from "@/components/CodeBlock";
import { Callout } from "@/components/DocsUI";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Using Zephyr with Django",
};

export default function DjangoIntegrationPage() {
  return (
    <>
      <h1>Using Zephyr with Django</h1>
      <p>
        Integrate Zephyr into a Django app: a view that submits a file for
        transcription, a model that stores each job&apos;s status and progress,
        and a webhook view that verifies the signature and records the result.
        The API key stays in Django settings / the server environment — it never
        reaches the browser.
      </p>

      <Callout title="Keep the key server-side" tone="warn">
        <p>
          <code>SpeechRevolutions()</code> reads{" "}
          <code>SPEECHREVOLUTIONS_API_KEY</code> (or <code>STT_API_KEY</code>)
          from the environment. Views run on the server, so the client and key
          never ship to templates or JavaScript.
        </p>
      </Callout>

      <h2>Install</h2>
      <CodeBlock
        language="bash"
        code={`pip install django speechrevolutions

export SPEECHREVOLUTIONS_API_KEY=stt_...`}
      />

      <h2>A model to store status + progress</h2>
      <p>
        Persist the Zephyr <code>job_id</code> plus a status and a{" "}
        <code>0–100</code> progress number. Store the download URL and transcript
        once the job completes.
      </p>
      <CodeBlock
        language="python"
        filename="transcripts/models.py"
        code={`from django.db import models


class TranscriptionJob(models.Model):
    class Status(models.TextChoices):
        PROCESSING = "processing"
        COMPLETED = "completed"
        FAILED = "failed"

    job_id = models.CharField(max_length=64, unique=True, db_index=True)
    status = models.CharField(
        max_length=16, choices=Status.choices, default=Status.PROCESSING
    )
    percent = models.FloatField(default=0.0)          # overall 0-100
    download_url = models.URLField(blank=True, default="")
    text = models.TextField(blank=True, default="")
    reason = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)`}
      />

      <h2>A view that submits</h2>
      <p>
        Take the uploaded file, call <code>submit()</code> to get a job id
        without blocking the request, and create the row. Pass a{" "}
        <code>callback_url</code> so Zephyr notifies you when the job finishes —
        the webhook view below fills in the result.
      </p>
      <CodeBlock
        language="python"
        filename="transcripts/views.py"
        code={`from django.http import JsonResponse
from django.views.decorators.http import require_POST
from speechrevolutions import SpeechRevolutions

from .models import TranscriptionJob

client = SpeechRevolutions()  # reads SPEECHREVOLUTIONS_API_KEY / STT_API_KEY


@require_POST
def start_transcription(request):
    upload = request.FILES["file"]

    # submit() returns a job id without holding the request open.
    job_id = client.submit(
        upload.read(),
        speaker_labels=True,
        callback_url=request.build_absolute_uri("/webhooks/zephyr/"),
    )

    TranscriptionJob.objects.create(job_id=job_id)
    return JsonResponse({"job_id": job_id, "status": "processing"})


def job_progress(request, job_id):
    job = TranscriptionJob.objects.get(job_id=job_id)
    return JsonResponse(
        {"status": job.status, "percent": job.percent, "text": job.text}
    )`}
      />

      <Callout title="Driving the percent field" tone="info">
        <p>
          <code>submit()</code> returns immediately and doesn&apos;t stream
          progress. To move <code>percent</code> between submit and completion,
          run the blocking <code>transcribe()</code> with{" "}
          <code>on_progress</code>/<code>on_upload_progress</code> callbacks in a
          background worker (Celery, RQ, or a thread) that writes each update to
          the row. See{" "}
          <Link href="/guides/live-progress">Live progress for web apps</Link>{" "}
          for the callback-to-bar weighting.
        </p>
      </Callout>

      <h2>Webhook view with signature verification</h2>
      <p>
        Zephyr POSTs a signed JSON body to your <code>callback_url</code> on
        completion or permanent failure. The signature is HMAC-SHA256 over the
        raw body in the <code>X-SR-Signature: sha256=&lt;hex&gt;</code> header.
        Verify against <code>request.body</code> (the exact bytes) and exempt the
        view from CSRF — it&apos;s a server-to-server POST, not a browser form.
      </p>
      <CodeBlock
        language="python"
        filename="transcripts/webhooks.py"
        code={`import hashlib
import hmac
import json

from django.conf import settings
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from .models import TranscriptionJob


def verify_signature(raw_body: bytes, signature_header: str) -> bool:
    expected = "sha256=" + hmac.new(
        settings.ZEPHYR_WEBHOOK_SECRET.encode(), raw_body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature_header or "")


@csrf_exempt
@require_POST
def zephyr_webhook(request):
    raw = request.body  # verify against the exact bytes received
    if not verify_signature(raw, request.headers.get("X-SR-Signature", "")):
        return HttpResponse(status=401)

    event = json.loads(raw)
    # {job_id, status: "completed" | "failed", download_url?, step?, reason?}
    try:
        job = TranscriptionJob.objects.get(job_id=event["job_id"])
    except TranscriptionJob.DoesNotExist:
        return HttpResponse(status=404)

    if event["status"] == "completed":
        job.status = TranscriptionJob.Status.COMPLETED
        job.percent = 100.0
        job.download_url = event.get("download_url", "")
        # Fetch + parse the transcript, then store the text:
        # from speechrevolutions import SpeechRevolutions
        # job.text = SpeechRevolutions().get_transcript(job.job_id).text
    else:
        job.status = TranscriptionJob.Status.FAILED
        job.reason = event.get("reason", "")
    job.save()

    return JsonResponse({"ok": True})  # a 2xx acks delivery; 5xx is retried`}
      />

      <h2>URLs</h2>
      <CodeBlock
        language="python"
        filename="urls.py"
        code={`from django.urls import path
from transcripts import views
from transcripts.webhooks import zephyr_webhook

urlpatterns = [
    path("transcribe/", views.start_transcription),
    path("jobs/<str:job_id>/progress/", views.job_progress),
    path("webhooks/zephyr/", zephyr_webhook),
]`}
      />

      <Callout title="Under the hood" tone="info">
        <p>
          <code>submit()</code> creates the job via the{" "}
          <Link href="/api-reference/upload">upload</Link> flow and returns its
          id; status and the transcript are fetched later through the{" "}
          <Link href="/api-reference/jobs">jobs</Link> endpoints. See the{" "}
          <Link href="/sdks/python">Python SDK</Link> for the full surface.
        </p>
      </Callout>
    </>
  );
}
