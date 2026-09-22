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
        complete snippet in Python, JavaScript, Go and C#. Every client reads your key
        from <code>SPEECHREVOLUTIONS_API_KEY</code>,
        and its host from <code>SPEECHREVOLUTIONS_BASE_URL</code> if you need to
        point at something other than production — see any SDK page for install
        and auth:{" "}
        <Link href="/sdks/python">Python</Link>,{" "}
        <Link href="/sdks/javascript">JavaScript</Link>,{" "}
        <Link href="/sdks/go">Go</Link>, <Link href="/sdks/csharp">C#</Link>.
      </p>
      <p>
        Want them as files instead? The{" "}
        <a href="https://github.com/SpeechRevolutions/cookbook">cookbook repo</a>{" "}
        has each recipe as a runnable script with its own command-line
        arguments, and every one is tested on each change.
      </p>
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
            code: `import { SpeechRevolutions } from "speechrevolutions";

const client = new SpeechRevolutions();
const result = await client.transcribe("meeting.mp3");

console.log(result.text);`,
          },
          {
            label: "Go",
            language: "go",
            filename: "transcribe.go",
            code: `package main

import (
	"context"
	"fmt"
	"log"

	stt "github.com/speechrevolutions/speechrevolutions-go"
)

func main() {
	client, err := stt.NewClient("") // empty reads SPEECHREVOLUTIONS_API_KEY
	if err != nil {
		log.Fatal(err)
	}

	result, err := client.Transcribe(
		context.Background(), "meeting.mp3", stt.TranscribeOptions{}, nil)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println(result.Text())
}`,
          },
          {
            label: "C#",
            language: "csharp",
            filename: "Program.cs",
            code: `using SpeechRevolutions;

using var client = new SpeechRevolutionsClient();
var result = await client.TranscribeAsync("meeting.mp3");

Console.WriteLine(result.Text);`,
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
          {
            label: "Go",
            language: "go",
            code: `// auto-detected
result, err := client.Transcribe(ctx, "https://example.com/audio.mp3", stt.TranscribeOptions{}, nil)

// explicit alias
result, err = client.TranscribeURL(ctx, "https://example.com/audio.mp3", stt.TranscribeOptions{}, nil)`,
          },
          {
            label: "C#",
            language: "csharp",
            code: `// auto-detected
var result = await client.TranscribeAsync("https://example.com/audio.mp3");

// explicit alias
result = await client.TranscribeUrlAsync("https://example.com/audio.mp3");`,
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
            code: `import { SpeechRevolutions } from "speechrevolutions";
import { JobFailedError } from "speechrevolutions";

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
          {
            label: "Go",
            language: "go",
            filename: "submit_poll.go",
            code: `package main

import (
	"context"
	"fmt"
	"log"
	"time"

	stt "github.com/speechrevolutions/speechrevolutions-go"
)

func main() {
	ctx := context.Background()
	client, err := stt.NewClient("")
	if err != nil {
		log.Fatal(err)
	}

	jobID, err := client.Submit(ctx, "meeting.mp3", stt.TranscribeOptions{
		SpeakerLabels: stt.Bool(true),
	}) // returns as soon as the audio is enqueued
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("submitted", jobID)

	result, err := pollUntilDone(ctx, client, jobID, 3*time.Second)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println(result.Text())
}

func pollUntilDone(
	ctx context.Context, c *stt.Client, jobID string, interval time.Duration,
) (*stt.Transcript, error) {
	for {
		status, err := c.GetJobStatus(ctx, jobID) // processing | completed | failed
		if err != nil {
			return nil, err
		}
		if status.IsCompleted() {
			return c.GetTranscript(ctx, jobID, stt.OutputJSON) // downloads + parses
		}
		if status.IsFailed() {
			return nil, fmt.Errorf("job %s failed at %s: %s",
				jobID, status.FailedStage, status.Reason)
		}
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(interval):
		}
	}
}`,
          },
          {
            label: "C#",
            language: "csharp",
            filename: "SubmitPoll.cs",
            code: `using SpeechRevolutions;

using var client = new SpeechRevolutionsClient();

// Returns as soon as the audio is enqueued.
var jobId = await client.SubmitAsync(
    "meeting.mp3", new TranscribeOptions { SpeakerLabels = true });
Console.WriteLine($"submitted {jobId}");

var result = await PollUntilDoneAsync(client, jobId);
Console.WriteLine(result.Text);

static async Task<TranscriptResult> PollUntilDoneAsync(
    SpeechRevolutionsClient client, string jobId, int intervalMs = 3000)
{
    while (true)
    {
        // processing | completed | failed
        var status = await client.GetJobStatusAsync(jobId);
        if (status.IsCompleted)
            return await client.GetTranscriptAsync(jobId); // downloads + parses
        if (status.IsFailed)
            throw new JobFailedException(
                $"job {jobId} failed", status.FailedStage, status.Reason);
        await Task.Delay(intervalMs);
    }
}`,
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
import { SpeechRevolutions } from "speechrevolutions";

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
          {
            label: "Go",
            language: "go",
            filename: "batch.go",
            code: `package main

import (
	"context"
	"fmt"
	"log"
	"path/filepath"
	"time"

	stt "github.com/speechrevolutions/speechrevolutions-go"
)

func main() {
	ctx := context.Background()
	client, err := stt.NewClient("")
	if err != nil {
		log.Fatal(err)
	}

	paths, err := filepath.Glob("audio/*.mp3")
	if err != nil {
		log.Fatal(err)
	}

	// 1. Submit all files up front — each call returns once the audio is enqueued.
	jobs := map[string]string{} // jobID -> source path
	for _, path := range paths {
		jobID, err := client.Submit(ctx, path, stt.TranscribeOptions{})
		if err != nil {
			log.Fatalf("submitting %s: %v", path, err)
		}
		jobs[jobID] = path
	}
	fmt.Printf("submitted %d jobs\n", len(jobs))

	// 2. Gather: poll the pending set until every job is done.
	pending := map[string]bool{}
	for jobID := range jobs {
		pending[jobID] = true
	}
	results := map[string]*stt.Transcript{}

	for len(pending) > 0 {
		for jobID := range pending {
			status, err := client.GetJobStatus(ctx, jobID)
			if err != nil {
				log.Printf("%s: %v", jobs[jobID], err)
				continue
			}
			switch {
			case status.IsCompleted():
				t, err := client.GetTranscript(ctx, jobID, stt.OutputJSON)
				if err != nil {
					log.Printf("%s: %v", jobs[jobID], err)
				} else {
					results[jobID] = t
				}
				delete(pending, jobID)
			case status.IsFailed():
				log.Printf("%s failed: %s %s",
					jobs[jobID], status.FailedStage, status.Reason)
				delete(pending, jobID)
			}
		}
		if len(pending) > 0 {
			time.Sleep(3 * time.Second)
		}
	}

	for jobID, result := range results {
		fmt.Println(jobs[jobID], "->", len(result.Text()), "chars")
	}
}`,
          },
          {
            label: "C#",
            language: "csharp",
            filename: "Batch.cs",
            code: `using SpeechRevolutions;

using var client = new SpeechRevolutionsClient();

// 1. Submit all files up front.
var jobs = new Dictionary<string, string>(); // jobId -> source path
foreach (var path in Directory.EnumerateFiles("audio", "*.mp3"))
{
    var jobId = await client.SubmitAsync(path);
    jobs[jobId] = path;
}
Console.WriteLine($"submitted {jobs.Count} jobs");

// 2. Gather: poll the pending set until every job is done.
var pending = new HashSet<string>(jobs.Keys);
var results = new Dictionary<string, TranscriptResult>();

while (pending.Count > 0)
{
    foreach (var jobId in pending.ToList())
    {
        var status = await client.GetJobStatusAsync(jobId);
        if (status.IsCompleted)
        {
            results[jobId] = await client.GetTranscriptAsync(jobId);
            pending.Remove(jobId);
        }
        else if (status.IsFailed)
        {
            Console.WriteLine(
                $"{jobs[jobId]} failed: {status.FailedStage} {status.Reason}");
            pending.Remove(jobId);
        }
    }
    if (pending.Count > 0) await Task.Delay(3000);
}

foreach (var (jobId, result) in results)
    Console.WriteLine($"{jobs[jobId]} -> {result.Text.Length} chars");`,
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
import { SpeechRevolutions } from "speechrevolutions";

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
          {
            label: "Go",
            language: "go",
            filename: "webhooks.go",
            code: `package main

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"

	stt "github.com/speechrevolutions/speechrevolutions-go"
)

