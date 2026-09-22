import { CodeBlock } from "@/components/CodeBlock";
import { Callout } from "@/components/DocsUI";
import { SITE } from "@/lib/constants";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Authentication",
  description:
    "Every request requires an API key via the X-API-Key header.",
};

export default function AuthPage() {
  return (
    <>
      <h1>Authentication</h1>
      <p>
        Every request requires an API key via the <code>X-API-Key</code> header.
      </p>

      <CodeBlock
        language="bash"
        code={`curl ${SITE.apiBase}/api/v1/upload \\
  -H "X-API-Key: $SPEECHREVOLUTIONS_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ ... }'`}
      />

      <h2>Environment variables</h2>
      <p>
        Official SDKs read the key automatically from{" "}
        <code>SPEECHREVOLUTIONS_API_KEY</code>, so in most code you never pass it
        explicitly. To point a client at a different host, such as staging, set{" "}
        <code>SPEECHREVOLUTIONS_BASE_URL</code>.
      </p>

      <h2>Errors</h2>
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

      <Callout title="Keep keys server-side" tone="warn">
        <p>
          Never ship API keys in browser or mobile clients. Proxy through your
          backend, or use the console demo flows for public demos.
        </p>
      </Callout>
    </>
  );
}
