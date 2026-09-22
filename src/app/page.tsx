import { CodeTabs } from "@/components/CodeTabs";
import { Callout } from "@/components/DocsUI";
import { SITE } from "@/lib/constants";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Introduction",
  description:
    "Production speech-to-text for developers. Transcribe audio with speaker labels, word timestamps, and multiple output formats, via SDK or one terminal command.",
};

export default function DocsHomePage() {
  return (
    <>
      <h1>Speech Revolutions Docs</h1>
      <p>
        Production speech-to-text for developers. Transcribe audio with speaker
        labels, word timestamps, and multiple output formats — via SDK or a
        single terminal command.
      </p>

      <p>
        New here? Start with the{" "}
        <Link href="/getting-started">Quickstart</Link> — first transcript in
        under a minute. Or pick your language:
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {[
          {
            href: "/sdks/python",
            title: "Python",
            body: "Sync and async clients, one-line transcribe.",
            install: "pip install speechrevolutions",
          },
          {
            href: "/sdks/javascript",
            title: "JavaScript",
            body: "TypeScript types, Node and edge runtimes.",
            install: "npm install speechrevolutions",
          },
          {
            href: "/sdks/go",
            title: "Go",
            body: "Context-aware, cancellable on every call.",
            install: "go get github.com/speechrevolutions/speechrevolutions-go",
          },
          {
            href: "/sdks/csharp",
            title: "C#",
            body: "Async-first client targeting net8.0.",
            install: "dotnet add package SpeechRevolutions",
          },
        ].map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="flex min-w-0 flex-col rounded-xl border border-white/10 bg-white/[0.03] p-4 no-underline transition-colors hover:border-brand-500/30 hover:bg-brand-500/5"
          >
            <p className="text-sm font-semibold text-white">{card.title}</p>
            <p className="mt-1 flex-1 text-sm text-zinc-400">{card.body}</p>
            <code className="mt-3 block truncate rounded-md bg-black/30 px-2 py-1.5 font-mono text-[11px] text-zinc-500">
              {card.install}
            </code>
          </Link>
        ))}
      </div>

      <h2>Choose your path</h2>
      <p>
        Use the <strong>SDK</strong> for apps and pipelines. Use{" "}
        <strong>cURL / terminal</strong> when you want a single streaming upload
        without managing upload sessions.
      </p>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Use case</th>
              <th>Endpoint</th>
              <th>Best for</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>SDK / apps</td>
              <td>
                <code>POST /api/v1/upload</code>
              </td>
              <td>Large files, progress heartbeats, resumable wait via SSE</td>
            </tr>
            <tr>
              <td>Terminal / scripts</td>
              <td>
                <code>POST /api/v1/transcribe</code>
              </td>
              <td>One-shot stream upload + percentage progress on the wire</td>
            </tr>
          </tbody>
        </table>
      </div>

      <Callout title="Base URL" tone="info">
        <p>
          All API requests go to <code>{SITE.apiBase}</code>. Authenticate with
          the <code>X-API-Key</code> header.
        </p>
      </Callout>

      <h2>30-second taste</h2>
      <CodeTabs
        tabs={[
          {
            label: "Python",
            language: "python",
            code: `from speechrevolutions import SpeechRevolutions

client = SpeechRevolutions()  # SPEECHREVOLUTIONS_API_KEY
result = client.transcribe("meeting.mp3", speaker_labels=True)
print(result.text)`,
          },
          {
            label: "JavaScript",
            language: "ts",
            code: `import { SpeechRevolutions } from "speechrevolutions";

const client = new SpeechRevolutions();
const result = await client.transcribe("meeting.mp3", {
  speakerLabels: true,
});
console.log(result.text);`,
          },
          {
            label: "Go",
            language: "go",
            code: `client, _ := stt.NewClient("") // SPEECHREVOLUTIONS_API_KEY
sl := true
result, err := client.Transcribe(context.Background(), "meeting.mp3", stt.TranscribeOptions{
    SpeakerLabels: &sl,
}, nil)
if err != nil {
    log.Fatal(err)
}
fmt.Println(result.Text())`,
          },
          {
            label: "C#",
            language: "csharp",
            code: `using SpeechRevolutions;

using var client = new SpeechRevolutionsClient(); // SPEECHREVOLUTIONS_API_KEY
var result = await client.TranscribeAsync("meeting.mp3", new TranscribeOptions
{
    SpeakerLabels = true,
});
Console.WriteLine(result.Text);`,
          },
          {
            label: "cURL",
            language: "bash",
            code: `curl -N -X POST \\
  "${SITE.apiBase}/api/v1/transcribe?output_type=json&speaker_labels=true" \\
  -H "X-API-Key: $SPEECHREVOLUTIONS_API_KEY" \\
  --data-binary @meeting.mp3`,
          },
        ]}
      />

      <h2>What you get</h2>
      <ul>
        <li>
          <strong>Zephyr</strong>, our speech-to-text engine — ranked{" "}
          <Link href="/benchmarks">#1 on diarization error rate</Link> across every
          subset of our public benchmark suite
        </li>
        <li>Speaker diarization and word-level timestamps</li>
        <li>
          Output formats: <code>txt</code>, <code>json</code>, <code>srt</code>,{" "}
          <code>vtt</code>, <code>docx</code>, <code>pdf</code>
        </li>
        <li>Custom vocabulary / keyterm prompting</li>
        <li>
          <strong>Live progress</strong> — real-time upload and transcription
          percentage via SDK console bars or callbacks (something neither
          AssemblyAI nor Deepgram expose for pre-recorded audio)
        </li>
      </ul>

      <p>
        Next: <Link href="/getting-started">Quickstart →</Link>
      </p>
    </>
  );
}