// The same secret configured server-side.
var secret = []byte(os.Getenv("SR_WEBHOOK_SECRET"))

func main() {
	client, err := stt.NewClient("")
	if err != nil {
		log.Fatal(err)
	}

	// 1. Submit with a webhook. Use Submit so you return without waiting.
	_, err = client.Submit(context.Background(), "meeting.mp3", stt.TranscribeOptions{
		CallbackURL: "https://you.example.com/hook",
	})
	if err != nil {
		log.Fatal(err)
	}

	// 2. Receive + verify the notification.
	http.HandleFunc("/hook", hook)
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func verifySignature(rawBody []byte, signatureHeader string) bool {
	mac := hmac.New(sha256.New, secret)
	mac.Write(rawBody)
	expected := "sha256=" + hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(signatureHeader))
}

func hook(w http.ResponseWriter, r *http.Request) {
	// Read the RAW body — verify against the exact bytes you received.
	raw, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "unreadable body", http.StatusBadRequest)
		return
	}
	if !verifySignature(raw, r.Header.Get("X-SR-Signature")) {
		http.Error(w, "bad signature", http.StatusUnauthorized)
		return
	}

	var event struct {
		JobID       string \`json:"job_id"\`
		Status      string \`json:"status"\`
		DownloadURL string \`json:"download_url"\`
		Step        string \`json:"step"\`
		Reason      string \`json:"reason"\`
	}
	if err := json.Unmarshal(raw, &event); err != nil {
		http.Error(w, "bad json", http.StatusBadRequest)
		return
	}

	if event.Status == "completed" {
		// mark done; fetch event.DownloadURL
	} else {
		// event.Step, event.Reason
	}

	// A 2xx acks delivery (we retry on 5xx).
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(\`{"ok":true}\`))
}`,
          },
          {
            label: "C#",
            language: "csharp",
            filename: "Program.cs",
            code: `using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using SpeechRevolutions;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

// The same secret configured server-side.
var secret = Encoding.UTF8.GetBytes(
    Environment.GetEnvironmentVariable("SR_WEBHOOK_SECRET")!);

using var client = new SpeechRevolutionsClient();

// 1. Submit with a webhook. Use SubmitAsync so you return without waiting.
await client.SubmitAsync("meeting.mp3",
    new TranscribeOptions { CallbackUrl = "https://you.example.com/hook" });

bool VerifySignature(byte[] rawBody, string? signatureHeader)
{
    using var hmac = new HMACSHA256(secret);
    var expected = "sha256=" + Convert.ToHexString(hmac.ComputeHash(rawBody)).ToLowerInvariant();
    return CryptographicOperations.FixedTimeEquals(
        Encoding.UTF8.GetBytes(expected),
        Encoding.UTF8.GetBytes(signatureHeader ?? ""));
}

// 2. Receive + verify the notification.
app.MapPost("/hook", async (HttpRequest request) =>
{
    // Buffer the RAW body — verify against the exact bytes you received.
    using var ms = new MemoryStream();
    await request.Body.CopyToAsync(ms);
    var raw = ms.ToArray();

    if (!VerifySignature(raw, request.Headers["X-SR-Signature"]))
        return Results.Unauthorized();

    var evt = JsonDocument.Parse(raw).RootElement;
    if (evt.GetProperty("status").GetString() == "completed")
    {
        // mark done; fetch evt.GetProperty("download_url")
    }
    else
    {
        // evt.GetProperty("step"), evt.GetProperty("reason")
    }

    return Results.Ok(new { ok = true }); // a 2xx acks delivery (we retry on 5xx)
});

app.Run();`,
          },
        ]}
      />

      <h2 id="retries">Retries and timeouts</h2>
      <p>
        Every client retries transient failures automatically — <code>429</code>,{" "}
        <code>5xx</code>, and network errors — honoring the server&apos;s{" "}
        <code>Retry-After</code> header. Tune the budget and backoff on the
        client. Requests that create a job are the exception: they are never
        retried after the bytes leave you, because a retry there would bill you
        for a second transcription.
      </p>
      <p>
        Errors are typed and carry the HTTP status and the server request id, so
        a failure is enough for support to find the job in our logs without you
        reproducing it.
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
            code: `import { SpeechRevolutions, RateLimitError } from "speechrevolutions";

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
          {
            label: "Go",
            language: "go",
            code: `client, err := stt.NewClient("")
