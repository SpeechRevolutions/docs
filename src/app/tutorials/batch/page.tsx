import { CodeTabs } from "@/components/CodeTabs";
import { Callout } from "@/components/DocsUI";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Batch-transcribe thousands of files",
  description:
    "Transcribe a large backlog of files: submit each job with bounded concurrency, persist the job IDs, and collect the transcripts by polling or webhook.",
};

export default function BatchTutorialPage() {
  return (
    <>
      <h1>Batch-transcribe thousands of files</h1>
      <p>
        To transcribe thousands of files, don&apos;t call{" "}
        <code>transcribe()</code> in a loop: it blocks on each file and holds a
        connection open for the entire job. Instead, <strong>submit</strong>{" "}
        every file with bounded concurrency, persist the returned job IDs, then{" "}
        <strong>collect</strong> the results separately by polling or with
        webhooks.
      </p>

      <h2>Submit and collect vs. transcribe()</h2>
      <p>
        <code>transcribe()</code> uploads, waits, and returns the transcript in
        one call. Use it for single files. Each call keeps a connection open
        for the full transcription, so a thousand concurrent calls hold a
        thousand connections, and any dropped connection loses its result.
      </p>
      <p>
        <code>submit()</code> uploads the audio, queues the job, and returns a{" "}
        <code>job_id</code> immediately. No connection stays open while the job
        runs. With the job IDs saved, you can collect results minutes or hours
        later, survive a restart, and retry a single file without redoing the
        batch. Only the upload needs concurrency control; transcription runs
        server-side.
      </p>

      <Callout title="The two phases" tone="tip">
        <p>
          <strong>Submit</strong>: upload and queue every file, bounded by a
          semaphore so you don&apos;t open thousands of uploads at once. Save the
          returned <code>job_id</code>s somewhere durable.{" "}
          <strong>Collect</strong>: fetch each transcript once its job
          completes, either by polling <code>get_job_status</code> /{" "}
          <code>get_transcript</code> or by receiving a POST to your{" "}
          <code>callback_url</code> when each job finishes.
        </p>
      </Callout>

      <h2>Step 1: Submit every file with bounded concurrency</h2>
      <p>
        Use the async client and run all submissions behind a semaphore. The
        semaphore caps how many uploads run at once; tune it to your bandwidth.
        Each task returns a <code>(path, job_id)</code> pair that you persist.
        If a submission fails, record the error instead of the job ID so you
        can retry that file.
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
import { SpeechRevolutions } from "speechrevolutions";

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
          {
            label: "Go",
            language: "go",
            filename: "submit.go",
            code: `package main

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"sync"

	stt "github.com/speechrevolutions/speechrevolutions-go"
)

const concurrency = 16 // max simultaneous uploads — tune to your bandwidth

// submitAll submits every file and returns {path: jobID}. A failure is
// recorded, not returned: one bad file must not sink the batch.
func submitAll(ctx context.Context, client *stt.Client, paths []string) map[string]string {
	var (
		mu     sync.Mutex
		wg     sync.WaitGroup
		jobIDs = map[string]string{}
		sem    = make(chan struct{}, concurrency)
	)

	for _, p := range paths {
		wg.Add(1)
		go func(path string) {
			defer wg.Done()
			sem <- struct{}{} // only \`concurrency\` uploads in flight at once
			defer func() { <-sem }()

			jobID, err := client.Submit(ctx, path, stt.TranscribeOptions{
				SpeakerLabels: stt.Bool(true),
			})
			if err != nil {
				log.Printf("FAILED to submit %s: %v", path, err) // retry this file later
				return
			}

			mu.Lock()
			jobIDs[path] = jobID
			mu.Unlock()
			fmt.Printf("submitted %s -> %s\\n", path, jobID)
		}(p)
	}

	wg.Wait()
	return jobIDs
}

func main() {
	client, err := stt.NewClient("")
	if err != nil {
		log.Fatal(err)
	}

	f, err := os.Open("files.txt")
	if err != nil {
		log.Fatal(err)
	}
	defer f.Close()

	var paths []string
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		if line := scanner.Text(); line != "" {
			paths = append(paths, line)
		}
	}

	ids := submitAll(context.Background(), client, paths)

	// Persist the ids BEFORE collecting — this is your durable checkpoint.
	out, err := json.MarshalIndent(ids, "", "  ")
	if err != nil {
		log.Fatal(err)
	}
	if err := os.WriteFile("jobs.json", out, 0o644); err != nil {
		log.Fatal(err)
	}
	fmt.Printf("submitted %d/%d files; saved jobs.json\\n", len(ids), len(paths))
}`,
          },
          {
            label: "C#",
            language: "csharp",
            filename: "Submit.cs",
            code: `using System.Collections.Concurrent;
using System.Text.Json;
using SpeechRevolutions;

const int Concurrency = 16; // max simultaneous uploads — tune to your bandwidth

using var client = new SpeechRevolutionsClient();

var paths = (await File.ReadAllLinesAsync("files.txt"))
    .Where(line => !string.IsNullOrWhiteSpace(line))
    .ToList();

var jobIds = new ConcurrentDictionary<string, string>();

await Parallel.ForEachAsync(
    paths,
    new ParallelOptions { MaxDegreeOfParallelism = Concurrency },
    async (path, ct) =>
    {
        try
        {
            var jobId = await client.SubmitAsync(path,
                new TranscribeOptions { SpeakerLabels = true }, ct);
            jobIds[path] = jobId;
            Console.WriteLine($"submitted {path} -> {jobId}");
        }
        catch (Exception e) // keep going; retry this file later
        {
            Console.Error.WriteLine($"FAILED to submit {path}: {e.Message}");
        }
    });

// Persist the ids BEFORE collecting — this is your durable checkpoint.
await File.WriteAllTextAsync("jobs.json",
    JsonSerializer.Serialize(jobIds, new JsonSerializerOptions { WriteIndented = true }));
Console.WriteLine($"submitted {jobIds.Count}/{paths.Count} files; saved jobs.json");`,
          },
        ]}
      />

      <Callout title="Persist job IDs before collecting" tone="warn">
        <p>
          Write the job IDs to durable storage (a file, a table, a queue) as
          soon as you have them, then start collecting. If collection crashes,
          re-read the IDs and resume without re-uploading. A job&apos;s download
          URL is regenerated on demand, so results stay fetchable by job ID long
          after upload.
        </p>
      </Callout>

      <h2>Step 2, option A: Collect by polling</h2>
      <p>
        Read the job IDs back and poll each job until it completes, then fetch
        the transcript. Reuse the semaphore to bound the number of concurrent
        requests. <code>get_job_status</code> returns a status to check for{" "}
        <code>completed</code> / <code>failed</code>; <code>get_transcript</code>{" "}
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
from pathlib import Path

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
                result.save(f"transcripts/{Path(path).stem}.json")  # -> transcripts/<name>.json
                print(f"done {path}")
                return
            if status.is_failed:
                raise JobFailedError(f"{path} failed", step=status.failed_stage,
                                     reason=status.reason)
            await asyncio.sleep(POLL_INTERVAL)


