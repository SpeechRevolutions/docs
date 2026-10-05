import { CodeBlock } from "@/components/CodeBlock";
import { CodeTabs } from "@/components/CodeTabs";
import { Callout } from "@/components/DocsUI";
import { SITE } from "@/lib/constants";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Webhooks",
  description:
    "Get a signed POST when a job finishes instead of holding a connection open, and verify it with your organization's signing secret.",
};

export default function WebhooksGuidePage() {
  return (
    <>
      <h1>Webhooks</h1>
      <p>
        Pass a <code>callback_url</code> and Speech Revolutions POSTs a signed notification
        to it when the job finishes, so your server can submit work and move on instead of
        holding a connection open.
      </p>

      <h2>Get your signing secret</h2>
      <p>
        Every webhook is signed with your organization&apos;s signing secret. Find it in the{" "}
        <a href={`${SITE.consoleUrl}/api-keys`} target="_blank" rel="noopener noreferrer">
          console
        </a>{" "}
        under <strong>API Keys → Webhook signing secret</strong>: choose <strong>Reveal</strong>,
        copy it, and store it where your receiver can read it — the examples below use{" "}
        <code>SPEECHREVOLUTIONS_WEBHOOK_SECRET</code>.
      </p>
      <CodeBlock
        language="bash"
        code={`export SPEECHREVOLUTIONS_WEBHOOK_SECRET="whsec_…"`}
      />
      <p>
        The secret belongs to the organization, not to an API key: webhooks for jobs from any
        of its keys are signed with it. Anyone who can create API keys can reveal it; owners
        and admins can rotate it.
      </p>

      <h2>Ask for a webhook</h2>
      <p>
        Add <code>callback_url</code> when you submit a job. <code>submit()</code> returns as
        soon as the job is queued; the webhook tells you when it is done.
      </p>
      <p>
        The URL must be publicly reachable over the internet. A <code>localhost</code> or{" "}
        <code>127.0.0.1</code> URL (or any private address) is refused with HTTP 403 when you
        submit, so in local development pass a tunnel&apos;s public URL instead.
      </p>
      <CodeTabs
        tabs={[
          {
            label: "Python",
            language: "python",
            code: `from speechrevolutions import SpeechRevolutions

client = SpeechRevolutions()  # reads SPEECHREVOLUTIONS_API_KEY
client.submit("meeting.mp3", callback_url="https://you.example.com/webhooks/stt")`,
          },
          {
            label: "JavaScript",
            language: "ts",
            code: `import { SpeechRevolutions } from "speechrevolutions";

const client = new SpeechRevolutions(); // reads SPEECHREVOLUTIONS_API_KEY
await client.submit("meeting.mp3", { callbackUrl: "https://you.example.com/webhooks/stt" });`,
          },
          {
            label: "Go",
            language: "go",
            code: `client, err := stt.NewClient("") // reads SPEECHREVOLUTIONS_API_KEY
if err != nil {
	log.Fatal(err)
}
_, err = client.Submit(context.Background(), "meeting.mp3", stt.TranscribeOptions{
	CallbackURL: "https://you.example.com/webhooks/stt",
})`,
          },
          {
            label: "C#",
            language: "csharp",
            code: `using SpeechRevolutions;

using var client = new SpeechRevolutionsClient(); // reads SPEECHREVOLUTIONS_API_KEY
await client.SubmitAsync("meeting.mp3",
    new TranscribeOptions { CallbackUrl = "https://you.example.com/webhooks/stt" });`,
          },
          {
            label: "cURL",
            language: "bash",
            code: `curl -N -X POST "${SITE.apiBase}/api/v1/transcribe?output_type=json&callback_url=https%3A%2F%2Fyou.example.com%2Fwebhooks%2Fstt" \\
  -H "X-API-Key: $SPEECHREVOLUTIONS_API_KEY" \\
  --data-binary @meeting.mp3`,
          },
        ]}
      />
      <p>
        The callback URL must be <code>https</code> or <code>http</code> and resolve to a
        public address.
      </p>

      <h2>What we send</h2>
      <p>
        One POST when the job completes or fails permanently. The body is JSON:
      </p>
      <CodeBlock
        language="json"
        code={`{
  "job_id": "3f1c…",
  "status": "completed",          // or "failed"
  "download_url": "https://…",    // completed only; fetch the transcript from here
  "step": "…",                    // failed only: where it failed
  "reason": "…"                   // failed only: why
}`}
      />
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Header</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>X-SR-Signature</code>
              </td>
              <td>
                <code>sha256=&lt;hex&gt;</code>: HMAC-SHA256 of the raw body, keyed with your
                signing secret.
              </td>
            </tr>
            <tr>
              <td>
                <code>X-SR-Event</code>
              </td>
              <td>
                <code>completed</code> or <code>failed</code>, the same as{" "}
                <code>status</code>.
              </td>
            </tr>
            <tr>
              <td>
                <code>X-SR-Delivery</code>
              </td>
              <td>A unique id per delivery. Retries reuse it, so use it to drop duplicates.</td>
            </tr>
            <tr>
              <td>
                <code>User-Agent</code>
              </td>
              <td>
                <code>SpeechRevolutions-Webhook/1</code>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Respond with any <code>2xx</code> to acknowledge. A <code>5xx</code>, a timeout (10
        seconds per attempt) or a connection error is retried with backoff, up to 4 attempts in
        all. A <code>4xx</code> is final and not retried.
      </p>

      <h2>Verify the signature</h2>
      <p>
        Compute the HMAC over the <em>exact bytes</em> you received — not a re-serialized
        object, which can reorder keys or change spacing — and compare with a constant-time
        check. Reject anything that doesn&apos;t match.
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
import os

from fastapi import FastAPI, HTTPException, Request

SECRET = os.environ["SPEECHREVOLUTIONS_WEBHOOK_SECRET"]
app = FastAPI()


def verify_signature(raw_body: bytes, signature_header: str) -> bool:
    expected = "sha256=" + hmac.new(SECRET.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature_header or "")


@app.post("/webhooks/stt")
async def receive(request: Request):
    raw = await request.body()  # the exact bytes received
    if not verify_signature(raw, request.headers.get("X-SR-Signature", "")):
        raise HTTPException(status_code=401, detail="bad signature")
    event = json.loads(raw)
    if event["status"] == "completed":
        ...  # fetch event["download_url"]
    else:
        ...  # event["step"], event["reason"]
    return {"ok": True}`,
          },
          {
            label: "JavaScript",
            language: "ts",
            filename: "webhooks.mjs",
            code: `import { createHmac, timingSafeEqual } from "node:crypto";
import express from "express";

const SECRET = process.env.SPEECHREVOLUTIONS_WEBHOOK_SECRET;

function verifySignature(rawBody, signatureHeader) {
  const expected = "sha256=" + createHmac("sha256", SECRET).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader ?? "");
  return a.length === b.length && timingSafeEqual(a, b);
}

const app = express();
// express.raw keeps the exact bytes; express.json would re-serialize them.
app.post("/webhooks/stt", express.raw({ type: "application/json" }), (req, res) => {
  if (!verifySignature(req.body, req.get("X-SR-Signature"))) {
    return res.status(401).send("bad signature");
  }
  const event = JSON.parse(req.body.toString());
  if (event.status === "completed") {
    // fetch event.download_url
  } else {
    // event.step, event.reason
  }
  res.json({ ok: true });
});

app.listen(8000);`,
          },
          {
            label: "Go",
            language: "go",
            filename: "webhooks.go",
            code: `package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
)

