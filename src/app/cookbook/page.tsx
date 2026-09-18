import { CodeTabs } from "@/components/CodeTabs";
import { Callout } from "@/components/DocsUI";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cookbook",
  description:
    "Short, copy-pasteable Speech Revolutions recipes: files and URLs, submit + poll, batching, webhooks, retries, speaker labels, multilingual, and subtitles.",
};

export default function CookbookPage() {
  return (
    <>
      <h1>Cookbook</h1>
      <p>
        Short, copy-pasteable recipes for common Speech Revolutions tasks. Each one is a
        complete snippet in Python and JavaScript. Every client reads your key
        from <code>SPEECHREVOLUTIONS_API_KEY</code> (or <code>STT_API_KEY</code>),
        and its host from <code>SPEECHREVOLUTIONS_BASE_URL</code> if you need to
        point at something other than production — see any SDK page for install
        and auth:{" "}
        <Link href="/sdks/python">Python</Link>,{" "}
        <Link href="/sdks/javascript">JavaScript</Link>,{" "}
        <Link href="/sdks/go">Go</Link>, <Link href="/sdks/csharp">C#</Link>.
      </p>
      <Callout tone="info" title="Which languages you will see">
        <p>
          The <Link href="/getting-started">Quickstart</Link> shows all four
          SDKs — Python, JavaScript, Go and C# — because that is where you pick
          one. From there on, recipes and guides are written in{" "}
          <strong>Python and JavaScript</strong>.
        </p>
        <p>
          That is deliberate rather than a gap. Every recipe maps one-to-one onto
          the Go and C# clients, which expose the same methods with each
          language&apos;s naming (<code>client.transcribe(...)</code>,{" "}
          <code>client.Transcribe(...)</code>,{" "}
          <code>client.TranscribeAsync(...)</code>) — so the shape you read here
          is the shape you write there. Duplicating every snippet four ways would
          mean four chances to drift out of date, and a stale example is worse
          than a translated one. Each SDK page carries a full working example in
          its own language:{" "}
          <Link href="/sdks/go">Go</Link>, <Link href="/sdks/csharp">C#</Link>.
        </p>
        <p>
          If a recipe you need is hard to translate, that is a docs bug worth
          reporting — tell us which one and we will add it in your language.
        </p>
      </Callout>
      <ul>
        <li>
          <a href="#file">Transcribe a local file</a>
        </li>
        <li>
          <a href="#url">Transcribe from a URL</a>
        </li>
        <li>
          <a href="#submit-poll">Submit and poll</a>
        </li>
        <li>
          <a href="#batch">Batch many files</a>
        </li>
        <li>
          <a href="#webhooks">Get notified with a webhook</a>
        </li>
        <li>
          <a href="#retries">Retries and timeouts</a>
        </li>
        <li>
          <a href="#speakers">Speaker labels</a>
        </li>
        <li>
          <a href="#multilingual">Multilingual audio</a>
        </li>
        <li>
          <a href="#subtitles">Subtitles (SRT / VTT)</a>
        </li>
      </ul>

      <h2 id="file">Transcribe a local file</h2>
      <p>
        The one-liner. <code>transcribe()</code> uploads the file, waits for the
        result, and parses it into a transcript object. Point it at a path, raw
        bytes, or a file object.
      </p>
      <CodeTabs
        tabs={[
          {
            label: "Python",
            language: "python",
            filename: "transcribe.py",
            code: `from speechrevolutions import SpeechRevolutions

client = SpeechRevolutions()
result = client.transcribe("meeting.mp3")

print(result.text)`,
          },
          {
            label: "JavaScript",
            language: "ts",
            filename: "transcribe.mjs",
            code: `import { SpeechRevolutions } from "@speechrevolutions/stt";

const client = new SpeechRevolutions();
const result = await client.transcribe("meeting.mp3");

console.log(result.text);`,
          },
        ]}
      />

      <h2 id="url">Transcribe from a URL</h2>
      <p>
        <code>transcribe()</code> auto-detects an <code>http(s)</code> URL; the{" "}
        <code>transcribe_url()</code> / <code>transcribeUrl()</code> aliases make
        the intent explicit.
      </p>
      <CodeTabs
        tabs={[
          {
            label: "Python",
            language: "python",
            code: `# auto-detected
result = client.transcribe("https://example.com/audio.mp3")

# explicit alias
result = client.transcribe_url("https://example.com/audio.mp3")`,
          },
          {
            label: "JavaScript",
            language: "ts",
            code: `// auto-detected
const result = await client.transcribe("https://example.com/audio.mp3");

// explicit alias
const result2 = await client.transcribeUrl("https://example.com/audio.mp3");`,
          },
        ]}
      />

      <h2 id="submit-poll">Submit and poll</h2>
      <p>
        When you don&apos;t want to hold a connection open for the whole job,{" "}
        <code>submit()</code> uploads the audio, enqueues it, and returns a{" "}
        <code>job_id</code> immediately. Fetch the result later with{" "}
        <code>get_job_status()</code> and <code>get_transcript()</code>. A job&apos;s
        status is one of <code>processing</code>, <code>completed</code>, or{" "}
        <code>failed</code>; the download URL is regenerated on demand, so results
        are fetchable long after the upload.
      </p>
      <CodeTabs
        tabs={[
          {
            label: "Python",
            language: "python",
            filename: "submit_poll.py",
            code: `import time

from speechrevolutions import SpeechRevolutions
from speechrevolutions.exceptions import JobFailedError

client = SpeechRevolutions()

job_id = client.submit("meeting.mp3", speaker_labels=True)  # returns immediately
print("submitted", job_id)

def poll_until_done(job_id, interval=3.0):
    while True:
        status = client.get_job_status(job_id)   # processing | completed | failed
        if status.is_completed:
            return client.get_transcript(job_id)  # downloads + parses
        if status.is_failed:
            raise JobFailedError(
                f"job {job_id} failed", step=status.failed_stage, reason=status.reason
            )
        time.sleep(interval)

result = poll_until_done(job_id)
print(result.text)`,
          },
          {
            label: "JavaScript",
            language: "ts",
            filename: "submit-poll.mjs",
            code: `import { SpeechRevolutions } from "@speechrevolutions/stt";
import { JobFailedError } from "@speechrevolutions/stt";

const client = new SpeechRevolutions();

const jobId = await client.submit("meeting.mp3", { speakerLabels: true });
console.log("submitted", jobId);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function pollUntilDone(jobId, intervalMs = 3000) {
  for (;;) {
    const status = await client.getJobStatus(jobId); // processing | completed | failed
    if (status.status === "completed") return client.getTranscript(jobId);
    if (status.status === "failed") {
      throw new JobFailedError(\`job \${jobId} failed\`, {
        step: status.failedStage,
        reason: status.reason,
      });
    }
    await sleep(intervalMs);
  }
}

const result = await pollUntilDone(jobId);
console.log(result.text);`,
          },
        ]}
      />

      <h2 id="batch">Batch many files</h2>
      <p>
        The scalable pattern: <strong>submit every file first</strong>, then
        gather the results. Because <code>submit()</code> holds no long-lived
        connection per job, you can enqueue a whole directory up front and poll
        for completion afterwards — nothing stays open while the server works.
      </p>
      <CodeTabs
        tabs={[
          {
            label: "Python",
            language: "python",
            filename: "batch.py",
            code: `import time
from pathlib import Path

from speechrevolutions import SpeechRevolutions

client = SpeechRevolutions()

# 1. Submit all files up front — each call returns as soon as the audio is enqueued.
jobs = {}  # job_id -> source path
for path in Path("audio/").glob("*.mp3"):
    job_id = client.submit(str(path))
    jobs[job_id] = path
print(f"submitted {len(jobs)} jobs")

# 2. Gather: poll the pending set until every job is done.
pending = set(jobs)
results = {}
while pending:
    for job_id in list(pending):
        status = client.get_job_status(job_id)
        if status.is_completed:
            results[job_id] = client.get_transcript(job_id)
            pending.discard(job_id)
        elif status.is_failed:
            print(f"{jobs[job_id]} failed: {status.failed_stage} {status.reason}")
            pending.discard(job_id)
    if pending:
        time.sleep(3)

for job_id, result in results.items():
    print(jobs[job_id], "->", len(result.text), "chars")`,
          },
          {
            label: "JavaScript",
            language: "ts",
            filename: "batch.mjs",
            code: `import { readdir } from "node:fs/promises";
import { SpeechRevolutions } from "@speechrevolutions/stt";

const client = new SpeechRevolutions();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 1. Submit all files up front.
const files = (await readdir("audio")).filter((f) => f.endsWith(".mp3"));
const jobs = new Map(); // jobId -> source path
for (const file of files) {
  const jobId = await client.submit(\`audio/\${file}\`);
  jobs.set(jobId, file);
}
console.log(\`submitted \${jobs.size} jobs\`);

// 2. Gather: poll the pending set until every job is done.
const pending = new Set(jobs.keys());
const results = new Map();
while (pending.size) {
  for (const jobId of [...pending]) {
    const status = await client.getJobStatus(jobId);
    if (status.status === "completed") {
      results.set(jobId, await client.getTranscript(jobId));
      pending.delete(jobId);
    } else if (status.status === "failed") {
      console.log(\`\${jobs.get(jobId)} failed: \${status.failedStage} \${status.reason}\`);
      pending.delete(jobId);
    }
  }
  if (pending.size) await sleep(3000);
}

for (const [jobId, result] of results) {
  console.log(jobs.get(jobId), "->", result.text.length, "chars");
}`,
          },
        ]}
      />
      <Callout title="Why submit + poll for batches" tone="tip">
        <p>
          <code>transcribe()</code> keeps one connection open per file until it
          finishes — fine for a single clip, wasteful for hundreds.{" "}
          <code>submit()</code> decouples enqueue from retrieval, so throughput is
          bounded by the platform, not by how many sockets you can hold open. For
          fully hands-off delivery, combine it with a{" "}
          <a href="#webhooks">webhook</a> and skip polling entirely.
        </p>
      </Callout>

      <h2 id="webhooks">Get notified with a webhook</h2>
      <p>
        Pass <code>callback_url</code> and the platform POSTs a signed JSON
        notification when the job finishes — no polling, no open connection. This
        is the right pattern for server and background workloads.
      </p>
      <p>
        The body is{" "}
        <code>
          {`{job_id, status: "completed" | "failed", download_url?, step?, reason?}`}
        </code>
        , signed with HMAC-SHA256 over the <em>raw</em> body in the{" "}
        <code>X-SR-Signature: sha256=&lt;hex&gt;</code> header (plus a unique{" "}
        <code>X-SR-Delivery</code> id). Always verify against the raw bytes you
        received — not a re-serialized dict — with a constant-time comparison.
      </p>
      <CodeTabs
        tabs={[
          {
            label: "Python",
            language: "python",
            filename: "webhooks.py",
            code: `import hashlib
import hmac
import json

from fastapi import FastAPI, Request, HTTPException
from speechrevolutions import SpeechRevolutions

client = SpeechRevolutions()

# 1. Submit with a webhook. Use submit() so you return without waiting.
client.submit("meeting.mp3", callback_url="https://you.example.com/hook")

# 2. Receive + verify the notification.
app = FastAPI()
SECRET = "your-signing-secret"  # the same secret configured server-side

def verify_signature(raw_body: bytes, signature_header: str, secret: str) -> bool:
    expected = "sha256=" + hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature_header or "")

@app.post("/hook")
async def hook(request: Request):
    raw = await request.body()
    if not verify_signature(raw, request.headers.get("X-SR-Signature", ""), SECRET):
        raise HTTPException(status_code=401, detail="bad signature")
    event = json.loads(raw)
    if event["status"] == "completed":
        ...  # mark done; fetch event["download_url"]
    else:
        ...  # event["step"], event["reason"]
    return {"ok": True}  # a 2xx acks delivery (we retry on 5xx)`,
          },
          {
            label: "JavaScript",
            language: "ts",
            filename: "webhooks.mjs",
            code: `import { createHmac, timingSafeEqual } from "node:crypto";
import express from "express";
import { SpeechRevolutions } from "@speechrevolutions/stt";

const client = new SpeechRevolutions();

// 1. Submit with a webhook. Use submit() so you return without waiting.
await client.submit("meeting.mp3", { callbackUrl: "https://you.example.com/hook" });

// 2. Receive + verify the notification.
const SECRET = process.env.SR_WEBHOOK_SECRET; // same secret configured server-side

function verifySignature(rawBody, signatureHeader, secret) {
  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader ?? "");
  return a.length === b.length && timingSafeEqual(a, b);
}

const app = express();
// Capture the RAW body — you must verify the signature against the exact bytes.
app.post("/hook", express.raw({ type: "application/json" }), (req, res) => {
  if (!verifySignature(req.body, req.get("X-SR-Signature"), SECRET))
    return res.status(401).send("bad signature");
  const event = JSON.parse(req.body.toString());
  if (event.status === "completed") {
    // mark done; fetch event.download_url
  } else {
    // event.step, event.reason
  }
  res.json({ ok: true }); // a 2xx acks delivery (we retry on 5xx)
});`,
          },
        ]}
      />

      <h2 id="retries">Retries and timeouts</h2>
      <p>
        The Python and JavaScript clients retry transient failures automatically —{" "}
        <code>429</code>, <code>5xx</code>, and network errors — honoring the
        server&apos;s <code>Retry-After</code> header. Tune the retry budget and
        backoff on the client. Errors are typed and carry a{" "}
        <code>status_code</code> / <code>statusCode</code> and the server{" "}
        <code>request_id</code> / <code>requestId</code> for correlating with
        support.
      </p>
      <CodeTabs
        tabs={[
          {
            label: "Python",
            language: "python",
            code: `from speechrevolutions import SpeechRevolutions
from speechrevolutions.exceptions import RateLimitError

client = SpeechRevolutions(
    max_retries=3,
    retry_backoff=0.5,   # seconds, exponential
    proxies={"https": "http://proxy.internal:8080"},
)

try:
    result = client.transcribe("meeting.mp3")
except RateLimitError as e:
    print(e.status_code, e.request_id)  # e.g. 429 "req_..."`,
          },
          {
            label: "JavaScript",
            language: "ts",
            code: `import { SpeechRevolutions, RateLimitError } from "@speechrevolutions/stt";

const client = new SpeechRevolutions({
  maxRetries: 3,
  retryBackoffMs: 500,
});

try {
  const result = await client.transcribe("meeting.mp3");
} catch (e) {
  if (e instanceof RateLimitError) {
    console.log(e.statusCode, e.requestId); // e.g. 429 "req_..."
  }
}`,
          },
        ]}
      />
      <Callout title="Go and C#" tone="info">
        <p>
          The retry/backoff and proxy knobs are a Python/JavaScript feature. In Go
          and C#, wrap calls in your own retry loop. See{" "}
          <Link href="/sdks/go">Go</Link> and <Link href="/sdks/csharp">C#</Link>{" "}
          for their error types.
        </p>
      </Callout>

      <h2 id="speakers">Speaker labels</h2>
      <p>
        <code>speaker_labels</code> (on by default) labels who spoke each segment.{" "}
        <code>diarize</code> is a Deepgram-compatible alias for the same flag. The
        result exposes <code>.utterances</code> — contiguous speaker turns — and
        every word in <code>.words</code> carries a <code>speaker</code>. Full
        detail in the{" "}
        <Link href="/guides/diarization">speaker diarization guide</Link>.
      </p>
      <CodeTabs
        tabs={[
          {
            label: "Python",
            language: "python",
            code: `result = client.transcribe("meeting.mp3", speaker_labels=True)

for u in result.utterances:
    print(f"Speaker {u.speaker}: {u.text}")`,
          },
          {
            label: "JavaScript",
            language: "ts",
            code: `const result = await client.transcribe("meeting.mp3", { speakerLabels: true });

for (const u of result.utterances) {
  console.log(\`Speaker \${u.speaker}: \${u.text}\`);
}`,
          },
        ]}
      />

      <h2 id="multilingual">Multilingual audio</h2>
      <p>
        There is no language flag to set. Speech Revolutions detects the spoken language and
        transcribes it, including audio that switches languages mid-file. Just
        call <code>transcribe()</code> as usual. For domain-specific names and
        jargon, pass <code>custom_vocabulary</code> to bias the model toward those
        terms.
      </p>
      <CodeTabs
        tabs={[
          {
            label: "Python",
            language: "python",
            code: `result = client.transcribe(
    "entrevista.mp3",
    custom_vocabulary=["Barcelona", "paella"],  # optional domain terms
)
print(result.text)`,
          },
          {
            label: "JavaScript",
            language: "ts",
            code: `const result = await client.transcribe("entrevista.mp3", {
  customVocabulary: ["Barcelona", "paella"], // optional domain terms
});
console.log(result.text);`,
          },
        ]}
      />
      <p>
        For per-language accuracy across our benchmark suite, see the{" "}
        <Link href="/benchmarks">benchmarks page</Link>.
      </p>

      <h2 id="subtitles">Subtitles (SRT / VTT)</h2>
      <p>
        Set <code>output_type</code> to <code>srt</code> or <code>vtt</code> and
        the server returns ready-to-use subtitle bytes — no client-side
        formatting. For subtitles, <code>.text</code> holds the decoded file and{" "}
        <code>.save()</code> writes it (inferring the extension from the output
        type). See{" "}
        <Link href="/guides/output-formats">output formats &amp; subtitles</Link>{" "}
        for all six formats and when to use each.
      </p>
      <CodeTabs
        tabs={[
          {
            label: "Python",
            language: "python",
            code: `# SubRip (.srt)
srt = client.transcribe("meeting.mp3", output_type="srt")
srt.save("meeting")   # -> meeting.srt

# WebVTT (.vtt)
vtt = client.transcribe("meeting.mp3", output_type="vtt")
print(vtt.text)       # the decoded WEBVTT file`,
          },
          {
            label: "JavaScript",
            language: "ts",
            code: `// SubRip (.srt)
const srt = await client.transcribe("meeting.mp3", { outputType: "srt" });
await srt.save("meeting"); // -> meeting.srt

// WebVTT (.vtt)
const vtt = await client.transcribe("meeting.mp3", { outputType: "vtt" });
console.log(vtt.text);     // the decoded WEBVTT file`,
          },
        ]}
      />

      <Callout title="Keep going" tone="tip">
        <p>
          Building a live progress bar for a web app? See{" "}
          <Link href="/guides/live-progress">Live progress for web apps</Link>.
          Working with timings? See{" "}
          <Link href="/guides/timestamps">Timestamps</Link>. Migrating from
          another provider? Start with the{" "}
          <Link href="/migrate/playbook">migration playbook</Link>.
        </p>
      </Callout>
    </>
  );
}
