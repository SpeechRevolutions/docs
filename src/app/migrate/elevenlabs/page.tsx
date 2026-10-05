import { CodeTabs } from "@/components/CodeTabs";
import { Callout } from "@/components/DocsUI";
import { LIMITS, SITE } from "@/lib/constants";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Migrating from ElevenLabs to Speech Revolutions",
  description:
    "Move an ElevenLabs Scribe integration to Speech Revolutions: xi-api-key auth, multipart vs presigned upload, the spacing-token quirk, diarization, and timestamps.",
};

export default function MigrateElevenLabsPage() {
  return (
    <>
      <h1>Migrating from ElevenLabs to Speech Revolutions</h1>
      <p>
        ElevenLabs&apos; Scribe speech-to-text is a single synchronous multipart{" "}
        <code>POST</code> to <code>/v1/speech-to-text</code>. Word timestamps come
        back by default and <code>diarize=true</code> adds a{" "}
        <code>speaker_id</code> to each word. Speech Revolutions returns the same data
        (transcript, per-word times, and speakers), and the SDK does it in one{" "}
        <code>transcribe()</code> call. This guide maps authentication, upload, and the
        response shape, including the <code>spacing</code> tokens you no longer need to
        filter.
      </p>

      <Callout title="What changes, what doesn't" tone="tip">
        <p>
          Your <code>diarize</code> flag works unchanged (Speech Revolutions accepts{" "}
          <code>diarize</code> as an alias for <code>speaker_labels</code>), and{" "}
          <code>result.text</code> maps directly. The main change is removing handling for
          ElevenLabs&apos; <code>spacing</code> tokens: <code>result.words</code> contains
          only words.
        </p>
      </Callout>

      <h2>Authentication</h2>
      <p>
        ElevenLabs authenticates with an <code>xi-api-key</code> header. Speech Revolutions
        uses <code>X-API-Key</code>. The SDK reads the key from the environment.
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>ElevenLabs</th>
              <th>Speech Revolutions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>xi-api-key: ELEVENLABS_API_KEY</code>
              </td>
              <td>
                <code>X-API-Key: SPEECHREVOLUTIONS_API_KEY</code>
              </td>
            </tr>
            <tr>
              <td>
                <code>ELEVENLABS_API_KEY</code> env var
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
              <th>ElevenLabs</th>
              <th>Speech Revolutions REST</th>
              <th>Speech Revolutions SDK</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>POST /v1/speech-to-text</code> (sync multipart,{" "}
                <code>model_id</code>)
              </td>
              <td>
                <code>POST /api/v1/transcribe</code> (raw bytes in, transcript streamed back;
                up to {LIMITS.apiUploadMax})
              </td>
              <td>
                <code>transcribe()</code> (blocks until done)
              </td>
            </tr>
            <tr>
              <td>— (response is inline)</td>
              <td>
                <code>GET /api/v1/jobs/{`{id}`}</code> / <code>/stream</code>
              </td>
              <td>
                <code>get_transcript()</code> / <code>on_progress</code>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>Upload differences</h2>
      <p>
        ElevenLabs takes the audio as a multipart <code>file</code> field with{" "}
        <code>model_id</code> in the form body. With Speech Revolutions, you pass a path, URL,
        or bytes to the SDK, which uploads the file to storage in parts. Speech Revolutions
        also reports live <code>upload</code> and <code>transcribe</code> progress (see{" "}
        <Link href="/guides/live-progress">live progress</Link>).
      </p>

      <h2>Response shape</h2>
      <p>
        ElevenLabs returns <code>text</code> plus a <code>words[]</code> array in
        which entries have a <code>type</code> of <code>word</code> or{" "}
        <code>spacing</code>; the <code>spacing</code> entries are not real words.
        Speakers appear as <code>speaker_id</code> strings (for example,{" "}
        <code>speaker_0</code>). Speech Revolutions&apos; <code>result.words</code> contains
        only words, with string speaker labels.
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>ElevenLabs field</th>
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
                <code>words[]</code> where <code>type == &quot;word&quot;</code> (
                <code>text</code>, <code>start</code>, <code>end</code>,{" "}
                <code>speaker_id</code>)
              </td>
              <td>
                <code>result.words</code> (<code>text</code>, <code>start</code>,{" "}
                <code>end</code>, <code>speaker</code>) — no spacing tokens
              </td>
            </tr>
            <tr>
              <td>
                <code>words[]</code> where <code>type == &quot;spacing&quot;</code>
              </td>
              <td>— (not returned; no filtering needed)</td>
            </tr>
            <tr>
              <td>— (regroup by <code>speaker_id</code> yourself)</td>
              <td>
                <code>result.utterances</code> (pre-grouped speaker turns)
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
      <Callout title="Retire the spacing filter" tone="info">
        <p>
          If your code skips <code>word.type === &quot;spacing&quot;</code>{" "}
          entries, delete that filter. <code>result.words</code> contains only words.
        </p>
      </Callout>

      <h2>Diarization</h2>
      <p>
        ElevenLabs diarizes with <code>diarize=true</code>, adding a{" "}
        <code>speaker_id</code> per word. Speech Revolutions uses the same <code>diarize</code>{" "}
        flag (an alias for <code>speaker_labels</code>, on by default) and also groups
        words into <code>result.utterances</code>, so you don&apos;t need to rebuild turns
        from per-word IDs. For measured diarization error rate (DER), see the{" "}
        <Link href="/benchmarks">benchmarks</Link> and the{" "}
        <a href={SITE.landingUrl}>comparison table</a>.
      </p>

      <h2>Timestamps</h2>
      <p>
        Both return per-word start and end times in seconds by default. The{" "}
        <Link href="/benchmarks">benchmarks</Link> compare median word-boundary error
        side by side.
      </p>

      <h2>Language selection</h2>
      <p>
        ElevenLabs takes <code>language_code</code>. Speech Revolutions auto-detects by
        default and detects language changes <em>within</em> a file, so a recording that
        switches languages mid-sentence is transcribed in each language. Each word has its
        own <code>language</code>, which you can use to split subtitles by language. To set
        a fixed language, pass <code>language</code> with an ISO 639-1 code (for example,{" "}
        <code>en</code>). This skips detection, including mid-file switching. See{" "}
        <Link href="/cookbook#pin-language">pinning the language</Link>.
      </p>

      <h2>Side by side</h2>
      <CodeTabs
        tabs={[
          {
            label: "Before — ElevenLabs (Python)",
            language: "python",
            filename: "elevenlabs_transcribe.py",
            code: `from elevenlabs.client import ElevenLabs

client = ElevenLabs()  # ELEVENLABS_API_KEY

with open("meeting.mp3", "rb") as f:
    resp = client.speech_to_text.convert(
        model_id="scribe_v2",
        file=f,
        diarize=True,
    )

print(resp.text)
for w in resp.words:
    if w.type == "word":                       # skip spacing tokens
        print(w.speaker_id, w.text, w.start, w.end)`,
          },
          {
            label: "After — Speech Revolutions (Python)",
            language: "python",
            filename: "stt_transcribe.py",
            code: `from speechrevolutions import SpeechRevolutions

client = SpeechRevolutions()  # SPEECHREVOLUTIONS_API_KEY
result = client.transcribe("meeting.mp3", diarize=True)  # same flag name

print(result.text)
for w in result.words:                          # already words only
    print(w.speaker, w.text, w.start, w.end)
for u in result.utterances:                     # pre-grouped speaker turns
    print(f"{u.speaker}: {u.text}")`,
          },
          {
            label: "After — Speech Revolutions (JavaScript)",
            language: "ts",
            filename: "stt-transcribe.mjs",
            code: `import { SpeechRevolutions } from "speechrevolutions";

const client = new SpeechRevolutions();
const result = await client.transcribe("meeting.mp3", { diarize: true });

console.log(result.text);
for (const u of result.utterances) {
  console.log(\`\${u.speaker}: \${u.text}\`);
}`,
          },
        ]}
      />

      <h2>Common pitfalls</h2>
      <ul>
        <li>
          <strong>Auth header.</strong> <code>xi-api-key</code> →{" "}
          <code>X-API-Key</code>.
        </li>
        <li>
          <strong>Spacing tokens.</strong> The <code>words</code> array omits them. Remove any{" "}
          <code>type</code> filtering.
        </li>
        <li>
          <strong>Speaker grouping.</strong> Use <code>result.utterances</code> instead of
          regrouping per-word <code>speaker_id</code> values.
        </li>
        <li>
          <strong>Keyword biasing.</strong> Scribe v2 keyterm prompting maps to{" "}
          <code>custom_vocabulary</code>, a list of domain terms.
        </li>
      </ul>

      <Callout title="Next steps" tone="info">
        <p>
          See the <Link href="/migrate/playbook">migration playbook</Link> for
          cutover, and the <Link href="/benchmarks">benchmarks</Link> for
          diarization and timestamp comparisons.
        </p>
      </Callout>
    </>
  );
}