var secret = []byte(os.Getenv("SPEECHREVOLUTIONS_WEBHOOK_SECRET"))

func verifySignature(rawBody []byte, signatureHeader string) bool {
	mac := hmac.New(sha256.New, secret)
	mac.Write(rawBody)
	expected := "sha256=" + hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(signatureHeader))
}

func receive(w http.ResponseWriter, r *http.Request) {
	raw, err := io.ReadAll(r.Body) // the exact bytes received
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
		// fetch event.DownloadURL
	} else {
		// event.Step, event.Reason
	}
	w.WriteHeader(http.StatusOK)
}

func main() {
	http.HandleFunc("/webhooks/stt", receive)
	log.Fatal(http.ListenAndServe(":8000", nil))
}`,
          },
          {
            label: "C#",
            language: "csharp",
            filename: "Program.cs",
            code: `using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

var app = WebApplication.CreateBuilder(args).Build();

var secret = Encoding.UTF8.GetBytes(
    Environment.GetEnvironmentVariable("SPEECHREVOLUTIONS_WEBHOOK_SECRET")!);

bool VerifySignature(byte[] rawBody, string? signatureHeader)
{
    using var hmac = new HMACSHA256(secret);
    var expected = "sha256=" + Convert.ToHexString(hmac.ComputeHash(rawBody)).ToLowerInvariant();
    return CryptographicOperations.FixedTimeEquals(
        Encoding.UTF8.GetBytes(expected),
        Encoding.UTF8.GetBytes(signatureHeader ?? ""));
}

