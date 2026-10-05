import { CodeBlock } from "@/components/CodeBlock";
import { Callout, EndpointBadge } from "@/components/DocsUI";
import { SITE } from "@/lib/constants";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terminal & cURL",
  description:
    "For shell scripts and one-off jobs, use POST /api/v1/transcribe. You stream the raw audio bytes as the request body (options go in the query string); the…",
};

export default function TerminalGuidePage() {
  return (
    <>
      <h1>Terminal & cURL</h1>
      <p>
        For shell scripts and one-off jobs, use{" "}
        <code>POST /api/v1/transcribe</code>. Send the raw audio bytes as the
        request body and the options in the query string. The server keeps the
        connection open and streams job progress back as SSE until the
        transcript is ready.
      </p>

      <EndpointBadge method="POST" path="/api/v1/transcribe" />

      <Callout title="When to use this" tone="tip">
        <p>
          Use <code>/transcribe</code> from terminals and simple scripts. Inside
          applications, use an <Link href="/sdks/python">SDK</Link>: it handles
          large uploads, retries, and reconnects for you.
        </p>
      </Callout>

      <h2>Basic example</h2>
      <CodeBlock
        language="bash"
        filename="transcribe.sh"
        code={`export SPEECHREVOLUTIONS_API_KEY=stt_...

curl -N -X POST \\
  "${SITE.apiBase}/api/v1/transcribe?output_type=json&word_timestamps=true&speaker_labels=true&nltk=true" \\
  -H "X-API-Key: $SPEECHREVOLUTIONS_API_KEY" \\
  --data-binary @./meeting.mp3`}
      />

      <p>
        The <code>-N</code> flag disables buffering so progress events stream as
        they arrive. <code>--data-binary</code> sends the file bytes unmodified
        as the request body.
      </p>

      <h2>Query parameters</h2>
      <p>
        Pass options in the query string; the request body is the raw audio.
        The options are the same as for{" "}
        <Link href="/api-reference/upload">upload</Link>:
      </p>
      <div className="table-scroll">
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
              <td>Start and end time of each word</td>
            </tr>
            <tr>
              <td>
                <code>speaker_labels</code>
              </td>
              <td>bool</td>
              <td>
                <code>true</code>
              </td>
              <td>Speaker diarization</td>
            </tr>
            <tr>
              <td>
                <code>nltk</code>
              </td>
              <td>bool</td>
              <td>
                <code>true</code>
              </td>
              <td>Restore punctuation and capitalization</td>
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
            <tr>
              <td>
                <code>language</code>
              </td>
              <td>string</td>
              <td>auto</td>
              <td>
                ISO 639-1 code (e.g. <code>en</code>) to skip language detection; see{" "}
                <Link href="/cookbook#pin-language">pinning the language</Link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>Progress stream</h2>
      <p>
        While the job runs, the response body streams events. Progress is
        reported as <strong>steps completed out of a total</strong>, not as a
        percentage. Divide the two to get one:
      </p>
      <CodeBlock
        language="text"
        filename="stream"
        code={`event: accepted
data: {"job_id": "...", "download_url": "https://...", "llm_download_url": null, "resume": "curl ..."}

event: progress
data: {"completed":1,"total":4,"step":"preprocess"}

event: progress
data: {"completed":2,"total":4,"step":"chunk:1"}

event: progress
data: {"completed":3,"total":4,"step":"chunk:0"}

event: progress
data: {"completed":4,"total":4,"step":"aggregation"}

event: completed
data: {"download_url": "https://..."}

event: transcript
data: <the transcript, one data: line per line of output>`}
      />
      <p>
        <code>total</code> is the number of processing steps for your file. It
        depends on how many chunks the audio is split into, so don&apos;t
        hard-code it. Chunk steps are named <code>chunk:N</code> and can arrive
        out of order because chunks are processed in parallel. A short file
        may emit no <code>progress</code> events at all and go straight from{" "}
        <code>accepted</code> to <code>completed</code>. Treat progress as
        advisory and detect completion with the <code>completed</code> event.
      </p>
      <p>
        There is no separate upload step: the upload and the wait for the
        transcript happen on one connection.
      </p>

      <p>
        Full field reference:{" "}
        <Link href="/api-reference/transcribe">API → Transcribe</Link>.
      </p>
    </>
  );
}
