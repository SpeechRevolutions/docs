import { CodeTabs } from "@/components/CodeTabs";
import { Callout } from "@/components/DocsUI";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Live progress for web apps",
  description:
    "You're building a transcription app and want to show each user a live progress bar while their file is transcribed. The SDK surfaces progress through two…",
};

export default function LiveProgressGuidePage() {
  return (
    <>
      <h1>Live progress for web apps</h1>
      <p>
        You&apos;re building a transcription app and want to show each user a
        live progress bar while their file is transcribed. The SDK surfaces
        progress through two callbacks — this guide turns them into a single
        0–100 number you store per job and serve to your frontend.
      </p>

      <Callout title="A Speech Revolutions extra" tone="tip">
        <p>
          Neither AssemblyAI nor Deepgram exposes a percentage for pre-recorded
          audio. Speech Revolutions reports progress for <strong>both</strong>{" "}
          the file upload and the transcription, so you can drive a real bar
          instead of a spinner.
        </p>
      </Callout>

      <h2>The two callbacks</h2>
      <p>
        <code>transcribe()</code> accepts two progress callbacks, each receiving
        a progress event:
      </p>
      <ul>
        <li>
          <code>on_upload_progress</code> / <code>onUploadProgress</code> — fires
          while the file uploads (<code>event.step === &quot;upload&quot;</code>).
        </li>
        <li>
          <code>on_progress</code> / <code>onProgress</code> — fires while the
          server transcribes.
        </li>
      </ul>
      <p>
        Each event carries <code>percent</code>, a <code>0–100</code> number
        that is <code>None</code>/<code>undefined</code> before the totals are
        known. You decide what to do with it: write it to your DB, push it over
        a WebSocket, or store it in memory for an HTTP endpoint to read.
      </p>

      <h2>Weight the two phases into one bar</h2>
      <p>
        Upload is usually quick, so give it the first slice of the bar and let
        transcription fill the rest. Store the latest value per job — guarded so
        events that arrive slightly out of order never make the bar go backwards
        — and serve <code>{`{ phase, percent }`}</code> to your frontend.
      </p>
      <CodeTabs
        tabs={[
          {
            label: "Python",
            language: "python",
            filename: "progress_webapp.py",
            code: `import asyncio
import threading
from dataclasses import dataclass, field

from speechrevolutions import AsyncSpeechRevolutions, ProgressEvent

# Weight the two phases into one bar. Upload is usually quick; give it the
# first slice and let transcription fill the rest. Tune to taste.
UPLOAD_WEIGHT = 0.15      # upload spans 0–15% of the overall bar
TRANSCRIBE_WEIGHT = 0.85  # transcription spans 15–100%


@dataclass
class JobProgress:
    """The latest progress for one job — the shape you'd serve to your frontend."""

    phase: str = "starting"  # "upload" | "transcribe" | "done"
    percent: float = 0.0     # overall 0–100 across both phases
    lock: threading.Lock = field(default_factory=threading.Lock, repr=False)

    def _set(self, phase: str, overall: float) -> None:
        with self.lock:
            self.phase = phase
            # never let the bar go backwards (events can arrive out of order)
            self.percent = max(self.percent, round(overall, 1))

    def on_upload(self, event: ProgressEvent) -> None:
        self._set("upload", (event.percent or 0.0) * UPLOAD_WEIGHT)

    def on_transcribe(self, event: ProgressEvent) -> None:
        pct = event.percent or 0.0
        self._set("transcribe", UPLOAD_WEIGHT * 100 + pct * TRANSCRIBE_WEIGHT)

    def snapshot(self) -> dict:
        with self.lock:
            return {"phase": self.phase, "percent": self.percent}


async def transcribe_with_progress(audio: str, store: JobProgress):
    async with AsyncSpeechRevolutions() as client:
        result = await client.transcribe(
            audio,
            on_upload_progress=store.on_upload,   # <- do anything with event.percent
            on_progress=store.on_transcribe,
        )
    store._set("done", 100.0)
    return result`,
          },
          {
            label: "JavaScript",
            language: "ts",
            filename: "progress-webapp.mjs",
            code: `import { SpeechRevolutions } from "speechrevolutions";

// Weight the two phases into a single 0–100 bar (upload is usually quick).
const UPLOAD_WEIGHT = 0.15;     // upload spans 0–15%
const TRANSCRIBE_WEIGHT = 0.85; // transcription spans 15–100%

/** The latest progress for one job — the shape you'd serve to your frontend. */
class JobProgress {
  phase = "starting"; // "upload" | "transcribe" | "done"
  percent = 0;        // overall 0–100 across both phases

  #set(phase, overall) {
    this.phase = phase;
    // never let the bar go backwards (events can arrive out of order)
    this.percent = Math.max(this.percent, Math.round(overall * 10) / 10);
  }
  onUpload = (event) => this.#set("upload", (event.percent ?? 0) * UPLOAD_WEIGHT);
  onTranscribe = (event) =>
    this.#set("transcribe", UPLOAD_WEIGHT * 100 + (event.percent ?? 0) * TRANSCRIBE_WEIGHT);
  done() {
    this.#set("done", 100);
  }
  snapshot() {
    return { phase: this.phase, percent: this.percent };
  }
}

const client = new SpeechRevolutions();
const store = new JobProgress();

const result = await client.transcribe("meeting.mp3", {
  onUploadProgress: store.onUpload, // <- do anything with event.percent
  onProgress: store.onTranscribe,
});
store.done();`,
          },
          {
            label: "Go",
            language: "go",
            filename: "progress_webapp.go",
            code: `package main

import (
	"context"
	"fmt"
	"log"
	"math"
	"sync"

	stt "github.com/speechrevolutions/speechrevolutions-go"
)

// Weight the two phases into one bar. Upload is usually quick; give it the
// first slice and let transcription fill the rest. Tune to taste.
const (
	uploadWeight     = 0.15 // upload spans 0–15% of the overall bar
	transcribeWeight = 0.85 // transcription spans 15–100%
)

// JobProgress is the latest progress for one job — the shape you would serve
// to your frontend. The callbacks fire on the SDK's reader goroutine, so the
// mutex is not optional.
type JobProgress struct {
	mu      sync.Mutex
	phase   string  // "upload" | "transcribe" | "done"
	percent float64 // overall 0–100 across both phases
}

func (p *JobProgress) set(phase string, overall float64) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.phase = phase
	// never let the bar go backwards (events can arrive out of order)
	p.percent = math.Max(p.percent, math.Round(overall*10)/10)
}

func (p *JobProgress) OnUpload(e stt.ProgressEvent) {
	pct, _ := e.Percent() // ok is false while the total is unknown
	p.set("upload", pct*uploadWeight)
}

func (p *JobProgress) OnTranscribe(e stt.ProgressEvent) {
	pct, _ := e.Percent()
	p.set("transcribe", uploadWeight*100+pct*transcribeWeight)
}

func (p *JobProgress) Snapshot() (string, float64) {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.phase, p.percent
}

func transcribeWithProgress(
	ctx context.Context, c *stt.Client, audio string, store *JobProgress,
) (*stt.Transcript, error) {
	result, err := c.Transcribe(ctx, audio, stt.TranscribeOptions{
		OnUploadProgress: store.OnUpload, // <- do anything with e.Percent()
	}, store.OnTranscribe)
	if err != nil {
		return nil, err
	}
	store.set("done", 100)
	return result, nil
}

func main() {
	client, err := stt.NewClient("")
	if err != nil {
		log.Fatal(err)
	}
	store := &JobProgress{phase: "starting"}
	if _, err := transcribeWithProgress(context.Background(), client, "meeting.mp3", store); err != nil {
		log.Fatal(err)
	}
	fmt.Println(store.Snapshot())
}`,
          },
          {
            label: "C#",
            language: "csharp",
            filename: "JobProgress.cs",
            code: `using SpeechRevolutions;

/// <summary>
/// The latest progress for one job — the shape you would serve to your
/// frontend. The callbacks fire on the SDK's reader task, so the lock is not
/// optional.
/// </summary>
public sealed class JobProgress
{
    // Weight the two phases into a single 0–100 bar (upload is usually quick).
    private const double UploadWeight = 0.15;     // upload spans 0–15%
    private const double TranscribeWeight = 0.85; // transcription spans 15–100%

    private readonly object _lock = new();

    public string Phase { get; private set; } = "starting"; // upload|transcribe|done
    public double Percent { get; private set; }             // overall 0–100

    public void Set(string phase, double overall)
    {
        lock (_lock)
        {
            Phase = phase;
            // never let the bar go backwards (events can arrive out of order)
            Percent = Math.Max(Percent, Math.Round(overall, 1));
        }
    }

    // <- do anything with e.Percent; it is null while the total is unknown
    public void OnUpload(ProgressEvent e) =>
        Set("upload", (e.Percent ?? 0) * UploadWeight);

    public void OnTranscribe(ProgressEvent e) =>
        Set("transcribe", UploadWeight * 100 + (e.Percent ?? 0) * TranscribeWeight);

    public object Snapshot()
    {
        lock (_lock) return new { phase = Phase, percent = Percent };
    }
}

public static class Transcriber
{
    public static async Task<TranscriptResult> RunAsync(
        SpeechRevolutionsClient client, string audio, JobProgress store)
    {
        var result = await client.TranscribeAsync(audio,
            new TranscribeOptions { OnUploadProgress = store.OnUpload },
            store.OnTranscribe);
        store.Set("done", 100);
        return result;
    }
}`,
          },
        ]}
      />

      <h2>Serve it to the frontend</h2>
      <p>
        Keep a map keyed by job id, run the transcription in the background, and
        return immediately. Your frontend polls a progress endpoint (or you push
        each snapshot over a WebSocket). The percentage comes straight from the
        SDK callbacks.
      </p>
      <CodeTabs
        tabs={[
          {
            label: "Python",
            language: "python",
            filename: "FastAPI",
            code: `from fastapi import FastAPI, BackgroundTasks, HTTPException

app = FastAPI()
JOBS: dict[str, JobProgress] = {}

@app.post("/transcribe")
async def start(url: str, background: BackgroundTasks):
    job_id = url  # or your own id
    JOBS[job_id] = JobProgress()
    background.add_task(transcribe_with_progress, url, JOBS[job_id])
    return {"job_id": job_id}          # returns immediately; runs in background

@app.get("/progress/{job_id}")
def progress(job_id: str):
    store = JOBS.get(job_id)
    if store is None:                   # restarted, expired, or a typo
        raise HTTPException(status_code=404, detail="unknown job")
    return store.snapshot()             # {"phase": "transcribe", "percent": 63.5}`,
          },
          {
            label: "JavaScript",
            language: "ts",
            filename: "Express",
            code: `const jobs = new Map(); // jobId -> JobProgress

app.post("/transcribe", (req, res) => {
  const store = new JobProgress();
  jobs.set(req.body.jobId, store);
  client.transcribe(req.body.url, {
    onUploadProgress: store.onUpload,
    onProgress: store.onTranscribe,
  }); // runs in the background
  res.json({ jobId: req.body.jobId }); // returns immediately
});

app.get("/progress/:jobId", (req, res) => {
  const store = jobs.get(req.params.jobId);
  if (!store) return res.status(404).json({ error: "unknown job" });
  res.json(store.snapshot());
});`,
          },
          {
            label: "Go",
            language: "go",
            filename: "net/http",
            code: `// net/http. The "POST /path" method patterns and r.PathValue need Go 1.22+.\n// jobs is shared across handlers, so guard the map itself too.
var (
	jobsMu sync.Mutex
	jobs   = map[string]*JobProgress{}
)

http.HandleFunc("POST /transcribe", func(w http.ResponseWriter, r *http.Request) {
	jobID := r.FormValue("job_id")
	store := &JobProgress{phase: "starting"}

	jobsMu.Lock()
	jobs[jobID] = store
	jobsMu.Unlock()

	// Runs in the background; the handler returns immediately.
	go transcribeWithProgress(context.Background(), client, r.FormValue("url"), store)

	json.NewEncoder(w).Encode(map[string]string{"job_id": jobID})
})

http.HandleFunc("GET /progress/{job_id}", func(w http.ResponseWriter, r *http.Request) {
	jobsMu.Lock()
	store, ok := jobs[r.PathValue("job_id")]
	jobsMu.Unlock()
	if !ok {
		http.NotFound(w, r)
		return
	}
	phase, percent := store.Snapshot()
	json.NewEncoder(w).Encode(map[string]any{"phase": phase, "percent": percent})
})`,
          },
          {
            label: "C#",
            language: "csharp",
            filename: "ASP.NET Core",
            code: `// ASP.NET Core minimal API. ConcurrentDictionary because handlers race.
var jobs = new System.Collections.Concurrent.ConcurrentDictionary<string, JobProgress>();

app.MapPost("/transcribe", (StartRequest req) =>
{
    var store = new JobProgress();
    jobs[req.JobId] = store;

    // Runs in the background; the handler returns immediately.
    _ = Transcriber.RunAsync(client, req.Url, store);

    return Results.Ok(new { jobId = req.JobId });
});

app.MapGet("/progress/{jobId}", (string jobId) =>
    jobs.TryGetValue(jobId, out var store)
        ? Results.Ok(store.Snapshot())   // {"phase":"transcribe","percent":63.5}
        : Results.NotFound());

public record StartRequest(string JobId, string Url);`,
          },
        ]}
      />

      <Callout title="Where percent comes from" tone="info">
        <p>
          The server streams raw <code>completed</code>/<code>total</code> step
          counts over{" "}
          <Link href="/api-reference/jobs">SSE</Link>; the SDK computes{" "}
          <code>percent = completed / total × 100</code> and hands it to your
          callbacks. See any SDK page — <Link href="/sdks/python">Python</Link>,{" "}
          <Link href="/sdks/javascript">JavaScript</Link>,{" "}
          <Link href="/sdks/go">Go</Link>, <Link href="/sdks/csharp">C#</Link> —
          for the callback signatures.
        </p>
      </Callout>
    </>
  );
}
