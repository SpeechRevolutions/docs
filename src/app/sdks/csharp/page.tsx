import { CodeBlock } from "@/components/CodeBlock";
import { Callout } from "@/components/DocsUI";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "C# SDK",
  description:
    "The official C# client for the Speech Revolutions STT API. Async methods throughout, targeting net8.0.",
};

export default function CsharpSdkPage() {
  return (
    <>
      <h1>C# / .NET SDK</h1>
      <p>
        The official C# client for the Speech Revolutions STT API. Every
        network call is async. The SDK targets <code>net8.0</code>.
      </p>

      <p>
        Source on{" "}
        <a href="https://github.com/SpeechRevolutions/csharp-sdk">GitHub</a> &middot;{" "}
        <a href="https://github.com/SpeechRevolutions/csharp-sdk/issues">
          report an issue
        </a>{" "}
        &middot; <a href="https://www.nuget.org/packages/SpeechRevolutions">NuGet</a>
      </p>

      <h2>Install</h2>
      <CodeBlock language="bash" code={`dotnet add package SpeechRevolutions`} />
      <h2>Quickstart</h2>
      <p>
        <code>TranscribeAsync</code> accepts a local path or an{" "}
        <code>http(s)</code> URL. A <code>byte[]</code> overload handles
        in-memory audio. With the default <code>OutputType.Json</code>, the SDK
        parses the response into a <code>TranscriptResult</code>.
      </p>
      <CodeBlock
        language="csharp"
        filename="Program.cs"
        code={`using SpeechRevolutions;

using var client = new SpeechRevolutionsClient(); // SPEECHREVOLUTIONS_API_KEY
var result = await client.TranscribeAsync("meeting.mp3", new TranscribeOptions
{
    SpeakerLabels = true, // or Diarize = true
});

Console.WriteLine(result.Text);
foreach (var u in result.Utterances)
    Console.WriteLine($"{u.Speaker}: {u.Text}");`}
      />

      <h2>From a URL or file</h2>
      <CodeBlock
        language="csharp"
        code={`// explicit alias
var result = await client.TranscribeUrlAsync("https://example.com/audio.mp3");

// or just pass the URL — http(s):// paths are downloaded:
var same = await client.TranscribeAsync("https://example.com/audio.mp3");`}
      />

      <h2>Options</h2>
      <p>
        Pass a <code>TranscribeOptions</code>. <code>Diarize</code> is an alias
        for <code>SpeakerLabels</code>. When you set it, it takes precedence.
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Option</th>
              <th>Type</th>
              <th>Default</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>OutputType</code>
              </td>
              <td>
                <code>OutputType</code>
              </td>
              <td>
                <code>Json</code>
              </td>
              <td>
                <code>Txt | Json | Srt | Vtt | Docx | Pdf</code>
              </td>
            </tr>
            <tr>
              <td>
                <code>WordTimestamps</code>
              </td>
              <td>
                <code>bool</code>
              </td>
              <td>
                <code>true</code>
              </td>
              <td>Per-word start/end times</td>
            </tr>
            <tr>
              <td>
                <code>SpeakerLabels</code>
              </td>
              <td>
                <code>bool</code>
              </td>
              <td>
                <code>true</code>
              </td>
              <td>Label who spoke each segment</td>
            </tr>
            <tr>
              <td>
                <code>Diarize</code>
              </td>
              <td>
                <code>bool?</code>
              </td>
              <td>
                <code>null</code>
              </td>
              <td>
                Alias for <code>SpeakerLabels</code>
              </td>
            </tr>
            <tr>
              <td>
                <code>Nltk</code>
              </td>
              <td>
                <code>bool</code>
              </td>
              <td>
                <code>true</code>
              </td>
              <td>Restore punctuation &amp; capitalization</td>
            </tr>
            <tr>
              <td>
                <code>Tier</code>
              </td>
              <td>
                <code>ProcessingTier</code>
              </td>
              <td>
                <code>Standard</code>
              </td>
              <td>
                <code>Standard</code> — the only tier currently available
              </td>
            </tr>
            <tr>
              <td>
                <code>CustomVocabulary</code>
              </td>
              <td>
                <code>IReadOnlyList&lt;string&gt;?</code>
              </td>
              <td>
                <code>null</code>
              </td>
              <td>Domain terms to bias toward</td>
            </tr>
            <tr>
              <td>
                <code>Language</code>
              </td>
              <td>
                <code>string?</code>
              </td>
              <td>
                <code>null</code>
              </td>
              <td>
                ISO 639-1 code (e.g. <code>&quot;en&quot;</code>) to skip detection;{" "}
                <code>null</code> detects the language automatically.{" "}
                <Link href="/cookbook#pin-language">When to pin</Link>
              </td>
            </tr>
            <tr>
              <td>
                <code>Progress</code>
              </td>
              <td>
                <code>bool</code>
              </td>
              <td>
                <code>false</code>
              </td>
              <td>Render live console bars</td>
            </tr>
            <tr>
              <td>
                <code>OnUploadProgress</code>
              </td>
              <td>
                <code>Action&lt;ProgressEvent&gt;?</code>
              </td>
              <td>
                <code>null</code>
              </td>
              <td>Upload-progress callback</td>
            </tr>
          </tbody>
        </table>
      </div>
      <CodeBlock
        language="csharp"
        code={`var result = await client.TranscribeAsync("a.mp3", new TranscribeOptions
{
    OutputType = OutputType.Srt,
    CustomVocabulary = new[] { "Kubernetes", "Anthropic" },
});`}
      />

      <h2>Live progress</h2>
      <p>
        The SDK reports progress for <strong>both</strong> the file upload and
        the transcription, as a console bar, a callback, or both. When you
        enable both, the bars render <em>and</em> your callbacks fire for every
        event.
      </p>
      <p>
        Files under about 3 MiB may report no transcription progress before
        they complete. Expect the bar to jump from the end of the upload to
        done.
      </p>
      <p>
        Set <code>Progress = true</code> for bars. An <code>Uploading</code>{" "}
        byte bar renders first, then a <code>Transcribing</code> bar. Each is a
        single line, updated in place and written to <code>stderr</code>, so
        piped <code>stdout</code> stays clean.
      </p>
      <CodeBlock
        language="csharp"
        code={`var result = await client.TranscribeAsync(
    "meeting.mp3",
    new TranscribeOptions
    {
        Progress = true, // console bars
        // upload progress — Step == "upload"
        OnUploadProgress = e => Console.WriteLine($"upload {e.Percent:0}%"),
    },
    // transcription progress
    onProgress: e => Console.WriteLine($"{e.Percent:0}% {e.Step}"));`}
      />
      <p>
        Each <code>ProgressEvent</code> carries <code>Completed</code>,{" "}
        <code>Total</code>, <code>Step</code>, <code>ElapsedSeconds</code>, and
        a computed <code>Percent</code> (a <code>double?</code> clamped to
        0–100, or <code>null</code> until the total is known).
      </p>
      <p>
        For a web UI, see{" "}
        <Link href="/guides/live-progress">Live progress for web apps</Link>.
        It combines both callbacks into a single 0–100 bar for your frontend.
      </p>

      <h2>Result shape</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Member</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>result.Text</code>
              </td>
              <td>Full transcript text</td>
            </tr>
            <tr>
              <td>
                <code>result.Transcript</code>
              </td>
              <td>Alias for <code>result.Text</code></td>
            </tr>
            <tr>
              <td>
                <code>result.Words</code>
              </td>
              <td>
                Words with <code>Start</code>, <code>End</code>, and <code>Speaker</code>
              </td>
            </tr>
            <tr>
              <td>
                <code>result.Utterances</code>
              </td>
              <td>Speaker turns</td>
            </tr>
            <tr>
              <td>
                <code>result.Content</code>
              </td>
              <td>Raw response bytes</td>
            </tr>
            <tr>
              <td>
                <code>await result.SaveAsync(path)</code>
              </td>
              <td>Write the output to disk</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        <code>SaveAsync("output")</code> writes{" "}
        <code>output.&lt;OutputType&gt;</code>. It adds the extension when the
        path has none and returns the final path. The client writes files only
        when you call <code>SaveAsync</code>.
      </p>
      <CodeBlock
        language="csharp"
        code={`var outPath = await result.SaveAsync("output"); // -> output.json`}
      />

      <h2>Webhooks</h2>
      <p>
        Set <code>CallbackUrl</code> to get notified when a job finishes
        instead of holding the call open. When the job completes or fails
        permanently, Speech Revolutions sends a signed JSON <code>POST</code>{" "}
        to your URL. The body is{" "}
        <code>
          {`{job_id, status: "completed"|"failed", download_url?, step?, reason?}`}
        </code>
        . It is signed with HMAC-SHA256 over the raw body, in the{" "}
        <code>X-SR-Signature: sha256=&lt;hex&gt;</code> header. The request
        also carries <code>X-SR-Event</code> (the status) and a unique{" "}
        <code>X-SR-Delivery</code> ID. Verify the signature against the raw
        request bytes with <code>HMACSHA256</code> and{" "}
        <code>CryptographicOperations.FixedTimeEquals</code>. Copy your signing
        secret from the console (
        <strong>API Keys → Webhook signing secret</strong>) into{" "}
        <code>SPEECHREVOLUTIONS_WEBHOOK_SECRET</code>. The{" "}
        <Link href="/guides/webhooks">webhooks guide</Link> covers the payload,
        retries, and secret rotation.
      </p>
      <CodeBlock
        language="csharp"
        code={`var result = await client.TranscribeAsync("meeting.mp3", new TranscribeOptions
{
    CallbackUrl = "https://you.example.com/hook",
});`}
      />

      <h2>Retrieve results later</h2>
      <p>
        Fetch a job by ID at any time, for example after a webhook arrives or
        after your service restarts. The download URL is generated on each
        request, so you can fetch results long after the original upload.
      </p>
      <CodeBlock
        language="csharp"
        code={`// List the most-recent jobs (newest first), cursor-paginated.
var page = await client.ListJobsAsync(limit: 10);
Console.WriteLine($"{page.Jobs.Count} job(s); nextBefore={page.NextBefore}");
foreach (var job in page.Jobs)
    Console.WriteLine($"  {job.JobId}  ({job.CreatedAt})");

// Poll a job by id, then fetch its transcript.
var status = await client.GetJobStatusAsync(jobId);
Console.WriteLine($"status: {status.Status}");
if (status.IsCompleted)
{
    var result = await client.GetTranscriptAsync(jobId); // downloads + parses
    Console.WriteLine(result.Text);
}
else if (status.IsFailed)
{
    Console.WriteLine($"{status.FailedStage}: {status.Reason}");
}`}
      />

      <h2>Authentication</h2>
      <p>The SDK reads your API key from the environment:</p>
      <CodeBlock
        language="bash"
        code={`export SPEECHREVOLUTIONS_API_KEY=stt_...`}
      />
      <p>Or pass it explicitly:</p>
      <CodeBlock language="csharp" code={`using var client = new SpeechRevolutionsClient(apiKey: "stt_...");`} />

      <h2>Errors</h2>
      <p>
        All errors derive from <code>SpeechRevolutionsException</code>:{" "}
        <code>AuthenticationException</code>, <code>RateLimitException</code>,{" "}
        <code>JobNotFoundException</code>, <code>JobFailedException</code>{" "}
        (<code>Step</code> / <code>Reason</code>), <code>UploadException</code>,{" "}
        <code>JobTimeoutException</code>, and <code>ApiException</code>{" "}
        (<code>StatusCode</code> / <code>Body</code>).
      </p>

      <Callout title="Under the hood" tone="info">
        <p>
          The SDK uploads the file in parts, retrying any part that fails. It
          then listens on the{" "}
          <Link href="/api-reference/jobs">SSE job stream</Link> and converts
          the <code>completed</code> and <code>total</code> counts into{" "}
          <code>Percent</code>.
        </p>
      </Callout>
    </>
  );
}
