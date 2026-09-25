import { CodeTabs } from "@/components/CodeTabs";
import { Callout, EndpointBadge } from "@/components/DocsUI";
import { SITE } from "@/lib/constants";
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
        <code>speaker_id</code> to each word. Speech Revolutions covers the same ground —
        transcript, per-word times, and speakers — and the SDK reduces it to one{" "}
        <code>transcribe()</code> call. This guide maps auth, upload, and the
        response shape (including a token quirk to watch for), and points to where
        Speech Revolutions measures ahead for Scribe migrators.
      </p>

      <Callout title="What changes, what doesn't" tone="tip">
        <p>
          Your <code>diarize</code> flag ports as-is (Speech Revolutions accepts{" "}
          <code>diarize</code> as an alias for <code>speaker_labels</code>), and{" "}
          <code>result.text</code> maps directly. The main cleanup is dropping
          ElevenLabs&apos; <code>spacing</code> word-array tokens — the Speech Revolutions{" "}
          <code>result.words</code> are already words only.
        </p>
      </Callout>

      <h2>Authentication</h2>
      <p>
        ElevenLabs authenticates with an <code>xi-api-key</code> header. Speech Revolutions
        uses <code>X-API-Key</code>, read from the environment by the SDK.
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
                <code>POST /api/v1/upload</code> → PUT to presigned URL →{" "}
                <code>POST /api/v1/upload/complete</code>
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
      <EndpointBadge method="POST" path="/api/v1/upload" />

      <h2>Upload differences</h2>
      <p>
        ElevenLabs takes the audio as a multipart <code>file</code> field with{" "}
        <code>model_id</code> in the form body. Speech Revolutions uploads through a presigned
        object-storage URL, so bytes stream to storage rather than through the API
        request — handled by the SDK when you pass a path, URL, or bytes. Speech Revolutions
        also reports live <code>upload</code> and <code>transcribe</code> progress
        (see <Link href="/guides/live-progress">live progress</Link>).
      </p>

      <h2>Response shape</h2>
      <p>
        ElevenLabs returns <code>text</code> plus a <code>words[]</code> array in
        which entries have a <code>type</code> of <code>word</code> or{" "}
        <code>spacing</code>; the <code>spacing</code> entries are not real words.
        Speakers appear as <code>speaker_id</code> strings (e.g.{" "}
        <code>speaker_0</code>). The Speech Revolutions <code>result.words</code> contains
        words only, with matching string speaker labels.
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
              <td>— (dropped; you no longer filter these out)</td>
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
          entries, you can delete that filter — <code>result.words</code> is
          already words only.
        </p>
      </Callout>

      <h2>Diarization</h2>
      <p>
        ElevenLabs diarizes with <code>diarize=true</code>, adding a{" "}
        <code>speaker_id</code> per word. Speech Revolutions uses the same <code>diarize</code>{" "}
        flag (alias for <code>speaker_labels</code>, on by default) and also groups
        words into <code>result.utterances</code>, so you don&apos;t reconstruct
        turns from per-word ids. Diarization accuracy is a clear Speech Revolutions strength —
        it leads on every subset in our testing; see the{" "}
        <Link href="/benchmarks">benchmarks</Link> and the{" "}
        <a href={SITE.landingUrl}>comparison table</a> for the measured DER.
      </p>

      <h2>Timestamps</h2>
      <p>
        Both return per-word start/end times in seconds by default. Timestamp
        precision is another area Speech Revolutions measures well on for Scribe migrators —
        the <Link href="/benchmarks">benchmarks</Link> report the median
        word-boundary error side by side, so you can compare rather than take our
        word for it.
      </p>

      <h2>Language selection</h2>
      <p>
        ElevenLabs takes <code>language_code</code>. Speech Revolutions always
        auto-detects, and detects changes <em>within</em> a file, so a
        recording that switches languages mid-sentence comes back correctly rather than
        forced into one. Each word carries its own <code>language</code>, which is what you
        want if you are cutting subtitles per language rather than per file.
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
          <strong>Spacing tokens.</strong> The Speech Revolutions <code>words</code> array omits
          them — remove any <code>type</code> filtering.
        </li>
        <li>
          <strong>Speaker grouping.</strong> Prefer <code>result.utterances</code>{" "}
          over regrouping per-word <code>speaker_id</code> values.
        </li>
        <li>
          <strong>Keyword biasing.</strong> ElevenLabs biases Scribe v2 with keyterm
          prompting; the equivalent here is <code>custom_vocabulary</code>, which takes the
          same kind of list of domain terms.
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
