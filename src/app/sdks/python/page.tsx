import { CodeBlock } from "@/components/CodeBlock";
import { Callout } from "@/components/DocsUI";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Python SDK",
  description:
    "Official Python client for the Speech Revolutions STT API. Ships a synchronous SpeechRevolutions client and an asyncio AsyncSpeechRevolutions client with the…",
};

export default function PythonSdkPage() {
  return (
    <>
      <h1>Python SDK</h1>
      <p>
        Official Python client for the Speech Revolutions STT API. Ships a
        synchronous <code>SpeechRevolutions</code> client and an asyncio{" "}
        <code>AsyncSpeechRevolutions</code> client with the same one-line{" "}
        <code>transcribe()</code> API.
      </p>

      <p>
        Source on 
        <a href="https://github.com/SpeechRevolutions/python-sdk">GitHub</a> &middot; 
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
        Point <code>transcribe()</code> at a local path, a URL, raw bytes, or a
        file object. With the default <code>output_type="json"</code> the SDK
        parses the response into a transcript-first result object.
      </p>
      <CodeBlock
        language="python"
        filename="transcribe.py"
        code={`from speechrevolutions import SpeechRevolutions

client = SpeechRevolutions()  # reads SPEECHREVOLUTIONS_API_KEY or STT_API_KEY
result = client.transcribe("meeting.mp3", speaker_labels=True)

print(result.text)
for u in result.utterances:
    print(f"Speaker {u.speaker}: {u.text}")`}
      />

      <h2>From a URL or file</h2>
      <p>
        <code>transcribe()</code> auto-detects <code>http(s)</code> URLs; the{" "}
        <code>transcribe_url()</code> / <code>transcribe_file()</code> aliases
        make intent explicit.
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
        Pass options as keyword arguments (ElevenLabs / Deepgram style) or as a{" "}
        <code>TranscribeOptions</code> config object (AssemblyAI style):
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

      <h2>Live progress</h2>
      <p>
        Unlike AssemblyAI and Deepgram — which expose no percentage for
        pre-recorded audio — you get real-time progress for <strong>both</strong>{" "}
        the file upload and the transcription, as a console bar, a callback, or
        both. They compose: the bars render <em>and</em> your callbacks still
        fire for every event.
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
        Building a UI?{" "}
        <Link href="/guides/live-progress">Live progress for web apps</Link>{" "}
        shows how to fold both callbacks into a single 0–100 bar you can serve
        to your frontend.
      </p>

      <h2>Async</h2>
      <p>
        The asyncio client mirrors the sync API. Use{" "}
        <code>async with</code> so the underlying httpx client is closed on
        exit.
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
        With <code>output_type="json"</code> the SDK returns a transcript-first
        object. The client never writes files unless you call{" "}
        <code>save()</code>.
      </p>
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
            <td>Full transcript (AssemblyAI / ElevenLabs style)</td>
          </tr>
          <tr>
            <td>
              <code>result.transcript</code>
            </td>
            <td>Deepgram-style alias for the same text</td>
          </tr>
          <tr>
            <td>
              <code>result.words</code>
            </td>
            <td>Word + start / end / speaker</td>
          </tr>
          <tr>
            <td>
              <code>result.utterances</code>
            </td>
            <td>AssemblyAI-style speaker turns</td>
          </tr>
          <tr>
            <td>
              <code>result.to_deepgram()</code>
            </td>
            <td>Deepgram-shaped dict for migrations</td>
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
            <td>Raw bytes / write to disk</td>
          </tr>
        </tbody>
      </table>
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
        Pass <code>callback_url</code> to be notified when a job finishes
        instead of holding the call open — the right pattern for server and
        background workloads. On completion or permanent failure the platform
        POSTs a signed JSON body to your URL:
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
        , signed with HMAC-SHA256 over the raw body in the{" "}
        <code>X-SR-Signature: sha256=&lt;hex&gt;</code> header (plus a unique{" "}
        <code>X-SR-Delivery</code> id). Always verify the signature against the
        raw bytes you received — not a re-serialized dict — using a
        constant-time comparison.
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
        Fetch a job by id anytime — useful after a webhook, or when rebuilding
        state after a restart. The download URL is regenerated on demand, so
        results are fetchable long after the original upload.
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
        Configure retries, backoff, and an outbound proxy on the client.
        Transient <code>429</code>/<code>5xx</code>/network errors are retried
        automatically (honoring the <code>Retry-After</code> header).
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
        Errors are typed and carry a <code>.status_code</code> and the server{" "}
        <code>.request_id</code> for correlating with support.
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

      <h2>Auth</h2>
      <p>The SDK reads the key from either environment variable:</p>
      <CodeBlock
        language="bash"
        code={`export SPEECHREVOLUTIONS_API_KEY=stt_...
# or
export STT_API_KEY=stt_...`}
      />
      <p>Or pass it explicitly:</p>
      <CodeBlock language="python" code={`client = SpeechRevolutions(api_key="stt_...")`} />

      <Callout title="Under the hood" tone="info">
        <p>
          The SDK drives the{" "}
          <Link href="/api-reference/upload">/api/v1/upload</Link> flow (create
          job → presigned PUT → complete) and waits on the{" "}
          <Link href="/api-reference/jobs">SSE job stream</Link>, converting the
          server&apos;s <code>completed</code>/<code>total</code> counts into{" "}
          <code>percent</code> for you.
        </p>
      </Callout>
    </>
  );
}
