import { CodeBlock } from "@/components/CodeBlock";
import { Callout } from "@/components/DocsUI";
import { SITE } from "@/lib/constants";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MCP server",
  description:
    "Give Claude, ChatGPT or any MCP client the ability to transcribe audio directly, with speaker labels, using your Speech Revolutions key.",
};

export default function McpPage() {
  return (
    <>
      <h1>MCP server</h1>
      <p>
        The Model Context Protocol lets an assistant call tools directly. Our MCP server turns
        this API into five of them, so someone can say &ldquo;transcribe this recording and tell
        me who said what&rdquo; and have it happen — no code, no copying job ids around.
      </p>
      <p>
        It ships inside the JavaScript SDK, so there is nothing separate to install.
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
        Restart the client. Create a key at{" "}
        <a href={SITE.consoleUrl}>the console</a> if you do not have one — new accounts start
        with $10 of credit, which is about 55 hours of audio.
      </p>

      <Callout tone="info">
        The key is read from the environment and never leaves your machine: the server runs
        locally as a subprocess of your MCP client, and talks to our API the same way the SDK
        does.
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
              so it suits recordings up to about half an hour.
            </td>
          </tr>
          <tr>
            <td>
              <code>submit_transcription_job</code>
            </td>
            <td>
              Start a long recording and return a job id immediately. Use for anything longer,
              and for batches.
            </td>
          </tr>
          <tr>
            <td>
              <code>check_job</code>
            </td>
            <td>Whether a job is processing, complete or failed.</td>
          </tr>
          <tr>
            <td>
              <code>get_transcript</code>
            </td>
            <td>
              Read a completed transcript as text, JSON, SRT or VTT.
            </td>
          </tr>
          <tr>
            <td>
              <code>list_jobs</code>
            </td>
            <td>Recent jobs on the account, newest first.</td>
          </tr>
        </tbody>
      </table>

      <h2>What comes back</h2>
      <p>
        Transcripts are returned as readable text with speaker labels and timestamps, not as
        the raw JSON payload:
      </p>

      <CodeBlock
        language="text"
        code={`Job: f1c3ae59-00bc-4e39-aa9e-5afed8c3974a · Detected language: en · Speakers: 3

[0:00] SPEAKER_1: You are already ahead of 90% of the people your age if you
can just communicate competently.
[0:12] SPEAKER_2: That tracks with what we saw in the hiring data.`}
      />

      <p>
        That is deliberate. The caller is a language model, and word-level JSON for a long
        recording spends the context it needs to answer the question. Ask{" "}
        <code>get_transcript</code> for <code>format: &quot;json&quot;</code> when you actually
        want per-word timings and confidences.
      </p>
      <p>
        Long transcripts are truncated with an explicit notice naming the job id and how much
        was cut, so nothing is silently summarised as if it were complete. Raise{" "}
        <code>max_characters</code> to get more.
      </p>

      <h2>Cost</h2>
      <p>
        The same as any other call: $0.003 per minute of audio, with diarization and timestamps
        included. Tool calls that only check status or list jobs are free.
      </p>

      <h2>Troubleshooting</h2>
      <p>
        If the server does not appear, run it by hand — it prints its errors to stderr, which
        some clients hide:
      </p>

      <CodeBlock
        language="bash"
        code={`SPEECHREVOLUTIONS_API_KEY=stt_... npx -y speechrevolutions mcp`}
      />

      <p>
        It should print a readiness line and then wait for input. A message about the key being
        unset means the <code>env</code> block above did not reach the process.
      </p>
    </>
  );
}
