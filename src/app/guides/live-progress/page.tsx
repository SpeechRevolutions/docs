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
            code: `import { SpeechRevolutions } from "@speechrevolutions/stt";

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
            code: `from fastapi import FastAPI, BackgroundTasks

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
    return JOBS[job_id].snapshot()      # {"phase": "transcribe", "percent": 63.5}`,
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

app.get("/progress/:jobId", (req, res) =>
  res.json(jobs.get(req.params.jobId).snapshot()),
);`,
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
