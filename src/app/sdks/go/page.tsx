import { CodeBlock } from "@/components/CodeBlock";
import { Callout } from "@/components/DocsUI";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Go SDK",
  description:
    "Official Go client for the Speech Revolutions STT API.",
};

export default function GoSdkPage() {
  return (
    <>
      <h1>Go SDK</h1>
      <p>Official Go client for the Speech Revolutions STT API.</p>

      <p>
        Source on 
        <a href="https://github.com/SpeechRevolutions/speechrevolutions-go">GitHub</a> &middot; 
        <a href="https://github.com/SpeechRevolutions/speechrevolutions-go/issues">
          report an issue
        </a>{" "}
        &middot; <a href="https://pkg.go.dev/github.com/speechrevolutions/speechrevolutions-go">pkg.go.dev</a>
      </p>

      <h2>Install</h2>
      <CodeBlock
        language="bash"
        code={`go get github.com/speechrevolutions/speechrevolutions-go`}
      />
      <h2>Quickstart</h2>
      <p>
        <code>Transcribe</code> accepts a local file path, an{" "}
        <code>http(s)</code> URL, or raw bytes (<code>TranscribeBytes</code>).
        The third argument is an optional transcription-progress callback
        (<code>nil</code> for none). Bool and tier options are pointers, so an
        unset field is distinct from <code>false</code> — leave them{" "}
        <code>nil</code> to accept the default.
      </p>
      <CodeBlock
        language="go"
        filename="main.go"
        code={`package main

import (
    "context"
    "fmt"
    "log"

    stt "github.com/speechrevolutions/speechrevolutions-go"
)

func main() {
    ctx := context.Background()

    client, err := stt.NewClient("") // SPEECHREVOLUTIONS_API_KEY or STT_API_KEY
    if err != nil {
        log.Fatal(err)
    }

    result, err := client.Transcribe(ctx, "meeting.mp3", stt.TranscribeOptions{
        SpeakerLabels: stt.Bool(true),
    }, nil)
    if err != nil {
        log.Fatal(err)
    }

    fmt.Println(result.Text())
    for _, u := range result.Utterances {
        fmt.Printf("Speaker %s: %s\\n", u.Speaker, u.Text)
    }
}`}
      />

      <h2>From a URL or file</h2>
      <CodeBlock
        language="go"
        code={`// explicit alias
result, err := client.TranscribeURL(ctx, "https://example.com/audio.mp3", stt.TranscribeOptions{}, nil)

// or, since Transcribe detects http(s):
result, err = client.Transcribe(ctx, "https://example.com/audio.mp3", stt.TranscribeOptions{}, nil)

// TranscribeFile is the same for a local path; TranscribeBytes for in-memory audio.`}
      />

      <h2>Options</h2>
      <p>
        <code>TranscribeOptions</code> fields — an empty{" "}
        <code>TranscribeOptions{"{}"}</code> gets all defaults applied.
      </p>
      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Type</th>
            <th>Default</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>OutputType</code>
            </td>
            <td>
              <code>OutputType</code>
            </td>
            <td>
              <code>OutputJSON</code>
            </td>
            <td>
              <code>txt | json | srt | vtt | docx | pdf</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>WordTimestamps</code>
            </td>
            <td>
              <code>*bool</code>
            </td>
            <td>
              <code>true</code>
            </td>
            <td>Per-word start/end times</td>
          </tr>
          <tr>
            <td>
              <code>SpeakerLabels</code>
            </td>
            <td>
              <code>*bool</code>
            </td>
            <td>
              <code>true</code>
            </td>
            <td>Label who spoke each segment</td>
          </tr>
          <tr>
            <td>
              <code>Diarize</code>
            </td>
            <td>
              <code>*bool</code>
            </td>
            <td>—</td>
            <td>
              Deepgram-compatible alias for <code>SpeakerLabels</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>NLTK</code>
            </td>
            <td>
              <code>*bool</code>
            </td>
            <td>
              <code>true</code>
            </td>
            <td>Restore punctuation &amp; capitalization</td>
          </tr>
          <tr>
            <td>
              <code>Tier</code>
            </td>
            <td>
              <code>*ProcessingTier</code>
            </td>
            <td>
              <code>TierStandard</code>
            </td>
            <td>
              <code>TierStandard</code> — the only tier currently available
            </td>
          </tr>
          <tr>
            <td>
              <code>CustomVocabulary</code>
            </td>
            <td>
              <code>[]string</code>
            </td>
            <td>
              <code>nil</code>
            </td>
            <td>Domain terms to bias toward</td>
          </tr>
          <tr>
            <td>
              <code>OnUploadProgress</code>
            </td>
            <td>
              <code>ProgressFunc</code>
            </td>
            <td>
              <code>nil</code>
            </td>
            <td>Upload byte-progress callback</td>
          </tr>
          <tr>
            <td>
              <code>Progress</code>
            </td>
            <td>
              <code>bool</code>
            </td>
            <td>
              <code>false</code>
            </td>
            <td>Render live console bars</td>
          </tr>
        </tbody>
      </table>

      <h2>Live progress</h2>
      <p>
        Unlike AssemblyAI and Deepgram — which expose no percentage for
        pre-recorded audio — you get real-time progress for <strong>both</strong>{" "}
        the file upload and the transcription, as a console bar, callbacks, or
        both. They compose: the bars render <em>and</em> your callbacks fire for
        every event.
      </p>
      <CodeBlock
        language="go"
        code={`// 1. Console bars — a single stderr line, updated in place. Shows an
//    "Uploading" byte bar, then a "Transcribing" bar. Off by default.
result, _ := client.Transcribe(ctx, "meeting.mp3", stt.TranscribeOptions{
    SpeakerLabels: stt.Bool(true),
    Progress:      true,
}, nil)

// 2. Programmatic — Percent() returns (float64, bool); the bool is false when
//    the total is unknown, so treat that as "unknown".
onProgress := func(e stt.ProgressEvent) { // transcription
    if pct, ok := e.Percent(); ok {
        fmt.Printf("%.0f%% %s\\n", pct, e.Step) // e.g. 42 "transcribe"
    }
}
onUpload := func(e stt.ProgressEvent) { // upload (e.Step == "upload")
    if pct, ok := e.Percent(); ok {
        fmt.Printf("upload %.0f%%\\n", pct)
    }
}

result, _ = client.Transcribe(ctx, "meeting.mp3", stt.TranscribeOptions{
    OnUploadProgress: onUpload,
    Progress:         true, // bars AND callbacks together
}, onProgress)`}
      />
      <p>
        Building a UI?{" "}
        <Link href="/guides/live-progress">Live progress for web apps</Link>{" "}
        shows how to fold both callbacks into a single 0–100 bar you can serve
        to your frontend.
      </p>

      <h2>Result shape</h2>
      <p>
        With <code>OutputJSON</code> the result is parsed into a
        transcript-first object:
      </p>
      <table>
        <thead>
          <tr>
            <th>Access</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>result.Text()</code>
            </td>
            <td>Full transcript (AssemblyAI / ElevenLabs style)</td>
          </tr>
          <tr>
            <td>
              <code>result.TranscriptText()</code>
            </td>
            <td>Deepgram-style alias</td>
          </tr>
          <tr>
            <td>
              <code>result.Words</code>
            </td>
            <td>Word + start / end / speaker</td>
          </tr>
          <tr>
            <td>
              <code>result.Utterances</code>
            </td>
            <td>AssemblyAI-style speaker turns</td>
          </tr>
          <tr>
            <td>
              <code>result.ToDeepgram()</code>
            </td>
            <td>Deepgram-shaped map</td>
          </tr>
          <tr>
            <td>
              <code>result.ToDict()</code>
            </td>
            <td>Normalized map</td>
          </tr>
          <tr>
            <td>
              <code>result.Content</code> / <code>result.Save(path)</code>
            </td>
            <td>Raw bytes / write to disk</td>
          </tr>
        </tbody>
      </table>
      <CodeBlock
        language="go"
        code={`// Save writes output.<output_type> when the path has no extension.
out, err := result.Save("output") // -> "output.json"
if err != nil {
    log.Fatal(err)
}
fmt.Println("saved to", out)`}
      />

      <h2>Webhooks</h2>
      <p>
        Set <code>CallbackURL</code> to be notified when a job finishes instead
        of holding the call open. On completion or permanent failure the
        platform POSTs a signed JSON body{" "}
        <code>
          {`{job_id, status: "completed"|"failed", download_url?, step?, reason?}`}
        </code>{" "}
        to your URL, signed with HMAC-SHA256 over the raw body in the{" "}
        <code>X-SR-Signature: sha256=&lt;hex&gt;</code> header (plus a unique{" "}
        <code>X-SR-Delivery</code> id). Verify it against the raw request bytes
        with <code>hmac</code> + <code>crypto/subtle.ConstantTimeCompare</code>.
      </p>
      <CodeBlock
        language="go"
        code={`jobID, err := client.Submit(ctx, "meeting.mp3", stt.TranscribeOptions{
    CallbackURL: "https://you.example.com/hook",
})
if err != nil {
    log.Fatal(err)
}
fmt.Println("submitted", jobID) // the hook fires when it finishes`}
      />

      <h2>Retrieve results later</h2>
      <p>
        Fetch a job by id anytime — useful after a webhook, or when rebuilding
        state after a restart. The download URL is regenerated on demand.
      </p>
      <CodeBlock
        language="go"
        filename="retrieve.go"
        code={`// List the most-recent jobs (newest first), cursor-paginated.
page, err := client.ListJobs(ctx, 10, "") // (limit, before)
if err != nil {
    log.Fatal(err)
}
fmt.Printf("%d job(s); next_before=%q\\n", len(page.Jobs), page.NextBefore)
for _, j := range page.Jobs {
    fmt.Printf("  %s  (%s)\\n", j.JobID, j.CreatedAt)
}

// Poll a job by id, then fetch its transcript.
status, err := client.GetJobStatus(ctx, jobID)
if err != nil {
    log.Fatal(err)
}
fmt.Println("status:", status.Status)
if status.IsCompleted() {
    result, err := client.GetTranscript(ctx, jobID, stt.OutputJSON)
    if err != nil {
        log.Fatal(err)
    }
    fmt.Println(result.Text())
} else if status.IsFailed() {
    fmt.Println(status.FailedStage, status.Reason)
}`}
      />

      <h2>Auth</h2>
      <CodeBlock
        language="bash"
        code={`export SPEECHREVOLUTIONS_API_KEY=stt_...
# or
export STT_API_KEY=stt_...`}
      />
      <CodeBlock
        language="go"
        code={`client, _ := stt.NewClient("")           // reads the env vars above
explicit, _ := stt.NewClient("stt_...")  // or pass it directly`}
      />

      <Callout title="Under the hood" tone="info">
        <p>
          The SDK drives the{" "}
          <Link href="/api-reference/upload">/api/v1/upload</Link> flow and
          waits on the{" "}
          <Link href="/api-reference/jobs">SSE job stream</Link>, converting the
          server&apos;s <code>completed</code>/<code>total</code> counts into a{" "}
          <code>Percent()</code> for you.
        </p>
      </Callout>
    </>
  );
}
