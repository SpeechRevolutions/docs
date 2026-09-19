import { CodeBlock } from "@/components/CodeBlock";
import { CodeTabs } from "@/components/CodeTabs";
import { Callout, EndpointBadge } from "@/components/DocsUI";
import { SITE } from "@/lib/constants";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Migrating from the OpenAI Whisper API to Speech Revolutions",
  description:
    "Move an OpenAI /v1/audio/transcriptions integration to Speech Revolutions: auth, multipart vs presigned upload, the 25 MB limit, and getting word timestamps + diarization in one call.",
};

export default function MigrateOpenAIWhisperPage() {
  return (
    <>
      <h1>Migrating from the OpenAI Whisper API to Speech Revolutions</h1>
      <p>
        OpenAI&apos;s transcription API is a single synchronous multipart{" "}
        <code>POST</code> to <code>/v1/audio/transcriptions</code>. It&apos;s
        simple, but three constraints tend to push teams to migrate: a hard{" "}
        <strong>25 MB file limit</strong>, and — on the current{" "}
        <code>gpt-4o-transcribe</code> model — <strong>no word-level
        timestamps</strong> and <strong>no speaker diarization</strong>. Speech Revolutions
        returns transcript, word timestamps, and diarized speaker turns from a
        single call, with no file-size ceiling in the request body.
      </p>

      <Callout title="The capability gap this closes" tone="tip">
        <p>
          On OpenAI, word timestamps require the older <code>whisper-1</code>{" "}
          model (via <code>response_format=verbose_json</code> +{" "}
          <code>timestamp_granularities</code>), and speaker labels require a
          separate <code>gpt-4o-transcribe-diarize</code> model —{" "}
          <code>gpt-4o-transcribe</code> returns text only. Speech Revolutions gives you{" "}
          <code>result.text</code>, <code>result.words</code> (with times), and{" "}
          <code>result.utterances</code> (speakers) together, every time.
        </p>
      </Callout>

      <h2>Authentication</h2>
      <p>
        OpenAI uses <code>Authorization: Bearer &lt;key&gt;</code>. Speech Revolutions uses{" "}
        <code>X-API-Key</code>, read from the environment by the SDK.
      </p>
      <table>
        <thead>
          <tr>
            <th>OpenAI</th>
            <th>Speech Revolutions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>Authorization: Bearer OPENAI_API_KEY</code>
            </td>
            <td>
              <code>X-API-Key: SPEECHREVOLUTIONS_API_KEY</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>OPENAI_API_KEY</code> env var
            </td>
            <td>
              <code>SPEECHREVOLUTIONS_API_KEY</code> or <code>STT_API_KEY</code>
            </td>
          </tr>
        </tbody>
      </table>

      <h2>Endpoint &amp; method mapping</h2>
      <table>
        <thead>
          <tr>
            <th>OpenAI</th>
            <th>Speech Revolutions REST</th>
            <th>Speech Revolutions SDK</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>POST /v1/audio/transcriptions</code> (sync multipart)
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
      <EndpointBadge method="POST" path="/api/v1/upload" />

      <h2>Upload differences &amp; the 25 MB limit</h2>
      <p>
        OpenAI expects the audio as a multipart <code>file</code> field in the
        request body, which is why the API rejects anything over{" "}
        <strong>25 MB</strong> — you have to pre-split or compress long recordings
        yourself. Speech Revolutions uploads through a presigned object-storage URL, so the
        bytes never pass through the API request body and there is no 25 MB
        request ceiling to work around. The SDK does the presign → PUT → complete
        handshake; you just pass a path, URL, or bytes.
      </p>
      <Callout title="No more chunking long files" tone="tip">
        <p>
          If you built a splitter to keep files under 25 MB for OpenAI, you can
          retire it. Send the whole recording to <code>transcribe()</code>.
        </p>
      </Callout>

      <h2>Response shape</h2>
      <p>
        With <code>response_format=json</code>, OpenAI&apos;s{" "}
        <code>gpt-4o-transcribe</code> returns essentially <code>{`{ text }`}</code>
        {" "}— no words, no segments, no speakers. Speech Revolutions returns those too:
      </p>
      <table>
        <thead>
          <tr>
            <th>OpenAI field</th>
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
              — (not returned by <code>gpt-4o-transcribe</code>)
            </td>
            <td>
              <code>result.words</code> (word + start/end/speaker, seconds)
            </td>
          </tr>
          <tr>
            <td>— (not returned)</td>
            <td>
              <code>result.utterances</code> (speaker turns)
            </td>
          </tr>
          <tr>
            <td>
              <code>language</code> (with <code>verbose_json</code>)
            </td>
            <td>
              <code>result.languages</code>
            </td>
          </tr>
        </tbody>
      </table>

      <h2>Diarization</h2>
      <p>
        <code>gpt-4o-transcribe</code> cannot diarize — you would switch to the
        separate <code>gpt-4o-transcribe-diarize</code> model (true as of the
        models available on 2026-07-23; check OpenAI&apos;s current docs before
        relying on this). Speech Revolutions diarizes in the same call: set{" "}
        <code>speaker_labels</code> (on by default) and read{" "}
        <code>result.utterances</code>. Diarization is one of Zephyr&apos;s headline strengths; the <Link href="/benchmarks">benchmarks</Link> and{" "}
        <a href={SITE.landingUrl}>comparison table</a> have the measured numbers.
      </p>

      <h2>Timestamps</h2>
      <p>
        On OpenAI, word timestamps mean dropping back to <code>whisper-1</code>{" "}
        with <code>response_format=verbose_json</code> and{" "}
        <code>timestamp_granularities: [&quot;word&quot;]</code>. On Speech Revolutions,{" "}
        <code>word_timestamps</code> is on by default and the times live on{" "}
        <code>result.words</code> in seconds — no model swap.
      </p>

      <h2>Language selection</h2>
      <p>
        OpenAI takes an ISO-639-1 <code>language</code> hint. Speech Revolutions always
        auto-detects, including code-switching mid-file — there&apos;s no
        language parameter to set. <code>result.languages</code> is a list of{" "}
        <code>{`{start, end, language}`}</code> segments covering the whole
        file, and every word in <code>result.words</code> also carries a{" "}
        <code>language</code>.
      </p>

      <h2>Custom vocabulary</h2>
      <p>
        OpenAI&apos;s only biasing lever is the free-text <code>prompt</code>{" "}
        (capped at roughly 224 tokens). Speech Revolutions takes an explicit{" "}
        <code>custom_vocabulary</code> list of domain terms.
      </p>

      <h2>Side by side</h2>
      <CodeTabs
        tabs={[
          {
            label: "Before — OpenAI (Python)",
            language: "python",
            filename: "openai_transcribe.py",
            code: `from openai import OpenAI

client = OpenAI()  # OPENAI_API_KEY

with open("meeting.mp3", "rb") as f:  # must be <= 25 MB
    resp = client.audio.transcriptions.create(
        model="gpt-4o-transcribe",
        file=f,
        response_format="json",
    )

print(resp.text)
# no word timestamps, no speakers from gpt-4o-transcribe`,
          },
          {
            label: "After — Speech Revolutions (Python)",
            language: "python",
            filename: "stt_transcribe.py",
            code: `from speechrevolutions import SpeechRevolutions

client = SpeechRevolutions()  # SPEECHREVOLUTIONS_API_KEY
result = client.transcribe("meeting.mp3", speaker_labels=True)  # any size

print(result.text)
for w in result.words:                 # word timestamps, in seconds
    print(w.text, w.start, w.end)
for u in result.utterances:            # speaker turns
    print(f"{u.speaker}: {u.text}")`,
          },
          {
            label: "After — Speech Revolutions (JavaScript)",
            language: "ts",
            filename: "stt-transcribe.mjs",
            code: `import { SpeechRevolutions } from "speechrevolutions";

const client = new SpeechRevolutions();
const result = await client.transcribe("meeting.mp3", { speakerLabels: true });

console.log(result.text);
for (const w of result.words) console.log(w.text, w.start, w.end);
for (const u of result.utterances) console.log(\`\${u.speaker}: \${u.text}\`);`,
          },
        ]}
      />

      <h2>Common pitfalls</h2>
      <ul>
        <li>
          <strong>Auth prefix.</strong> Drop <code>Bearer</code>; Speech Revolutions uses the{" "}
          <code>X-API-Key</code> header.
        </li>
        <li>
          <strong>Expecting text only.</strong> Speech Revolutions returns{" "}
          <code>words</code> and <code>utterances</code> by default — you no
          longer need a second model for timestamps or speakers.
        </li>
        <li>
          <strong>Left-over 25 MB workarounds.</strong> Chunking / compression
          steps built for OpenAI are unnecessary.
        </li>
        <li>
          <strong>Prompt-based biasing.</strong> Replace the{" "}
          <code>prompt</code> term list with <code>custom_vocabulary</code>.
        </li>
      </ul>

      <Callout title="Next steps" tone="info">
        <p>
          See the <Link href="/migrate/playbook">migration playbook</Link> for
          cutover, and the <Link href="/benchmarks">benchmarks</Link> for
          accuracy, diarization, and timestamp comparisons.
        </p>
      </Callout>
    </>
  );
}
