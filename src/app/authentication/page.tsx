import { CodeBlock } from "@/components/CodeBlock";
import { CodeTabs } from "@/components/CodeTabs";
import { Callout } from "@/components/DocsUI";
import { SITE } from "@/lib/constants";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Authentication",
  description:
    "Create an API key in the console and set SPEECHREVOLUTIONS_API_KEY; the SDKs read it automatically.",
};

export default function AuthPage() {
  return (
    <>
      <h1>Authentication</h1>
      <p>
        Create an API key in the{" "}
        <a href={`${SITE.consoleUrl}/api-keys`} target="_blank" rel="noopener noreferrer">
          console
        </a>{" "}
        and set it as <code>SPEECHREVOLUTIONS_API_KEY</code>. The SDKs read it automatically.
      </p>

      <CodeBlock language="bash" code={`export SPEECHREVOLUTIONS_API_KEY="stt_…"`} />

      <p>
        Every SDK picks the key up from the environment, or takes it explicitly:
      </p>
      <CodeTabs
        tabs={[
          {
            label: "Python",
            language: "python",
            code: `from speechrevolutions import SpeechRevolutions

client = SpeechRevolutions()                   # reads SPEECHREVOLUTIONS_API_KEY
client = SpeechRevolutions(api_key="stt_…")   # or pass it`,
          },
          {
            label: "JavaScript",
            language: "ts",
            code: `import { SpeechRevolutions } from "speechrevolutions";

const client = new SpeechRevolutions();                     // reads SPEECHREVOLUTIONS_API_KEY
const other = new SpeechRevolutions({ apiKey: "stt_…" });   // or pass it`,
          },
          {
            label: "Go",
            language: "go",
            code: `client, err := stt.NewClient("")       // reads SPEECHREVOLUTIONS_API_KEY
client, err = stt.NewClient("stt_…")    // or pass it`,
          },
          {
            label: "C#",
            language: "csharp",
            code: `using var client = new SpeechRevolutionsClient();          // reads SPEECHREVOLUTIONS_API_KEY
using var other = new SpeechRevolutionsClient("stt_…");    // or pass it`,
          },
        ]}
      />
      <p>
        To point a client at a different host, such as staging, set{" "}
        <code>SPEECHREVOLUTIONS_BASE_URL</code>.
      </p>

      <h2>Calling the API directly</h2>
      <p>
        Without an SDK, send the key in the <code>X-API-Key</code> header. That is mostly
        useful for a quick test from a terminal:
      </p>
      <CodeBlock
        language="bash"
        code={`curl -N -X POST "${SITE.apiBase}/api/v1/transcribe" \\
  -H "X-API-Key: $SPEECHREVOLUTIONS_API_KEY" \\
  --data-binary @sample.mp3`}
      />

      <h2>Errors</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Meaning</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>401</code>
              </td>
              <td>Missing or invalid API key</td>
            </tr>
            <tr>
              <td>
                <code>429</code>
              </td>
              <td>Rate limit exceeded</td>
            </tr>
          </tbody>
        </table>
      </div>

      <Callout title="Keep keys server-side" tone="warn">
        <p>
          Never ship API keys in browser or mobile clients. Proxy through your
          backend, or use the console demo flows for public demos.
        </p>
      </Callout>
    </>
  );
}
