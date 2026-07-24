import { CodeBlock } from "@/components/CodeBlock";
import { CodeTabs } from "@/components/CodeTabs";
import { Callout } from "@/components/DocsUI";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Timestamps",
  description:
    "Word-level start/end times in Zephyr transcripts: where they live in .words, the JSON shape, and how the SDK parses them.",
};

export default function TimestampsGuidePage() {
  return (
    <>
      <h1>Timestamps</h1>
      <p>
        Zephyr returns a start and end time for every word, in seconds from the
        beginning of the audio. Word timestamps are on by default
        (<code>word_timestamps=true</code>); leave them on and read them off the
        result. They power everything downstream — <a href="#subtitles">subtitle
        cues</a>, <Link href="/guides/diarization">speaker turns</Link>, clip
        extraction, and karaoke-style highlighting.
      </p>

      <h2 id="words">Read them off .words</h2>
      <p>
        With the default <code>output_type="json"</code> the SDK parses the
        response into a transcript object. Each entry in <code>result.words</code>{" "}
        carries the word text plus its <code>start</code> and <code>end</code>{" "}
        (floats, in seconds), and — when{" "}
        <Link href="/guides/diarization">speaker labels</Link> are on — a{" "}
        <code>speaker</code>.
      </p>
      <CodeTabs
        tabs={[
          {
            label: "Python",
            language: "python",
            code: `result = client.transcribe("meeting.mp3")  # word_timestamps=True by default

for w in result.words[:5]:
    print(f"{w.start:6.2f}–{w.end:6.2f}  {w.word}")
# 0.48–  0.71  Hello
# 0.71–  1.02  everyone`,
          },
          {
            label: "JavaScript",
            language: "ts",
            code: `const result = await client.transcribe("meeting.mp3"); // wordTimestamps: true by default

for (const w of result.words.slice(0, 5)) {
  console.log(\`\${w.start.toFixed(2)}–\${w.end.toFixed(2)}  \${w.word}\`);
}
// 0.48–0.71  Hello
// 0.71–1.02  everyone`,
          },
        ]}
      />

      <h2 id="fields">Per-word fields</h2>
      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Type</th>
            <th>Meaning</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>word</code>
            </td>
            <td>
              <code>string</code>
            </td>
            <td>
              The token. <code>.text</code> is an AssemblyAI-compatible alias.
            </td>
          </tr>
          <tr>
            <td>
              <code>start</code>
            </td>
            <td>
              <code>float</code>
            </td>
            <td>Seconds from the start of the audio to the word onset.</td>
          </tr>
          <tr>
            <td>
              <code>end</code>
            </td>
            <td>
              <code>float</code>
            </td>
            <td>Seconds to the word offset.</td>
          </tr>
          <tr>
            <td>
              <code>speaker</code>
            </td>
            <td>
              <code>string | null</code>
            </td>
            <td>
              Set when <code>speaker_labels</code> is on; otherwise absent.
            </td>
          </tr>
          <tr>
            <td>
              <code>confidence</code>
            </td>
            <td>
              <code>float | null</code>
            </td>
            <td>Per-word confidence when the model reports it.</td>
          </tr>
          <tr>
            <td>
              <code>language</code>
            </td>
            <td>
              <code>string | null</code>
            </td>
            <td>
              The detected language for this word — see{" "}
              <Link href="/migrate/deepgram">language detection</Link> for
              the transcript-level <code>result.languages</code> segments.
            </td>
          </tr>
        </tbody>
      </table>

      <h2 id="json">The JSON shape</h2>
      <p>
        Under the hood the <code>json</code> output is a document with a{" "}
        <code>words</code> array. The SDK parses this into <code>result.words</code>{" "}
        and derives <code>result.text</code> and{" "}
        <code>result.utterances</code> from it. You rarely need the raw form, but
        it&apos;s available as <code>result.raw</code>.
      </p>
      <CodeBlock
        language="json"
        filename="json output (abridged)"
        code={`{
  "words": [
    { "word": "Hello",    "start": 0.48, "end": 0.71, "speaker": "SPEAKER_0" },
    { "word": "everyone", "start": 0.71, "end": 1.02, "speaker": "SPEAKER_0" }
  ]
}`}
      />
      <p>
        Prefer <code>result.to_dict()</code> for a normalized, provider-neutral
        dict, or <code>result.to_deepgram()</code> for a Deepgram-shaped response
        during a migration — both preserve the per-word <code>start</code>/
        <code>end</code>.
      </p>
      <CodeBlock
        language="python"
        code={`normalized = result.to_dict()      # {"id", "text", "words": [...], "utterances": [...]}
first = normalized["words"][0]
print(first["start"], first["end"], first["word"])`}
      />

      <Callout title="Timestamps without JSON" tone="info">
        <p>
          Choosing <code>srt</code> or <code>vtt</code> gives you timestamps
          already formatted as subtitle cues; <code>docx</code>/<code>pdf</code>{" "}
          are formatted documents. To work with timings in code, use the default{" "}
          <code>json</code> output and read <code>.words</code>. See{" "}
          <Link href="/guides/output-formats">output formats &amp; subtitles</Link>.
        </p>
      </Callout>

      <h2 id="subtitles">Turning timestamps into cues</h2>
      <p>
        You don&apos;t have to build cues yourself — request{" "}
        <code>output_type="srt"</code> or <code>"vtt"</code> and the server emits
        properly timed subtitles. Reach for <code>.words</code> only when you need
        custom windows, e.g. grouping words into fixed-length caption lines or
        extracting a clip between two timestamps.
      </p>

      <h2 id="accuracy">Accuracy</h2>
      <p>
        Timestamp accuracy is measured in our public benchmark suite alongside
        word error rate and diarization. Rather than quote a figure here, see the{" "}
        <Link href="/benchmarks">benchmarks page</Link> for the current numbers
        and methodology.
      </p>

      <Callout title="Related" tone="tip">
        <p>
          <Link href="/guides/diarization">Speaker diarization</Link> adds a{" "}
          <code>speaker</code> to each word and groups them into turns.{" "}
          <Link href="/cookbook#subtitles">The cookbook</Link> has copy-pasteable
          subtitle recipes.
        </p>
      </Callout>
    </>
  );
}
