import { CodeTabs } from "@/components/CodeTabs";
import { Callout } from "@/components/DocsUI";
import { SITE } from "@/lib/constants";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Introduction",
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

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {[
          {
            href: "/getting-started",
            title: "Quickstart",
            body: "Transcribe your first file in under a minute.",
          },
          {
            href: "/guides/terminal",
            title: "Terminal & cURL",
            body: "Stream a file to POST /api/v1/transcribe.",
          },
          {
            href: "/sdks/python",
            title: "Python SDK",
            body: "Sync and async clients with a one-line transcribe API.",
          },
        ].map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-4 no-underline transition-colors hover:border-brand-500/30 hover:bg-brand-500/5"
          >
            <p className="text-sm font-semibold text-white">{card.title}</p>
            <p className="mt-1 text-sm text-zinc-400">{card.body}</p>
          </Link>
        ))}
      </div>

      <h2>Choose your path</h2>
      <p>
        Use the <strong>SDK</strong> for apps and pipelines. Use{" "}
        <strong>cURL / terminal</strong> when you want a single streaming upload
        without managing upload sessions.
      </p>

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
            label: "cURL",
            language: "bash",
            code: `curl -N -X POST \\
  "${SITE.apiBase}/api/v1/transcribe?output_type=json&speaker_labels=true" \\
  -H "X-API-Key: $SPEECHREVOLUTIONS_API_KEY" \\
  --data-binary @meeting.mp3`,
          },
          {
            label: "JavaScript",
            language: "ts",
            code: `import { SpeechRevolutions } from "@speechrevolutions/stt";

const client = new SpeechRevolutions();
const result = await client.transcribe("meeting.mp3", {
  speakerLabels: true,
});
console.log(result.text);`,
          },
        ]}
      />

      <h2>What you get</h2>
      <ul>
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
