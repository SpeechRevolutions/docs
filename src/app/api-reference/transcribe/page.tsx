import { CodeBlock } from "@/components/CodeBlock";
import { Callout, EndpointBadge } from "@/components/DocsUI";
import { SITE } from "@/lib/constants";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Transcribe API",
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
        <code>multipart/form-data</code> with the audio file and option fields
        (same semantics as <Link href="/api-reference/upload">upload</Link>):
      </p>
      <CodeBlock
        language="bash"
        code={`curl -N -X POST "${SITE.apiBase}/api/v1/transcribe" \\
  -H "X-API-Key: $SPEECHREVOLUTIONS_API_KEY" \\
  -F "file=@audio.mp3" \\
  -F "output_type=json" \\
  -F "word_timestamps=true" \\
  -F "speaker_labels=true" \\
  -F "nltk=true" \\
  -F "custom_vocabulary=AcmeCorp,Grok"`}
      />

      <h2>Behavior</h2>
      <ol>
        <li>Client streams the full audio file in the request body.</li>
        <li>
          Server processes the job and writes <strong>percentage-style</strong>{" "}
          progress events on the same HTTP response (
          <code>event: progress</code> with <code>percent</code>).
        </li>
        <li>
          On success, emits <code>event: completed</code> with{" "}
          <code>download_url</code> / job metadata (or attaches the result,
          depending on <code>output_type</code>).
        </li>
      </ol>

      <h2>Progress events</h2>
      <CodeBlock
        language="text"
        code={`event: progress
data: {"percent": 0, "step": "upload"}

event: progress
data: {"percent": 35, "step": "transcribe"}

event: progress
data: {"percent": 100, "step": "done"}

event: completed
data: {"job_id":"…","download_url":"https://…","output_type":"json"}`}
      />

      <h2>Errors</h2>
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

      <p>
        Guide: <Link href="/guides/terminal">Terminal & cURL</Link>
      </p>
    </>
  );
}
