import { Callout } from "@/components/DocsUI";
import { MigrationCompare } from "@/components/MigrationCompare";
import { LIMITS, SITE } from "@/lib/constants";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Migrating from ElevenLabs to Speech Revolutions",
  description:
    "Move an ElevenLabs Scribe integration to Speech Revolutions: xi-api-key auth, multipart vs presigned upload, the spacing-token quirk, diarization, and timestamps.",
};

export default function MigrateElevenLabsPage() {
  return (
    <>
      <h1>Migrating from ElevenLabs to Speech Revolutions</h1>
      <p>
        ElevenLabs&apos; Scribe speech-to-text is a single synchronous multipart{" "}
        <code>POST</code> to <code>/v1/speech-to-text</code>. Word timestamps come
        back by default and <code>diarize=true</code> adds a{" "}
        <code>speaker_id</code> to each word. Speech Revolutions returns the same data
        (transcript, per-word times, and speakers), and the SDK does it in one{" "}
        <code>transcribe()</code> call. This guide maps authentication, upload, and the
        response shape, including the <code>spacing</code> tokens you no longer need to
        filter.
      </p>

      <Callout title="What changes, what doesn't" tone="tip">
        <p>
          Your <code>diarize</code> flag works unchanged (Speech Revolutions accepts{" "}
          <code>diarize</code> as an alias for <code>speaker_labels</code>), and{" "}
          <code>result.text</code> maps directly. The main change is removing handling for
          ElevenLabs&apos; <code>spacing</code> tokens: <code>result.words</code> contains
          only words.
        </p>
      </Callout>

      <h2>Authentication</h2>
      <p>
        ElevenLabs authenticates with an <code>xi-api-key</code> header. Speech Revolutions
        uses <code>X-API-Key</code>. The SDK reads the key from the environment.
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>ElevenLabs</th>
              <th>Speech Revolutions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>xi-api-key: ELEVENLABS_API_KEY</code>
              </td>
              <td>
                <code>X-API-Key: SPEECHREVOLUTIONS_API_KEY</code>
              </td>
            </tr>
            <tr>
              <td>
                <code>ELEVENLABS_API_KEY</code> env var
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
              <th>ElevenLabs</th>
              <th>Speech Revolutions REST</th>
              <th>Speech Revolutions SDK</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>POST /v1/speech-to-text</code> (sync multipart,{" "}
                <code>model_id</code>)
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

      <h2>Upload differences</h2>
      <p>
        ElevenLabs takes the audio as a multipart <code>file</code> field with{" "}
        <code>model_id</code> in the form body. With Speech Revolutions, you pass a path, URL,
        or bytes to the SDK, which uploads the file to storage in parts. Speech Revolutions
        also reports live <code>upload</code> and <code>transcribe</code> progress (see{" "}
        <Link href="/guides/live-progress">live progress</Link>).
      </p>

      <h2>Response shape</h2>
      <p>
        ElevenLabs returns <code>text</code> plus a <code>words[]</code> array in
        which entries have a <code>type</code> of <code>word</code> or{" "}
        <code>spacing</code>; the <code>spacing</code> entries are not real words.
        Speakers appear as <code>speaker_id</code> strings (for example,{" "}
        <code>speaker_0</code>). Speech Revolutions&apos; <code>result.words</code> contains
        only words, with string speaker labels.
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>ElevenLabs field</th>
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
                <code>words[]</code> where <code>type == &quot;word&quot;</code> (
                <code>text</code>, <code>start</code>, <code>end</code>,{" "}
                <code>speaker_id</code>)
              </td>
              <td>
                <code>result.words</code> (<code>text</code>, <code>start</code>,{" "}
                <code>end</code>, <code>speaker</code>) — no spacing tokens
              </td>
            </tr>
            <tr>
              <td>
                <code>words[]</code> where <code>type == &quot;spacing&quot;</code>
              </td>
              <td>— (not returned; no filtering needed)</td>
            </tr>
            <tr>
              <td>— (regroup by <code>speaker_id</code> yourself)</td>
              <td>
                <code>result.utterances</code> (pre-grouped speaker turns)
              </td>
            </tr>
            <tr>
              <td>
                <code>language_code</code>
              </td>
              <td>
                <code>result.languages</code>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <Callout title="Retire the spacing filter" tone="info">
        <p>
          If your code skips <code>word.type === &quot;spacing&quot;</code>{" "}
          entries, delete that filter. <code>result.words</code> contains only words.
        </p>
      </Callout>

      <h2>Diarization</h2>
      <p>
        ElevenLabs diarizes with <code>diarize=true</code>, adding a{" "}
        <code>speaker_id</code> per word. Speech Revolutions uses the same <code>diarize</code>{" "}
        flag (an alias for <code>speaker_labels</code>, on by default) and also groups
        words into <code>result.utterances</code>, so you don&apos;t need to rebuild turns
        from per-word IDs. Zephyr ranks #1 on diarization error rate (DER) on every
        benchmark subset. See the{" "}
        <Link href="/benchmarks">benchmarks</Link> and the{" "}
        <a href={SITE.landingUrl}>comparison table</a>.
      </p>

      <h2>Timestamps</h2>
      <p>
        Both return per-word start and end times in seconds by default. On the{" "}
        <Link href="/benchmarks">word-alignment benchmark</Link>, Zephyr&apos;s mean
        word-start error is 40 ms, against 58 ms for ElevenLabs.
      </p>

      <h2>Language selection</h2>
      <p>
        ElevenLabs takes <code>language_code</code>. Speech Revolutions auto-detects by
        default and detects language changes <em>within</em> a file, so a recording that
        switches languages mid-sentence is transcribed in each language. Each word has its
        own <code>language</code>, which you can use to split subtitles by language. To set
        a fixed language, pass <code>language</code> with an ISO 639-1 code (for example,{" "}
        <code>en</code>). This skips detection, including mid-file switching. See{" "}
        <Link href="/cookbook#pin-language">pinning the language</Link>.
      </p>

      <h2>Side by side</h2>
      <MigrationCompare
        from="ElevenLabs"
        before={[
          {
            label: "Python",
            language: "python",
            filename: "elevenlabs_transcribe.py",
            code: `from elevenlabs.client import ElevenLabs

client = ElevenLabs()  # ELEVENLABS_API_KEY

with open("meeting.mp3", "rb") as f:
    resp = client.speech_to_text.convert(
        model_id="scribe_v2",
        file=f,
        diarize=True,
    )

print(resp.text)
for w in resp.words:
    if w.type == "word":                       # skip spacing tokens
        print(w.speaker_id, w.text, w.start, w.end)`,
          },
          {
            label: "JavaScript",
            language: "ts",
            filename: "elevenlabs-transcribe.ts",
            code: `import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { createReadStream } from "node:fs";

const client = new ElevenLabsClient(); // ELEVENLABS_API_KEY

const resp = await client.speechToText.convert({
  modelId: "scribe_v2",
  file: createReadStream("meeting.mp3"),
  diarize: true,
});

console.log(resp.text);
for (const w of resp.words) {
  if (w.type === "word") {                       // skip spacing tokens
    console.log(w.speakerId, w.text, w.start, w.end);
  }
}`,
          },
          {
            label: "Go",
            language: "go",
            filename: "elevenlabs_transcribe.go",
            code: `// ElevenLabs has no official Go SDK, so this calls the REST API directly.
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
)

func main() {
	audio, err := os.ReadFile("meeting.mp3")
	if err != nil {
		log.Fatal(err)
	}

	var body bytes.Buffer
	form := multipart.NewWriter(&body)
	form.WriteField("model_id", "scribe_v2")
	form.WriteField("diarize", "true")
	part, _ := form.CreateFormFile("file", "meeting.mp3")
	part.Write(audio)
	form.Close()

	req, _ := http.NewRequest("POST", "https://api.elevenlabs.io/v1/speech-to-text", &body)
	req.Header.Set("xi-api-key", os.Getenv("ELEVENLABS_API_KEY"))
	req.Header.Set("Content-Type", form.FormDataContentType())
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Fatal(err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		msg, _ := io.ReadAll(res.Body)
		log.Fatalf("elevenlabs: %s: %s", res.Status, msg)
	}

	var resp struct {
		Text  string \`json:"text"\`
		Words []struct {
			Text      string  \`json:"text"\`
			Start     float64 \`json:"start"\`
			End       float64 \`json:"end"\`
			Type      string  \`json:"type"\`
			SpeakerID string  \`json:"speaker_id"\`
		} \`json:"words"\`
	}
	if err := json.NewDecoder(res.Body).Decode(&resp); err != nil {
		log.Fatal(err)
	}

	fmt.Println(resp.Text)
	for _, w := range resp.Words {
		if w.Type == "word" { // skip spacing tokens
			fmt.Println(w.SpeakerID, w.Text, w.Start, w.End)
		}
	}
}`,
          },
          {
            label: "C#",
            language: "csharp",
            filename: "Program.cs",
            code: `// ElevenLabs has no official .NET SDK, so this calls the REST API directly.
using System.Net.Http.Headers;
using System.Text.Json;

using var http = new HttpClient();
http.DefaultRequestHeaders.Add("xi-api-key", Environment.GetEnvironmentVariable("ELEVENLABS_API_KEY"));

using var form = new MultipartFormDataContent
{
    { new StringContent("scribe_v2"), "model_id" },
    { new StringContent("true"), "diarize" },
};
var audio = new ByteArrayContent(await File.ReadAllBytesAsync("meeting.mp3"));
audio.Headers.ContentType = new MediaTypeHeaderValue("audio/mpeg");
form.Add(audio, "file", "meeting.mp3");

var res = await http.PostAsync("https://api.elevenlabs.io/v1/speech-to-text", form);
res.EnsureSuccessStatusCode();
using var json = JsonDocument.Parse(await res.Content.ReadAsStringAsync());

Console.WriteLine(json.RootElement.GetProperty("text").GetString());
foreach (var w in json.RootElement.GetProperty("words").EnumerateArray())
{
    if (w.GetProperty("type").GetString() != "word") continue; // skip spacing tokens
    Console.WriteLine($"{w.GetProperty("speaker_id")} {w.GetProperty("text")} " +
                      $"{w.GetProperty("start")} {w.GetProperty("end")}");
}`,
          },
        ]}
        after={[
          {
            label: "Python",
            language: "python",
            filename: "stt_transcribe.py",
            code: `from speechrevolutions import SpeechRevolutions

client = SpeechRevolutions()  # SPEECHREVOLUTIONS_API_KEY
result = client.transcribe("meeting.mp3", diarize=True)  # same flag name

print(result.text)
for w in result.words:                          # already words only
    print(w.speaker, w.text, w.start, w.end)
for u in result.utterances:                     # pre-grouped speaker turns
    print(f"{u.speaker}: {u.text}")`,
          },
          {
            label: "JavaScript",
            language: "ts",
            filename: "stt-transcribe.ts",
            code: `import { SpeechRevolutions } from "speechrevolutions";

const client = new SpeechRevolutions(); // SPEECHREVOLUTIONS_API_KEY
const result = await client.transcribe("meeting.mp3", { diarize: true }); // same flag name

console.log(result.text);
for (const w of result.words) {               // already words only
  console.log(w.speaker, w.text, w.start, w.end);
}
for (const u of result.utterances) {          // pre-grouped speaker turns
  console.log(\`\${u.speaker}: \${u.text}\`);
}`,
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

	// an official SDK: no multipart form, no response struct of your own
	result, err := client.Transcribe(ctx, "meeting.mp3", stt.TranscribeOptions{
		Diarize: stt.Bool(true), // same flag name
	}, nil)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println(result.Text())
	for _, w := range result.Words { // already words only
		if w.Start != nil && w.End != nil {
			fmt.Println(w.Speaker, w.Word, *w.Start, *w.End)
		}
	}
	for _, u := range result.Utterances { // pre-grouped speaker turns
		fmt.Printf("%s: %s\\n", u.Speaker, u.Text)
	}
}`,
          },
          {
            label: "C#",
            language: "csharp",
            filename: "Program.cs",
            code: `using SpeechRevolutions;

// an official SDK: no multipart form, no JSON walking
using var client = new SpeechRevolutionsClient(); // SPEECHREVOLUTIONS_API_KEY
var result = await client.TranscribeAsync(
    "meeting.mp3",
    new TranscribeOptions { Diarize = true }); // same flag name

Console.WriteLine(result.Text);
foreach (var w in result.Words)          // already words only
    Console.WriteLine($"{w.Speaker} {w.Text} {w.Start} {w.End}");
foreach (var u in result.Utterances)     // pre-grouped speaker turns
    Console.WriteLine($"{u.Speaker}: {u.Text}");`,
          },
        ]}
      />

      <h2>Common pitfalls</h2>
      <ul>
        <li>
          <strong>Auth header.</strong> <code>xi-api-key</code> →{" "}
          <code>X-API-Key</code>.
        </li>
        <li>
          <strong>Spacing tokens.</strong> The <code>words</code> array omits them. Remove any{" "}
          <code>type</code> filtering.
        </li>
        <li>
          <strong>Speaker grouping.</strong> Use <code>result.utterances</code> instead of
          regrouping per-word <code>speaker_id</code> values.
        </li>
        <li>
          <strong>Keyword biasing.</strong> Scribe v2 keyterm prompting maps to{" "}
          <code>custom_vocabulary</code>, a list of domain terms.
        </li>
      </ul>

      <Callout title="Next steps" tone="info">
        <p>
          See the <Link href="/migrate/playbook">migration playbook</Link> for
          cutover, and the <Link href="/benchmarks">benchmarks</Link> for
          diarization and timestamp comparisons.
        </p>
      </Callout>
    </>
  );
}
