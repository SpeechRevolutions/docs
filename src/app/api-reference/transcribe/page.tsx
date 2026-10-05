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
          The server streams the upload to storage, enqueues the job and sends an{" "}
          <code>accepted</code> event straight away, before any waiting. It carries the{" "}
          <code>job_id</code> (also in the <code>X-Job-Id</code> response header), a{" "}
          <code>download_url</code> and a ready-made <code>resume</code> command, so if your
          connection drops you can still fetch the job you started.
        </li>
        <li>
          It then forwards the job&apos;s <code>progress</code> events, identical to the{" "}
          <Link href="/api-reference/jobs">Jobs SSE stream</Link> (<code>completed</code>/
          <code>total</code>/<code>step</code>; the first one already has{" "}
          <code>completed</code> &ge; 1). Files under about 3 MiB go straight to the GPU and
          usually send none at all. Progress is best effort: when the server&apos;s stream pool
          is busy you get a <code>waiting</code> heartbeat with an ETA instead.
        </li>
        <li>
          On success it sends <code>completed</code> (data:{" "}
          <code>{`{"download_url": "…"}`}</code>), then a final <code>transcript</code> event
          whose data is the finished result in your <code>output_type</code>. Multi-line output
          is sent as one <code>data:</code> line per line, which SSE clients join back together.
        </li>
      </ol>

      <h2>Events</h2>
      <p>A short file, as streamed (URLs shortened):</p>
      <CodeBlock
        language="text"
        code={`event: accepted
data: {"job_id": "57dd9d88-676a-43e4-a96c-c31e68859f90", "download_url": "https://…", "llm_download_url": null, "resume": "curl -H \\"X-API-Key: $SPEECHREVOLUTIONS_API_KEY\\" ${SITE.apiBase}/api/v1/jobs/57dd9d88-676a-43e4-a96c-c31e68859f90"}

id: 1791179346392-0
event: completed
data: {"download_url": "https://…"}

event: transcript
data: {"words": [{"word": "Ребят,", "start": 0.12, "end": 0.34, "speaker": "SPEAKER_1", …}, …], …}`}
      />
      <p>A longer file also reports its steps between the two:</p>
      <CodeBlock
        language="text"
        code={`id: 1791179526032-0
event: progress
data: {"completed": 1, "total": 7, "step": "preprocess"}

id: 1791179533242-0
event: progress
data: {"completed": 2, "total": 7, "step": "chunk:0"}

…

id: 1791179547620-0
event: progress
data: {"completed": 7, "total": 7, "step": "aggregation"}`}
      />
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>accepted</code>
              </td>
              <td>
                <code>job_id</code>, <code>download_url</code>, <code>llm_download_url</code>,{" "}
                <code>resume</code>. Always first.
              </td>
            </tr>
            <tr>
              <td>
                <code>progress</code>
              </td>
              <td>
                <code>{`{"completed": <int>, "total": <int>, "step": "<name>"}`}</code>
              </td>
            </tr>
            <tr>
              <td>
                <code>waiting</code>
              </td>
              <td>Heartbeat while progress is unavailable; ignore it or show the ETA</td>
            </tr>
            <tr>
              <td>
                <code>completed</code>
              </td>
              <td>
                <code>{`{"download_url": "<url>"}`}</code>; the <code>transcript</code> event follows
              </td>
            </tr>
            <tr>
              <td>
                <code>transcript</code>
              </td>
              <td>The result itself, in the requested <code>output_type</code>. Last event.</td>
            </tr>
            <tr>
              <td>
                <code>failed</code>
              </td>
              <td>
                The job failed; <code>{`{"step": "<name>", "reason": "<msg>"}`}</code>. Last
                event.
              </td>
            </tr>
            <tr>
              <td>
                <code>timeout</code> / <code>error</code>
              </td>
              <td>
                The wait limit was reached, or the finished result could not be read back.
                Both carry <code>job_id</code> and <code>download_url</code>; fetch the result
                from there.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

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
                <code>422</code>
              </td>
              <td>
                Invalid query parameter, e.g. an unsupported <code>language</code> code
              </td>
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
