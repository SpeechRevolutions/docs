import { CodeBlock } from "@/components/CodeBlock";
import { CodeTabs } from "@/components/CodeTabs";
import { docMeta } from "@/lib/metadata";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = docMeta({
  title: "OpenAI-compatible endpoint",
  description:
    "POST /v1/audio/transcriptions in OpenAI's shape: use the OpenAI SDKs, Open WebUI, LibreChat or any tool with a custom OpenAI base URL, with Speech Revolutions behind it.",
});

export default function OpenAICompatiblePage() {
  return (
    <>
      <h1>OpenAI-compatible endpoint</h1>
      <p>
        <code>POST https://api.speechrevolutions.com/v1/audio/transcriptions</code> takes the same
        request as OpenAI&apos;s transcription endpoint and returns the same shapes. Anything that
        lets you set the OpenAI base URL works unchanged: the OpenAI SDKs, Open WebUI, LibreChat,
        LiveKit&apos;s <code>openai.STT</code>, Pipecat&apos;s <code>OpenAISTTService</code>.
      </p>
      <CodeTabs
        tabs={[
          {
            label: "Python",
            language: "python",
            code: `# pip install openai
import os
from openai import OpenAI

client = OpenAI(
    base_url="https://api.speechrevolutions.com/v1",
    api_key=os.environ["SPEECHREVOLUTIONS_API_KEY"],
)
with open("meeting.mp3", "rb") as f:
    result = client.audio.transcriptions.create(model="whisper-1", file=f)
print(result.text)`,
          },
          {
            label: "JavaScript",
            language: "ts",
            code: `// npm install openai
import fs from "node:fs";
import OpenAI, { toFile } from "openai";

const client = new OpenAI({
  baseURL: "https://api.speechrevolutions.com/v1",
  apiKey: process.env.SPEECHREVOLUTIONS_API_KEY,
});
const result = await client.audio.transcriptions.create({
  model: "whisper-1",
  // Pass the file in memory: a stream is sent without a Content-Length, which this endpoint needs.
  file: await toFile(fs.readFileSync("meeting.mp3"), "meeting.mp3"),
});
console.log(result.text);`,
          },
        ]}
      />
      <CodeBlock
        language="bash"
        code={`curl https://api.speechrevolutions.com/v1/audio/transcriptions \\
  -H "Authorization: Bearer $SPEECHREVOLUTIONS_API_KEY" \\
  -F file=@meeting.mp3 -F model=whisper-1 -F response_format=srt`}
      />

      <h2 id="fields">Request fields</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Field</th>
              <th>What happens</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>file</code></td>
              <td>The audio, up to 200 MB (OpenAI&apos;s limit is 25 MB). Larger files: <Link href="/api-reference/upload">upload</Link>.</td>
            </tr>
            <tr>
              <td><code>model</code></td>
              <td>Accepted and ignored: every request gets our best model.</td>
            </tr>
            <tr>
              <td><code>language</code></td>
              <td>An ISO 639-1 code; leave it out to detect the language.</td>
            </tr>
            <tr>
              <td><code>prompt</code></td>
              <td>Names, brands and acronyms in it are used as <Link href="/guides/features">keyterms</Link>.</td>
            </tr>
            <tr>
              <td><code>response_format</code></td>
              <td>
                <code>json</code> (default, <code>{"{"}text{"}"}</code>), <code>text</code>,{" "}
                <code>srt</code>, <code>vtt</code>, or <code>verbose_json</code>: language, duration,
                words with times, and segments split at speaker turns and sentence ends.
              </td>
            </tr>
            <tr>
              <td><code>timestamp_granularities[]</code></td>
              <td><code>word</code> and/or <code>segment</code>, with <code>verbose_json</code>.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Authenticate with <code>Authorization: Bearer &lt;your API key&gt;</code> (or{" "}
        <code>X-API-Key</code>). Errors come back in OpenAI&apos;s shape,{" "}
        <code>{"{"}&quot;error&quot;: {"{"}&quot;message&quot;, &quot;type&quot;{"}"}{"}"}</code>.
      </p>
    </>
  );
}
