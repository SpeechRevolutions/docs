import { CodeBlock } from "@/components/CodeBlock";
import { CodeTabs } from "@/components/CodeTabs";
import { Callout, EndpointBadge } from "@/components/DocsUI";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Jobs API",
  description:
    "Wait for a result, retrieve a job by id, list recent jobs, or cancel one.",
};

export default function JobsApiPage() {
  return (
    <>
      <h1>Jobs API</h1>
      <p>
        Look up a job by id, list recent jobs, follow one to completion, or cancel it. The SDKs
        wrap every call here; the endpoints and response shapes are listed for reference.
      </p>

      <h2>Retrieve a job</h2>
      <EndpointBadge method="GET" path="/api/v1/jobs/{job_id}" />
      <p>
        Returns a job&apos;s current status plus a freshly-generated{" "}
        <code>download_url</code> once it has completed — valid even long after
        the original upload response.
      </p>
      <CodeTabs
        tabs={[
          {
            label: "Python",
            language: "python",
            code: `status = client.get_job_status(job_id)
if status.is_completed:
    result = client.get_transcript(job_id)
    print(result.text)
elif status.is_failed:
    print(status.failed_stage, status.reason)`,
          },
          {
            label: "JavaScript",
            language: "ts",
            code: `const status = await client.getJobStatus(jobId);
if (status.status === "completed") {
  const result = await client.getTranscript(jobId);
  console.log(result.text);
} else if (status.status === "failed") {
  console.log(status.failedStage, status.reason);
}`,
          },
          {
            label: "Go",
            language: "go",
            code: `status, err := client.GetJobStatus(ctx, jobID)
if err != nil {
	log.Fatal(err)
}
if status.IsCompleted() {
	result, err := client.GetTranscript(ctx, jobID, stt.OutputJSON)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println(result.Text())
}`,
          },
          {
            label: "C#",
            language: "csharp",
            code: `var status = await client.GetJobStatusAsync(jobId);
if (status.IsCompleted)
{
    var result = await client.GetTranscriptAsync(jobId);
    Console.WriteLine(result.Text);
}`,
          },
        ]}
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
        back the previous page&apos;s <code>next_before</code>).
      </p>
      <CodeTabs
        tabs={[
          {
            label: "Python",
            language: "python",
            code: `page = client.list_jobs(limit=50)
for job in page["jobs"]:
    print(job["job_id"], job["created_at"])
older = client.list_jobs(limit=50, before=page["next_before"])  # next page`,
          },
          {
            label: "JavaScript",
            language: "ts",
            code: `const page = await client.listJobs({ limit: 50 });
for (const job of page.jobs) console.log(job.jobId, job.createdAt);
// next page: client.listJobs({ limit: 50, before: page.nextBefore ?? undefined })`,
          },
          {
            label: "Go",
            language: "go",
            code: `page, err := client.ListJobs(ctx, 50, "")
if err != nil {
	log.Fatal(err)
}
for _, job := range page.Jobs {
	fmt.Println(job.JobID, job.CreatedAt)
}
// next page: client.ListJobs(ctx, 50, page.NextBefore)`,
          },
          {
            label: "C#",
            language: "csharp",
            code: `var page = await client.ListJobsAsync(limit: 50);
foreach (var job in page.Jobs)
    Console.WriteLine($"{job.JobId} {job.CreatedAt}");
// next page: await client.ListJobsAsync(50, page.NextBefore)`,
          },
        ]}
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
        A Server-Sent Events stream of a job&apos;s progress, ending in its result. You rarely
        open it yourself: the SDKs follow it inside <code>transcribe()</code>, reconnect with{" "}
        <code>Last-Event-ID</code> if the connection drops, and report progress through the{" "}
        <a href="/guides/live-progress">progress callbacks</a>.
      </p>

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
      </div>

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
      <CodeTabs
        tabs={[
          { label: "Python", language: "python", code: `client.cancel_job(job_id)` },
          { label: "JavaScript", language: "ts", code: `await client.cancelJob(jobId);` },
          { label: "Go", language: "go", code: `err := client.CancelJob(ctx, jobID)` },
          { label: "C#", language: "csharp", code: `await client.CancelJobAsync(jobId);` },
        ]}
      />
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