async def collect_all(job_ids: dict[str, str]) -> None:
    Path("transcripts").mkdir(exist_ok=True)
    sem = asyncio.Semaphore(CONCURRENCY)
    async with AsyncSpeechRevolutions() as client:
        outcomes = await asyncio.gather(
            *(collect_one(client, path, jid, sem) for path, jid in job_ids.items()),
            return_exceptions=True,  # one failure doesn't sink the batch
        )
    for path, outcome in zip(job_ids, outcomes):
        if isinstance(outcome, Exception):  # ...but it is reported, so you can retry it
            print(f"FAILED {path}: {outcome}")


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
import { SpeechRevolutions, JobFailedError } from "speechrevolutions";

const CONCURRENCY = 16;
const POLL_INTERVAL_MS = 5000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function collectOne(client, filePath, jobId) {
  for (;;) {
    const status = await client.getJobStatus(jobId);
    if (status.status === "completed") {
      const result = await client.getTranscript(jobId); // downloads + parses
      await mkdir("transcripts", { recursive: true });
      await writeFile(
        path.join("transcripts", path.parse(filePath).name + ".json"), // -> transcripts/<name>.json
        JSON.stringify(result.toDict(), null, 2),
      );
      console.log("done " + filePath);
      return;
    }
    if (status.status === "failed") {
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
      // One failure must not sink the batch, but it is reported so you can retry it.
      await collectOne(client, filePath, jobId).catch((e) =>
        console.error(\`FAILED \${filePath}: \${e.message}\`),
      );
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
}

await collectAll(JSON.parse(readFileSync("jobs.json", "utf8")));`,
          },
          {
            label: "Go",
            language: "go",
            filename: "collect_poll.go",
            code: `package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	stt "github.com/speechrevolutions/speechrevolutions-go"
)

const (
	collectConcurrency = 16
	pollInterval       = 5 * time.Second // between status checks
)

func collectOne(ctx context.Context, client *stt.Client, path, jobID string) error {
	for {
		status, err := client.GetJobStatus(ctx, jobID)
		if err != nil {
			return err
		}
		if status.IsCompleted() {
			// downloads + parses
			result, err := client.GetTranscript(ctx, jobID, stt.OutputJSON)
			if err != nil {
				return err
			}
			// -> transcripts/<name>.json
			name := strings.TrimSuffix(filepath.Base(path), filepath.Ext(path))
			if _, err := result.Save(filepath.Join("transcripts", name+".json")); err != nil {
				return err
			}
			fmt.Println("done", path)
			return nil
		}
		if status.IsFailed() {
			return fmt.Errorf("%s failed at %s: %s", path, status.FailedStage, status.Reason)
		}
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(pollInterval):
		}
	}
}

func main() {
	ctx := context.Background()
	client, err := stt.NewClient("")
	if err != nil {
		log.Fatal(err)
	}

	raw, err := os.ReadFile("jobs.json")
	if err != nil {
		log.Fatal(err)
	}
	var jobIDs map[string]string
	if err := json.Unmarshal(raw, &jobIDs); err != nil {
		log.Fatal(err)
	}
	if err := os.MkdirAll("transcripts", 0o755); err != nil {
		log.Fatal(err)
	}

	var wg sync.WaitGroup
	sem := make(chan struct{}, collectConcurrency)
	for p, id := range jobIDs {
		wg.Add(1)
		go func(path, jobID string) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()
			if err := collectOne(ctx, client, path, jobID); err != nil {
				// one failure doesn't sink the batch, but it is reported so you can retry it
				log.Printf("FAILED %s: %v", path, err)
			}
		}(p, id)
	}
	wg.Wait()
}`,
          },
          {
            label: "C#",
            language: "csharp",
            filename: "CollectPoll.cs",
            code: `using System.Text.Json;
using SpeechRevolutions;

const int Concurrency = 16;
var pollInterval = TimeSpan.FromSeconds(5); // between status checks

using var client = new SpeechRevolutionsClient();

var jobIds = JsonSerializer.Deserialize<Dictionary<string, string>>(
    await File.ReadAllTextAsync("jobs.json"))!;

Directory.CreateDirectory("transcripts");

await Parallel.ForEachAsync(
    jobIds,
    new ParallelOptions { MaxDegreeOfParallelism = Concurrency },
    async (entry, ct) =>
    {
        var (path, jobId) = entry;
        try
        {
            while (true)
            {
                var status = await client.GetJobStatusAsync(jobId, ct);
                if (status.IsCompleted)
                {
                    // downloads + parses
                    var result = await client.GetTranscriptAsync(jobId, OutputType.Json, ct);
                    // -> transcripts/<name>.json
                    await result.SaveAsync(Path.Combine("transcripts",
                        Path.GetFileNameWithoutExtension(path) + ".json"));
                    Console.WriteLine($"done {path}");
                    return;
                }
                if (status.IsFailed)
                    throw new JobFailedException(
                        $"{path} failed", status.FailedStage, status.Reason);

                await Task.Delay(pollInterval, ct);
            }
        }
        catch (Exception e) // one failure doesn't sink the batch, but it is reported
        {
            Console.Error.WriteLine($"FAILED {path}: {e.Message}");
        }
    });`,
          },
        ]}
      />

      <h2>Step 2, option B: Collect by webhook</h2>
      <p>
        Polling thousands of jobs wastes requests. Pass a{" "}
        <code>callback_url</code> when you submit, and you receive a signed POST
        when each job finishes. Fetch the transcript in your handler instead of
        polling. Change one line in Step 1:
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
            code: `// In the mapLimit callback, add a callbackUrl so Speech Revolutions notifies you on completion:
const jobId = await client.submit(path, {
  speakerLabels: true,
  callbackUrl: "https://your-app.example.com/webhooks/speechrevolutions",
});`,
          },
          {
            label: "Go",
            language: "go",
            code: `// In submitAll, add a CallbackURL so Speech Revolutions notifies you on completion:
jobID, err := client.Submit(ctx, path, stt.TranscribeOptions{
	SpeakerLabels: stt.Bool(true),
	CallbackURL:   "https://your-app.example.com/webhooks/speechrevolutions",
})`,
          },
          {
            label: "C#",
            language: "csharp",
            code: `// In the submit loop, add a CallbackUrl so we notify you on completion:
var jobId = await client.SubmitAsync(path, new TranscribeOptions
{
    SpeakerLabels = true,
    CallbackUrl = "https://your-app.example.com/webhooks/speechrevolutions",
});`,
          },
        ]}
      />
      <p>
        The webhook body is{" "}
        <code>{`{ job_id, status, download_url?, step?, reason? }`}</code>, signed
        with HMAC-SHA256 in the <code>X-SR-Signature: sha256=&lt;hmac&gt;</code>{" "}
        header, keyed with your organization&apos;s signing secret from the console
        (<strong>API Keys → Webhook signing secret</strong>). Always verify the
        signature against the raw request bytes before trusting the payload (see{" "}
        <Link href="/guides/webhooks">Webhooks</Link>). In the handler, look up
        the file that the <code>job_id</code> belongs to, then call{" "}
        <code>get_transcript(job_id)</code> (or download{" "}
        <code>download_url</code> directly) and save it.
      </p>

      <Callout title="Polling or webhooks?" tone="info">
        <p>
          <strong>Polling</strong> is simplest and needs no public endpoint.
          Use it for a one-off backfill run from a script.{" "}
          <strong>Webhooks</strong> scale better and use fewer requests, but
          need a server that can receive them. Use them for an ongoing
          pipeline. Both collect from the same job IDs, so you can start with
          polling and switch later without changing Step 1.
        </p>
      </Callout>

      <h2>Track and resume with the jobs list</h2>
      <p>
        <code>list_jobs(limit=, before=)</code> returns your recent jobs,
        newest first, with cursor pagination. Use it for a dashboard or to
        rebuild state if you lose your local <code>jobs.json</code>. Page
        through with the returned <code>next_before</code> cursor.
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
            code: `import { SpeechRevolutions } from "speechrevolutions";

const client = new SpeechRevolutions();
let before;
for (;;) {
  const page = await client.listJobs({ limit: 100, before });
  for (const job of page.jobs) {
    console.log(job.jobId, job.createdAt);
  }
  before = page.nextBefore;
  if (!before) break;
}`,
          },
          {
            label: "Go",
            language: "go",
            filename: "list_jobs.go",
            code: `package main

import (
	"context"
	"fmt"
	"log"

	stt "github.com/speechrevolutions/speechrevolutions-go"
)

func main() {
	ctx := context.Background()
	client, err := stt.NewClient("")
	if err != nil {
		log.Fatal(err)
	}

	before := ""
	for {
		page, err := client.ListJobs(ctx, 100, before)
		if err != nil {
			log.Fatal(err)
		}
		for _, job := range page.Jobs {
			fmt.Println(job.JobID, job.CreatedAt)
		}
		before = page.NextBefore
		if before == "" {
			break
		}
	}
}`,
          },
          {
            label: "C#",
            language: "csharp",
            filename: "ListJobs.cs",
            code: `using SpeechRevolutions;

using var client = new SpeechRevolutionsClient();

string? before = null;
while (true)
{
    var page = await client.ListJobsAsync(limit: 100, before: before);
    foreach (var job in page.Jobs)
        Console.WriteLine($"{job.JobId} {job.CreatedAt}");

    before = page.NextBefore;
    if (string.IsNullOrEmpty(before)) break;
}`,
          },
        ]}
      />

      <p>
        For live progress on a single file, see the{" "}
        <Link href="/tutorials/meeting-app">meeting-transcription tutorial</Link>{" "}
        and the <Link href="/guides/live-progress">live progress guide</Link>;
        for more patterns, the <Link href="/cookbook">cookbook</Link>.
      </p>
    </>
  );
}