if err != nil {
	log.Fatal(err)
}
client.MaxRetries = 3
client.RetryBackoff = 500 * time.Millisecond // exponential
client.Timeout = 10 * time.Minute

// Proxies and any other transport concern: supply your own *http.Client.
proxy, _ := url.Parse("http://proxy.internal:8080")
client.HTTP = &http.Client{
	Transport: &http.Transport{Proxy: http.ProxyURL(proxy)},
}

result, err := client.Transcribe(ctx, "meeting.mp3", stt.TranscribeOptions{}, nil)

var rateLimit *stt.RateLimitError
if errors.As(err, &rateLimit) {
	fmt.Println(rateLimit.StatusCode, rateLimit.RequestID) // e.g. 429 "req_..."
}`,
          },
          {
            label: "C#",
            language: "csharp",
            code: `using SpeechRevolutions;

// Proxies and any other transport concern: supply your own HttpClient.
var handler = new HttpClientHandler
{
    Proxy = new WebProxy("http://proxy.internal:8080"),
    UseProxy = true,
};

using var client = new SpeechRevolutionsClient(
    maxRetries: 3,
    retryBackoff: TimeSpan.FromMilliseconds(500), // exponential
    timeout: TimeSpan.FromMinutes(10),
    httpClient: new HttpClient(handler));

