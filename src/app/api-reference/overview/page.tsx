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
        <a href="/openapi.json">OpenAPI 3.1 document</a> — point a client generator, an
        HTTP client or a coding agent at it rather than reading this page by hand.
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
        automatically, so most applications never see one; if you call the API
        directly, wait a few seconds and retry with exponential backoff.
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
        submission rate: 120 new jobs a minute, 7,200 an hour. If you need more,
        contact us and we will raise it for your key.
      </p>

      <h2>Audio formats</h2>
      <p>
        Audio is decoded with FFmpeg, so the container and codec do not have to be declared
        and almost anything plays: <code>mp3</code>, <code>wav</code>, <code>m4a</code>/
        <code>mp4</code>, <code>aac</code>, <code>ogg</code>, <code>opus</code>,{" "}
        <code>flac</code>, <code>webm</code>, <code>wma</code>, <code>aiff</code>. Video files
        work too — the audio track is extracted and the video discarded. Sample rate, channel
        count and bit depth are normalised for you, so there is nothing to convert before
        uploading; re-encoding first usually loses quality rather than gaining speed.
      </p>
      <p>
        A file that FFmpeg cannot decode, or that contains no audio track, fails the job at
        the <code>preprocess</code> stage with the reason on the job record rather than
        being rejected at upload — the bytes have to be read before anything can tell.
      </p>

      <h2>Errors</h2>
      <p>
        Every error is JSON with a <code>detail</code> field. A validation error — a missing
        header or a field of the wrong type — carries a list instead, each entry naming the
        offending field in <code>loc</code>.
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
              <td>The request is understood but cannot be acted on — most often completing
                an upload whose bytes never arrived.</td>
              <td>Fix the call. Retrying as-is fails the same way.</td>
            </tr>
            <tr>
              <td>
                <code>401</code>
              </td>
              <td>Missing, malformed or revoked API key.</td>
              <td>
                Check the <code>X-API-Key</code> header. A request with no{" "}
                <code>User-Agent</code> is rejected by the edge before it reaches the API.
              </td>
            </tr>
            <tr>
              <td>
                <code>402</code>
              </td>
              <td>The account is out of credit.</td>
              <td>
                Top up, or turn on auto-recharge. Reads, listing and cancellation keep
                working — only new jobs are refused.
              </td>
            </tr>
            <tr>
              <td>
                <code>404</code>
              </td>
              <td>No such job for this account.</td>
              <td>Check the job id. Jobs are scoped to the key that created them.</td>
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
              <td>The fleet is briefly at capacity.</td>
              <td>
                Retry after the <code>Retry-After</code> header. This one is transient and
                safe to retry.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        <strong>A job that fails after it was accepted</strong> is not an HTTP error: the
        request succeeded and the job record carries the failure. Poll the job or read the
        stream, and read <code>failed_stage</code> and <code>reason</code>.{" "}
        <code>failed_stage</code> says where it stopped — <code>preprocess</code> for a file
        that could not be decoded, a <code>gpu_</code> stage for transcription, diarization
        or timestamping, <code>aggregation</code> for assembling the transcript, and{" "}
        <code>user</code> for a job cancelled from your side.
      </p>
      <Callout title="Retrying safely" tone="warn">
        <p>
          <code>POST /api/v1/upload</code> and{" "}
          <code>POST /api/v1/upload/multipart/create</code> create a job the moment the
          server handles them, and the API has no idempotency key. If the response is lost
          — a 502, a reset, a read timeout — you cannot tell whether the job exists, and
          retrying creates a <em>second</em> job for the same audio, which is transcribed and
          billed twice. Retry these two only when the request provably never landed: a
          connect timeout, or a <code>429</code>. Everything else is safe to retry. The
          official SDKs already follow this rule.
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
