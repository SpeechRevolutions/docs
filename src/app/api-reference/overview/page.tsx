import { Callout } from "@/components/DocsUI";
import { SITE } from "@/lib/constants";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "API overview",
  description:
    "Base URL: https://api.speechrevolutions.com",
};

export default function ApiOverviewPage() {
  return (
    <>
      <h1>API reference</h1>
      <p>
        Base URL: <code>{SITE.apiBase}</code>
      </p>
      <p>
        Auth: <code>X-API-Key: &lt;key&gt;</code>
      </p>

      <h2>Endpoints</h2>
      <table>
        <thead>
          <tr>
            <th>Method</th>
            <th>Path</th>
            <th>Audience</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>POST</code>
            </td>
            <td>
              <Link href="/api-reference/upload">/api/v1/upload</Link>
            </td>
            <td>SDK — create job + presigned URLs</td>
          </tr>
          <tr>
            <td>
              <code>POST</code>
            </td>
            <td>
              <Link href="/api-reference/upload">/api/v1/upload/progress</Link>
            </td>
            <td>SDK — keep upload session alive</td>
          </tr>
          <tr>
            <td>
              <code>POST</code>
            </td>
            <td>
              <Link href="/api-reference/upload">/api/v1/upload/complete</Link>
            </td>
            <td>SDK — enqueue after storage PUT</td>
          </tr>
          <tr>
            <td>
              <code>POST</code>
            </td>
            <td>
              <Link href="/api-reference/transcribe">/api/v1/transcribe</Link>
            </td>
            <td>Terminal — stream file + progress</td>
          </tr>
          <tr>
            <td>
              <code>GET</code>
            </td>
            <td>
              <Link href="/api-reference/jobs">/api/v1/jobs/{"{id}"}/stream</Link>
            </td>
            <td>SSE progress (SDK wait path)</td>
          </tr>
          <tr>
            <td>
              <code>POST</code>
            </td>
            <td>
              <Link href="/api-reference/jobs">/api/v1/jobs/cancel</Link>
            </td>
            <td>Cancel a job</td>
          </tr>
          <tr>
            <td>
              <code>POST</code>
            </td>
            <td>
              <Link href="/api-reference/jobs">/api/v1/jobs/check-failed</Link>
            </td>
            <td>Batch failure check</td>
          </tr>
        </tbody>
      </table>

      <Callout title="Upload styles" tone="info">
        <p>
          <strong>SDK path:</strong> upload → progress → complete → SSE
          (multipart when available, else a single presigned PUT).
          <br />
          <strong>Terminal path:</strong> one raw-body stream to{" "}
          <code>/transcribe</code> with SSE progress on the same connection.
          <br />
          <strong>By URL:</strong> pass <code>audio_url</code> to{" "}
          <code>/upload</code> and the platform fetches the audio itself — no
          client upload.
        </p>
      </Callout>
    </>
  );
}
