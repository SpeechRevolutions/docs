import { CodeBlock } from "@/components/CodeBlock";
import { Callout } from "@/components/DocsUI";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "C# SDK",
  description:
    "Official C# client for the Speech Revolutions STT API. Async-first, targets net8.0, in the style of the Deepgram / ElevenLabs .NET clients.",
};

export default function CsharpSdkPage() {
  return (
    <>
      <h1>C# / .NET SDK</h1>
      <p>
        Official C# client for the Speech Revolutions STT API. Async-first,
        targets <code>net8.0</code>, in the style of the Deepgram / ElevenLabs
        .NET clients.
      </p>

      <p>
        Source on 
        <a href="https://github.com/SpeechRevolutions/csharp-sdk">GitHub</a> &middot; 
        <a href="https://github.com/SpeechRevolutions/csharp-sdk/issues">
          report an issue
        </a>{" "}
        &middot; <a href="https://www.nuget.org/packages/SpeechRevolutions">NuGet</a>
      </p>

      <h2>Install</h2>
      <CodeBlock language="bash" code={`dotnet add package SpeechRevolutions`} />
      <p>Or reference the project directly:</p>
      <CodeBlock
        language="xml"
        code={`<ProjectReference Include="path/to/SpeechRevolutions/SpeechRevolutions.csproj" />`}
      />

      <h2>Quickstart</h2>
      <p>
        <code>TranscribeAsync</code> accepts a local path, an{" "}
        <code>http(s)</code> URL, or a <code>byte[]</code> overload for
        in-memory audio. With the default <code>OutputType.Json</code> the SDK
        parses the response into a transcript-first <code>TranscriptResult</code>.
      </p>
      <CodeBlock
        language="csharp"
        filename="Program.cs"
        code={`using SpeechRevolutions;

using var client = new SpeechRevolutionsClient(); // SPEECHREVOLUTIONS_API_KEY or STT_API_KEY
var result = await client.TranscribeAsync("meeting.mp3", new TranscribeOptions
{
    SpeakerLabels = true, // or Diarize = true
});

Console.WriteLine(result.Text);
foreach (var u in result.Utterances)
    Console.WriteLine($"Speaker {u.Speaker}: {u.Text}");`}
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
        Pass a <code>TranscribeOptions</code>. <code>Diarize</code> is a
        Deepgram-compatible alias for <code>SpeakerLabels</code> (when set, it
        wins).
      </p>
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
        Unlike AssemblyAI and Deepgram — which expose no percentage for
        pre-recorded audio — you get real-time progress for <strong>both</strong>{" "}
        the file upload and the transcription, as a console bar, a callback, or
        both. They compose: the bars render <em>and</em> your callbacks still
        fire for every event.
      </p>
      <p>
        Set <code>Progress = true</code> for bars. An <code>Uploading</code>{" "}
        byte bar renders first, then a <code>Transcribing</code> bar — both
        single-line, updated in place, and written to <code>stderr</code> (so
        they never pollute piped <code>stdout</code>).
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
        a computed <code>Percent</code> (a clamped <code>double?</code> in
        0–100, <code>null</code> until it can be computed).
      </p>
      <p>
        Building a UI?{" "}
        <Link href="/guides/live-progress">Live progress for web apps</Link>{" "}
        shows how to fold both callbacks into a single 0–100 bar you can serve
        to your frontend.
      </p>

      <h2>Result shape</h2>
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
            <td>Full transcript (AssemblyAI / ElevenLabs style)</td>
          </tr>
          <tr>
            <td>
              <code>result.Transcript</code>
            </td>
            <td>Deepgram-style alias</td>
          </tr>
          <tr>
            <td>
              <code>result.Words</code>
            </td>
            <td>
              Word + <code>Start</code> / <code>End</code> / <code>Speaker</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>result.Utterances</code>
            </td>
            <td>AssemblyAI-style speaker turns</td>
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
            <td>Write to disk</td>
          </tr>
        </tbody>
      </table>
      <p>
        <code>SaveAsync("output")</code> writes{" "}
        <code>output.&lt;OutputType&gt;</code> (extension inferred when the path
        has none) and returns the final path. The client never writes files on
        its own.
      </p>
      <CodeBlock
        language="csharp"
        code={`var outPath = await result.SaveAsync("output"); // -> output.json`}
      />

      <h2>Webhooks</h2>
      <p>
        Set <code>CallbackUrl</code> to be notified when a job finishes instead
        of holding the call open. On completion or permanent failure the
        platform POSTs a signed JSON body{" "}
        <code>
          {`{job_id, status: "completed"|"failed", download_url?, step?, reason?}`}
        </code>{" "}
        to your URL, signed with HMAC-SHA256 over the raw body in the{" "}
        <code>X-SR-Signature: sha256=&lt;hex&gt;</code> header (plus a unique{" "}
        <code>X-SR-Delivery</code> id). Verify it against the raw request bytes
        with <code>HMACSHA256</code> +{" "}
        <code>CryptographicOperations.FixedTimeEquals</code>.
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
        Fetch a job by id anytime — useful after a webhook, or when rebuilding
        state after a restart. The download URL is regenerated on demand.
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

      <h2>Auth</h2>
      <CodeBlock
        language="bash"
        code={`export SPEECHREVOLUTIONS_API_KEY=stt_...
# or
export STT_API_KEY=stt_...`}
      />
      <p>Or pass it explicitly:</p>
      <CodeBlock language="csharp" code={`using var client = new SpeechRevolutionsClient(apiKey: "stt_...");`} />

      <h2>Errors</h2>
      <p>
        All errors derive from <code>SttException</code>:{" "}
        <code>AuthenticationException</code>, <code>RateLimitException</code>,{" "}
        <code>JobNotFoundException</code>, <code>JobFailedException</code>{" "}
        (<code>Step</code> / <code>Reason</code>), <code>UploadException</code>,{" "}
        <code>JobTimeoutException</code>, and <code>ApiException</code>{" "}
        (<code>StatusCode</code> / <code>Body</code>).
      </p>

      <Callout title="Under the hood" tone="info">
        <p>
          The SDK drives the{" "}
          <Link href="/api-reference/upload">/api/v1/upload</Link> flow and
          waits on the{" "}
          <Link href="/api-reference/jobs">SSE job stream</Link>, converting the
          server&apos;s <code>completed</code>/<code>total</code> counts into{" "}
          <code>Percent</code> for you.
        </p>
      </Callout>
    </>
  );
}
