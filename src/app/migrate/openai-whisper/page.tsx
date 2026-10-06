import { CodeBlock } from "@/components/CodeBlock";
import { Callout } from "@/components/DocsUI";
import { MigrationCompare } from "@/components/MigrationCompare";
import { LIMITS, SITE } from "@/lib/constants";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Migrating from the OpenAI Whisper API to Speech Revolutions",
  description:
    "Move an OpenAI /v1/audio/transcriptions integration to Speech Revolutions: auth, multipart vs presigned upload, the 25 MB limit, and getting word timestamps + diarization in one call.",
};

export default function MigrateOpenAIWhisperPage() {
  return (
    <>
      <h1>Migrating from the OpenAI Whisper API to Speech Revolutions</h1>
      <p>
        OpenAI&apos;s transcription API is a single synchronous multipart{" "}
        <code>POST</code> to <code>/v1/audio/transcriptions</code>. It has a{" "}
        <strong>25 MB file limit</strong>, and the current <code>gpt-4o-transcribe</code>{" "}
        model returns <strong>no word-level timestamps</strong> and{" "}
        <strong>no speaker diarization</strong>. Speech Revolutions returns the transcript,
        word timestamps, and speaker turns from a single call, for files up to 10 GB
        through the SDK.
      </p>

      <Callout title="Timestamps and speakers in one call" tone="tip">
        <p>
          On OpenAI, word timestamps require the older <code>whisper-1</code>{" "}
          model (via <code>response_format=verbose_json</code> +{" "}
          <code>timestamp_granularities</code>), and speaker labels require a
          separate <code>gpt-4o-transcribe-diarize</code> model —{" "}
          <code>gpt-4o-transcribe</code> returns text only. Speech Revolutions returns{" "}
          <code>result.text</code>, <code>result.words</code> (with times), and{" "}
          <code>result.utterances</code> (speakers) in every response.
        </p>
      </Callout>

      <h2>Authentication</h2>
      <p>
        OpenAI uses <code>Authorization: Bearer &lt;key&gt;</code>. Speech Revolutions uses{" "}
        <code>X-API-Key</code>. The SDK reads the key from the environment.
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>OpenAI</th>
              <th>Speech Revolutions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>Authorization: Bearer OPENAI_API_KEY</code>
              </td>
              <td>
                <code>X-API-Key: SPEECHREVOLUTIONS_API_KEY</code>
              </td>
            </tr>
            <tr>
              <td>
                <code>OPENAI_API_KEY</code> env var
              </td>
              <td>
                <code>SPEECHREVOLUTIONS_API_KEY</code>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>Endpoint &amp; method mapping</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>OpenAI</th>
              <th>Speech Revolutions REST</th>
              <th>Speech Revolutions SDK</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>POST /v1/audio/transcriptions</code> (sync multipart)
              </td>
              <td>
                <code>POST /api/v1/transcribe</code> (raw bytes in, transcript streamed back;
                up to {LIMITS.apiUploadMax})
              </td>
              <td>
                <code>transcribe()</code> (blocks until done)
              </td>
            </tr>
            <tr>
              <td>— (response is inline)</td>
              <td>
                <code>GET /api/v1/jobs/{`{id}`}</code> / <code>/stream</code>
              </td>
              <td>
                <code>get_transcript()</code> / <code>on_progress</code>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>Upload differences and the 25 MB limit</h2>
      <p>
        OpenAI expects the audio as a multipart <code>file</code> field in the request body
        and rejects files over <strong>25 MB</strong>, so you split or compress long
        recordings yourself. Speech Revolutions has no 25 MB limit: the SDKs upload files up
        to {LIMITS.sdkUploadMax} to storage in parts. Pass a path, URL, or bytes.
      </p>
      <Callout title="No more chunking long files" tone="tip">
        <p>
          If you split files to stay under 25 MB for OpenAI, remove that step. Send the
          whole recording to <code>transcribe()</code>.
        </p>
      </Callout>

      <h2>Response shape</h2>
      <p>
        With <code>response_format=json</code>, OpenAI&apos;s{" "}
        <code>gpt-4o-transcribe</code> returns only <code>{`{ text }`}</code>, with no words,
        segments, or speakers. Speech Revolutions returns all of these:
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>OpenAI field</th>
              <th>Speech Revolutions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>text</code>
              </td>
              <td>
                <code>result.text</code>
              </td>
            </tr>
            <tr>
              <td>
                — (not returned by <code>gpt-4o-transcribe</code>)
              </td>
              <td>
                <code>result.words</code> (word + start/end/speaker, seconds)
              </td>
            </tr>
            <tr>
              <td>— (not returned)</td>
              <td>
                <code>result.utterances</code> (speaker turns)
              </td>
            </tr>
            <tr>
              <td>
                <code>language</code> (with <code>verbose_json</code>)
              </td>
              <td>
                <code>result.languages</code>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>Diarization</h2>
      <p>
        <code>gpt-4o-transcribe</code> does not diarize; OpenAI offers the separate{" "}
        <code>gpt-4o-transcribe-diarize</code> model (as of July 2026). Speech Revolutions
        diarizes in the same call: set <code>speaker_labels</code> (on by default) and read{" "}
        <code>result.utterances</code>. Zephyr ranks #1 on diarization error rate on every
        benchmark subset. See the{" "}
        <Link href="/benchmarks">benchmarks</Link> and the{" "}
        <a href={SITE.landingUrl}>comparison table</a>.
      </p>

      <h2>Timestamps</h2>
      <p>
        On OpenAI, word timestamps require <code>whisper-1</code> with{" "}
        <code>response_format=verbose_json</code> and{" "}
        <code>timestamp_granularities: [&quot;word&quot;]</code>. On Speech Revolutions,{" "}
        <code>word_timestamps</code> is on by default and the times are returned on{" "}
        <code>result.words</code> in seconds, with no model change.
      </p>

      <h2>Language selection</h2>
      <p>
        OpenAI takes an ISO 639-1 <code>language</code> hint. Speech Revolutions
        auto-detects by default and returns the detected spans in{" "}
        <code>result.languages</code>. To skip detection, pass the same{" "}
        <code>language</code> parameter with an ISO 639-1 code. As with Whisper, a wrong
        code does not fail: the model translates into that language. See{" "}
        <Link href="/cookbook#pin-language">pinning the language</Link>.
      </p>

      <h2>Custom vocabulary</h2>
      <p>
        OpenAI biases transcription only through the free-text <code>prompt</code> (about
        224 tokens maximum). Speech Revolutions takes a <code>custom_vocabulary</code> list
        of domain terms.
      </p>

      <h2>Side by side</h2>
      <MigrationCompare
        from="OpenAI"
        before={[
          {
            label: "Python",
            language: "python",
            filename: "openai_transcribe.py",
            code: `from openai import OpenAI

client = OpenAI()  # OPENAI_API_KEY

with open("meeting.mp3", "rb") as f:  # must be <= 25 MB
    resp = client.audio.transcriptions.create(
        model="gpt-4o-transcribe",
        file=f,
        response_format="json",
    )

print(resp.text)
# no word timestamps, no speakers from gpt-4o-transcribe`,
          },
          {
            label: "JavaScript",
            language: "ts",
            filename: "openai-transcribe.ts",
            code: `import OpenAI from "openai";
import { createReadStream } from "node:fs";

const client = new OpenAI(); // OPENAI_API_KEY

const resp = await client.audio.transcriptions.create({
  model: "gpt-4o-transcribe",
  file: createReadStream("meeting.mp3"), // must be <= 25 MB
  response_format: "json",
});

console.log(resp.text);
// no word timestamps, no speakers from gpt-4o-transcribe`,
          },
          {
            label: "Go",
            language: "go",
            filename: "openai_transcribe.go",
            code: `package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/openai/openai-go"
)

func main() {
	ctx := context.Background()
	client := openai.NewClient() // OPENAI_API_KEY

	f, err := os.Open("meeting.mp3") // must be <= 25 MB
	if err != nil {
		log.Fatal(err)
	}
	defer f.Close()

	resp, err := client.Audio.Transcriptions.New(ctx, openai.AudioTranscriptionNewParams{
		Model: openai.AudioModelGPT4oTranscribe,
		File:  f,
	})
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println(resp.Text)
	// no word timestamps, no speakers from gpt-4o-transcribe
}`,
          },
          {
            label: "C#",
            language: "csharp",
            filename: "Program.cs",
            code: `using OpenAI.Audio;

var client = new AudioClient("gpt-4o-transcribe",
    Environment.GetEnvironmentVariable("OPENAI_API_KEY")); // OPENAI_API_KEY

AudioTranscription resp = await client.TranscribeAudioAsync("meeting.mp3"); // must be <= 25 MB

Console.WriteLine(resp.Text);
// no word timestamps, no speakers from gpt-4o-transcribe`,
          },
        ]}
        after={[
          {
            label: "Python",
            language: "python",
            filename: "stt_transcribe.py",
            code: `from speechrevolutions import SpeechRevolutions

client = SpeechRevolutions()  # SPEECHREVOLUTIONS_API_KEY
result = client.transcribe("meeting.mp3", speaker_labels=True)  # any size

print(result.text)
for w in result.words:                 # word timestamps, in seconds
    print(w.text, w.start, w.end)
for u in result.utterances:            # speaker turns
    print(f"{u.speaker}: {u.text}")`,
          },
          {
            label: "JavaScript",
            language: "ts",
            filename: "stt-transcribe.ts",
            code: `import { SpeechRevolutions } from "speechrevolutions";

const client = new SpeechRevolutions(); // SPEECHREVOLUTIONS_API_KEY
const result = await client.transcribe("meeting.mp3", { speakerLabels: true }); // any size

console.log(result.text);
for (const w of result.words) console.log(w.text, w.start, w.end); // word timestamps, in seconds
for (const u of result.utterances) console.log(\`\${u.speaker}: \${u.text}\`); // speaker turns`,
          },
          {
            label: "Go",
            language: "go",
            filename: "stt_transcribe.go",
            code: `package main

import (
	"context"
	"fmt"
	"log"

	stt "github.com/speechrevolutions/speechrevolutions-go"
)

func main() {
	ctx := context.Background()
	client, err := stt.NewClient("") // SPEECHREVOLUTIONS_API_KEY
	if err != nil {
		log.Fatal(err)
	}

	result, err := client.Transcribe(ctx, "meeting.mp3", stt.TranscribeOptions{ // any size
		SpeakerLabels: stt.Bool(true),
	}, nil)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println(result.Text())
	for _, w := range result.Words { // word timestamps, in seconds
		if w.Start != nil && w.End != nil {
			fmt.Println(w.Word, *w.Start, *w.End)
		}
	}
	for _, u := range result.Utterances { // speaker turns
		fmt.Printf("%s: %s\\n", u.Speaker, u.Text)
	}
}`,
          },
          {
            label: "C#",
            language: "csharp",
            filename: "Program.cs",
            code: `using SpeechRevolutions;

using var client = new SpeechRevolutionsClient(); // SPEECHREVOLUTIONS_API_KEY
var result = await client.TranscribeAsync(
    "meeting.mp3", // any size
    new TranscribeOptions { SpeakerLabels = true });

Console.WriteLine(result.Text);
foreach (var w in result.Words)          // word timestamps, in seconds
    Console.WriteLine($"{w.Text} {w.Start} {w.End}");
foreach (var u in result.Utterances)     // speaker turns
    Console.WriteLine($"{u.Speaker}: {u.Text}");`,
          },
        ]}
      />

      <h2>Common pitfalls</h2>
      <ul>
        <li>
          <strong>Auth prefix.</strong> Drop <code>Bearer</code>; Speech Revolutions uses the{" "}
          <code>X-API-Key</code> header.
        </li>
        <li>
          <strong>Expecting text only.</strong> Speech Revolutions returns{" "}
          <code>words</code> and <code>utterances</code> by default. You don&apos;t need a
          second model for timestamps or speakers.
        </li>
        <li>
          <strong>Leftover 25 MB workarounds.</strong> Remove chunking or compression steps
          built for OpenAI.
        </li>
        <li>
          <strong>Prompt-based biasing.</strong> Replace the{" "}
          <code>prompt</code> term list with <code>custom_vocabulary</code>.
        </li>
      </ul>

      <Callout title="Next steps" tone="info">
        <p>
          See the <Link href="/migrate/playbook">migration playbook</Link> for
          cutover, and the <Link href="/benchmarks">benchmarks</Link> for
          accuracy, diarization, and timestamp comparisons.
        </p>
      </Callout>
    </>
  );
}
