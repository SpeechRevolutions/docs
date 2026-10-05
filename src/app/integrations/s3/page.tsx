import { CodeBlock } from "@/components/CodeBlock";
import { CodeTabs } from "@/components/CodeTabs";
import { Callout } from "@/components/DocsUI";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Using Speech Revolutions with Amazon S3",
  description:
    "Transcribe audio stored in Amazon S3 without downloading it: presign a short-lived GET URL, pass it to Speech Revolutions, and write the JSON transcript back to a bucket.",
};

export default function S3IntegrationPage() {
  return (
    <>
      <h1>Using Speech Revolutions with Amazon S3</h1>
      <p>
        To transcribe audio stored in S3, you don&apos;t need to download it first.
        Presign a short-lived GET URL for the object, pass that URL to Speech Revolutions,
        and write the JSON transcript back to a bucket. Everything runs server-side, so
        your AWS credentials and Speech Revolutions API key stay in your backend.
      </p>

      <Callout title="Use a presigned URL, not a public object" tone="tip">
        <p>
          A presigned GET URL gives Speech Revolutions time-limited read access to one
          object without making the bucket public. Set an expiry longer than the
          transcription time of your largest file.
        </p>
      </Callout>

      <h2>Transcribe an object already in S3</h2>
      <p>
        Presign a GET URL for the source object and pass it to Speech Revolutions. The SDK
        detects <code>http(s)</code> URLs, so <code>transcribe()</code> fetches the audio
        directly from S3. Then serialize <code>result.to_dict()</code> (or{" "}
        <code>result.toDict()</code>) and write it to your output bucket with{" "}
        <code>PutObject</code>.
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
client = SpeechRevolutions()  # SPEECHREVOLUTIONS_API_KEY

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
import { SpeechRevolutions } from "speechrevolutions";

const s3 = new S3Client({});
const client = new SpeechRevolutions(); // SPEECHREVOLUTIONS_API_KEY

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
          {
            label: "Go",
            language: "go",
            filename: "transcribe_s3.go",
            code: `package main

import (
	"bytes"
	"context"
	"encoding/json"
	"log"
	"path/filepath"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	stt "github.com/speechrevolutions/speechrevolutions-go"
)

const (
	srcBucket = "my-audio"
	outBucket = "my-transcripts"
)

func transcribeS3Object(
	ctx context.Context, s3c *s3.Client, sttc *stt.Client, key string,
) (string, error) {
	// 1. Presign a short-lived GET so Speech Revolutions can read the object.
	presign := s3.NewPresignClient(s3c)
	req, err := presign.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(srcBucket),
		Key:    aws.String(key),
	}, s3.WithPresignExpires(time.Hour)) // outlast the transcription
	if err != nil {
		return "", err
	}

	// 2. Pass the URL straight to Speech Revolutions (auto-detected as a URL).
	result, err := sttc.Transcribe(ctx, req.URL, stt.TranscribeOptions{
		SpeakerLabels: stt.Bool(true),
	}, nil)
	if err != nil {
		return "", err
	}

	// 3. Store the JSON result back to S3.
	body, err := json.Marshal(result.ToDict())
	if err != nil {
		return "", err
	}
	outKey := strings.TrimSuffix(key, filepath.Ext(key)) + ".json"
	_, err = s3c.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(outBucket),
		Key:         aws.String(outKey),
		Body:        bytes.NewReader(body),
		ContentType: aws.String("application/json"),
	})
	return outKey, err
}

func main() {
	ctx := context.Background()
	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		log.Fatal(err)
	}
	sttc, err := stt.NewClient("") // SPEECHREVOLUTIONS_API_KEY
	if err != nil {
		log.Fatal(err)
	}

	key, err := transcribeS3Object(ctx, s3.NewFromConfig(cfg), sttc, "meeting.mp3")
	if err != nil {
		log.Fatal(err)
	}
	log.Println("wrote", key)
}`,
          },
          {
            label: "C#",
            language: "csharp",
            filename: "TranscribeS3.cs",
            code: `using System.Text;
using System.Text.Json;
using Amazon.S3;
using Amazon.S3.Model;
using SpeechRevolutions;

const string SrcBucket = "my-audio";
const string OutBucket = "my-transcripts";

using var s3 = new AmazonS3Client();
using var client = new SpeechRevolutionsClient(); // SPEECHREVOLUTIONS_API_KEY

async Task<string> TranscribeS3ObjectAsync(string key)
{
    // 1. Presign a short-lived GET so Speech Revolutions can read the object.
    var audioUrl = await s3.GetPreSignedURLAsync(new GetPreSignedUrlRequest
    {
        BucketName = SrcBucket,
        Key = key,
        Expires = DateTime.UtcNow.AddHours(1), // outlast the transcription
    });

    // 2. Pass the URL straight to Speech Revolutions (auto-detected as a URL).
    var result = await client.TranscribeAsync(audioUrl,
        new TranscribeOptions { SpeakerLabels = true });

    // 3. Store the JSON result back to S3.
    var outKey = Path.ChangeExtension(key, ".json");
    await s3.PutObjectAsync(new PutObjectRequest
    {
        BucketName = OutBucket,
        Key = outKey,
        ContentBody = JsonSerializer.Serialize(result.ToDict()),
        ContentType = "application/json",
    });
    return outKey;
}

Console.WriteLine(await TranscribeS3ObjectAsync("meeting.mp3"));`,
          },
        ]}
      />

      <h2>Long files: submit() and a webhook</h2>
      <p>
        For large recordings, don&apos;t block on <code>transcribe()</code>. Presign the
        GET URL, call <code>submit()</code> with a <code>callback_url</code>, and write the
        result to S3 from your webhook handler when the job completes.
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
          {
            label: "Go",
            language: "go",
            filename: "submit_s3.go",
            code: `presign := s3.NewPresignClient(s3c)
req, err := presign.PresignGetObject(ctx, &s3.GetObjectInput{
	Bucket: aws.String(srcBucket),
	Key:    aws.String(key),
}, s3.WithPresignExpires(time.Hour))
if err != nil {
	log.Fatal(err)
}

jobID, err := sttc.Submit(ctx, req.URL, stt.TranscribeOptions{
	SpeakerLabels: stt.Bool(true),
	CallbackURL:   "https://you.example.com/webhooks/stt",
})
// In the webhook handler (after verifying X-SR-Signature):
//   result, _ := sttc.GetTranscript(ctx, event.JobID, stt.OutputJSON)
//   body, _ := json.Marshal(result.ToDict())
//   s3c.PutObject(ctx, &s3.PutObjectInput{Bucket: aws.String(outBucket),
//       Key: aws.String(outKey), Body: bytes.NewReader(body)})`,
          },
          {
            label: "C#",
            language: "csharp",
            filename: "SubmitS3.cs",
            code: `var audioUrl = await s3.GetPreSignedURLAsync(new GetPreSignedUrlRequest
{
    BucketName = SrcBucket,
    Key = key,
    Expires = DateTime.UtcNow.AddHours(1),
});

var jobId = await client.SubmitAsync(audioUrl, new TranscribeOptions
{
    SpeakerLabels = true,
    CallbackUrl = "https://you.example.com/webhooks/stt",
});
// In the webhook handler (after verifying X-SR-Signature):
//   var result = await client.GetTranscriptAsync(evt.JobId);
//   await s3.PutObjectAsync(new PutObjectRequest {
//       BucketName = OutBucket, Key = outKey,
//       ContentBody = JsonSerializer.Serialize(result.ToDict()) });`,
          },
        ]}
      />

      <Callout title="Verify the webhook signature" tone="warn">
        <p>
          The completion POST is signed with HMAC-SHA256 in the{" "}
          <code>X-SR-Signature: sha256=&lt;hex&gt;</code> header. Always verify it against
          the raw request bytes before you use <code>download_url</code>, using your
          organization&apos;s signing secret from the console (
          <strong>API Keys → Webhook signing secret</strong>). The{" "}
          <Link href="/guides/webhooks">webhooks guide</Link> shows how in every
          language.
        </p>
      </Callout>

      <Callout title="How it works" tone="info">
        <p>
          When you pass a URL, Speech Revolutions fetches the audio directly. The SDK then
          waits on the <Link href="/api-reference/jobs">SSE job stream</Link> and parses
          the result. See the <Link href="/sdks/python">Python</Link> and{" "}
          <Link href="/sdks/javascript">JavaScript</Link> SDK pages for all options and
          result fields.
        </p>
      </Callout>
    </>
  );
}
