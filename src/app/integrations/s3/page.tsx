import { CodeBlock } from "@/components/CodeBlock";
import { CodeTabs } from "@/components/CodeTabs";
import { Callout } from "@/components/DocsUI";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Using Speech Revolutions with Amazon S3",
  description:
    "Already storing audio in S3? You don't need to download it first. Presign a short-lived GET URL for the object, hand that URL to Speech Revolutions, and write the JSON…",
};

export default function S3IntegrationPage() {
  return (
    <>
      <h1>Using Speech Revolutions with Amazon S3</h1>
      <p>
        Already storing audio in S3? You don&apos;t need to download it first.
        Presign a short-lived GET URL for the object, hand that URL to Speech Revolutions,
        and write the JSON transcript straight back to a bucket. Everything runs
        server-side, so your AWS credentials and Speech Revolutions API key never leave your
        backend.
      </p>

      <Callout title="Why presign instead of making the object public" tone="tip">
        <p>
          A presigned GET URL grants Speech Revolutions time-limited read access to one
          object without opening the bucket to the world. Give it a lifetime
          comfortably longer than your largest file&apos;s transcription time,
          then let it expire.
        </p>
      </Callout>

      <h2>Transcribe an object already in S3</h2>
      <p>
        Presign a GET for the source object and pass the URL to Speech Revolutions — the SDK
        auto-detects <code>http(s)</code> URLs, so <code>transcribe()</code>{" "}
        streams the audio directly from S3. Then serialize{" "}
        <code>result.to_dict()</code> / <code>result.toDict()</code> and{" "}
        <code>PutObject</code> it back to your output bucket.
      </p>
      <CodeTabs
        tabs={[
          {
            label: "Python",
            language: "python",
            filename: "transcribe_s3.py",
            code: `import json

import boto3
from speechrevolutions import SpeechRevolutions

s3 = boto3.client("s3")
client = SpeechRevolutions()  # SPEECHREVOLUTIONS_API_KEY / STT_API_KEY

SRC_BUCKET = "my-audio"
OUT_BUCKET = "my-transcripts"


def transcribe_s3_object(key: str) -> str:
    # 1. Presign a short-lived GET so Speech Revolutions can read the object.
    audio_url = s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": SRC_BUCKET, "Key": key},
        ExpiresIn=3600,  # seconds — outlast the transcription
    )

    # 2. Pass the URL straight to Speech Revolutions (auto-detected as a URL).
    result = client.transcribe(audio_url, speaker_labels=True)

    # 3. Store the JSON result back to S3.
    out_key = key.rsplit(".", 1)[0] + ".json"
    s3.put_object(
        Bucket=OUT_BUCKET,
        Key=out_key,
        Body=json.dumps(result.to_dict()).encode(),
        ContentType="application/json",
    )
    return out_key`,
          },
          {
            label: "JavaScript",
            language: "ts",
            filename: "transcribe-s3.ts",
            code: `import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { SpeechRevolutions } from "@speechrevolutions/stt";

const s3 = new S3Client({});
const client = new SpeechRevolutions(); // SPEECHREVOLUTIONS_API_KEY / STT_API_KEY

const SRC_BUCKET = "my-audio";
const OUT_BUCKET = "my-transcripts";

export async function transcribeS3Object(key: string): Promise<string> {
  // 1. Presign a short-lived GET so Speech Revolutions can read the object.
  const audioUrl = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: SRC_BUCKET, Key: key }),
    { expiresIn: 3600 }, // seconds — outlast the transcription
  );

  // 2. Pass the URL straight to Speech Revolutions (auto-detected as a URL).
  const result = await client.transcribe(audioUrl, { speakerLabels: true });

  // 3. Store the JSON result back to S3.
  const outKey = key.replace(/\\.[^.]+$/, "") + ".json";
  await s3.send(
    new PutObjectCommand({
      Bucket: OUT_BUCKET,
      Key: outKey,
      Body: JSON.stringify(result.toDict()),
      ContentType: "application/json",
    }),
  );
  return outKey;
}`,
          },
        ]}
      />

      <h2>Long files: submit() + a webhook</h2>
      <p>
        For large recordings, don&apos;t block on <code>transcribe()</code>.
        Presign the GET, call <code>submit()</code> with a{" "}
        <code>callback_url</code>, and store the result to S3 from your webhook
        handler once the job completes.
      </p>
      <CodeTabs
        tabs={[
          {
            label: "Python",
            language: "python",
            filename: "submit_s3.py",
            code: `audio_url = s3.generate_presigned_url(
    "get_object",
    Params={"Bucket": SRC_BUCKET, "Key": key},
    ExpiresIn=3600,
)

job_id = client.submit(
    audio_url,
    speaker_labels=True,
    callback_url="https://you.example.com/webhooks/stt",
)
# In the webhook handler (after verifying X-SR-Signature):
#   result = client.get_transcript(event["job_id"])
#   s3.put_object(Bucket=OUT_BUCKET, Key=out_key,
#                 Body=json.dumps(result.to_dict()).encode())`,
          },
          {
            label: "JavaScript",
            language: "ts",
            filename: "submit-s3.ts",
            code: `const audioUrl = await getSignedUrl(
  s3,
  new GetObjectCommand({ Bucket: SRC_BUCKET, Key: key }),
  { expiresIn: 3600 },
);

const jobId = await client.submit(audioUrl, {
  speakerLabels: true,
  callbackUrl: "https://you.example.com/webhooks/stt",
});
// In the webhook handler (after verifying X-SR-Signature):
//   const result = await client.getTranscript(event.job_id);
//   await s3.send(new PutObjectCommand({ Bucket: OUT_BUCKET, Key: outKey,
//     Body: JSON.stringify(result.toDict()) }));`,
          },
        ]}
      />

      <Callout title="Verify the webhook signature" tone="warn">
        <p>
          The completion POST is signed with HMAC-SHA256 in the{" "}
          <code>X-SR-Signature: sha256=&lt;hex&gt;</code> header — always verify
          it against the raw request bytes before trusting{" "}
          <code>download_url</code>. The{" "}
          <Link href="/integrations/fastapi">FastAPI</Link> and{" "}
          <Link href="/integrations/nextjs">Next.js</Link> guides show complete
          receivers.
        </p>
      </Callout>

      <Callout title="Under the hood" tone="info">
        <p>
          Passing a URL lets Speech Revolutions fetch the audio directly; the SDK then waits
          on the{" "}
          <Link href="/api-reference/jobs">SSE job stream</Link> and parses the
          result. See the <Link href="/sdks/python">Python</Link> and{" "}
          <Link href="/sdks/javascript">JavaScript</Link> SDK pages for the full
          option and result surface.
        </p>
      </Callout>
    </>
  );
}
