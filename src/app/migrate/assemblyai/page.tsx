import { CodeBlock } from "@/components/CodeBlock";
import { CodeTabs } from "@/components/CodeTabs";
import { Callout, EndpointBadge } from "@/components/DocsUI";
import { SITE } from "@/lib/constants";
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
        <code>status === &quot;completed&quot;</code>. The Speech Revolutions model is the
        same shape, so if you&apos;re used to AssemblyAI&apos;s upload-then-poll
        rhythm you&apos;ll feel at home. The Speech Revolutions SDK collapses all three steps
        into one blocking <code>transcribe()</code>, or keeps them separate with{" "}
        <code>submit()</code> + <code>get_transcript()</code>.
      </p>

      <Callout title="Familiar ergonomics" tone="tip">
        <p>
          The Speech Revolutions <code>result.text</code> and{" "}
          <code>result.utterances</code> match AssemblyAI&apos;s{" "}
          <code>text</code> and speaker-utterance model directly, and the SDK
          accepts options either as keyword arguments or as a{" "}
          <code>TranscribeOptions</code> config object — the AssemblyAI style.
        </p>
      </Callout>

      <h2>Authentication</h2>
      <p>
        AssemblyAI sends the key in a bare <code>authorization</code> header (no{" "}
        <code>Bearer</code> prefix). Speech Revolutions uses <code>X-API-Key</code>, read from
        the environment by the SDK.
      </p>
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

      <h2>Endpoint &amp; method mapping</h2>
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
            <td>
              <code>POST /api/v1/upload</code> → PUT to presigned URL
            </td>
            <td rowSpan={2}>
              <code>submit()</code> (or <code>transcribe()</code> to also wait)
            </td>
          </tr>
          <tr>
            <td>
              <code>POST /v2/transcript</code> (<code>audio_url</code> → job id)
            </td>
            <td>
              <code>POST /api/v1/upload/complete</code>
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
      <EndpointBadge method="POST" path="/api/v1/upload" />
      <p>
        Note the ordering difference: AssemblyAI uploads first and gets an{" "}
        <code>upload_url</code> it then references in the transcript request.
        Speech Revolutions issues the presigned URL <em>first</em> (from{" "}
        <code>/api/v1/upload</code>), you PUT the bytes to it, then confirm with{" "}
        <code>/api/v1/upload/complete</code>. The SDK handles the ordering.
      </p>

      <h2>Upload differences</h2>
      <p>
        Both platforms are async and both accept a hosted URL, so if you already
        pass <code>audio_url</code> pointing at your own storage, hand the same
        URL to <code>transcribe()</code>. For local files, AssemblyAI streams
        bytes to <code>/v2/upload</code>; Speech Revolutions streams them to a presigned
        object-storage URL. Speech Revolutions additionally surfaces live{" "}
        <code>upload</code> and <code>transcribe</code> progress you can render as
        a bar (see <Link href="/guides/live-progress">live progress</Link>),
        rather than polling a status field.
      </p>

      <h2>Response shape</h2>
      <p>
        AssemblyAI returns a flat object with <code>text</code> and a{" "}
        <code>words[]</code> array. Timestamps are in{" "}
        <strong>milliseconds</strong>. Speech Revolutions returns times in{" "}
        <strong>seconds</strong>.
      </p>
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
      <Callout title="Watch the units" tone="warn">
        <p>
          AssemblyAI timestamps are milliseconds; Speech Revolutions timestamps are seconds.
          If you divide by 1000 anywhere, remove that step after migrating.
        </p>
      </Callout>

      <h2>Diarization</h2>
      <p>
        AssemblyAI enables diarization with <code>speaker_labels: true</code>.
        Speech Revolutions uses the same <code>speaker_labels</code> flag (on by default) and
        exposes the same <code>utterances</code> concept, so speaker-turn code
        ports almost verbatim. Zephyr&apos;s diarization accuracy leads the field
        in our testing — see the <Link href="/benchmarks">benchmarks</Link> and
        the <a href={SITE.landingUrl}>comparison table</a>.
      </p>

      <h2>Timestamps</h2>
      <p>
        Word timestamps are always available on both. The only change is the unit
        (ms → seconds). Speech Revolutions also measures well on timestamp precision; the{" "}
        <Link href="/benchmarks">benchmarks</Link> have the figures.
      </p>

      <h2>Language selection</h2>
      <p>
        AssemblyAI takes <code>language_code</code>, or{" "}
        <code>language_detection: true</code> to auto-detect. Speech Revolutions always
        auto-detects, including code-switching mid-file — there&apos;s no
        language parameter to set. Read the detected language(s) back from{" "}
        <code>result.languages</code>, a list of{" "}
        <code>{`{start, end, language}`}</code> segments covering the whole
        file (and every word in <code>result.words</code> also carries a{" "}
        <code>language</code>).
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
        If your AssemblyAI code submits and polls on its own schedule (e.g. from a
        worker), mirror it with <code>submit()</code> + <code>get_job_status()</code>{" "}
        instead of the blocking <code>transcribe()</code>:
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
        Or skip polling entirely with a <code>callback_url</code> webhook — the
        platform POSTs a signed notification when the job finishes.
      </p>

      <h2>Common pitfalls</h2>
      <ul>
        <li>
          <strong>Timestamp units.</strong> Milliseconds → seconds. This is the
          most common bug after migrating.
        </li>
        <li>
          <strong>Auth header name.</strong> <code>authorization</code> →{" "}
          <code>X-API-Key</code>.
        </li>
        <li>
          <strong>Upload ordering.</strong> Speech Revolutions presigns before you PUT bytes;
          AssemblyAI uploads then references a URL. Irrelevant if you use the SDK.
        </li>
        <li>
          <strong>Keyword biasing.</strong> AssemblyAI&apos;s{" "}
          <code>word_boost</code> becomes{" "}
          <code>custom_vocabulary</code>.
        </li>
      </ul>

      <Callout title="Next steps" tone="info">
        <p>
          The <Link href="/migrate/playbook">migration playbook</Link> covers
          cutover; the <Link href="/benchmarks">benchmarks</Link> cover accuracy,
          diarization, and timestamp precision.
        </p>
      </Callout>
    </>
  );
}