try
{
    var result = await client.TranscribeAsync("meeting.mp3");
}
catch (RateLimitException e)
{
    Console.WriteLine($"{e.StatusCode} {e.RequestId}"); // e.g. 429 "req_..."
}`,
          },
        ]}
      />
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
          {
            label: "Go",
            language: "go",
            code: `result, err := client.Transcribe(ctx, "meeting.mp3", stt.TranscribeOptions{
	SpeakerLabels: stt.Bool(true),
}, nil)
if err != nil {
	log.Fatal(err)
}

for _, u := range result.Utterances {
	fmt.Printf("Speaker %s: %s\n", u.Speaker, u.Text)
}`,
          },
          {
            label: "C#",
            language: "csharp",
            code: `var result = await client.TranscribeAsync("meeting.mp3",
    new TranscribeOptions { SpeakerLabels = true });

foreach (var u in result.Utterances)
    Console.WriteLine($"Speaker {u.Speaker}: {u.Text}");`,
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
          {
            label: "Go",
            language: "go",
            code: `result, err := client.Transcribe(ctx, "entrevista.mp3", stt.TranscribeOptions{
	CustomVocabulary: []string{"Barcelona", "paella"}, // optional domain terms
}, nil)
if err != nil {
	log.Fatal(err)
}
fmt.Println(result.Text())`,
          },
          {
            label: "C#",
            language: "csharp",
            code: `var result = await client.TranscribeAsync("entrevista.mp3",
    new TranscribeOptions
    {
        CustomVocabulary = new[] { "Barcelona", "paella" }, // optional domain terms
    });

Console.WriteLine(result.Text);`,
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
          {
            label: "Go",
            language: "go",
            code: `// SubRip (.srt)
srt, err := client.Transcribe(ctx, "meeting.mp3", stt.TranscribeOptions{
	OutputType: stt.OutputSRT,
}, nil)
if err != nil {
	log.Fatal(err)
}
path, err := srt.Save("meeting") // extension inferred from the output type
if err != nil {
	log.Fatal(err)
}
fmt.Println("wrote", path) // wrote meeting.srt

// WebVTT (.vtt)
vtt, err := client.Transcribe(ctx, "meeting.mp3", stt.TranscribeOptions{
	OutputType: stt.OutputVTT,
}, nil)
if err != nil {
	log.Fatal(err)
}
fmt.Println(vtt.Text()) // the decoded WEBVTT file`,
          },
          {
            label: "C#",
            language: "csharp",
            code: `// SubRip (.srt)
var srt = await client.TranscribeAsync("meeting.mp3",
    new TranscribeOptions { OutputType = OutputType.Srt });
await srt.SaveAsync("meeting"); // -> meeting.srt

// WebVTT (.vtt)
var vtt = await client.TranscribeAsync("meeting.mp3",
    new TranscribeOptions { OutputType = OutputType.Vtt });
Console.WriteLine(vtt.Text);    // the decoded WEBVTT file`,
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
