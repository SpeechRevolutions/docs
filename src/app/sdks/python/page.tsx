import { CodeBlock } from "@/components/CodeBlock";
import { Callout } from "@/components/DocsUI";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Python SDK",
  description:
    "The official Python client for the Speech Revolutions STT API, with a synchronous SpeechRevolutions client and an asyncio AsyncSpeechRevolutions client.",
};

export default function PythonSdkPage() {
  return (
    <>
      <h1>Python SDK</h1>
      <p>
        The official Python client for the Speech Revolutions STT API. It
        includes a synchronous <code>SpeechRevolutions</code> client and an
        asyncio <code>AsyncSpeechRevolutions</code> client. Both expose the
        same <code>transcribe()</code> method.
      </p>

      <p>
        Source on{" "}
        <a href="https://github.com/SpeechRevolutions/python-sdk">GitHub</a> &middot;{" "}
        <a href="https://github.com/SpeechRevolutions/python-sdk/issues">
          report an issue
        </a>{" "}
        &middot; <a href="https://pypi.org/project/speechrevolutions/">PyPI</a>
      </p>

      <h2>Install</h2>
      <CodeBlock language="bash" code={`pip install speechrevolutions

# optional console progress bars (tqdm)
pip install "speechrevolutions[progress]"`} />

      <h2>Quickstart</h2>
      <p>
        Pass <code>transcribe()</code> a local path, a URL, raw bytes, or a
        file object. With the default <code>output_type="json"</code>, the SDK
        parses the response into a result object.
      </p>
      <CodeBlock
        language="python"
        filename="transcribe.py"
        code={`from speechrevolutions import SpeechRevolutions

client = SpeechRevolutions()  # reads SPEECHREVOLUTIONS_API_KEY
result = client.transcribe("meeting.mp3", speaker_labels=True)

print(result.text)
for u in result.utterances:
    print(f"{u.speaker}: {u.text}")`}
      />

      <h2>From a URL or file</h2>
      <p>
        <code>transcribe()</code> detects <code>http(s)</code> URLs
        automatically. Use the <code>transcribe_url()</code> and{" "}
        <code>transcribe_file()</code> aliases to make the source explicit.
      </p>
      <CodeBlock
        language="python"
        code={`# auto-detected
result = client.transcribe("https://example.com/audio.mp3")

# explicit aliases
result = client.transcribe_url("https://example.com/audio.mp3")
result = client.transcribe_file("./local.wav")`}
      />

      <h2>Options</h2>
      <p>
        Pass options as keyword arguments or as a{" "}
        <code>TranscribeOptions</code> object:
      </p>
      <CodeBlock
        language="python"
        code={`from speechrevolutions import TranscribeOptions

# kwargs — \`diarize\` is a Deepgram-compatible alias for \`speaker_labels\`
result = client.transcribe("a.mp3", diarize=True, output_type="srt")

# config object
result = client.transcribe(
    "a.mp3",
    options=TranscribeOptions(speaker_labels=True),
)`}
      />
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Kwarg</th>
              <th>Type</th>
              <th>Default</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>output_type</code>
              </td>
              <td>
                <code>str</code>
              </td>
              <td>
                <code>&quot;json&quot;</code>
              </td>
              <td>
                <code>txt | json | srt | vtt | docx | pdf</code>
              </td>
            </tr>
            <tr>
              <td>
                <code>word_timestamps</code>
              </td>
              <td>
                <code>bool</code>
              </td>
              <td>
                <code>True</code>
              </td>
              <td>Per-word start/end times</td>
            </tr>
            <tr>
              <td>
                <code>speaker_labels</code>
              </td>
              <td>
                <code>bool</code>
              </td>
              <td>
                <code>True</code>
              </td>
              <td>Label who spoke each segment</td>
            </tr>
            <tr>
              <td>
                <code>diarize</code>
              </td>
              <td>
                <code>bool</code>
              </td>
              <td>—</td>
              <td>
                Alias for <code>speaker_labels</code>
              </td>
            </tr>
            <tr>
              <td>
                <code>nltk</code>
              </td>
              <td>
                <code>bool</code>
              </td>
              <td>
                <code>True</code>
              </td>
              <td>Restore punctuation &amp; capitalization</td>
            </tr>
            <tr>
              <td>
                <code>tier</code>
              </td>
              <td>
                <code>str</code>
              </td>
              <td>
                <code>&quot;standard&quot;</code>
              </td>
              <td>
                <code>standard</code> — the only tier currently available
              </td>
            </tr>
            <tr>
              <td>
                <code>custom_vocabulary</code>
              </td>
              <td>
                <code>list[str] | None</code>
              </td>
              <td>
                <code>None</code>
              </td>
              <td>Domain terms to bias toward</td>
            </tr>
            <tr>
              <td>
                <code>language</code>
              </td>
              <td>
                <code>str | None</code>
              </td>
              <td>
                <code>None</code>
              </td>
              <td>
                ISO 639-1 code (e.g. <code>&quot;en&quot;</code>) to skip detection;{" "}
                <code>None</code> auto-detects.{" "}
                <Link href="/cookbook#pin-language">When to pin</Link>
              </td>
            </tr>
            <tr>
              <td>
                <code>on_progress</code>
              </td>
              <td>
                <code>Callable</code>
              </td>
              <td>
                <code>None</code>
              </td>
              <td>Transcription-progress callback (see below)</td>
            </tr>
            <tr>
              <td>
                <code>on_upload_progress</code>
              </td>
              <td>
                <code>Callable</code>
              </td>
              <td>
                <code>None</code>
              </td>
              <td>Upload byte-progress callback</td>
            </tr>
            <tr>
              <td>
                <code>progress</code>
              </td>
              <td>
                <code>bool</code>
              </td>
              <td>
                <code>False</code>
              </td>
              <td>Render live console bars</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>Live progress</h2>
      <p>
        The SDK reports progress for <strong>both</strong> the file upload and
        the transcription, as a console bar, a callback, or both. When you
        enable both, the bars render <em>and</em> your callbacks fire for every
        event. AssemblyAI and Deepgram expose no percentage for pre-recorded audio.
      </p>
      <p>
        Files under about 3 MiB may report no transcription progress before
        they complete. Expect the bar to jump from the end of the upload to
        done.
      </p>
      <CodeBlock
        language="python"
        code={`# 1. Console bars — an "Uploading" byte bar, then a "Transcribing" bar.
#    Uses tqdm if installed: pip install "speechrevolutions[progress]"
result = client.transcribe("meeting.mp3", progress=True)

# 2. Programmatic — read event.percent (0-100, or None until total is known)
def on_progress(event):        # transcription
    print(event.percent, event.step)      # e.g. 42.0 "transcribe"

def on_upload(event):          # upload (event.step == "upload")
    print("upload", event.percent)

result = client.transcribe(
    "meeting.mp3",
    on_progress=on_progress,
    on_upload_progress=on_upload,
    progress=True,             # bars AND callbacks together
)`}
      />
      <p>
        Each <code>ProgressEvent</code> carries <code>.completed</code>,{" "}
        <code>.total</code>, <code>.step</code>, <code>.elapsed_seconds</code>,
        and a computed <code>.percent</code> (0–100, or <code>None</code> when
        the total is not yet known).
      </p>
      <p>
        For a web UI, see{" "}
        <Link href="/guides/live-progress">Live progress for web apps</Link>.
        It combines both callbacks into a single 0–100 bar for your frontend.
      </p>

      <h2>Async</h2>
      <p>
        The asyncio client has the same API as the sync client. Use{" "}
        <code>async with</code> so the underlying HTTP client closes on exit.
      </p>
      <CodeBlock
        language="python"
        filename="transcribe_async.py"
        code={`import asyncio
from speechrevolutions import AsyncSpeechRevolutions

async def main():
    async with AsyncSpeechRevolutions() as client:
        result = await client.transcribe(
            "meeting.mp3",
            speaker_labels=True,
            progress=True,
        )
        print(result.text)

asyncio.run(main())`}
      />

      <h2>Result shape</h2>
      <p>
        With <code>output_type="json"</code>, the SDK returns a{" "}
        <code>Transcript</code> object. The client writes files only when you
        call <code>save()</code>.
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Member</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>result.text</code>
              </td>
              <td>Full transcript text</td>
            </tr>
            <tr>
              <td>
                <code>result.transcript</code>
              </td>
              <td>Alias for <code>result.text</code></td>
            </tr>
            <tr>
              <td>
                <code>result.words</code>
              </td>
              <td>Words with start, end, and speaker</td>
            </tr>
            <tr>
              <td>
                <code>result.utterances</code>
              </td>
              <td>Speaker turns</td>
            </tr>
            <tr>
              <td>
                <code>result.to_deepgram()</code>
              </td>
              <td>Deepgram-shaped dict, for migrations</td>
            </tr>
            <tr>
              <td>
                <code>result.to_dict()</code>
              </td>
              <td>Normalized JSON dict</td>
            </tr>
            <tr>
              <td>
                <code>result.content</code> / <code>result.save(path)</code>
              </td>
              <td>Raw bytes / write the output to disk</td>
            </tr>
          </tbody>
        </table>
      </div>
      <CodeBlock
        language="python"
        code={`dg = result.to_deepgram()
print(dg["results"]["channels"][0]["alternatives"][0]["transcript"])

# save() appends the output type when the path has no extension
out = result.save("output")   # -> "output.json"
print("saved to", out)`}
      />

      <h2>Webhooks</h2>
      <p>
        Pass <code>callback_url</code> to get notified when a job finishes
        instead of holding the call open. Use this for server and background
        workloads. When the job completes or fails permanently, Speech
        Revolutions sends a signed JSON <code>POST</code> to your URL:
      </p>
      <CodeBlock
        language="python"
        code={`client.transcribe("meeting.mp3", callback_url="https://you.example.com/hook")`}
      />
      <p>
        The POST body is{" "}
        <code>
          {`{job_id, status: "completed"|"failed", download_url?, step?, reason?}`}
        </code>
        . It is signed with HMAC-SHA256 over the raw body, in the{" "}
        <code>X-SR-Signature: sha256=&lt;hex&gt;</code> header. The request
        also carries <code>X-SR-Event</code> (the status) and a unique{" "}
        <code>X-SR-Delivery</code> ID. Verify the signature against the raw
        bytes you received, not a re-serialized dict, and use a constant-time
        comparison. Copy your signing secret from the console (
        <strong>API Keys → Webhook signing secret</strong>) into{" "}
        <code>SPEECHREVOLUTIONS_WEBHOOK_SECRET</code>. The{" "}
        <Link href="/guides/webhooks">webhooks guide</Link> covers the payload,
        retries, and secret rotation.
      </p>
      <CodeBlock
        language="python"
        filename="webhooks.py"
        code={`import hashlib
import hmac


def verify_signature(raw_body: bytes, signature_header: str, signing_secret: str) -> bool:
    """Return True if X-SR-Signature matches the raw request body."""
    expected = "sha256=" + hmac.new(
        signing_secret.encode(), raw_body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature_header or "")


# FastAPI receiver
# @app.post("/webhooks/speechrevolutions")
# async def receive(request: Request):
#     raw = await request.body()
#     if not verify_signature(raw, request.headers.get("X-SR-Signature", ""), SECRET):
#         raise HTTPException(status_code=401, detail="bad signature")
#     event = json.loads(raw)
#     if event["status"] == "completed":
#         ...  # mark done; fetch event["download_url"]
#     else:
#         ...  # event["step"], event["reason"]
#     return {"ok": True}  # a 2xx acks delivery (we retry on 5xx)`}
      />

      <h2>Retrieve results later</h2>
      <p>
        Fetch a job by ID at any time, for example after a webhook arrives or
        after your service restarts. The download URL is generated on each
        request, so you can fetch results long after the original upload.
      </p>
      <CodeBlock
        language="python"
        filename="retrieve.py"
        code={`# Get a job's current status (processing | completed | failed)
status = client.get_job_status(job_id)
print(status.status)

if status.is_completed:
    result = client.get_transcript(job_id)  # downloads + parses into a Transcript
    print(result.text)
elif status.is_failed:
    print(status.failed_stage, status.reason)

# List your most-recent jobs (newest first), cursor-paginated
page = client.list_jobs(limit=50)
print(page["jobs"], page["next_before"])
for job in page["jobs"]:
    print(job["job_id"], job["created_at"])`}
      />

      <h2>Robustness</h2>
      <p>
        Configure retries, backoff, and an outbound proxy on the client. The
        SDK retries <code>429</code>, <code>5xx</code>, and network errors
        automatically and honors the <code>Retry-After</code> header.
      </p>
      <CodeBlock
        language="python"
        code={`client = SpeechRevolutions(
    max_retries=3,
    retry_backoff=0.5,               # seconds, exponential
    proxies={"https": "http://proxy.internal:8080"},
)`}
      />
      <p>
        Errors are typed. Each carries a <code>.status_code</code> and the
        server&apos;s <code>.request_id</code>. Include the request ID when you
        contact support.
      </p>
      <CodeBlock
        language="python"
        code={`from speechrevolutions.exceptions import RateLimitError, AuthenticationError

try:
    result = client.transcribe("meeting.mp3")
except RateLimitError as e:
    print(e.status_code, e.request_id)  # e.g. 429 "req_..."
except AuthenticationError as e:
    print(e.status_code, e.request_id)`}
      />

      <h2>Authentication</h2>
      <p>The SDK reads your API key from the environment:</p>
      <CodeBlock
        language="bash"
        code={`export SPEECHREVOLUTIONS_API_KEY=stt_...`}
      />
      <p>Or pass it explicitly:</p>
      <CodeBlock language="python" code={`client = SpeechRevolutions(api_key="stt_...")`} />

      <Callout title="Under the hood" tone="info">
        <p>
          The SDK uploads the file in parts, retrying any part that fails. It
          then listens on the{" "}
          <Link href="/api-reference/jobs">SSE job stream</Link> and converts
          the <code>completed</code> and <code>total</code> counts into{" "}
          <code>percent</code>.
        </p>
      </Callout>
    </>
  );
}
