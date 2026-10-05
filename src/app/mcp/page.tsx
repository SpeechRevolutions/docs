import { CodeBlock } from "@/components/CodeBlock";
import { Callout } from "@/components/DocsUI";
import { SITE } from "@/lib/constants";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MCP server",
  description:
    "Let Claude, ChatGPT, or any MCP client transcribe audio with speaker labels, using your Speech Revolutions API key.",
};

export default function McpPage() {
  return (
    <>
      <h1>MCP server</h1>
      <p>
        The Model Context Protocol (MCP) lets an assistant call tools directly. The Speech
        Revolutions MCP server exposes this API as five tools, so you can ask an assistant to
        &ldquo;transcribe this recording and tell me who said what&rdquo; without writing code
        or copying job IDs.
      </p>
      <p>
        The server ships inside the JavaScript SDK. There is nothing separate to install.
      </p>

      <h2>Setup</h2>
      <p>
        Add this to your MCP client&apos;s configuration. In Claude Desktop that is{" "}
        <code>claude_desktop_config.json</code>; other clients use the same shape.
      </p>

      <CodeBlock
        language="json"
        code={`{
  "mcpServers": {
    "speechrevolutions": {
      "command": "npx",
      "args": ["-y", "speechrevolutions", "mcp"],
      "env": {
        "SPEECHREVOLUTIONS_API_KEY": "stt_..."
      }
    }
  }
}`}
      />

      <p>
        Restart the client. If you don&apos;t have an API key, create one in{" "}
        <a href={SITE.consoleUrl}>the console</a>. New accounts start with $10 of credit,
        about 55 hours of audio.
      </p>

      <Callout tone="info">
        The server runs locally as a subprocess of your MCP client and reads the API key from
        its environment. The key is sent only to the Speech Revolutions API, the same way the
        SDK sends it.
      </Callout>

      <h2>Tools</h2>
      <table>
        <thead>
          <tr>
            <th>Tool</th>
            <th>What it does</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>transcribe_audio</code>
            </td>
            <td>
              Transcribe a local file or public URL and return the text. Waits for the result,
              so use it for recordings up to about 30 minutes.
            </td>
          </tr>
          <tr>
            <td>
              <code>submit_transcription_job</code>
            </td>
            <td>
              Submit a recording and return a job ID immediately. Use it for longer recordings
              and for batches.
            </td>
          </tr>
          <tr>
            <td>
              <code>check_job</code>
            </td>
            <td>Report whether a job is processing, complete, or failed.</td>
          </tr>
          <tr>
            <td>
              <code>get_transcript</code>
            </td>
            <td>
              Return a completed transcript as text, JSON, SRT, or VTT.
            </td>
          </tr>
          <tr>
            <td>
              <code>list_jobs</code>
            </td>
            <td>List recent jobs on the account, newest first.</td>
          </tr>
        </tbody>
      </table>

      <h2>Output</h2>
      <p>
        Transcripts are returned as readable text with speaker labels and timestamps, not as
        raw JSON:
      </p>

      <CodeBlock
        language="text"
        code={`Job: f1c3ae59-00bc-4e39-aa9e-5afed8c3974a · Detected language: en · Speakers: 3

[0:00] SPEAKER_1: You are already ahead of 90% of the people your age if you
can just communicate competently.
[0:12] SPEAKER_2: That tracks with what we saw in the hiring data.`}
      />

      <p>
        This keeps long recordings within the assistant&apos;s context. To get per-word
        timings and confidences, call <code>get_transcript</code> with{" "}
        <code>format: &quot;json&quot;</code>.
      </p>
      <p>
        Long transcripts are truncated with a notice that names the job ID and how much was
        cut. Raise <code>max_characters</code> to get more.
      </p>

      <h2>Cost</h2>
      <p>
        The same as any other API call: $0.003 per minute of audio, with diarization and
        timestamps included. Tool calls that only check status or list jobs are free.
      </p>

      <h2>Troubleshooting</h2>
      <p>
        If the server doesn&apos;t appear in your client, run it manually. It prints errors to
        stderr, which some clients hide:
      </p>

      <CodeBlock
        language="bash"
        code={`SPEECHREVOLUTIONS_API_KEY=stt_... npx -y speechrevolutions mcp`}
      />

      <p>
        It prints a readiness line and then waits for input. If it reports that the key is
        unset, the <code>env</code> block in your configuration isn&apos;t reaching the
        process.
      </p>
    </>
  );
}