app.MapPost("/webhooks/stt", async (HttpRequest request) =>
{
    using var ms = new MemoryStream();
    await request.Body.CopyToAsync(ms); // the exact bytes received
    var raw = ms.ToArray();

    if (!VerifySignature(raw, request.Headers["X-SR-Signature"]))
        return Results.Unauthorized();

    var evt = JsonDocument.Parse(raw).RootElement;
    if (evt.GetProperty("status").GetString() == "completed")
    {
        // fetch evt.GetProperty("download_url")
    }
    else
    {
        // evt.GetProperty("step"), evt.GetProperty("reason")
    }
    return Results.Ok();
});

app.Run();`,
          },
        ]}
      />

      <h2>Test your receiver locally</h2>
      <p>
        Sign a sample body with your secret and send it the way we would. A receiver that
        verifies correctly accepts this and rejects the same request with the body changed.
        (This tests your receiver only: real deliveries need the public URL above.)
      </p>
      <CodeBlock
        language="bash"
        code={`BODY='{"job_id":"test","status":"completed","download_url":"https://example.com/t.json"}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SPEECHREVOLUTIONS_WEBHOOK_SECRET" -hex | sed 's/^.* //')

curl -X POST http://localhost:8000/webhooks/stt \\
  -H "Content-Type: application/json" \\
  -H "X-SR-Signature: sha256=$SIG" \\
  --data "$BODY"`}
      />

      <h2>Rotate the secret</h2>
      <p>
        If the secret leaks, an owner or admin can choose <strong>Rotate</strong> on the same
        console card. Webhooks sent after that are signed with the new secret, and a receiver
        still using the old one rejects them — so update your receivers right after rotating.
        Every reveal and rotation is recorded in the organization&apos;s activity log.
      </p>
      <Callout title="Keep it server-side" tone="warn">
        <p>
          Anyone with the signing secret can forge webhooks that your receiver will accept.
          Keep it in your server&apos;s environment or secret manager, never in client-side code
          or a repository.
        </p>
      </Callout>

      <h2>Next steps</h2>
      <ul>
        <li>
          <Link href="/api-reference/jobs">Job lifecycle</Link>: fetch a job&apos;s status
          yourself, for example to reconcile after downtime.
        </li>
        <li>
          <Link href="/integrations/fastapi">FastAPI</Link>,{" "}
          <Link href="/integrations/django">Django</Link> and{" "}
          <Link href="/integrations/nextjs">Next.js</Link>: a receiver wired into a full app.
        </li>
        <li>
          <Link href="/cookbook#webhooks">Cookbook</Link>: batch submission with webhooks.
        </li>
      </ul>
    </>
  );
}
