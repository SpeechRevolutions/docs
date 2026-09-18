import { CodeTabs } from "@/components/CodeTabs";
import { Callout } from "@/components/DocsUI";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Batch-transcribe thousands of files",
  description:
    "You have a backlog — thousands of recordings sitting in a bucket — and you want them all transcribed. The naive approach, calling transcribe() in a loop…",
};

export default function BatchTutorialPage() {
  return (
    <>
      <h1>Batch-transcribe thousands of files</h1>
      <p>
        You have a backlog — thousands of recordings sitting in a bucket — and
        you want them all transcribed. The naive approach, calling{" "}
        <code>transcribe()</code> in a loop, blocks on each file and holds a
        live connection open for the entire job. That doesn&apos;t scale. This
        tutorial shows the pattern that does: <strong>submit</strong> every file
        (with bounded concurrency), persist the returned job ids, then{" "}
        <strong>collect</strong> results separately by polling or via webhooks.
      </p>

      <h2>Why submit + collect beats N live connections</h2>
      <p>
        <code>transcribe()</code> is a convenience: it uploads, waits, and
        returns the transcript in one call — perfect for one file, wasteful for
        thousands. Each in-flight call keeps a long-lived connection open for
        the full duration of the transcription. Run a thousand of those at once
        and you&apos;re holding a thousand sockets, any one of which can drop and
        lose the result you were waiting on.
      </p>
      <p>
        <code>submit()</code> uploads the audio, enqueues the job, and returns a{" "}
        <code>job_id</code> immediately — no connection held while Speech Revolutions works.
        Once you have the ids, the work is durable: you can collect the results
        minutes or hours later, survive a restart, and retry a single file
        without redoing the batch. The upload is the only part that needs
        concurrency control; the transcription itself runs server-side.
      </p>

      <Callout title="The two phases" tone="tip">
        <p>
          <strong>Submit</strong> — upload + enqueue every file, bounded by a
          semaphore so you don&apos;t open thousands of uploads at once. Save the
          returned <code>job_id</code>s somewhere durable.{" "}
          <strong>Collect</strong> — fetch each transcript once its job
          completes, either by polling <code>get_job_status</code> /{" "}
          <code>get_transcript</code> or by having Speech Revolutions POST a{" "}
          <code>callback_url</code> when each job finishes.
        </p>
      </Callout>

      <h2>Step 1 — submit everything with bounded concurrency</h2>
      <p>
        Use the async client and gather all submissions behind a semaphore. The
        semaphore caps how many uploads run at once (tune it to your bandwidth);
        every task returns a <code>(path, job_id)</code> pair you persist before
        moving on. If a submission fails, record the error instead of the id so
        you can retry just that file.
      </p>
      <CodeTabs
        tabs={[
          {
            label: "Python",
            language: "python",
            filename: "submit.py",
            code: `import asyncio
import json

from speechrevolutions import AsyncSpeechRevolutions

CONCURRENCY = 16  # max simultaneous uploads — tune to your bandwidth


async def submit_all(paths: list[str]) -> dict[str, str]:
    """Submit every file; return {path: job_id}. Failures are recorded, not raised."""
    sem = asyncio.Semaphore(CONCURRENCY)
    job_ids: dict[str, str] = {}

    async with AsyncSpeechRevolutions() as client:
        async def submit_one(path: str) -> None:
            async with sem:  # only CONCURRENCY uploads in flight at once
                try:
                    job_id = await client.submit(path, speaker_labels=True)
                    job_ids[path] = job_id
                    print(f"submitted {path} -> {job_id}")
                except Exception as e:  # keep going; retry this file later
                    print(f"FAILED to submit {path}: {e}")

        await asyncio.gather(*(submit_one(p) for p in paths))

    return job_ids


if __name__ == "__main__":
    files = [line.strip() for line in open("files.txt") if line.strip()]
    ids = asyncio.run(submit_all(files))
    # Persist the ids BEFORE collecting — this is your durable checkpoint.
    with open("jobs.json", "w") as f:
        json.dump(ids, f, indent=2)
    print(f"submitted {len(ids)}/{len(files)} files; saved jobs.json")`,
          },
          {
            label: "JavaScript",
            language: "ts",
            filename: "submit.mjs",
            code: `import { writeFileSync, readFileSync } from "node:fs";
import { SpeechRevolutions } from "@speechrevolutions/stt";

const CONCURRENCY = 16;
const client = new SpeechRevolutions();

// A tiny semaphore: run tasks with at most \`limit\` in flight.
async function mapLimit(items, limit, fn) {
  const results = [];
  let i = 0;
  const workers = Array.from({ length: limit }, async () => {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return results;
}

const paths = readFileSync("files.txt", "utf8").split("\\n").filter(Boolean);

const pairs = await mapLimit(paths, CONCURRENCY, async (path) => {
  try {
    const jobId = await client.submit(path, { speakerLabels: true });
    console.log(\`submitted \${path} -> \${jobId}\`);
    return [path, jobId];
  } catch (e) {
    console.error(\`FAILED to submit \${path}: \${e.message}\`);
    return [path, null]; // retry this file later
  }
});

const jobIds = Object.fromEntries(pairs.filter(([, id]) => id));
writeFileSync("jobs.json", JSON.stringify(jobIds, null, 2));
console.log(\`submitted \${Object.keys(jobIds).length}/\${paths.length}; saved jobs.json\`);`,
          },
        ]}
      />

      <Callout title="Persist ids before collecting" tone="warn">
        <p>
          Write the job ids to durable storage (a file, a table, a queue) as
          soon as you have them, and only then start collecting. The ids are
          your recovery point: if collection crashes, you re-read them and pick
          up where you left off — you never re-upload. Speech Revolutions regenerates a
          job&apos;s download URL on demand, so results stay fetchable by id long
          after upload.
        </p>
      </Callout>

      <h2>Step 2 (option A) — collect by polling</h2>
      <p>
        Read back the ids and poll each job until it completes, then fetch the
        transcript. The async client with the same semaphore keeps the polling
        pressure bounded. <code>get_job_status</code> returns a status you check
        for <code>completed</code> / <code>failed</code>; <code>get_transcript</code>{" "}
        downloads and parses the result.
      </p>
      <CodeTabs
        tabs={[
          {
            label: "Python",
            language: "python",
            filename: "collect_poll.py",
            code: `import asyncio
import json

from speechrevolutions import AsyncSpeechRevolutions
from speechrevolutions.exceptions import JobFailedError

CONCURRENCY = 16
POLL_INTERVAL = 5.0  # seconds between status checks


async def collect_one(client: AsyncSpeechRevolutions, path: str, job_id: str, sem):
    async with sem:
        while True:
            status = await client.get_job_status(job_id)
            if status.is_completed:
                result = await client.get_transcript(job_id)  # downloads + parses
                result.save(f"transcripts/{path}")            # -> transcripts/<name>.json
                print(f"done {path}")
                return
            if status.is_failed:
                raise JobFailedError(f"{path} failed", step=status.failed_stage,
                                     reason=status.reason)
            await asyncio.sleep(POLL_INTERVAL)


async def collect_all(job_ids: dict[str, str]) -> None:
    sem = asyncio.Semaphore(CONCURRENCY)
    async with AsyncSpeechRevolutions() as client:
        await asyncio.gather(
            *(collect_one(client, path, jid, sem) for path, jid in job_ids.items()),
            return_exceptions=True,  # one failure doesn't sink the batch
        )


if __name__ == "__main__":
    job_ids = json.load(open("jobs.json"))
    asyncio.run(collect_all(job_ids))`,
          },
        
          {
            label: "JavaScript",
            language: "ts",
            filename: "collect.mjs",
            code: `import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { SpeechRevolutions, JobFailedError } from "@speechrevolutions/stt";

const CONCURRENCY = 16;
const POLL_INTERVAL_MS = 5000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function collectOne(client, filePath, jobId) {
  for (;;) {
    const status = await client.getJobStatus(jobId);
    if (status.isCompleted) {
      const result = await client.getTranscript(jobId); // downloads + parses
      await mkdir("transcripts", { recursive: true });
      await writeFile(
        path.join("transcripts", path.basename(filePath) + ".json"),
        result.toJSON(),
      );
      console.log("done " + filePath);
      return;
    }
    if (status.isFailed) {
      throw new JobFailedError(
        filePath + " failed at " + status.failedStage + ": " + status.reason,
      );
    }
    await sleep(POLL_INTERVAL_MS);
  }
}

// Bounded concurrency: a fixed pool of workers pulling off one queue.
async function collectAll(jobIds) {
  const client = new SpeechRevolutions();
  const queue = Object.entries(jobIds);

  const worker = async () => {
    for (;;) {
      const next = queue.shift();
      if (!next) return;
      const [filePath, jobId] = next;
      // One failure must not sink the batch.
      await collectOne(client, filePath, jobId).catch((e) => console.error(e.message));
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
}

await collectAll(JSON.parse(readFileSync("jobs.json", "utf8")));`,
          },
        ]}
      />

      <h2>Step 2 (option B) — collect by webhook</h2>
      <p>
        At large scale, polling thousands of jobs is a lot of wasted requests.
        Pass a <code>callback_url</code> when you submit, and Speech Revolutions POSTs a
        signed notification the moment each job finishes — you fetch the
        transcript in the handler and never poll at all. Change one line in
        Step 1:
      </p>
      <CodeTabs
        tabs={[
          {
            label: "Python",
            language: "python",
            filename: "submit_with_webhook.py",
            code: `# In submit_one(), add a callback_url so Speech Revolutions notifies you on completion:
job_id = await client.submit(
    path,
    speaker_labels=True,
    callback_url="https://your-app.example.com/webhooks/speechrevolutions",
)`,
          },
        
          {
            label: "JavaScript",
            language: "ts",
            code: `// In submitOne(), add a callbackUrl so Speech Revolutions notifies you on completion:
const jobId = await client.submit(filePath, {
  speakerLabels: true,
  callbackUrl: "https://your-app.example.com/webhooks/speechrevolutions",
});`,
          },
        ]}
      />
      <p>
        The webhook body is{" "}
        <code>{`{ job_id, status, download_url?, step?, reason? }`}</code>, signed
        with HMAC-SHA256 in the <code>X-SR-Signature: sha256=&lt;hmac&gt;</code>{" "}
        header — always verify it against the raw request bytes before trusting
        the payload. In the handler, look up which file the <code>job_id</code>{" "}
        belongs to, then call <code>get_transcript(job_id)</code> (or download{" "}
        <code>download_url</code> directly) and save it. See the{" "}
        <Link href="/sdks/python">Python SDK</Link> and{" "}
        <Link href="/api-reference/jobs">Jobs API</Link> pages for the full
        signature-verification receiver.
      </p>

      <Callout title="Polling or webhooks?" tone="info">
        <p>
          <strong>Polling</strong> is simplest and needs no public endpoint —
          great for a one-off backfill run from a script.{" "}
          <strong>Webhooks</strong> scale better and cost fewer requests once
          you have a server that can receive them — the right default for an
          ongoing pipeline. Both collect from the same durable job ids, so you
          can start with polling and switch later without changing Step 1.
        </p>
      </Callout>

      <h2>Track and resume with the jobs list</h2>
      <p>
        You don&apos;t have to rely solely on your own <code>jobs.json</code>.{" "}
        <code>list_jobs(limit=, before=)</code> returns your recent jobs,
        newest first, cursor-paginated — handy for a dashboard or for rebuilding
        state after losing your local record. Page through with the returned{" "}
        <code>next_before</code> cursor.
      </p>
      <CodeTabs
        tabs={[
          {
            label: "Python",
            language: "python",
            filename: "list_jobs.py",
            code: `from speechrevolutions import SpeechRevolutions

client = SpeechRevolutions()
before = None
while True:
    page = client.list_jobs(limit=100, before=before)
    for job in page["jobs"]:
        print(job["job_id"], job["created_at"])
    before = page["next_before"]
    if not before:
        break`,
          },
        
          {
            label: "JavaScript",
            language: "ts",
            code: `import { SpeechRevolutions } from "@speechrevolutions/stt";

const client = new SpeechRevolutions();
let before;
for (;;) {
  const page = await client.listJobs({ limit: 100, before });
  for (const job of page.jobs) {
    console.log(job.job_id, job.created_at);
  }
  before = page.next_before;
  if (!before) break;
}`,
          },
        ]}
      />

      <p>
        That&apos;s the scalable shape: submit with bounded concurrency, persist
        the ids, collect out of band. For the live single-file experience
        instead, see the{" "}
        <Link href="/tutorials/meeting-app">meeting-transcription tutorial</Link>{" "}
        and the <Link href="/guides/live-progress">live progress guide</Link>;
        for more patterns, the <Link href="/cookbook">cookbook</Link>.
      </p>
    </>
  );
}
