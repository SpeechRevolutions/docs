import { CodeBlock } from "@/components/CodeBlock";
import { CodeTabs } from "@/components/CodeTabs";
import { Callout } from "@/components/DocsUI";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Speaker diarization",
  description:
    "Turn on speaker_labels to label who spoke each segment: per-word speaker tags, .utterances speaker turns, and how to render them.",
};

export default function DiarizationGuidePage() {
  return (
    <>
      <h1>Speaker diarization</h1>
      <p>
        Diarization answers &quot;who spoke when.&quot; Speech Revolutions labels who spoke
        each segment and attaches a speaker to every word, so you can render a
        transcript as a back-and-forth conversation instead of one wall of text.
      </p>

      <Callout title="Where Zephyr leads" tone="tip">
        <p>
          Diarization is a headline strength: on our public benchmark suite
          Zephyr ranks <strong>#1 on diarization error rate (DER)</strong> across
          every subset, well ahead of the field — and some providers can&apos;t
          diarize at all, including OpenAI&apos;s <code>gpt-4o-transcribe</code>{" "}
          (as of the model available on 2026-07-23; check OpenAI&apos;s current
          docs before relying on this). See the{" "}
          <Link href="/benchmarks">benchmarks page</Link> for the full
          provider-by-provider numbers and methodology.
        </p>
      </Callout>

      <h2 id="enable">Turn it on</h2>
      <p>
        <code>speaker_labels</code> is on by default. <code>diarize</code> is a
        Deepgram-compatible alias for the same flag, so code ported from Deepgram
        works unchanged.
      </p>
      <CodeTabs
        tabs={[
          {
            label: "Python",
            language: "python",
            code: `# speaker_labels defaults to True; shown explicitly here.
result = client.transcribe("meeting.mp3", speaker_labels=True)

# diarize is a Deepgram-compatible alias for speaker_labels
result = client.transcribe("meeting.mp3", diarize=True)`,
          },
          {
            label: "JavaScript",
            language: "ts",
            code: `// speakerLabels defaults to true; shown explicitly here.
const result = await client.transcribe("meeting.mp3", { speakerLabels: true });

// diarize is a Deepgram-compatible alias for speakerLabels
const r2 = await client.transcribe("meeting.mp3", { diarize: true });`,
          },
        ]}
      />

      <h2 id="utterances">Speaker turns: .utterances</h2>
      <p>
        The most convenient view is <code>result.utterances</code> — an
        AssemblyAI-style list of contiguous speaker turns. Each utterance carries
        its <code>speaker</code>, its <code>text</code>, the <code>start</code>/
        <code>end</code> of the turn, and the <code>words</code> that make it up.
      </p>
      <CodeTabs
        tabs={[
          {
            label: "Python",
            language: "python",
            code: `result = client.transcribe("meeting.mp3", speaker_labels=True)

for u in result.utterances:
    print(f"[{u.start:.1f}s] Speaker {u.speaker}: {u.text}")
# [0.5s] Speaker SPEAKER_0: Hi, thanks for joining.
# [3.2s] Speaker SPEAKER_1: Happy to be here.`,
          },
          {
            label: "JavaScript",
            language: "ts",
            code: `const result = await client.transcribe("meeting.mp3", { speakerLabels: true });

for (const u of result.utterances) {
  console.log(\`[\${u.start.toFixed(1)}s] Speaker \${u.speaker}: \${u.text}\`);
}
// [0.5s] Speaker SPEAKER_0: Hi, thanks for joining.
// [3.2s] Speaker SPEAKER_1: Happy to be here.`,
          },
        ]}
      />

      <h2 id="per-word">Per-word speakers: .words</h2>
      <p>
        Every entry in <code>result.words</code> also carries a{" "}
        <code>speaker</code> alongside its{" "}
        <Link href="/guides/timestamps">timestamps</Link>. Utterances are simply
        runs of consecutive words with the same speaker, grouped for you — but the
        per-word labels are there when you need finer control (e.g. highlighting
        the current speaker word by word).
      </p>
      <CodeBlock
        language="python"
        code={`for w in result.words[:4]:
    print(w.speaker, w.word, w.start, w.end)
# SPEAKER_0 Hi 0.50 0.68
# SPEAKER_0 thanks 0.68 0.99`}
      />

      <h2 id="render">Render speaker turns</h2>
      <p>
        To display a conversation, iterate <code>utterances</code> and print a new
        block whenever the speaker changes. Since utterances are already grouped
        by turn, this is a direct loop — optionally mapping raw labels like{" "}
        <code>SPEAKER_0</code> to friendly names.
      </p>
      <CodeTabs
        tabs={[
          {
            label: "Python",
            language: "python",
            code: `NAMES = {"SPEAKER_0": "Host", "SPEAKER_1": "Guest"}

def format_ts(seconds: float) -> str:
    m, s = divmod(int(seconds), 60)
    return f"{m:02d}:{s:02d}"

for u in result.utterances:
    name = NAMES.get(u.speaker, u.speaker)
    print(f"{format_ts(u.start)}  {name}\\n  {u.text}\\n")`,
          },
          {
            label: "JavaScript",
            language: "ts",
            code: `const NAMES = { SPEAKER_0: "Host", SPEAKER_1: "Guest" };

const formatTs = (s) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return \`\${String(m).padStart(2, "0")}:\${String(sec).padStart(2, "0")}\`;
};

for (const u of result.utterances) {
  const name = NAMES[u.speaker] ?? u.speaker;
  console.log(\`\${formatTs(u.start)}  \${name}\\n  \${u.text}\\n\`);
}`,
          },
        ]}
      />

      <Callout title="Speaker label format" tone="info">
        <p>
          Speakers are stable string ids within a job (e.g.{" "}
          <code>SPEAKER_0</code>, <code>SPEAKER_1</code>). If you export a
          Deepgram-shaped response with <code>result.to_deepgram()</code>, those
          ids are mapped to integer speaker indices to match Deepgram&apos;s
          schema.
        </p>
      </Callout>

      <h2 id="migrating">Migrating from Deepgram</h2>
      <p>
        Beyond the <code>diarize</code> alias, <code>result.to_deepgram()</code>{" "}
        returns a Deepgram pre-recorded response shape — including{" "}
        <code>results.utterances</code> with integer <code>speaker</code> indices
        — so existing parsing code keeps working while you migrate. See the{" "}
        <Link href="/migrate/playbook">migration playbook</Link>.
      </p>

      <Callout title="Related" tone="tip">
        <p>
          <Link href="/guides/timestamps">Timestamps</Link> covers the per-word{" "}
          <code>start</code>/<code>end</code> that diarization builds on.{" "}
          <Link href="/cookbook#speakers">The cookbook</Link> has a
          copy-pasteable speaker-labels recipe.
        </p>
      </Callout>
    </>
  );
}
