import { Callout } from "@/components/DocsUI";
import { LIMITS, RATE_LIMITS, SITE } from "@/lib/constants";
import type { Metadata } from "next";
import Link from "next/link";
import { ENDPOINTS, TAGS } from "@/lib/openapi";

export const metadata: Metadata = {
  title: "API overview",
  description:
    "Base URL, authentication, file-size limits, per-endpoint rate limits, supported audio formats and every error code for the Speech Revolutions speech-to-text API.",
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
      <p>
        Every public endpoint is also described in an{" "}
        <a href="/openapi.json">OpenAPI 3.1 document</a>. Use it with a client generator, an
        HTTP client, or a coding agent.
      </p>

      <h2>Limits</h2>
      <div className="table-scroll">
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
              <td>Through an SDK, which uploads in parts</td>
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
              <td>Uploaded audio is deleted within 30 minutes of job completion</td>
            </tr>
          </tbody>
        </table>
      </div>
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
        automatically. If you call the API directly, retry with exponential
        backoff.
      </p>
      <div className="table-scroll">
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
      </div>
      <p>
        Each upload creates one job, so the upload limit is also your job
        submission rate: 120 new jobs a minute, 7,200 an hour. To raise it for
        your key, contact us.
      </p>

      <h2>Audio formats</h2>
      <p>
        Audio is decoded with FFmpeg, so you do not declare the container or codec. Supported
        formats include <code>mp3</code>, <code>wav</code>, <code>m4a</code>/
        <code>mp4</code>, <code>aac</code>, <code>ogg</code>, <code>opus</code>,{" "}
        <code>flac</code>, <code>webm</code>, <code>wma</code>, and <code>aiff</code>. Video
        files work too: the audio track is extracted and the video discarded. Sample rate,
        channel count, and bit depth are normalized for you, so do not convert files before
        uploading. Re-encoding usually loses quality and does not make processing faster.
      </p>
      <p>
        A file that cannot be decoded, or that contains no audio track, is not rejected at
        upload. The job fails at the <code>preprocess</code> stage, with the reason on the
        job record.
      </p>

      <h2>Errors</h2>
      <p>
        Every error is JSON with a <code>detail</code> field. For a validation error (a missing
        header or a field of the wrong type), <code>detail</code> is a list, and each entry
        names the invalid field in <code>loc</code>.
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Meaning</th>
              <th>What to do</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>400</code>
              </td>
              <td>The request is valid but cannot be processed. The most common cause is
                completing an upload whose bytes never arrived.</td>
              <td>Fix the call. Retrying as-is fails the same way.</td>
            </tr>
            <tr>
              <td>
                <code>401</code>
              </td>
              <td>Missing, malformed or revoked API key.</td>
              <td>
                Check the <code>X-API-Key</code> header. A request with no{" "}
                <code>User-Agent</code> header is also rejected.
              </td>
            </tr>
            <tr>
              <td>
                <code>402</code>
              </td>
              <td>The account is out of credit.</td>
              <td>
                Top up, or turn on auto-recharge. Reads, listing, and cancellation keep
                working; only new jobs are refused.
              </td>
            </tr>
            <tr>
              <td>
                <code>404</code>
              </td>
              <td>No such job for this account.</td>
              <td>Check the job ID. Jobs are scoped to the key that created them.</td>
            </tr>
            <tr>
              <td>
                <code>413</code>
              </td>
              <td>The file is over the limit for that route.</td>
              <td>
                Use the SDK upload path for anything above <code>{LIMITS.apiUploadMax}</code>.
              </td>
            </tr>
            <tr>
              <td>
                <code>422</code>
              </td>
              <td>A field is missing or the wrong type.</td>
              <td>
                Read <code>detail[].loc</code> — it names the field.
              </td>
            </tr>
            <tr>
              <td>
                <code>429</code>
              </td>
              <td>Over the rate limit for that endpoint.</td>
              <td>Back off and retry. The SDKs do this for you.</td>
            </tr>
            <tr>
              <td>
                <code>503</code>
              </td>
              <td>The service is temporarily at capacity.</td>
              <td>
                Retry after the interval in the <code>Retry-After</code> header. This error
                is transient and safe to retry.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        <strong>A job that fails after it was accepted</strong> does not return an HTTP
        error. The request succeeded, and the job record carries the failure. Poll the job or
        read the stream, then check <code>failed_stage</code> and <code>reason</code>.{" "}
        <code>failed_stage</code> says where the job stopped — <code>preprocess</code> for a file
        that could not be decoded, a <code>gpu_</code> stage for transcription, diarization
        or timestamping, <code>aggregation</code> for assembling the transcript, and{" "}
        <code>user</code> for a job cancelled from your side.
      </p>
      <Callout title="Retrying safely" tone="warn">
        <p>
          <code>POST /api/v1/transcribe</code> creates a job as soon as the server has the
          audio, and the API has no idempotency key. If the connection drops after the{" "}
          <code>accepted</code> event, you already have the job ID: follow that job instead of
          resending. If it drops before, you cannot tell whether the job exists, and resending
          creates a <em>second</em> job for the same audio, transcribed and billed twice.
          Resend only when the request never reached the server: a connect timeout, or a{" "}
          <code>429</code>. Everything else is safe to retry. The official SDKs follow this
          rule.
        </p>
      </Callout>

      <h2>Endpoints</h2>
      <p>
        Every endpoint has its own page with parameters, request samples and response
        examples, generated from the{" "}
        <a href="/openapi.json">OpenAPI 3.1 document</a>.
      </p>
      {TAGS.map((tag) => (
        <div key={tag}>
          <h3>{tag}</h3>
          <div className="table-scroll">
            <table>
              <tbody>
                {ENDPOINTS.filter((e) => e.tag === tag).map((e) => (
                  <tr key={e.slug}>
                    <td className="w-16">
                      <code>{e.method}</code>
                    </td>
                    <td>
                      <Link href={`/api-reference/endpoints/${e.slug}`}>{e.path}</Link>
                    </td>
                    <td>{e.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <Callout title="Upload styles" tone="info">
        <p>
          <strong>SDK path:</strong> the SDK uploads the file in parts, then follows the job
          until the transcript is ready.
          <br />
          <strong>Terminal path:</strong> one raw-body stream to{" "}
          <code>/transcribe</code> with SSE progress on the same connection.
          <br />
          <strong>By URL:</strong> pass <code>audio_url</code> to{" "}
          <code>/upload</code> and the API fetches the audio for you. Nothing is
          uploaded from your client.
        </p>
      </Callout>
    </>
  );
}
