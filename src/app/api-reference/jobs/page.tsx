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
  "llm_download_url": null,       // refined transcript, only for jobs with LLM post-processing
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
        The stream emits <code>progress</code> events (zero or more), then one terminal{" "}
        <code>completed</code> or <code>failed</code> event, after which the server closes it.
        Each event carries an <code>id:</code>; send the last one back as{" "}
        <code>Last-Event-ID</code> when you reconnect. Lines starting with <code>:</code> are
        keep-alive comments; ignore them.
      </p>
      <p>
        A <code>progress</code> event is sent as each step <em>finishes</em>, so the first one
        you see already has <code>completed</code> of at least 1. The <code>step</code> names
        depend on how the file was routed:
      </p>
      <ul>
        <li>
          <strong>Files under about 3 MiB</strong> go straight to the GPU as one chunk. They
          usually finish in seconds and may send <strong>no</strong> <code>progress</code>{" "}
          event at all before <code>completed</code>.
        </li>
        <li>
          <strong>Larger files</strong> start with <code>preprocess</code>. Short audio is then
          one <code>chunk:0</code>; long audio is split into several <code>chunk:N</code> steps,
          which finish in whatever order the workers do, followed by{" "}
          <code>aggregation</code>.
        </li>
      </ul>
      <p>
        <code>total</code> depends on how many chunks the audio was split into, so read it
        from each event rather than hard-coding it. A 44-minute file, as streamed:
      </p>
      <CodeBlock
        language="text"
        filename="stream"
        code={`id: 1791179526032-0
event: progress
data: {"completed": 1, "total": 7, "step": "preprocess"}

id: 1791179533242-0
event: progress
data: {"completed": 2, "total": 7, "step": "chunk:0"}

id: 1791179542519-0
event: progress
data: {"completed": 3, "total": 7, "step": "chunk:4"}

…

id: 1791179547620-0
event: progress
data: {"completed": 7, "total": 7, "step": "aggregation"}

id: 1791179547725-0
event: completed
data: {"download_url": "https://…"}`}
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
                Terminal success: <code>{`{"download_url": "<url>"}`}</code>, a presigned
                link to the result. You already know the <code>job_id</code> (it is in the
                path).
              </td>
            </tr>
            <tr>
              <td>
                <code>failed</code>
              </td>
              <td>
                Terminal failure: <code>{`{"step": "<name>", "reason": "<msg>"}`}</code>, e.g.{" "}
                <code>{`{"step": "user", "reason": "cancelled_by_user"}`}</code> after a cancel
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Open the stream for a job that has already finished and it replays from the start:
        the progress events the job sent, then the terminal one.
      </p>

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
