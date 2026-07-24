import { CodeTabs } from "@/components/CodeTabs";
import { Callout } from "@/components/DocsUI";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Build a meeting-transcription app",
};

export default function MeetingAppTutorialPage() {
  return (
    <>
      <h1>Build a meeting-transcription app</h1>
      <p>
        This tutorial wires the whole thing together: a user uploads a meeting
        recording, watches a live progress bar, and ends up with a clean,
        speaker-labeled transcript — &quot;Speaker A said this, then Speaker B
        replied.&quot; It builds directly on two guides you should skim first:{" "}
        <Link href="/guides/live-progress">Live progress</Link> (turning the
        SDK&apos;s callbacks into a 0–100 bar) and{" "}
        <Link href="/guides/diarization">Speaker diarization</Link> (what{" "}
        <code>speaker_labels</code> gives you). Here we combine them into one
        end-to-end app.
      </p>

      <Callout title="What you'll build" tone="tip">
        <p>
          A backend endpoint that accepts a recording and transcribes it with{" "}
          <code>speaker_labels</code> on; a progress endpoint your frontend
          polls while the job runs; and a transcript view that renders Zephyr&apos;s{" "}
          <code>.utterances</code> as timestamped speaker turns. No spinner —
          a real bar, because Zephyr reports progress for pre-recorded audio.
        </p>
      </Callout>

      <h2>The shape of the result</h2>
      <p>
        When you pass <code>speaker_labels=True</code>, Zephyr labels who spoke
        each segment, and the SDK parses the response into a transcript object
        with an <code>.utterances</code> list. Each utterance is one contiguous
        speaker turn:
      </p>
      <ul>
        <li>
          <code>utterance.speaker</code> — the speaker label (e.g. <code>&quot;A&quot;</code>,{" "}
          <code>&quot;B&quot;</code>)
        </li>
        <li>
          <code>utterance.text</code> — what that speaker said in this turn
        </li>
        <li>
          <code>utterance.start</code> / <code>utterance.end</code> — turn
          boundaries in seconds
        </li>
      </ul>
      <p>
        That maps one-to-one onto the UI you want: a list of turns, each with a
        speaker chip, a timestamp, and the spoken text. <code>result.text</code>{" "}
        still holds the full flat transcript if you need it.
      </p>

      <h2>Step 1 — transcribe with speakers and progress</h2>
      <p>
        Run the transcription in the background and stream its progress into a
        per-job store, exactly as in the{" "}
        <Link href="/guides/live-progress">Live progress</Link> guide. The only
        additions here are <code>speaker_labels=True</code> and keeping the
        finished <code>result</code> around so the transcript endpoint can serve
        its <code>.utterances</code>.
      </p>
      <CodeTabs
        tabs={[
          {
            label: "Python",
            language: "python",
            filename: "meeting_app.py",
            code: `import threading
from dataclasses import dataclass, field

from speechrevolutions import AsyncSpeechRevolutions, ProgressEvent

# Give upload the first slice of the bar; transcription fills the rest.
UPLOAD_WEIGHT = 0.15


@dataclass
class Meeting:
    """Everything the frontend needs for one meeting, kept in memory."""

    phase: str = "starting"          # "upload" | "transcribe" | "done" | "failed"
    percent: float = 0.0             # overall 0–100
    turns: list[dict] = field(default_factory=list)  # speaker turns, filled when done
    lock: threading.Lock = field(default_factory=threading.Lock, repr=False)

    def _bar(self, phase: str, overall: float) -> None:
        with self.lock:
            self.phase = phase
            self.percent = max(self.percent, round(overall, 1))  # never go backwards

    def on_upload(self, e: ProgressEvent) -> None:
        self._bar("upload", (e.percent or 0.0) * UPLOAD_WEIGHT)

    def on_transcribe(self, e: ProgressEvent) -> None:
        self._bar("transcribe", UPLOAD_WEIGHT * 100 + (e.percent or 0.0) * (1 - UPLOAD_WEIGHT))

    def snapshot(self) -> dict:
        with self.lock:
            return {"phase": self.phase, "percent": self.percent, "turns": self.turns}


async def transcribe_meeting(audio: str, meeting: Meeting) -> None:
    async with AsyncSpeechRevolutions() as client:
        result = await client.transcribe(
            audio,
            speaker_labels=True,             # <- label who spoke each segment
            on_upload_progress=meeting.on_upload,
            on_progress=meeting.on_transcribe,
        )
    # Turn the SDK's utterances into plain dicts for the UI.
    meeting.turns = [
        {"speaker": u.speaker, "text": u.text, "start": u.start, "end": u.end}
        for u in result.utterances
    ]
    meeting._bar("done", 100.0)`,
          },
          {
            label: "JavaScript",
            language: "ts",
            filename: "meeting-app.mjs",
            code: `import { SpeechRevolutions } from "@speechrevolutions/stt";

const UPLOAD_WEIGHT = 0.15; // upload spans 0–15% of the bar

/** Everything the frontend needs for one meeting, kept in memory. */
class Meeting {
  phase = "starting"; // "upload" | "transcribe" | "done" | "failed"
  percent = 0;        // overall 0–100
  turns = [];         // speaker turns, filled when done

  #bar(phase, overall) {
    this.phase = phase;
    this.percent = Math.max(this.percent, Math.round(overall * 10) / 10); // never backwards
  }
  onUpload = (e) => this.#bar("upload", (e.percent ?? 0) * UPLOAD_WEIGHT);
  onTranscribe = (e) =>
    this.#bar("transcribe", UPLOAD_WEIGHT * 100 + (e.percent ?? 0) * (1 - UPLOAD_WEIGHT));
  snapshot() {
    return { phase: this.phase, percent: this.percent, turns: this.turns };
  }
}

const client = new SpeechRevolutions();

export async function transcribeMeeting(audio, meeting) {
  const result = await client.transcribe(audio, {
    speakerLabels: true, // <- label who spoke each segment
    onUploadProgress: meeting.onUpload,
    onProgress: meeting.onTranscribe,
  });
  // Turn the SDK's utterances into plain objects for the UI.
  meeting.turns = result.utterances.map((u) => ({
    speaker: u.speaker,
    text: u.text,
    start: u.start,
    end: u.end,
  }));
  meeting.snapshot(); // phase flips to "done" below
  meeting.phase = "done";
  meeting.percent = 100;
}`,
          },
        ]}
      />

      <h2>Step 2 — expose start, progress, and transcript endpoints</h2>
      <p>
        Kick the job off in the background and return a <code>job_id</code>{" "}
        immediately. The frontend polls <code>/progress</code> for the bar, and
        once <code>phase</code> is <code>&quot;done&quot;</code> it reads the
        speaker turns from the same snapshot.
      </p>
      <CodeTabs
        tabs={[
          {
            label: "Python",
            language: "python",
            filename: "FastAPI",
            code: `import uuid
from fastapi import FastAPI, BackgroundTasks

app = FastAPI()
MEETINGS: dict[str, Meeting] = {}

@app.post("/meetings")
async def start(url: str, background: BackgroundTasks):
    job_id = uuid.uuid4().hex
    MEETINGS[job_id] = Meeting()
    background.add_task(transcribe_meeting, url, MEETINGS[job_id])
    return {"job_id": job_id}                 # returns immediately

@app.get("/meetings/{job_id}")
def get(job_id: str):
    return MEETINGS[job_id].snapshot()
    # -> {"phase": "transcribe", "percent": 63.5, "turns": []}
    #    ...and once done: "turns": [{"speaker": "A", "text": "...", "start": 0.4, "end": 5.1}, ...]`,
          },
          {
            label: "JavaScript",
            language: "ts",
            filename: "Express",
            code: `import { randomUUID } from "node:crypto";

const meetings = new Map(); // jobId -> Meeting

app.post("/meetings", (req, res) => {
  const jobId = randomUUID();
  const meeting = new Meeting();
  meetings.set(jobId, meeting);
  transcribeMeeting(req.body.url, meeting); // runs in the background
  res.json({ jobId });                      // returns immediately
});

app.get("/meetings/:jobId", (req, res) => {
  res.json(meetings.get(req.params.jobId).snapshot());
  // -> { phase: "done", percent: 100, turns: [{ speaker: "A", text, start, end }, ...] }
});`,
          },
        ]}
      />

      <Callout title="For real servers, prefer a webhook" tone="info">
        <p>
          Holding the transcription in a background task is fine for a single
          box and a demo. For anything that restarts or scales out, use{" "}
          <code>submit()</code> plus a <code>callback_url</code> so a job
          survives a redeploy — the pattern in the{" "}
          <Link href="/tutorials/batch">batch tutorial</Link>. Persist{" "}
          <code>turns</code> to your database instead of an in-memory map.
        </p>
      </Callout>

      <h2>Step 3 — render the transcript as speaker turns</h2>
      <p>
        With the turns in hand the frontend is straightforward: one row per
        utterance, a speaker chip, a <code>mm:ss</code> timestamp from{" "}
        <code>start</code>, and the text. This is a minimal React view; style it
        however you like.
      </p>
      <CodeTabs
        tabs={[
          {
            label: "React",
            language: "tsx",
            filename: "MeetingView.tsx",
            code: `import { useEffect, useState } from "react";

type Turn = { speaker: string | null; text: string; start: number | null; end: number | null };
type Snapshot = { phase: string; percent: number; turns: Turn[] };

const mmss = (s: number | null) =>
  s == null ? "" : \`\${Math.floor(s / 60)}:\${String(Math.floor(s % 60)).padStart(2, "0")}\`;

export function MeetingView({ jobId }: { jobId: string }) {
  const [snap, setSnap] = useState<Snapshot | null>(null);

  useEffect(() => {
    const id = setInterval(async () => {
      const s: Snapshot = await fetch(\`/meetings/\${jobId}\`).then((r) => r.json());
      setSnap(s);
      if (s.phase === "done" || s.phase === "failed") clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [jobId]);

  if (!snap) return <p>Starting…</p>;

  if (snap.phase !== "done") {
    return (
      <div>
        <progress value={snap.percent} max={100} />
        <span>{Math.round(snap.percent)}% — {snap.phase}</span>
      </div>
    );
  }

  return (
    <div>
      {snap.turns.map((t, i) => (
        <div key={i} className="turn">
          <span className="speaker">Speaker {t.speaker ?? "?"}</span>
          <span className="time">{mmss(t.start)}</span>
          <p>{t.text}</p>
        </div>
      ))}
    </div>
  );
}`,
          },
        ]}
      />

      <p>
        That&apos;s the whole loop: upload, a real progress bar while Zephyr
        works, and a speaker-labeled transcript rendered from{" "}
        <code>.utterances</code>. From here you might persist meetings, add
        search across turns, or export the transcript — see the{" "}
        <Link href="/tutorials/subtitles">subtitles tutorial</Link> to turn the
        same job into an <code>.srt</code>/<code>.vtt</code> file, or the{" "}
        <Link href="/cookbook">cookbook</Link> for more recipes.
      </p>
    </>
  );
}
