import { Callout } from "@/components/DocsUI";
import { LIMITS, RATE_LIMITS, SITE } from "@/lib/constants";
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

      <h2>Limits</h2>
      <table>
        <thead>
          <tr>
            <th>Limit</th>
            <th>Value</th>
            <th>Applies to</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Maximum file size</td>
            <td>
              <code>{LIMITS.sdkUploadMax}</code>
            </td>
            <td>
              SDK upload flow (<code>/api/v1/upload</code> + presigned PUT or
              multipart)
            </td>
          </tr>
          <tr>
            <td>Maximum file size</td>
            <td>
              <code>{LIMITS.apiUploadMax}</code>
            </td>
            <td>
              Direct REST upload (<code>/api/v1/transcribe</code>)
            </td>
          </tr>
          <tr>
            <td>Audio retention</td>
            <td>
              <code>{LIMITS.dataRetentionMinutes} minutes</code>
            </td>
            <td>Uploaded audio is deleted after processing</td>
          </tr>
        </tbody>
      </table>
      <p>
        A file larger than the limit for its path is rejected at job creation,
        before any upload starts. Send anything above{" "}
        <code>{LIMITS.apiUploadMax}</code> through an SDK rather than the REST
        endpoint.
      </p>

      <h2>Rate limits</h2>
      <p>
        Limits apply per API key, per endpoint, over a rolling minute. Going over
        returns <code>429</code>. The official SDKs back off and retry
        automatically, so most applications never see one; if you call the API
        directly, wait a few seconds and retry with exponential backoff.
      </p>
      <table>
        <thead>
          <tr>
            <th>Endpoint</th>
            <th>Requests / minute</th>
          </tr>
        </thead>
        <tbody>
          {RATE_LIMITS.map((r) => (
            <tr key={r.endpoint}>
              <td>
                <code>{r.endpoint}</code>
              </td>
              <td>{r.perMinute}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Each upload creates one job, so the upload limit is also your job
        submission rate: 120 new jobs a minute, 7,200 an hour. If you need more,
        contact us and we will raise it for your key.
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
