import { CodeBlock } from "@/components/CodeBlock";
import { CodeTabs } from "@/components/CodeTabs";
import { LIMITS, SITE } from "@/lib/constants";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Uploading files",
  description: `Send audio up to ${LIMITS.apiUploadMax} in one request with cURL, anything up to ${LIMITS.sdkUploadMax} through an SDK, or a URL for audio that is already online.`,
};

/*
 * How audio gets in, by size and source. This page used to document the upload endpoints the
 * SDKs call internally (create, presigned PUT, progress, complete, multipart). Those are the
 * SDKs' transport, not a public API: they are not in the API reference, and nothing here tells a
 * reader to call them. A reader without an SDK uses /api/v1/transcribe.
 */
export default function UploadingFilesPage() {
  return (
    <>
      <h1>Uploading files</h1>
      <p>
        Send audio up to {LIMITS.apiUploadMax} in a single request with cURL, anything up to{" "}
        {LIMITS.sdkUploadMax} through an SDK, or pass a URL for audio that is already online.
      </p>

      <h2>Up to {LIMITS.apiUploadMax}: one request</h2>
      <p>
        <Link href="/api-reference/endpoints/transcribe">
          <code>POST /api/v1/transcribe</code>
        </Link>{" "}
        takes the audio as the request body and streams the transcript back on the same
        connection. Nothing to install, and no job to poll.
      </p>
      <CodeBlock
        language="bash"
        code={`curl -N -X POST "${SITE.apiBase}/api/v1/transcribe?output_type=json&speaker_labels=true" \\
  -H "X-API-Key: $SPEECHREVOLUTIONS_API_KEY" \\
  --data-binary @meeting.mp3`}
      />
      <p>
        The <Link href="/api-reference/transcribe">one-request transcription</Link> guide covers
        the stream, its events, and how to resume if the connection drops.
      </p>

      <h2>Larger files: use an SDK</h2>
      <p>
        Above {LIMITS.apiUploadMax}, and for anything running in production, let an SDK do the
        upload. It sends the file in parts straight to storage, retries a part that fails rather
        than the whole file, reports upload progress, and then waits for the result. Up to{" "}
        {LIMITS.sdkUploadMax} per file.
      </p>
      <CodeTabs
        tabs={[
          {
            label: "Python",
            language: "python",
            code: `from speechrevolutions import SpeechRevolutions

client = SpeechRevolutions()  # reads SPEECHREVOLUTIONS_API_KEY
result = client.transcribe("board-meeting.mp4", speaker_labels=True)
print(result.text)`,
          },
          {
            label: "JavaScript",
            language: "ts",
            code: `import { SpeechRevolutions } from "speechrevolutions";

const client = new SpeechRevolutions(); // reads SPEECHREVOLUTIONS_API_KEY
const result = await client.transcribe("board-meeting.mp4", { speakerLabels: true });
console.log(result.text);`,
          },
          {
            label: "Go",
            language: "go",
            code: `client, err := stt.NewClient("") // reads SPEECHREVOLUTIONS_API_KEY
if err != nil {
	log.Fatal(err)
}
sl := true
result, err := client.Transcribe(context.Background(), "board-meeting.mp4",
	stt.TranscribeOptions{SpeakerLabels: &sl}, nil)
if err != nil {
	log.Fatal(err)
}
fmt.Println(result.Text())`,
          },
          {
            label: "C#",
            language: "csharp",
            code: `using SpeechRevolutions;

using var client = new SpeechRevolutionsClient(); // reads SPEECHREVOLUTIONS_API_KEY
var result = await client.TranscribeAsync("board-meeting.mp4",
    new TranscribeOptions { SpeakerLabels = true });
Console.WriteLine(result.Text);`,
          },
        ]}
      />

      <h2>Audio that is already online</h2>
      <p>
        Pass an <code>https</code> URL instead of a path and the platform fetches the audio
        itself, so the bytes never pass through your machine. The URL has to be reachable from
        the public internet; for a private bucket, pass a signed URL that outlives the job (see{" "}
        <Link href="/integrations/s3">Amazon S3</Link> and{" "}
        <Link href="/integrations/supabase">Supabase</Link>).
      </p>
      <CodeTabs
        tabs={[
          {
            label: "Python",
            language: "python",
            code: `result = client.transcribe("https://example.com/audio.mp3")`,
          },
          {
            label: "JavaScript",
            language: "ts",
            code: `const result = await client.transcribe("https://example.com/audio.mp3");`,
          },
          {
            label: "Go",
            language: "go",
            code: `result, err := client.TranscribeURL(ctx, "https://example.com/audio.mp3", stt.TranscribeOptions{}, nil)`,
          },
          {
            label: "C#",
            language: "csharp",
            code: `var result = await client.TranscribeAsync("https://example.com/audio.mp3");`,
          },
        ]}
      />

      <h2>Don&apos;t wait on the result</h2>
      <p>
        For batches and background work, submit and move on: pass a <code>callback_url</code>{" "}
        and we POST a signed notification when each job finishes. It works with every SDK and
        with <code>/api/v1/transcribe</code> as a query parameter. The{" "}
        <Link href="/guides/webhooks">webhooks guide</Link> covers the payload, verifying the
        signature, and retries.
      </p>

      <h2>Formats and limits</h2>
      <p>
        Common audio and video formats are accepted, and anything we can decode is transcoded for
        you. The{" "}
        <Link href="/api-reference/overview">API overview</Link> lists the formats, size limits,
        rate limits and every error code.
      </p>

      <h2>Next steps</h2>
      <ul>
        <li>
          <Link href="/api-reference/transcribe">One-request transcription</Link>: the stream,
          events and resuming.
        </li>
        <li>
          <Link href="/sdks/python">SDKs</Link>: upload progress, retries and every option.
        </li>
        <li>
          <Link href="/api-reference/jobs">Job lifecycle</Link>: list, fetch and cancel jobs.
        </li>
      </ul>
    </>
  );
}
