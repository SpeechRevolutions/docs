import { CodeBlock } from "@/components/CodeBlock";
import { Callout, EndpointBadge } from "@/components/DocsUI";
import { SITE } from "@/lib/constants";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terminal & cURL",
};

export default function TerminalGuidePage() {
  return (
    <>
      <h1>Terminal & cURL</h1>
      <p>
        For shell scripts and one-off jobs, use{" "}
        <code>POST /api/v1/transcribe</code>. You stream the audio file in a
        single request; the server responds with percentage-style progress until
        transcription finishes, then returns the result.
      </p>

      <EndpointBadge method="POST" path="/api/v1/transcribe" />

      <Callout title="When to use this" tone="tip">
        <p>
          Use <code>/transcribe</code> from terminals and simple scripts. Use
          the <Link href="/sdks/python">SDK</Link> (
          <code>/api/v1/upload</code> flow) inside applications — it handles
          large uploads, heartbeats, and SSE reconnects for you.
        </p>
      </Callout>

      <h2>Basic example</h2>
      <CodeBlock
        language="bash"
        filename="transcribe.sh"
        code={`export SPEECHREVOLUTIONS_API_KEY=stt_...

curl -N -X POST "${SITE.apiBase}/api/v1/transcribe" \\
  -H "X-API-Key: $SPEECHREVOLUTIONS_API_KEY" \\
  -F "file=@./meeting.mp3" \\
  -F "output_type=json" \\
  -F "word_timestamps=true" \\
  -F "speaker_labels=true" \\
  -F "nltk=true" \\
  -F "tier=standard"`}
      />

      <p>
        The <code>-N</code> flag disables buffering so progress events stream as
        they arrive.
      </p>

      <h2>Form fields</h2>
      <p>
        Same options as <Link href="/api-reference/upload">upload</Link>, plus
        the file body:
      </p>
      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Type</th>
            <th>Default</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>file</code>
            </td>
            <td>file</td>
            <td>required</td>
            <td>Audio/video bytes (multipart)</td>
          </tr>
          <tr>
            <td>
              <code>output_type</code>
            </td>
            <td>string</td>
            <td>
              <code>json</code>
            </td>
            <td>
              <code>txt | json | srt | vtt | docx | pdf</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>word_timestamps</code>
            </td>
            <td>bool</td>
            <td>
              <code>true</code>
            </td>
            <td>Per-word timing</td>
          </tr>
          <tr>
            <td>
              <code>speaker_labels</code>
            </td>
            <td>bool</td>
            <td>
              <code>true</code>
            </td>
            <td>Diarization</td>
          </tr>
          <tr>
            <td>
              <code>nltk</code>
            </td>
            <td>bool</td>
            <td>
              <code>true</code>
            </td>
            <td>Punctuation / cleanup</td>
          </tr>
          <tr>
            <td>
              <code>tier</code>
            </td>
            <td>string</td>
            <td>
              <code>standard</code>
            </td>
            <td>
              <code>standard</code> — the only tier currently available
            </td>
          </tr>
          <tr>
            <td>
              <code>custom_vocabulary</code>
            </td>
            <td>string</td>
            <td>—</td>
            <td>Comma-separated terms (optional)</td>
          </tr>
        </tbody>
      </table>

      <h2>Progress stream</h2>
      <p>
        While the job runs, the response body streams events similar to:
      </p>
      <CodeBlock
        language="text"
        filename="stream"
        code={`event: progress
data: {"percent": 12, "step": "preprocess"}

event: progress
data: {"percent": 48, "step": "transcribe"}

event: progress
data: {"percent": 91, "step": "aggregate"}

event: completed
data: {"download_url": "https://...", "job_id": "..."}`}
      />
      <p>
        Unlike the SDK upload flow, there is no separate{" "}
        <code>/upload/progress</code> or <code>/upload/complete</code> step —
        the file upload and job wait happen on one connection.
      </p>

      <p>
        Full field reference:{" "}
        <Link href="/api-reference/transcribe">API → Transcribe</Link>.
      </p>
    </>
  );
}
