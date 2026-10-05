import { CodeBlock } from "@/components/CodeBlock";
import { CodeTabs } from "@/components/CodeTabs";
import { Callout } from "@/components/DocsUI";
import { LIMITS, SITE } from "@/lib/constants";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Migrating from AssemblyAI to Speech Revolutions",
  description:
    "Move an AssemblyAI integration to Speech Revolutions: auth, the upload-submit-poll flow, response fields, and millisecond vs second timestamps.",
};

export default function MigrateAssemblyAIPage() {
  return (
    <>
      <h1>Migrating from AssemblyAI to Speech Revolutions</h1>
      <p>
        AssemblyAI already uses an async flow: upload the file to{" "}
        <code>/v2/upload</code>, submit a job to <code>/v2/transcript</code>, then
        poll <code>/v2/transcript/{`{id}`}</code> until{" "}
        <code>status === &quot;completed&quot;</code>. Speech Revolutions follows the
        same async model. The SDK runs all three steps in one blocking{" "}
        <code>transcribe()</code> call, or you can keep them separate with{" "}
        <code>submit()</code> and <code>get_transcript()</code>.
      </p>

      <Callout title="Familiar ergonomics" tone="tip">
        <p>
          <code>result.text</code> and <code>result.utterances</code> map directly
          to AssemblyAI&apos;s <code>text</code> and <code>utterances</code>. The SDK
          accepts options as keyword arguments or as a{" "}
          <code>TranscribeOptions</code> config object, like AssemblyAI&apos;s{" "}
          <code>TranscriptionConfig</code>.
        </p>
      </Callout>

      <h2>Authentication</h2>
      <p>
        AssemblyAI sends the key in a bare <code>authorization</code> header (no{" "}
        <code>Bearer</code> prefix). Speech Revolutions uses <code>X-API-Key</code>, read from
        the environment by the SDK.
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>AssemblyAI</th>
              <th>Speech Revolutions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>authorization: ASSEMBLYAI_API_KEY</code>
              </td>
              <td>
                <code>X-API-Key: SPEECHREVOLUTIONS_API_KEY</code>
              </td>
            </tr>
            <tr>
              <td>
                <code>ASSEMBLYAI_API_KEY</code> env var
              </td>
              <td>
                <code>SPEECHREVOLUTIONS_API_KEY</code>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>Endpoint &amp; method mapping</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>AssemblyAI</th>
              <th>Speech Revolutions REST</th>
              <th>Speech Revolutions SDK</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>POST /v2/upload</code> (raw bytes → <code>upload_url</code>)
              </td>
              <td rowSpan={2}>
                <code>POST /api/v1/transcribe</code> (raw bytes in, transcript streamed back;
                up to {LIMITS.apiUploadMax})
              </td>
              <td rowSpan={2}>
                <code>submit()</code> (or <code>transcribe()</code> to also wait)
              </td>
            </tr>
            <tr>
              <td>
                <code>POST /v2/transcript</code> (<code>audio_url</code> → job id)
              </td>
            </tr>
            <tr>
              <td>
                <code>GET /v2/transcript/{`{id}`}</code> (poll until{" "}
                <code>completed</code>)
              </td>
              <td>
                <code>GET /api/v1/jobs/{`{id}`}</code> or{" "}
                <code>/stream</code> (SSE)
              </td>
              <td>
                <code>get_job_status()</code> / <code>get_transcript()</code>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        AssemblyAI uploads first, returns an <code>upload_url</code>, then creates a
        transcript from it. In a Speech Revolutions SDK this is one call: pass a path or URL
        to <code>transcribe()</code> and it uploads the file, waits, and returns the
        transcript. To test from a terminal, <code>/api/v1/transcribe</code> does the same in
        one request.
      </p>

      <h2>Upload differences</h2>
      <p>
        Both platforms accept a hosted URL. If you already pass an{" "}
        <code>audio_url</code> that points at your own storage, pass the same URL to{" "}
        <code>transcribe()</code>. For local files, AssemblyAI streams bytes to{" "}
        <code>/v2/upload</code>; Speech Revolutions streams them to a presigned
        object-storage URL. Speech Revolutions also reports live <code>upload</code> and{" "}
        <code>transcribe</code> progress that you can render as a progress bar instead of
        polling a status field (see <Link href="/guides/live-progress">live progress</Link>).
      </p>

      <h2>Response shape</h2>
      <p>
        AssemblyAI returns a flat object with <code>text</code> and a{" "}
        <code>words[]</code> array, with timestamps in <strong>milliseconds</strong>.
        Speech Revolutions returns timestamps in <strong>seconds</strong>.
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>AssemblyAI field</th>
              <th>Speech Revolutions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>text</code>
              </td>
              <td>
                <code>result.text</code>
              </td>
            </tr>
            <tr>
              <td>
                <code>words[]</code> (<code>text</code>, <code>start</code>/
                <code>end</code> in <strong>ms</strong>, <code>speaker</code>)
              </td>
              <td>
                <code>result.words</code> (<code>text</code>, <code>start</code>/
                <code>end</code> in <strong>seconds</strong>, <code>speaker</code>)
              </td>
            </tr>
            <tr>
              <td>
                <code>utterances[]</code> (speaker turns)
              </td>
              <td>
                <code>result.utterances</code>
              </td>
            </tr>
            <tr>
              <td>
                <code>language_code</code>
              </td>
              <td>
                <code>result.languages</code>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <Callout title="Watch the units" tone="warn">
        <p>
          AssemblyAI timestamps are in milliseconds; Speech Revolutions timestamps are in
          seconds. If your code divides by 1000, remove that step.
        </p>
      </Callout>

      <h2>Diarization</h2>
      <p>
        AssemblyAI enables diarization with <code>speaker_labels: true</code>.
        Speech Revolutions uses the same <code>speaker_labels</code> flag (on by default) and
        returns <code>utterances</code> in the same way, so speaker-turn code ports with
        few changes. For diarization accuracy, see the{" "}
        <Link href="/benchmarks">benchmarks</Link> and the{" "}
        <a href={SITE.landingUrl}>comparison table</a>.
      </p>

      <h2>Timestamps</h2>
      <p>
        Both return word timestamps. The only change is the unit (milliseconds →
        seconds). For timestamp precision, see the{" "}
        <Link href="/benchmarks">benchmarks</Link>.
      </p>

      <h2>Language selection</h2>
      <p>
        AssemblyAI takes <code>language_code</code>, or{" "}
        <code>language_detection: true</code> to auto-detect. Speech Revolutions
        auto-detects by default, so remove <code>language_detection</code> from your
        request. Detection runs per segment, so <code>result.languages</code> reports
        language spans rather than one language for the whole file. To set a fixed
        language, replace <code>language_code</code> with <code>language</code> and an
        ISO 639-1 code (for example, <code>en</code>). This skips detection for the whole
        file; see <Link href="/cookbook#pin-language">pinning the language</Link>.
      </p>

      <h2>Side by side</h2>
      <CodeTabs
        tabs={[
          {
            label: "Before — AssemblyAI (Python)",
            language: "python",
            filename: "assemblyai_transcribe.py",
            code: `import assemblyai as aai

aai.settings.api_key = "..."  # ASSEMBLYAI_API_KEY
transcriber = aai.Transcriber()

config = aai.TranscriptionConfig(speaker_labels=True)
transcript = transcriber.transcribe("meeting.mp3", config)  # uploads + polls

print(transcript.text)
for u in transcript.utterances:
    print(f"{u.speaker}: {u.text}")
for w in transcript.words:
    print(w.text, w.start, w.end)  # start/end in milliseconds`,
          },
          {
            label: "After — Speech Revolutions (Python)",
            language: "python",
            filename: "stt_transcribe.py",
            code: `from speechrevolutions import SpeechRevolutions, TranscribeOptions

client = SpeechRevolutions()  # SPEECHREVOLUTIONS_API_KEY
# config-object style, like AssemblyAI's TranscriptionConfig
result = client.transcribe(
    "meeting.mp3",
    options=TranscribeOptions(speaker_labels=True),
)

print(result.text)
for u in result.utterances:
    print(f"{u.speaker}: {u.text}")
for w in result.words:
    print(w.text, w.start, w.end)  # start/end in seconds`,
          },
          {
            label: "After — Speech Revolutions (JavaScript)",
            language: "ts",
            filename: "stt-transcribe.mjs",
            code: `import { SpeechRevolutions } from "speechrevolutions";

const client = new SpeechRevolutions();
const result = await client.transcribe("meeting.mp3", { speakerLabels: true });

console.log(result.text);
for (const u of result.utterances) {
  console.log(\`\${u.speaker}: \${u.text}\`);
}`,
          },
        ]}
      />

      <h2>Non-blocking, if you polled before</h2>
      <p>
        If your AssemblyAI code submits and polls on its own schedule (for example, from a
        worker), use <code>submit()</code> and <code>get_job_status()</code> instead of the
        blocking <code>transcribe()</code>:
      </p>
      <CodeBlock
        language="python"
        code={`job_id = client.submit("meeting.mp3", speaker_labels=True)

status = client.get_job_status(job_id)
if status.is_completed:
    result = client.get_transcript(job_id)
    print(result.text)`}
      />
      <p>
        To skip polling, set a <code>callback_url</code>{" "}
        <Link href="/guides/webhooks">webhook</Link>. Speech Revolutions sends a signed POST
        when the job finishes.
      </p>

      <h2>Common pitfalls</h2>
      <ul>
        <li>
          <strong>Timestamp units.</strong> Milliseconds → seconds. This is the most
          common bug after migrating.
        </li>
        <li>
          <strong>Auth header name.</strong> <code>authorization</code> →{" "}
          <code>X-API-Key</code>.
        </li>
        <li>
          <strong>Upload flow.</strong> AssemblyAI uploads, then references the upload URL in a
          second request. The Speech Revolutions SDK does both in one{" "}
          <code>transcribe()</code> call.
        </li>
        <li>
          <strong>Keyword biasing.</strong> AssemblyAI&apos;s{" "}
          <code>keyterms_prompt</code> and the deprecated <code>word_boost</code> both map
          to <code>custom_vocabulary</code>.
        </li>
      </ul>

      <Callout title="Next steps" tone="info">
        <p>
          See the <Link href="/migrate/playbook">migration playbook</Link> for cutover,
          and the <Link href="/benchmarks">benchmarks</Link> for accuracy, diarization,
          and timestamp precision.
        </p>
      </Callout>
    </>
  );
}
