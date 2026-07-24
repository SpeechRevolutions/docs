import { CodeBlock } from "@/components/CodeBlock";
import { EndpointBadge } from "@/components/DocsUI";
import { SITE } from "@/lib/constants";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Upload API",
};

export default function UploadApiPage() {
  return (
    <>
      <h1>Upload API (SDK)</h1>
      <p>
        Create a job, upload bytes to a presigned URL, then complete. This is
        what the official SDKs call.
      </p>

      <h2>Create job</h2>
      <EndpointBadge method="POST" path="/api/v1/upload" />
      <CodeBlock
        language="bash"
        code={`curl -X POST "${SITE.apiBase}/api/v1/upload" \\
  -H "X-API-Key: $SPEECHREVOLUTIONS_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "file_size": 1048576,
    "output_type": "json",
    "word_timestamps": true,
    "speaker_labels": true,
    "nltk": true,
    "tier": "standard",
    "custom_vocabulary": ["AcmeCorp"]
  }'`}
      />

      <h3>Request body</h3>
      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Type</th>
            <th>Default</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>file_size</code>
            </td>
            <td>int</td>
            <td>required</td>
          </tr>
          <tr>
            <td>
              <code>output_type</code>
            </td>
            <td>string</td>
            <td>
              <code>json</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>word_timestamps</code>
            </td>
            <td>bool</td>
            <td>
              <code>true</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>speaker_labels</code>
            </td>
            <td>bool</td>
            <td>
              <code>true</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>nltk</code>
            </td>
            <td>bool</td>
            <td>
              <code>true</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>tier</code>
            </td>
            <td>string</td>
            <td>
              <code>standard</code> — the only tier currently available
            </td>
          </tr>
          <tr>
            <td>
              <code>custom_vocabulary</code>
            </td>
            <td>string[]</td>
            <td>optional</td>
          </tr>
          <tr>
            <td>
              <code>callback_url</code>
            </td>
            <td>string (uri)</td>
            <td>optional</td>
          </tr>
        </tbody>
      </table>
      <p>
        <code>callback_url</code> is an optional http(s) webhook. On completion
        or permanent failure the platform POSTs a JSON notification there —{" "}
        <code>
          {`{job_id, status: "completed"|"failed", download_url?, step?, reason?}`}
        </code>{" "}
        — signed with HMAC-SHA256 in the{" "}
        <code>X-SR-Signature: sha256=&lt;hex&gt;</code> header (verify against
        the raw body) plus a unique <code>X-SR-Delivery</code> id. See any{" "}
        <Link href="/sdks/python">SDK page</Link> for a signature-verification
        snippet.
      </p>

      <h3>Response</h3>
      <CodeBlock
        language="json"
        code={`{
  "job_id": "…",
  "upload_url": "https://…",
  "download_url": "https://…",
  "content_type": "application/octet-stream",
  "expires_in": 3600
}`}
      />

      <h2>Progress heartbeat</h2>
      <EndpointBadge method="POST" path="/api/v1/upload/progress" />
      <p>
        Ping while the PUT is in flight (TTL ~15s). Body:{" "}
        <code>{`{"job_id":"…"}`}</code>
      </p>

      <h2>Complete</h2>
      <EndpointBadge method="POST" path="/api/v1/upload/complete" />
      <p>
        Enqueues the job. Body: <code>{`{"job_id":"…"}`}</code>
      </p>

      <p>
        Then wait on{" "}
        <Link href="/api-reference/jobs">
          GET /api/v1/jobs/{"{job_id}"}/stream
        </Link>
        .
      </p>
    </>
  );
}
