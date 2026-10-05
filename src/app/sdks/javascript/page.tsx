import { CodeBlock } from "@/components/CodeBlock";
import { Callout } from "@/components/DocsUI";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "JavaScript SDK",
  description:
    "The official JavaScript and TypeScript client for the Speech Revolutions STT API. Promise-based, and runs on Node 18+ using native fetch.",
};

export default function JsSdkPage() {
  return (
    <>
      <h1>JavaScript / TypeScript SDK</h1>
      <p>
        The official JavaScript and TypeScript client for the Speech
        Revolutions STT API. Every method returns a promise. The SDK runs on
        Node 18+ and uses native <code>fetch</code>.
      </p>

      <p>
        Source on{" "}
        <a href="https://github.com/SpeechRevolutions/node-sdk">GitHub</a> &middot;{" "}
        <a href="https://github.com/SpeechRevolutions/node-sdk/issues">
          report an issue
        </a>{" "}
        &middot; <a href="https://www.npmjs.com/package/speechrevolutions">npm</a>
      </p>

      <h2>Install</h2>
      <CodeBlock language="bash" code={`npm install speechrevolutions`} />

      <h2>Quickstart</h2>
      <p>
        <code>transcribe()</code> accepts a local path, a URL, raw bytes, or a{" "}
        <code>Blob</code>. With the default <code>outputType: "json"</code>,
        the SDK parses the response into a result object.
      </p>
      <CodeBlock
        language="ts"
        filename="transcribe.ts"
        code={`import { SpeechRevolutions } from "speechrevolutions";

const client = new SpeechRevolutions(); // SPEECHREVOLUTIONS_API_KEY
const result = await client.transcribe("meeting.mp3", { speakerLabels: true });

console.log(result.text);
for (const u of result.utterances) {
  console.log(\`\${u.speaker}: \${u.text}\`);
}`}
      />

      <h2>From a URL or file</h2>
      <p>
        <code>transcribe()</code> detects <code>http(s)</code> URLs
        automatically. Use the <code>transcribeUrl()</code> alias to make the
        source explicit.
      </p>
      <CodeBlock
        language="ts"
        code={`// auto-detected
const result = await client.transcribe("https://example.com/audio.mp3");

// explicit alias
const result2 = await client.transcribeUrl("https://example.com/audio.mp3");`}
      />

      <h2>Options</h2>
      <p>
        Pass options as the second argument. <code>diarize</code> is an alias
        for <code>speakerLabels</code>.
      </p>
      <CodeBlock
        language="ts"
        code={`await client.transcribe("a.mp3", {
  diarize: true,        // alias for speakerLabels
  outputType: "srt",
  wordTimestamps: true,
  customVocabulary: ["AcmeCorp"],
});`}
      />
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Option</th>
              <th>Type</th>
              <th>Default</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>outputType</code>
              </td>
              <td>
                <code>&quot;txt&quot; | &quot;json&quot; | &quot;srt&quot; | &quot;vtt&quot; | &quot;docx&quot; | &quot;pdf&quot;</code>
              </td>
              <td>
                <code>&quot;json&quot;</code>
              </td>
            </tr>
            <tr>
              <td>
                <code>wordTimestamps</code>
              </td>
              <td>
                <code>boolean</code>
              </td>
              <td>
                <code>true</code>
              </td>
            </tr>
            <tr>
              <td>
                <code>speakerLabels</code>
              </td>
              <td>
                <code>boolean</code>
              </td>
              <td>
                <code>true</code>
              </td>
            </tr>
            <tr>
              <td>
                <code>diarize</code>
              </td>
              <td>
                <code>boolean</code> (alias for <code>speakerLabels</code>)
              </td>
              <td>—</td>
            </tr>
            <tr>
              <td>
                <code>nltk</code>
              </td>
              <td>
                <code>boolean</code> (punctuation &amp; capitalization)
              </td>
              <td>
                <code>true</code>
              </td>
            </tr>
            <tr>
              <td>
                <code>tier</code>
              </td>
              <td>
                <code>&quot;standard&quot;</code>
              </td>
              <td>
                <code>&quot;standard&quot;</code>
              </td>
            </tr>
            <tr>
              <td>
                <code>customVocabulary</code>
              </td>
              <td>
                <code>string[]</code>
              </td>
              <td>
                <code>undefined</code>
              </td>
            </tr>
            <tr>
              <td>
                <code>language</code>
              </td>
              <td>
                <code>string</code>
              </td>
              <td>
                <code>undefined</code>
              </td>
            </tr>
            <tr>
              <td>
                <code>onProgress</code>
              </td>
              <td>
                <code>(event: ProgressEvent) =&gt; void</code>
              </td>
              <td>
                <code>undefined</code>
              </td>
            </tr>
            <tr>
              <td>
                <code>onUploadProgress</code>
              </td>
              <td>
                <code>(event: ProgressEvent) =&gt; void</code>
              </td>
              <td>
                <code>undefined</code>
              </td>
            </tr>
            <tr>
              <td>
                <code>progress</code>
              </td>
              <td>
                <code>boolean</code> (render console bars)
              </td>
              <td>
                <code>false</code>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        <code>tier</code>: <code>standard</code> is the only tier currently
        available.
      </p>
      <p>
        <code>language</code>: an ISO 639-1 code (e.g. <code>&quot;en&quot;</code>) skips
        language detection and transcribes the whole file in that language. Leave it unset
        to detect the language automatically. See{" "}
        <Link href="/cookbook#pin-language">pinning the language</Link>.
      </p>

      <h2>Live progress</h2>
      <p>
        The SDK reports progress for <strong>both</strong> the file upload and
        the transcription, as a console bar, a callback, or both. When you
        enable both, the bars render <em>and</em> your callbacks fire for every
        event.
      </p>
      <p>
        Files under about 3 MiB may report no transcription progress before
        they complete. Expect the bar to jump from the end of the upload to
        done.
      </p>
      <CodeBlock
        language="ts"
        code={`// 1. Console bars — an "Uploading" byte bar, then a "Transcribing" bar,
//    rendered to stderr on a single carriage-return-updated line.
await client.transcribe("meeting.mp3", { progress: true });

// 2. Programmatic — read event.percent (0-100, undefined until total is known)
await client.transcribe("meeting.mp3", {
  onProgress(event) {
    // transcription: event.step is e.g. "transcribe"
    console.log(event.percent, event.step);
  },
  onUploadProgress(event) {
    // upload: event.step === "upload"; completed / total are bytes
    console.log("upload", event.percent);
  },
});

// onProgress may also be passed as a 3rd positional argument.`}
      />
      <p>
        Each <code>ProgressEvent</code> carries <code>completed</code>,{" "}
        <code>total</code>, <code>step</code>, and a computed{" "}
        <code>percent</code> (0–100, or <code>undefined</code> when the total
        is not yet known).
      </p>
      <p>
        For a web UI, see{" "}
        <Link href="/guides/live-progress">Live progress for web apps</Link>.
        It combines both callbacks into a single 0–100 bar for your frontend.
      </p>

      <h2>Result shape</h2>
      <p>
        With <code>outputType: "json"</code>, the SDK returns a{" "}
        <code>Transcript</code> object:
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
                <code>result.toDeepgram()</code>
              </td>
              <td>Deepgram-shaped object, for migrations</td>
            </tr>
            <tr>
              <td>
                <code>result.toDict()</code>
              </td>
              <td>Normalized JSON object</td>
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
        language="ts"
        code={`const dg = result.toDeepgram();
console.log(dg.results.channels[0].alternatives[0].transcript);

// save() appends the output type when the path has no extension.
// Returns the written path.
const path = await result.save("output"); // -> "output.json"`}
      />

      <h2>Webhooks</h2>
      <p>
        Pass <code>callbackUrl</code> to get notified when a job finishes
        instead of holding the call open. Use this for server and background
        workloads. When the job completes or fails permanently, Speech
        Revolutions sends a signed JSON <code>POST</code> to your URL:
      </p>
      <CodeBlock
        language="ts"
        code={`await client.transcribe("meeting.mp3", {
  callbackUrl: "https://you.example.com/hook",
});`}
      />
      <p>
        The POST body is{" "}
        <code>
          {`{ job_id, status: "completed"|"failed", download_url?, step?, reason? }`}
        </code>
        . It is signed with HMAC-SHA256 over the raw body, in the{" "}
        <code>X-SR-Signature: sha256=&lt;hex&gt;</code> header. The request
        also carries <code>X-SR-Event</code> (the status) and a unique{" "}
        <code>X-SR-Delivery</code> ID. Verify the signature against the{" "}
        <em>raw</em> body bytes, and use a constant-time comparison. Copy your
        signing secret from the console (
        <strong>API Keys → Webhook signing secret</strong>) into{" "}
        <code>SPEECHREVOLUTIONS_WEBHOOK_SECRET</code>. The{" "}
        <Link href="/guides/webhooks">webhooks guide</Link> covers the payload,
        retries, and secret rotation.
      </p>
      <CodeBlock
        language="ts"
        filename="webhooks.ts"
        code={`import { createHmac, timingSafeEqual } from "node:crypto";

export function verifySignature(rawBody, signatureHeader, signingSecret) {
  const expected =
    "sha256=" + createHmac("sha256", signingSecret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader ?? "");
  return a.length === b.length && timingSafeEqual(a, b);
}

// Express handler — capture the RAW body for verification.
// app.post(
//   "/webhooks/speechrevolutions",
//   express.raw({ type: "application/json" }),
//   (req, res) => {
//     if (!verifySignature(req.body, req.get("X-SR-Signature"), SECRET))
//       return res.status(401).send("bad signature");
//     const event = JSON.parse(req.body.toString());
//     if (event.status === "completed") {
//       // mark done; fetch event.download_url
//     } else {
//       // event.step, event.reason
//     }
//     res.json({ ok: true }); // a 2xx acks delivery (we retry on 5xx)
//   },
// );`}
      />

      <h2>Retrieve results later</h2>
      <p>
        Fetch a job by ID at any time, for example after a webhook arrives or
        after your service restarts. The download URL is generated on each
        request, so you can fetch results long after the original upload.
      </p>
      <CodeBlock
        language="ts"
        filename="retrieve.ts"
        code={`// Get a job's current status ("processing" | "completed" | "failed")
const status = await client.getJobStatus(jobId);
console.log(status.status);

if (status.status === "completed") {
  const result = await client.getTranscript(jobId); // downloads + parses
  console.log(result.text);
} else if (status.status === "failed") {
  console.log(status.failedStage, status.reason);
}

// List most-recent jobs (newest first), cursor-paginated
const page = await client.listJobs({ limit: 50 });
console.log(page.jobs, page.nextBefore);
for (const job of page.jobs) console.log(job.jobId, job.createdAt);`}
      />

      <h2>Robustness</h2>
      <p>
        Configure retries, backoff, and low-level request options on the
        client. The SDK retries <code>429</code>, <code>5xx</code>, and network
        errors automatically and honors the <code>Retry-After</code> header.
      </p>
      <CodeBlock
        language="ts"
        code={`import { ProxyAgent } from "undici";

// Any fetch option can be passed through; a dispatcher is how undici proxies.
const dispatcher = new ProxyAgent("http://proxy.internal:8080");

const client = new SpeechRevolutions({
  maxRetries: 3,
  retryBackoffMs: 500,  // exponential
  requestInit: { dispatcher },
});`}
      />
      <p>
        Errors are typed. Each carries a <code>.statusCode</code> and the
        server&apos;s <code>.requestId</code>. Include the request ID when you
        contact support.
      </p>
      <CodeBlock
        language="ts"
        code={`import { RateLimitError, AuthenticationError } from "speechrevolutions";

try {
  const result = await client.transcribe("meeting.mp3");
} catch (err) {
  if (err instanceof RateLimitError) {
    console.log(err.statusCode, err.requestId); // e.g. 429 "req_..."
  }
}`}
      />

      <h2>Authentication</h2>
      <p>The SDK reads your API key from the environment:</p>
      <CodeBlock
        language="bash"
        code={`export SPEECHREVOLUTIONS_API_KEY=stt_...`}
      />
      <p>Or pass it explicitly:</p>
      <CodeBlock
        language="ts"
        code={`const client = new SpeechRevolutions({ apiKey: "stt_..." });
// or the shorthand
const client2 = new SpeechRevolutions("stt_...");`}
      />

      <Callout title="Under the hood" tone="info">
        <p>
          The SDK streams the upload in chunks. It then listens on the{" "}
          <Link href="/api-reference/jobs">SSE job stream</Link> and converts
          the <code>completed</code> and <code>total</code> counts into{" "}
          <code>percent</code>.
        </p>
      </Callout>
    </>
  );
}
