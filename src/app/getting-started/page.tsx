import { CodeTabs } from "@/components/CodeTabs";
import { Callout } from "@/components/DocsUI";
import { SITE } from "@/lib/constants";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Quickstart",
};

export default function QuickstartPage() {
  return (
    <>
      <h1>Quickstart</h1>
      <p>
        Get an API key, install an SDK (or use cURL), and transcribe a file.
      </p>

      <h2>1. Get an API key</h2>
      <p>
        Create a key in the{" "}
        <a href={SITE.consoleUrl}>developer console</a>. Export it in your
        shell:
      </p>
      <CodeTabs
        tabs={[
          {
            label: "bash",
            code: `export SPEECHREVOLUTIONS_API_KEY=stt_...`,
          },
        ]}
      />

      <h2>2a. SDK (recommended for apps)</h2>
      <p>
        The SDK uses the upload flow under the hood (
        <code>POST /api/v1/upload</code> → storage → complete → SSE wait).
      </p>
      <CodeTabs
        tabs={[
          {
            label: "Python",
            language: "python",
            code: `pip install speechrevolutions

# then:
from speechrevolutions import SpeechRevolutions

client = SpeechRevolutions()
result = client.transcribe(
    "audio.mp3",
    speaker_labels=True,
)
print(result.text)
for u in result.utterances:
    print(f"{u.speaker}: {u.text}")`,
          },
          {
            label: "JavaScript",
            language: "ts",
            code: `npm install @speechrevolutions/stt

import { SpeechRevolutions } from "@speechrevolutions/stt";

const client = new SpeechRevolutions();
const result = await client.transcribe("audio.mp3", {
  speakerLabels: true,
});
console.log(result.text);`,
          },
        ]}
      />

      <h2>2b. Terminal (one request)</h2>
      <p>
        For scripts and one-off jobs, stream the file to{" "}
        <code>POST /api/v1/transcribe</code>. The connection stays open and
        emits percentage-style progress until the transcript is ready.
      </p>
      <CodeTabs
        tabs={[
          {
            label: "cURL",
            language: "bash",
            code: `curl -N -X POST "${SITE.apiBase}/api/v1/transcribe" \\
  -H "X-API-Key: $SPEECHREVOLUTIONS_API_KEY" \\
  -F "file=@audio.mp3" \\
  -F "output_type=json" \\
  -F "word_timestamps=true" \\
  -F "speaker_labels=true" \\
  -F "nltk=true"`,
          },
        ]}
      />
      <Callout title="SDK vs terminal" tone="tip">
        <p>
          Prefer the <Link href="/sdks/python">SDK</Link> in application code.
          Prefer <Link href="/guides/terminal">/transcribe</Link> when you want
          a single streaming HTTP call from a shell.
        </p>
      </Callout>

      <h2>3. Watch live progress (optional)</h2>
      <p>
        The SDKs surface real-time upload <em>and</em> transcription progress —
        as console bars (<code>progress=True</code>) or callbacks with a{" "}
        <code>percent</code> field. Neither AssemblyAI nor Deepgram exposes this
        for pre-recorded audio.
      </p>
      <CodeTabs
        tabs={[
          {
            label: "Python",
            language: "python",
            code: `result = client.transcribe("audio.mp3", progress=True)

# or a callback
result = client.transcribe(
    "audio.mp3",
    on_progress=lambda e: print(e.percent, e.step),
)`,
          },
          {
            label: "JavaScript",
            language: "ts",
            code: `await client.transcribe("audio.mp3", { progress: true });

// or a callback
await client.transcribe("audio.mp3", {
  onProgress: (e) => console.log(e.percent, e.step),
});`,
          },
        ]}
      />
      <p>
        See each <Link href="/sdks/python">SDK page</Link> for the full{" "}
        <code>onProgress</code> / <code>onUploadProgress</code> API.
      </p>

      <h2>Next steps</h2>
      <ul>
        <li>
          <Link href="/authentication">Authentication</Link>
        </li>
        <li>
          <Link href="/guides/features">Features & formats</Link>
        </li>
        <li>
          <Link href="/api-reference/overview">API reference</Link>
        </li>
      </ul>
    </>
  );
}
