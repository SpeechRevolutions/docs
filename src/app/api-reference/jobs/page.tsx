import { CodeBlock } from "@/components/CodeBlock";
import { Callout, EndpointBadge } from "@/components/DocsUI";
import { SITE } from "@/lib/constants";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Jobs API",
};

export default function JobsApiPage() {
  return (
    <>
      <h1>Jobs API</h1>
      <p>
        Used primarily by the SDK after <code>/upload/complete</code> to wait
        for a result, retrieve a job by id, or list recent jobs. These are the
        real user-cluster job endpoints.
      </p>

      <h2>Retrieve a job</h2>
      <EndpointBadge method="GET" path="/api/v1/jobs/{job_id}" />
      <p>
        Returns a job&apos;s current status plus a freshly-generated{" "}
        <code>download_url</code> once it has completed — valid even long after
        the original upload response. Backs the SDK&apos;s{" "}
        <code>get_job_status</code> / <code>getJobStatus</code> /{" "}
        <code>GetJobStatus</code> / <code>GetJobStatusAsync</code> and{" "}
        <code>get_transcript</code> methods.
      </p>
      <CodeBlock
        language="bash"
        code={`curl "${SITE.apiBase}/api/v1/jobs/$JOB_ID" \\
  -H "X-API-Key: $SPEECHREVOLUTIONS_API_KEY"`}
      />
      <p>
        Response (<code>JobStatusResponse</code>):
      </p>
      <CodeBlock
        language="json"
        code={`{
  "job_id": "…",
  "status": "completed",          // processing | completed | failed
  "download_url": "https://…",    // present when status is "completed"
  "failed_stage": null,           // present when status is "failed"
  "reason": null                  // present when status is "failed"
}`}
      />

      <h2>List jobs</h2>
      <EndpointBadge method="GET" path="/api/v1/jobs" />
      <p>
        The caller&apos;s most-recent jobs (newest first), cursor-paginated.
        Query params: <code>limit</code> (default 50, 1–100) and{" "}
        <code>before</code> (an ISO-8601 <code>created_at</code> cursor — pass
        back the previous page&apos;s <code>next_before</code>). Backs the
        SDK&apos;s <code>list_jobs</code> / <code>listJobs</code> /{" "}
        <code>ListJobs</code> / <code>ListJobsAsync</code>.
      </p>
      <CodeBlock
        language="bash"
        code={`curl "${SITE.apiBase}/api/v1/jobs?limit=50" \\
  -H "X-API-Key: $SPEECHREVOLUTIONS_API_KEY"`}
      />
      <p>
        Response (<code>JobListResponse</code>):
      </p>
      <CodeBlock
        language="json"
        code={`{
  "jobs": [
    { "job_id": "…", "created_at": "2026-07-22T18:01:00Z" }
  ],
  "next_before": "2026-07-22T18:01:00Z"   // null on the last page
}`}
      />

      <h2>SSE stream</h2>
      <EndpointBadge method="GET" path="/api/v1/jobs/{job_id}/stream" />
      <p>
        Open a Server-Sent Events stream for a job. Reconnect with the{" "}
        <code>Last-Event-ID</code> header to resume without missing events.
      </p>
      <CodeBlock
        language="bash"
        code={`curl -N "${SITE.apiBase}/api/v1/jobs/$JOB_ID/stream" \\
  -H "X-API-Key: $SPEECHREVOLUTIONS_API_KEY" \\
  -H "Accept: text/event-stream"`}
      />

      <h3>Events</h3>
      <p>
        The stream emits three event types: <code>progress</code> (repeated),
        then a terminal <code>completed</code> or <code>failed</code>. The{" "}
        <code>step</code> name depends on how the file was routed: small files
        skip straight to a <code>chunk:N</code> step; larger files start with{" "}
        <code>preprocess</code>, then either a single <code>chunk:0</code> (short
        audio) or multiple <code>chunk:0</code>, <code>chunk:1</code>, … steps
        (long audio, one per split chunk) followed by <code>aggregation</code>.
      </p>
      <CodeBlock
        language="text"
        filename="stream"
        code={`event: progress
data: {"completed": 0, "total": 8, "step": "preprocess"}

event: progress
data: {"completed": 3, "total": 8, "step": "chunk:0"}

event: progress
data: {"completed": 8, "total": 8, "step": "aggregation"}

event: completed
data: {"job_id": "…", "download_url": "https://…", "output_type": "json"}`}
      />
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
              <code>progress</code>
            </td>
            <td>
              <code>{`{"completed": <int>, "total": <int>, "step": "<name>"}`}</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>completed</code>
            </td>
            <td>
              Terminal success; data may include a <code>download_url</code> and
              job metadata
            </td>
          </tr>
          <tr>
            <td>
              <code>failed</code>
            </td>
            <td>
              Terminal failure; <code>{`{"step": "<name>", "reason": "<msg>"}`}</code>
            </td>
          </tr>
        </tbody>
      </table>

      <Callout title="completed / total → percent" tone="tip">
        <p>
          The <code>progress</code> payload carries raw{" "}
          <code>completed</code> and <code>total</code> step counts — not a
          percentage. A percentage is a client-side convenience: the official
          SDKs compute <code>percent = completed / total × 100</code> and
          surface it as <code>ProgressEvent.percent</code> (which is undefined
          while <code>total</code> is still unknown). See any{" "}
          <a href="/sdks/python">SDK page</a> for the live-progress callbacks.
        </p>
      </Callout>

      <h2>Cancel</h2>
      <EndpointBadge method="POST" path="/api/v1/jobs/cancel" />
      <CodeBlock language="json" code={`{"job_id": "…"}`} />
      <p>
        You can only cancel a job that hasn&apos;t already been processed, and
        only for the portion that hasn&apos;t been processed yet. If a job is
        already substantially complete when your cancellation is received — say
        most of the audio has been transcribed — we reserve the right to bill
        for the work already done.
      </p>

      <h2>Check failed</h2>
      <EndpointBadge method="POST" path="/api/v1/jobs/check-failed" />
      <CodeBlock language="json" code={`{"job_ids": ["…", "…"]}`} />
      <p>
        Response: <code>{`{"failed_jobs": [true, false]}`}</code>
      </p>
    </>
  );
}
