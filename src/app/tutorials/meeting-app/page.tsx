import { CodeTabs } from "@/components/CodeTabs";
import { Callout } from "@/components/DocsUI";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Build a meeting-transcription app",
  description:
    "This tutorial wires the whole thing together: a user uploads a meeting recording, watches a live progress bar, and ends up with a clean, speaker-labeled…",
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
          polls while the job runs; and a transcript view that renders the Speech Revolutions{" "}
          <code>.utterances</code> as timestamped speaker turns. No spinner —
          a real bar, because Speech Revolutions reports progress for pre-recorded audio.
        </p>
      </Callout>

      <h2>The shape of the result</h2>
      <p>
        When you pass <code>speaker_labels=True</code>, Speech Revolutions labels who spoke
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
            code: `import { SpeechRevolutions } from "speechrevolutions";

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
          {
            label: "Go",
            language: "go",
            filename: "meeting_app.go",
            code: `package main

import (
	"context"
	"math"
	"sync"

	stt "github.com/speechrevolutions/speechrevolutions-go"
)

// Give upload the first slice of the bar; transcription fills the rest.
const uploadWeight = 0.15

// Turn is one speaker turn, as the frontend wants it.
type Turn struct {
	Speaker string  \`json:"speaker"\`
	Text    string  \`json:"text"\`
	Start   float64 \`json:"start"\`
	End     float64 \`json:"end"\`
}

// Meeting is everything the frontend needs for one meeting, kept in memory.
type Meeting struct {
	mu      sync.Mutex
	Phase   string  // "upload" | "transcribe" | "done" | "failed"
	Percent float64 // overall 0–100
	Turns   []Turn  // speaker turns, filled when done
}

func (m *Meeting) bar(phase string, overall float64) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.Phase = phase
	m.Percent = math.Max(m.Percent, math.Round(overall*10)/10) // never go backwards
}

func (m *Meeting) OnUpload(e stt.ProgressEvent) {
	pct, _ := e.Percent()
	m.bar("upload", pct*uploadWeight)
}

func (m *Meeting) OnTranscribe(e stt.ProgressEvent) {
	pct, _ := e.Percent()
	m.bar("transcribe", uploadWeight*100+pct*(1-uploadWeight))
}

func (m *Meeting) Snapshot() (string, float64, []Turn) {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.Phase, m.Percent, m.Turns
}

func TranscribeMeeting(ctx context.Context, c *stt.Client, audio string, m *Meeting) error {
	result, err := c.Transcribe(ctx, audio, stt.TranscribeOptions{
		SpeakerLabels:    stt.Bool(true), // <- label who spoke each segment
		OnUploadProgress: m.OnUpload,
	}, m.OnTranscribe)
	if err != nil {
		m.bar("failed", 0)
		return err
	}

	// Turn the SDK's utterances into plain structs for the UI.
	turns := make([]Turn, 0, len(result.Utterances))
	for _, u := range result.Utterances {
		t := Turn{Speaker: u.Speaker, Text: u.Text}
		if u.Start != nil {
			t.Start = *u.Start
		}
		if u.End != nil {
			t.End = *u.End
		}
		turns = append(turns, t)
	}

	m.mu.Lock()
	m.Turns = turns
	m.mu.Unlock()
	m.bar("done", 100)
	return nil
}

func main() {}`,
          },
          {
            label: "C#",
            language: "csharp",
            filename: "Meeting.cs",
            code: `using SpeechRevolutions;

/// <summary>One speaker turn, as the frontend wants it.</summary>
public record Turn(string? Speaker, string Text, double Start, double End);

/// <summary>Everything the frontend needs for one meeting, kept in memory.</summary>
public sealed class Meeting
{
    // Give upload the first slice of the bar; transcription fills the rest.
    private const double UploadWeight = 0.15;

    private readonly object _lock = new();

    public string Phase { get; private set; } = "starting"; // upload|transcribe|done|failed
    public double Percent { get; private set; }             // overall 0–100
    public IReadOnlyList<Turn> Turns { get; private set; } = Array.Empty<Turn>();

    public void Bar(string phase, double overall)
    {
        lock (_lock)
        {
            Phase = phase;
            Percent = Math.Max(Percent, Math.Round(overall, 1)); // never go backwards
        }
    }

    public void OnUpload(ProgressEvent e) =>
        Bar("upload", (e.Percent ?? 0) * UploadWeight);

    public void OnTranscribe(ProgressEvent e) =>
        Bar("transcribe", UploadWeight * 100 + (e.Percent ?? 0) * (1 - UploadWeight));

    public object Snapshot()
    {
        lock (_lock) return new { phase = Phase, percent = Percent, turns = Turns };
    }

    public void SetTurns(IReadOnlyList<Turn> turns)
    {
        lock (_lock) Turns = turns;
    }
}

public static class Meetings
{
    public static async Task TranscribeAsync(SpeechRevolutionsClient client, string audio, Meeting meeting)
    {
        try
        {
            var result = await client.TranscribeAsync(audio,
                new TranscribeOptions
                {
                    SpeakerLabels = true, // <- label who spoke each segment
                    OnUploadProgress = meeting.OnUpload,
                },
                meeting.OnTranscribe);

            // Turn the SDK's utterances into plain records for the UI.
            meeting.SetTurns(result.Utterances
                .Select(u => new Turn(u.Speaker, u.Text, u.Start ?? 0, u.End ?? 0))
                .ToList());
            meeting.Bar("done", 100);
        }
        catch
        {
            meeting.Bar("failed", 0);
            throw;
        }
    }
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
from fastapi import FastAPI, BackgroundTasks, HTTPException

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
    meeting = MEETINGS.get(job_id)
    if meeting is None:                       # restarted, expired, or a typo
        raise HTTPException(status_code=404, detail="unknown meeting")
    return meeting.snapshot()
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
  const meeting = meetings.get(req.params.jobId);
  if (!meeting) return res.status(404).json({ error: "unknown meeting" });
  res.json(meeting.snapshot());
  // -> { phase: "done", percent: 100, turns: [{ speaker: "A", text, start, end }, ...] }
});`,
          },
          {
            label: "Go",
            language: "go",
            filename: "net/http",
            code: `// net/http. Method patterns and r.PathValue need Go 1.22+.
var (
	meetingsMu sync.Mutex
	meetings   = map[string]*Meeting{}
)

http.HandleFunc("POST /meetings", func(w http.ResponseWriter, r *http.Request) {
	buf := make([]byte, 16)
	rand.Read(buf) // crypto/rand — no third-party uuid needed
	jobID := hex.EncodeToString(buf)
	m := &Meeting{Phase: "starting"}

	meetingsMu.Lock()
	meetings[jobID] = m
	meetingsMu.Unlock()

	go TranscribeMeeting(context.Background(), client, r.FormValue("url"), m)

	json.NewEncoder(w).Encode(map[string]string{"job_id": jobID}) // returns immediately
})

http.HandleFunc("GET /meetings/{job_id}", func(w http.ResponseWriter, r *http.Request) {
	meetingsMu.Lock()
	m, ok := meetings[r.PathValue("job_id")]
	meetingsMu.Unlock()
	if !ok {
		http.NotFound(w, r)
		return
	}
	phase, percent, turns := m.Snapshot()
	json.NewEncoder(w).Encode(map[string]any{
		"phase": phase, "percent": percent, "turns": turns,
	})
	// -> {"phase":"transcribe","percent":63.5,"turns":[]}
	//    ...and once done: "turns":[{"speaker":"A","text":"...","start":0.4,"end":5.1}, ...]
})`,
          },
          {
            label: "C#",
            language: "csharp",
            filename: "ASP.NET Core",
            code: `// ASP.NET Core minimal API.
var meetings = new System.Collections.Concurrent.ConcurrentDictionary<string, Meeting>();

app.MapPost("/meetings", (StartMeeting req) =>
{
    var jobId = Guid.NewGuid().ToString("n");
    var meeting = new Meeting();
    meetings[jobId] = meeting;

    _ = Meetings.TranscribeAsync(client, req.Url, meeting); // runs in the background

    return Results.Ok(new { jobId });                       // returns immediately
});

app.MapGet("/meetings/{jobId}", (string jobId) =>
    meetings.TryGetValue(jobId, out var meeting)
        ? Results.Ok(meeting.Snapshot())
        : Results.NotFound());
// -> { phase: "done", percent: 100, turns: [{ speaker: "A", text, start, end }, ...] }

public record StartMeeting(string Url);`,
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
        That&apos;s the whole loop: upload, a real progress bar while Speech Revolutions
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
