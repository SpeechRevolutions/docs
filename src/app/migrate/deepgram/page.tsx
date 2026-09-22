import { CodeBlock } from "@/components/CodeBlock";
import { CodeTabs } from "@/components/CodeTabs";
import { Callout, EndpointBadge } from "@/components/DocsUI";
import { SITE } from "@/lib/constants";
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
        response. Speech Revolutions uses a short upload-then-wait flow, but the SDK hides it
        behind one <code>transcribe()</code> call — so in practice the migration
        is a rename, not a rewrite. This guide maps every piece across, including
        a <code>to_deepgram()</code> helper that returns Deepgram-shaped JSON so
        your existing response parsing keeps working.
      </p>

      <Callout title="The one-line version" tone="tip">
        <p>
          Deepgram&apos;s <code>diarize=true</code> is supported verbatim —
          Speech Revolutions accepts <code>diarize</code> as an alias for{" "}
          <code>speaker_labels</code>. And <code>result.to_deepgram()</code>{" "}
          reshapes the Speech Revolutions output into the{" "}
          <code>results.channels[0].alternatives[0]</code> structure you already
          parse.
        </p>
      </Callout>

      <h2>Authentication</h2>
      <p>
        Deepgram authenticates with an <code>Authorization: Token &lt;key&gt;</code>{" "}
        header. Speech Revolutions uses an <code>X-API-Key</code> header, and the SDKs read
        it from the environment for you.
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
        Deepgram is one synchronous endpoint. Speech Revolutions splits creation and
        retrieval, but the SDK&apos;s <code>transcribe()</code> drives the whole
        flow and blocks until the transcript is ready — the closest analogue to a
        single Deepgram call.
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
                <code>POST /api/v1/upload</code> → PUT to presigned URL →{" "}
                <code>POST /api/v1/upload/complete</code>
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
      <EndpointBadge method="POST" path="/api/v1/upload" />

      <h2>Upload differences</h2>
      <p>
        Deepgram takes raw audio bytes directly in the request body with a{" "}
        <code>Content-Type</code> matching the file. Speech Revolutions uploads through a
        presigned URL, which means large files stream straight to object storage
        instead of through the API — but the SDK does the presign, PUT, and
        complete handshake for you, so you still pass a path, URL, bytes, or file
        object to <code>transcribe()</code>. Speech Revolutions also reports real{" "}
        <code>upload</code> and <code>transcribe</code> progress; Deepgram
        exposes no percentage for pre-recorded audio.
      </p>

      <h2>Response shape</h2>
      <p>
        Deepgram nests everything under{" "}
        <code>results.channels[0].alternatives[0]</code>, with word-level
        speakers as integers. Speech Revolutions returns a transcript-first object. Map it
        like this:
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
                <code>speaker_0</code>) plus <code>result.utterances</code>{" "}
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
          If your codebase already digs into{" "}
          <code>results.channels[0].alternatives[0]</code>, call{" "}
          <code>result.to_deepgram()</code> and feed that dict to your existing
          code unchanged.
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
        alias for <code>speaker_labels</code>), and additionally groups the words
        into <code>result.utterances</code> — ready-made speaker turns you would
        otherwise have to reconstruct from per-word integers. Diarization quality
        is one of Zephyr&apos;s strongest results; see the{" "}
        <Link href="/benchmarks">benchmarks</Link> and the{" "}
        <a href={SITE.landingUrl}>comparison table</a> for measured numbers.
      </p>

      <h2>Timestamps</h2>
      <p>
        Both return per-word start/end times in <strong>seconds</strong>. On
        Speech Revolutions word timestamps are on by default (<code>word_timestamps=true</code>
        ); the values live on <code>result.words</code>.
      </p>

      <h2>Language selection</h2>
      <p>
        Deepgram takes a BCP-47 <code>language</code> query param, or{" "}
        <code>detect_language=true</code> to auto-detect. Speech Revolutions always
        auto-detects, including code-switching mid-file — there&apos;s no
        language parameter to set. <code>result.languages</code> is a list of{" "}
        <code>{`{start, end, language}`}</code> segments covering the whole
        file, and every word in <code>result.words</code> also carries a{" "}
        <code>language</code>.
      </p>

      <h2>Side by side</h2>
      <p>
        Diarized transcription, before and after. The &quot;before&quot; column
        is <code>deepgram-sdk</code> v3, which is what most existing integrations
        are running; Deepgram has since reshaped its client, so if you are on v4
        or newer your code will differ from the left-hand side. The right-hand
        side is unaffected either way.
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
          <strong>Auth header.</strong> It&apos;s <code>X-API-Key</code>, not{" "}
          <code>Authorization: Token</code> — the SDK sets it, but hand-rolled
          HTTP calls need updating.
        </li>
        <li>
          <strong>Speaker type changes.</strong> Speech Revolutions speakers are strings
          (<code>speaker_0</code>), not integers. Use{" "}
          <code>result.utterances</code> instead of grouping words yourself, or
          call <code>to_deepgram()</code> for the integer form.
        </li>
        <li>
          <strong>No inline response.</strong> There is a job to wait on.{" "}
          <code>transcribe()</code> hides this; if you call the REST API
          directly, follow the upload → complete → poll/stream flow.
        </li>
        <li>
          <strong>Keyword biasing.</strong> Deepgram&apos;s repeatable{" "}
          <code>keyterm</code> becomes the <code>custom_vocabulary</code>{" "}
          list.
        </li>
      </ul>

      <Callout title="Next steps" tone="info">
        <p>
          See the general{" "}
          <Link href="/migrate/playbook">migration playbook</Link> for cutover
          strategy, and the <Link href="/benchmarks">benchmarks</Link> for how
          the two compare on accuracy and diarization.
        </p>
      </Callout>
    </>
  );
}
