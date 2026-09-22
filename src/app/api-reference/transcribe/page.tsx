import { CodeBlock } from "@/components/CodeBlock";
import { Callout, EndpointBadge } from "@/components/DocsUI";
import { SITE } from "@/lib/constants";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Transcribe API",
  description:
    "One-shot streaming upload for shells and simple scripts. Same transcription options as upload — no separate progress/complete steps.",
};

export default function TranscribeApiPage() {
  return (
    <>
      <h1>Transcribe API (terminal)</h1>
      <p>
        One-shot streaming upload for shells and simple scripts. Same
        transcription options as upload — no separate progress/complete steps.
      </p>

      <EndpointBadge method="POST" path="/api/v1/transcribe" />

      <Callout title="Designed for cURL" tone="tip">
        <p>
          Prefer this endpoint from the terminal. Prefer the{" "}
          <Link href="/sdks/python">SDK</Link> (upload flow) in application
          code.
        </p>
      </Callout>

      <h2>Request</h2>
      <p>
        The request <strong>body is the raw audio bytes</strong>; transcription
        options are query parameters (same names and semantics as{" "}
        <Link href="/api-reference/upload">upload</Link>). Sending the body raw
        lets the server stream it straight to storage without buffering the whole
        file.
      </p>
      <CodeBlock
        language="bash"
        code={`curl -N -X POST \\
  "${SITE.apiBase}/api/v1/transcribe?output_type=json&word_timestamps=true&speaker_labels=true&nltk=true&custom_vocabulary=AcmeCorp,Grok" \\
  -H "X-API-Key: $SPEECHREVOLUTIONS_API_KEY" \\
  --data-binary @audio.mp3`}
      />

      <h2>Behavior</h2>
      <ol>
        <li>Client streams the raw audio bytes as the request body.</li>
        <li>
          The server streams the upload to storage, enqueues the job, then
          streams the job&apos;s SSE progress on the same response — identical in
          shape to the <Link href="/api-reference/jobs">Jobs SSE stream</Link>{" "}
          (<code>progress</code> events carrying <code>completed</code>/
          <code>total</code>/<code>step</code>).
        </li>
        <li>
          On success it emits a terminal <code>completed</code> event with a{" "}
          <code>download_url</code>; fetch that to retrieve the result.
        </li>
      </ol>

      <h2>Progress events</h2>
      <CodeBlock
        language="text"
        code={`event: progress
data: {"completed": 0, "total": 8, "step": "preprocess"}

event: progress
data: {"completed": 3, "total": 8, "step": "chunk:0"}

event: progress
data: {"completed": 8, "total": 8, "step": "aggregation"}

event: completed
data: {"job_id":"…","download_url":"https://…","output_type":"json"}`}
      />

      <h2>Errors</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Meaning</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>401</code>
              </td>
              <td>Unauthorized</td>
            </tr>
            <tr>
              <td>
                <code>413</code>
              </td>
              <td>File too large for this route</td>
            </tr>
            <tr>
              <td>
                <code>429</code>
              </td>
              <td>Rate limited</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>
        Guide: <Link href="/guides/terminal">Terminal & cURL</Link>
      </p>
    </>
  );
}
