import { CodeBlock } from "@/components/CodeBlock";
import { Callout } from "@/components/DocsUI";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Using Speech Revolutions with FastAPI",
  description:
    "Wire Speech Revolutions into a FastAPI service: submit a job from an endpoint, stream progress into a per-job store from the async client's callbacks, expose a…",
};

export default function FastapiIntegrationPage() {
  return (
    <>
      <h1>Using Speech Revolutions with FastAPI</h1>
      <p>
        Wire Speech Revolutions into a FastAPI service: submit a job from an endpoint,
        stream progress into a per-job store from the async client&apos;s
        callbacks, expose a <code>/progress/{`{job_id}`}</code> endpoint your
        frontend polls, and receive signed completion webhooks. Your API key
        lives only in the server environment.
      </p>

      <Callout title="Keep the key server-side" tone="warn">
        <p>
          <code>AsyncSpeechRevolutions()</code> reads{" "}
          <code>SPEECHREVOLUTIONS_API_KEY</code> (or <code>STT_API_KEY</code>)
          from the environment. It stays on your FastAPI host — the browser only
          ever sees job ids and progress numbers.
        </p>
      </Callout>

      <h2>Install</h2>
      <CodeBlock
        language="bash"
        code={`pip install fastapi uvicorn speechrevolutions

export SPEECHREVOLUTIONS_API_KEY=stt_...`}
      />

      <h2>Submit in a background task + a progress endpoint</h2>
      <p>
        Kick off the transcription in a FastAPI <code>BackgroundTasks</code> job
        so the request returns immediately. The async client&apos;s{" "}
        <code>on_upload_progress</code> and <code>on_progress</code> callbacks
        write into a per-job store; the <code>/progress/{`{job_id}`}</code>{" "}
        endpoint reads the latest snapshot. This mirrors the{" "}
        <code>progress_webapp.py</code> pattern from the SDK examples.
      </p>
      <CodeBlock
        language="python"
        filename="main.py"
        code={`import threading
import uuid
from dataclasses import dataclass, field

from fastapi import FastAPI, BackgroundTasks, UploadFile, HTTPException
from speechrevolutions import AsyncSpeechRevolutions, ProgressEvent

app = FastAPI()

# Weight upload + transcription into one 0-100 bar (see the live-progress guide).
UPLOAD_WEIGHT = 0.15
TRANSCRIBE_WEIGHT = 0.85


@dataclass
class JobProgress:
    phase: str = "starting"          # "upload" | "transcribe" | "done" | "failed"
    percent: float = 0.0             # overall 0-100
    text: str | None = None
    lock: threading.Lock = field(default_factory=threading.Lock, repr=False)

    def _set(self, phase: str, overall: float) -> None:
        with self.lock:
            self.phase = phase
            self.percent = max(self.percent, round(overall, 1))  # never go backwards

    def on_upload(self, e: ProgressEvent) -> None:
        self._set("upload", (e.percent or 0.0) * UPLOAD_WEIGHT)

    def on_transcribe(self, e: ProgressEvent) -> None:
        self._set("transcribe", UPLOAD_WEIGHT * 100 + (e.percent or 0.0) * TRANSCRIBE_WEIGHT)

    def snapshot(self) -> dict:
        with self.lock:
            return {"phase": self.phase, "percent": self.percent, "text": self.text}


JOBS: dict[str, JobProgress] = {}


async def run_job(job_id: str, audio: bytes) -> None:
    store = JOBS[job_id]
    try:
        async with AsyncSpeechRevolutions() as client:
            result = await client.transcribe(
                audio,
                on_upload_progress=store.on_upload,
                on_progress=store.on_transcribe,
                speaker_labels=True,
            )
        with store.lock:
            store.phase, store.percent, store.text = "done", 100.0, result.text
    except Exception:
        store._set("failed", store.percent)


@app.post("/transcribe")
async def transcribe(file: UploadFile, background: BackgroundTasks):
    job_id = uuid.uuid4().hex
    JOBS[job_id] = JobProgress()
    audio = await file.read()
    background.add_task(run_job, job_id, audio)  # returns immediately
    return {"job_id": job_id}


@app.get("/progress/{job_id}")
def progress(job_id: str):
    store = JOBS.get(job_id)
    if store is None:
        raise HTTPException(status_code=404, detail="unknown job")
    return store.snapshot()  # {"phase": "transcribe", "percent": 63.5, "text": null}`}
      />

      <Callout title="A per-process dict is the simplest store" tone="info">
        <p>
          The in-memory <code>JOBS</code> dict works when one worker serves both
          the submit and the poll. Behind multiple Uvicorn/Gunicorn workers, put
          the snapshot in Redis or your database so any worker can answer the
          poll. See{" "}
          <Link href="/guides/live-progress">Live progress for web apps</Link>{" "}
          for the weighting details.
        </p>
      </Callout>

      <h2>Prefer submit() for fire-and-forget?</h2>
      <p>
        If you don&apos;t need live progress, <code>submit()</code> returns a
        job id without holding the connection open. Poll{" "}
        <code>get_job_status()</code> (or add a <code>callback_url</code>) and
        fetch the transcript when it finishes.
      </p>
      <CodeBlock
        language="python"
        code={`async with AsyncSpeechRevolutions() as client:
    job_id = await client.submit("meeting.mp3", speaker_labels=True)
    # ...later, from a poller or a webhook:
    status = await client.get_job_status(job_id)   # .status: processing|completed|failed
    if status.is_completed:
        result = await client.get_transcript(job_id)
        print(result.text)`}
      />

      <h2>Signed webhook receiver</h2>
      <p>
        For long jobs, pass a <code>callback_url</code> and let Speech Revolutions POST you
        on completion. The platform signs the raw body with HMAC-SHA256 in the{" "}
        <code>X-SR-Signature: sha256=&lt;hex&gt;</code> header. Verify against
        the exact bytes you received — not a re-serialized dict — with a
        constant-time compare. This mirrors <code>webhooks.py</code> from the
        SDK examples.
      </p>
      <CodeBlock
        language="python"
        filename="webhooks.py"
        code={`import hashlib
import hmac
import json
import os

from fastapi import Request, HTTPException

SIGNING_SECRET = os.environ["STT_WEBHOOK_SECRET"]


def verify_signature(raw_body: bytes, signature_header: str) -> bool:
    """Return True if X-SR-Signature matches the raw request body."""
    expected = "sha256=" + hmac.new(
        SIGNING_SECRET.encode(), raw_body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature_header or "")


@app.post("/webhooks/stt")
async def receive(request: Request):
    raw = await request.body()  # verify against the exact bytes received
    if not verify_signature(raw, request.headers.get("X-SR-Signature", "")):
        raise HTTPException(status_code=401, detail="bad signature")

    event = json.loads(raw)
    # {job_id, status: "completed" | "failed", download_url?, step?, reason?}
    if event["status"] == "completed":
        ...  # mark done; fetch event["download_url"] or client.get_transcript(...)
    else:
        ...  # event["step"], event["reason"]
    return {"ok": True}  # a 2xx acks delivery; 5xx is retried`}
      />

      <Callout title="Under the hood" tone="info">
        <p>
          The async client drives the{" "}
          <Link href="/api-reference/upload">upload</Link> flow and waits on the{" "}
          <Link href="/api-reference/jobs">SSE job stream</Link>, converting the
          server&apos;s <code>completed</code>/<code>total</code> counts into{" "}
          <code>percent</code>. See the <Link href="/sdks/python">Python SDK</Link>{" "}
          for the full surface.
        </p>
      </Callout>
    </>
  );
}
