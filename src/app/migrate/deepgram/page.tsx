import { CodeBlock } from "@/components/CodeBlock";
import { CodeTabs } from "@/components/CodeTabs";
import { Callout } from "@/components/DocsUI";
import { LIMITS, SITE } from "@/lib/constants";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Migrating from Deepgram to Speech Revolutions",
  description:
    "Move a Deepgram Nova-3 integration to Speech Revolutions: auth, endpoint mapping, response shapes, and the to_deepgram() escape hatch.",
};

export default function MigrateDeepgramPage() {
  return (
    <>
      <h1>Migrating from Deepgram to Speech Revolutions</h1>
      <p>
        Deepgram&apos;s pre-recorded API is a single synchronous{" "}
        <code>POST</code>: you send raw audio bytes to{" "}
        <code>/v1/listen</code> and get the full transcript back in one
        response. Speech Revolutions uses an upload-then-wait flow, and the SDK wraps it in
        one <code>transcribe()</code> call, so most of the migration is renaming. This guide
        maps each part of the API, including the <code>to_deepgram()</code> helper, which
        returns Deepgram-shaped JSON so your existing response parsing keeps working.
      </p>

      <Callout title="The one-line version" tone="tip">
        <p>
          Speech Revolutions accepts Deepgram&apos;s <code>diarize=true</code> as an alias
          for <code>speaker_labels</code>. <code>result.to_deepgram()</code> returns the
          output in the <code>results.channels[0].alternatives[0]</code> structure you
          already parse.
        </p>
      </Callout>

      <h2>Authentication</h2>
      <p>
        Deepgram authenticates with an <code>Authorization: Token &lt;key&gt;</code>{" "}
        header. Speech Revolutions uses an <code>X-API-Key</code> header. The SDKs read the
        key from the environment.
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Deepgram</th>
              <th>Speech Revolutions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>Authorization: Token DEEPGRAM_API_KEY</code>
              </td>
              <td>
                <code>X-API-Key: SPEECHREVOLUTIONS_API_KEY</code>
              </td>
            </tr>
            <tr>
              <td>
                <code>DEEPGRAM_API_KEY</code> env var
              </td>
              <td>
                <code>SPEECHREVOLUTIONS_API_KEY</code>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <CodeBlock
        language="bash"
        code={`# was
export DEEPGRAM_API_KEY=...
# now
export SPEECHREVOLUTIONS_API_KEY=stt_...`}
      />

      <h2>Endpoint &amp; method mapping</h2>
      <p>
        Deepgram uses one synchronous endpoint. Speech Revolutions separates job creation
        and retrieval. The SDK&apos;s <code>transcribe()</code> runs the whole flow and
        blocks until the transcript is ready, which is the closest equivalent to a single
        Deepgram call.
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Deepgram</th>
              <th>Speech Revolutions REST</th>
              <th>Speech Revolutions SDK</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>POST /v1/listen</code> (sync)
              </td>
              <td>
                <code>POST /api/v1/transcribe</code> (raw bytes in, transcript streamed back;
                up to {LIMITS.apiUploadMax})
              </td>
              <td>
                <code>transcribe()</code> (blocks) or <code>submit()</code>{" "}
                (non-blocking)
              </td>
            </tr>
            <tr>
              <td>— (response is inline)</td>
              <td>
                <code>GET /api/v1/jobs/{`{id}`}/stream</code> (SSE progress)
              </td>
              <td>
                <code>on_progress</code> callback
              </td>
            </tr>
            <tr>
              <td>— (response is inline)</td>
              <td>
                <code>GET /api/v1/jobs/{`{id}`}</code>
              </td>
              <td>
                <code>get_job_status()</code> / <code>get_transcript()</code>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>Upload differences</h2>
      <p>
        Deepgram takes raw audio bytes directly in the request body with a{" "}
        <code>Content-Type</code> that matches the file. With Speech Revolutions, you pass a
        path, URL, bytes, or file object to the SDK&apos;s <code>transcribe()</code>, which
        uploads large files to object storage in parts. Speech Revolutions also reports{" "}
        <code>upload</code> and <code>transcribe</code> progress; Deepgram reports no
        progress for pre-recorded audio.
      </p>

      <h2>Response shape</h2>
      <p>
        Deepgram nests everything under{" "}
        <code>results.channels[0].alternatives[0]</code>, with word-level
        speakers as integers. Speech Revolutions returns a flat transcript object. The
        fields map as follows:
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Deepgram field</th>
              <th>Speech Revolutions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>...alternatives[0].transcript</code>
              </td>
              <td>
                <code>result.text</code> (or <code>result.transcript</code>)
              </td>
            </tr>
            <tr>
              <td>
                <code>...alternatives[0].words[]</code> (<code>word</code>,{" "}
                <code>start</code>, <code>end</code>)
              </td>
              <td>
                <code>result.words</code> (<code>text</code>, <code>start</code>,{" "}
                <code>end</code>)
              </td>
            </tr>
            <tr>
              <td>
                per-word <code>speaker</code> (integer, e.g. <code>0</code>)
              </td>
              <td>
                per-word <code>speaker</code> (string, e.g.{" "}
                <code>SPEAKER_1</code>) plus <code>result.utterances</code>{" "}
                (grouped speaker turns)
              </td>
            </tr>
            <tr>
              <td>
                <code>results.channels[0].detected_language</code>
              </td>
              <td>
                <code>result.languages</code>
              </td>
            </tr>
            <tr>
              <td>the whole Deepgram JSON</td>
              <td>
                <code>result.to_deepgram()</code> reproduces it
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <Callout title="Drop-in for existing parsers" tone="info">
        <p>
          If your code already reads{" "}
          <code>results.channels[0].alternatives[0]</code>, call{" "}
          <code>result.to_deepgram()</code> and pass the result to your existing code
          unchanged.
        </p>
      </Callout>
      <CodeBlock
        language="python"
        code={`dg = result.to_deepgram()
print(dg["results"]["channels"][0]["alternatives"][0]["transcript"])`}
      />

      <h2>Diarization</h2>
      <p>
        Deepgram diarizes with <code>diarize=true</code>, tagging each word with
        an integer speaker. Speech Revolutions accepts the same <code>diarize</code> flag (an
        alias for <code>speaker_labels</code>) and also groups words into{" "}
        <code>result.utterances</code>, so you don&apos;t need to rebuild speaker turns
        from per-word labels. For diarization accuracy, see the{" "}
        <Link href="/benchmarks">benchmarks</Link> and the{" "}
        <a href={SITE.landingUrl}>comparison table</a>.
      </p>

      <h2>Timestamps</h2>
      <p>
        Both return per-word start and end times in <strong>seconds</strong>. Speech
        Revolutions enables word timestamps by default (<code>word_timestamps=true</code>)
        and returns them on <code>result.words</code>.
      </p>

      <h2>Language selection</h2>
      <p>
        Deepgram takes a BCP-47 <code>language</code> query param, or{" "}
        <code>detect_language=true</code> to auto-detect. Speech Revolutions auto-detects by
        default, so remove <code>detect_language</code> from your request. Detection runs
        per segment, not per request: <code>result.languages</code> returns language spans,
        so a bilingual recording is labeled with both languages. To set a fixed language,
        pass <code>language</code> with an ISO 639-1 code, so <code>en-US</code> becomes{" "}
        <code>en</code>. This skips detection for the whole file; see{" "}
        <Link href="/cookbook#pin-language">pinning the language</Link>.
      </p>

      <h2>Side by side</h2>
      <p>
        Diarized transcription, before and after. The &quot;before&quot; example uses{" "}
        <code>deepgram-sdk</code> v3; v4 has the same shape. The v5 client is different, so
        if you use v5 or newer, your existing code differs from this example. The Speech
        Revolutions code is the same either way.
      </p>
      <CodeTabs
        tabs={[
          {
            label: "Before — Deepgram (Python)",
            language: "python",
            filename: "deepgram_transcribe.py",
            code: `from deepgram import DeepgramClient, PrerecordedOptions

dg = DeepgramClient()  # DEEPGRAM_API_KEY

with open("meeting.mp3", "rb") as f:
    source = {"buffer": f.read(), "mimetype": "audio/mp3"}

options = PrerecordedOptions(model="nova-3", diarize=True, smart_format=True)
resp = dg.listen.rest.v("1").transcribe_file(source, options)

alt = resp["results"]["channels"][0]["alternatives"][0]
print(alt["transcript"])
for w in alt["words"]:
    print(w["speaker"], w["word"], w["start"], w["end"])`,
          },
          {
            label: "After — Speech Revolutions (Python)",
            language: "python",
            filename: "stt_transcribe.py",
            code: `from speechrevolutions import SpeechRevolutions

client = SpeechRevolutions()  # SPEECHREVOLUTIONS_API_KEY
result = client.transcribe("meeting.mp3", diarize=True)  # same flag name

print(result.text)
for w in result.words:
    print(w.speaker, w.text, w.start, w.end)

# grouped speaker turns, no reconstruction needed
for u in result.utterances:
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
}

// keep your Deepgram parser working:
const dg = result.toDeepgram();
console.log(dg.results.channels[0].alternatives[0].transcript);`,
          },
        ]}
      />

      <h2>Common pitfalls</h2>
      <ul>
        <li>
          <strong>Auth header.</strong> Use <code>X-API-Key</code>, not{" "}
          <code>Authorization: Token</code>. The SDK sets it for you; update any direct
          HTTP calls.
        </li>
        <li>
          <strong>Speaker type.</strong> Speech Revolutions speakers are strings
          (<code>SPEAKER_1</code>), not integers. Use{" "}
          <code>result.utterances</code> instead of grouping words yourself, or
          call <code>to_deepgram()</code> for the integer form.
        </li>
        <li>
          <strong>No inline response.</strong> Each request creates a job that you wait on.{" "}
          <code>transcribe()</code> handles this. If you call the REST API directly, follow
          the upload → complete → poll or stream flow.
        </li>
        <li>
          <strong>Keyword biasing.</strong> Deepgram&apos;s repeatable{" "}
          <code>keyterm</code> maps to the <code>custom_vocabulary</code> list.
        </li>
      </ul>

      <Callout title="Next steps" tone="info">
        <p>
          See the <Link href="/migrate/playbook">migration playbook</Link> for cutover,
          and the <Link href="/benchmarks">benchmarks</Link> for accuracy and diarization
          comparisons.
        </p>
      </Callout>
    </>
  );
}
