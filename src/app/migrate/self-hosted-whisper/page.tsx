import { CodeBlock } from "@/components/CodeBlock";
import { Callout } from "@/components/DocsUI";
import { MigrationCompare } from "@/components/MigrationCompare";
import { SITE } from "@/lib/constants";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Migrating from self-hosted Whisper to Speech Revolutions",
  description:
    "Move a faster-whisper or whisper.cpp deployment to Speech Revolutions' hosted API: retire the GPU ops, keep word timestamps, and get built-in diarization.",
};

export default function MigrateSelfHostedWhisperPage() {
  return (
    <>
      <h1>Migrating from self-hosted Whisper to Speech Revolutions</h1>
      <p>
        This guide covers moving from self-hosted Whisper (<code>faster-whisper</code>{" "}
        with CTranslate2 on a GPU, or <code>whisper.cpp</code> on CPU/Metal) to the Speech
        Revolutions API. Self-hosting means provisioning GPUs, pinning CUDA/cuDNN, sizing
        VRAM for <code>large-v3</code>, warming models, batching, autoscaling, and running
        a separate diarization stack. Speech Revolutions runs Zephyr, its speech-to-text
        engine, as a hosted API and returns word timestamps and diarization in one
        response, with a diarization error rate that ranks #1 on every benchmark subset.
      </p>

      <Callout title="What you no longer run" tone="tip">
        <p>
          GPU capacity, driver and toolkit versions, VRAM limits, cold starts,
          concurrency and queueing, and a diarization pipeline (neither{" "}
          <code>faster-whisper</code> nor <code>whisper.cpp</code> includes one). With
          Speech Revolutions, you call the API instead.
        </p>
      </Callout>

      <h2>Authentication</h2>
      <p>
        A local model needs no authentication. Speech Revolutions requires an API key,
        which the SDK reads from the environment.
      </p>
      <CodeBlock
        language="bash"
        code={`export SPEECHREVOLUTIONS_API_KEY=stt_...`}
      />

      <h2>From a function call to an API call</h2>
      <p>
        Self-hosted Whisper runs in process: you load a model into GPU memory once, then
        call <code>.transcribe()</code> on it. With Speech Revolutions, the SDK uploads the
        file and waits for the result. The call site is still a single line.
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Self-hosted</th>
              <th>Speech Revolutions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>WhisperModel(&quot;large-v3&quot;, device=&quot;cuda&quot;)</code>{" "}
                (loads weights into VRAM)
              </td>
              <td>
                <code>SpeechRevolutions()</code> (reads the API key)
              </td>
            </tr>
            <tr>
              <td>
                <code>model.transcribe(path, ...)</code> (runs on your GPU)
              </td>
              <td>
                <code>client.transcribe(path, ...)</code> (runs on Speech Revolutions)
              </td>
            </tr>
            <tr>
              <td>
                lazy <code>segments</code> generator you must iterate
              </td>
              <td>
                a materialized result: <code>.text</code>, <code>.words</code>,{" "}
                <code>.utterances</code>
              </td>
            </tr>
            <tr>
              <td>you operate the GPU, queue, and scaling</td>
              <td>hosted; nothing to operate</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>Input and upload differences</h2>
      <p>
        <code>faster-whisper</code> reads a local file path directly.{" "}
        <code>whisper.cpp</code> requires 16 kHz mono WAV, so most pipelines convert with{" "}
        <code>ffmpeg</code> first. Speech Revolutions accepts common audio and video
        formats and transcodes them for you. Pass a path, URL, or bytes to the SDK and skip
        the conversion step.
      </p>

      <h2>Response shape</h2>
      <p>
        <code>faster-whisper</code> yields <code>Segment</code> objects, each with
        a <code>words</code> list (<code>start</code>, <code>end</code>,{" "}
        <code>word</code>) when <code>word_timestamps=True</code>, plus an{" "}
        <code>info</code> with the detected <code>language</code>. Speech Revolutions returns
        one complete result object.
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>faster-whisper</th>
              <th>Speech Revolutions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                join <code>segment.text</code> across the generator
              </td>
              <td>
                <code>result.text</code> (already assembled)
              </td>
            </tr>
            <tr>
              <td>
                <code>segment.words[]</code> (<code>word</code>, <code>start</code>,{" "}
                <code>end</code>)
              </td>
              <td>
                <code>result.words</code> (<code>text</code>, <code>start</code>,{" "}
                <code>end</code>, <code>speaker</code>)
              </td>
            </tr>
            <tr>
              <td>— (no speaker labels)</td>
              <td>
                <code>result.utterances</code> (speaker turns)
              </td>
            </tr>
            <tr>
              <td>
                <code>info.language</code>
              </td>
              <td>
                <code>result.languages</code>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <Callout title="No more draining the generator" tone="info">
        <p>
          <code>faster-whisper</code>&apos;s <code>segments</code> is a lazy
          generator: transcription runs only as you iterate it. Speech Revolutions returns
          a finished result, so there is no generator to consume.
        </p>
      </Callout>

      <h2>Diarization</h2>
      <p>
        Neither <code>faster-whisper</code> nor <code>whisper.cpp</code> diarizes
        on its own. You run a separate pipeline (typically{" "}
        <code>pyannote.audio</code>) and align its speaker turns to the Whisper words
        yourself. Speech Revolutions diarizes in the same call: set{" "}
        <code>speaker_labels</code> (on by default) and read{" "}
        <code>result.utterances</code>. Zephyr ranks #1 on diarization error rate on every
        benchmark subset. See the{" "}
        <Link href="/benchmarks">benchmarks</Link> and the{" "}
        <a href={SITE.landingUrl}>comparison table</a>.
      </p>

      <h2>Timestamps</h2>
      <p>
        With <code>faster-whisper</code>, word timestamps require{" "}
        <code>word_timestamps=True</code>, which adds alignment cost. On Speech
        Revolutions, <code>word_timestamps</code> is on by default and the times are on{" "}
        <code>result.words</code> in seconds.
      </p>

      <h2>Language selection</h2>
      <p>
        <code>faster-whisper</code> auto-detects, or you pass{" "}
        <code>language=</code> to <code>transcribe()</code>. Speech Revolutions auto-detects
        by default, with no per-language model choice, and handles code-switching without
        splitting the file. The detected spans are returned in{" "}
        <code>result.languages</code>. To set a fixed language, pass the same{" "}
        <code>language=</code> option with an ISO 639-1 code; see{" "}
        <Link href="/cookbook#pin-language">pinning the language</Link>.
      </p>

      <h2>Side by side</h2>
      <MigrationCompare
        from="self-hosted Whisper"
        before={[
          {
            label: "Python",
            language: "python",
            filename: "faster_whisper_transcribe.py",
            code: `from faster_whisper import WhisperModel

# loads weights into GPU memory; you own the box, drivers, and VRAM
model = WhisperModel("large-v3", device="cuda", compute_type="float16")

segments, info = model.transcribe("meeting.mp3", word_timestamps=True)

# 'segments' is a lazy generator — transcription runs as you iterate
text = []
for segment in segments:
    text.append(segment.text)
    for w in segment.words:
        print(w.start, w.end, w.word)
print("".join(text))
print("language:", info.language)
# diarization? bring your own pyannote pipeline and align it yourself.`,
          },
          {
            label: "JavaScript",
            language: "ts",
            filename: "whisper-server.ts",
            code: `import { readFileSync } from "node:fs";

// your whisper.cpp server: ./build/bin/whisper-server -m models/ggml-large-v3.bin
const form = new FormData();
form.append("file", new Blob([readFileSync("meeting.wav")]), "meeting.wav"); // 16 kHz mono WAV
form.append("response_format", "json");

const res = await fetch("http://localhost:8080/inference", { method: "POST", body: form });
const { text } = await res.json();
console.log(text);
// no word timestamps in this format, no diarization: bring your own and align it yourself.`,
          },
          {
            label: "Go",
            language: "go",
            filename: "whisper_server.go",
            code: `// Calls your own whisper.cpp server (whisper-server -m models/ggml-large-v3.bin).
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"mime/multipart"
	"net/http"
	"os"
)

func main() {
	audio, err := os.ReadFile("meeting.wav") // 16 kHz mono WAV
	if err != nil {
		log.Fatal(err)
	}

	var body bytes.Buffer
	form := multipart.NewWriter(&body)
	form.WriteField("response_format", "json")
	part, _ := form.CreateFormFile("file", "meeting.wav")
	part.Write(audio)
	form.Close()

	// you run this box: the GPU, the drivers, the model files, the restarts
	res, err := http.Post("http://localhost:8080/inference", form.FormDataContentType(), &body)
	if err != nil {
		log.Fatal(err)
	}
	defer res.Body.Close()

	var resp struct {
		Text string \`json:"text"\`
	}
	if err := json.NewDecoder(res.Body).Decode(&resp); err != nil {
		log.Fatal(err)
	}
	fmt.Println(resp.Text)
	// no word timestamps in this format, no diarization: bring your own and align it yourself.
}`,
          },
          {
            label: "C#",
            language: "csharp",
            filename: "Program.cs",
            code: `using Whisper.net;

// loads weights into memory; you own the box, the runtime package and the model file
using var factory = WhisperFactory.FromPath("ggml-large-v3.bin");
using var processor = factory.CreateBuilder()
    .WithLanguage("auto")
    .Build();

// Whisper.net reads 16 kHz WAV, so convert with ffmpeg first
using var wav = File.OpenRead("meeting.wav");
await foreach (var segment in processor.ProcessAsync(wav))
    Console.WriteLine($"{segment.Start}->{segment.End}: {segment.Text}");
// diarization? bring your own pipeline and align it yourself.`,
          },
        ]}
        after={[
          {
            label: "Python",
            language: "python",
            filename: "stt_transcribe.py",
            code: `from speechrevolutions import SpeechRevolutions

client = SpeechRevolutions()  # SPEECHREVOLUTIONS_API_KEY — no GPU, no model files
result = client.transcribe("meeting.mp3", speaker_labels=True)

print(result.text)                  # already assembled
for w in result.words:              # word timestamps, in seconds
    print(w.start, w.end, w.text)
for u in result.utterances:         # diarization built in
    print(f"{u.speaker}: {u.text}")
print("languages:", result.languages)  # [{start, end, language}, ...]`,
          },
          {
            label: "JavaScript",
            language: "ts",
            filename: "stt-transcribe.ts",
            code: `import { SpeechRevolutions } from "speechrevolutions";

// no GPU, no model files, no server to keep up
const client = new SpeechRevolutions(); // SPEECHREVOLUTIONS_API_KEY
const result = await client.transcribe("meeting.mp3", { speakerLabels: true }); // MP3 as-is

console.log(result.text);                     // already assembled
for (const w of result.words) {               // word timestamps, in seconds
  console.log(w.start, w.end, w.text);
}
for (const u of result.utterances) {          // diarization built in
  console.log(\`\${u.speaker}: \${u.text}\`);
}
console.log("languages:", result.languages);  // [{ start, end, language }, ...]`,
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
	// no GPU, no model files, no server to keep up
	client, err := stt.NewClient("") // SPEECHREVOLUTIONS_API_KEY
	if err != nil {
		log.Fatal(err)
	}

	result, err := client.Transcribe(ctx, "meeting.mp3", stt.TranscribeOptions{ // MP3 as-is
		SpeakerLabels: stt.Bool(true),
	}, nil)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println(result.Text())       // already assembled
	for _, w := range result.Words { // word timestamps, in seconds
		if w.Start != nil && w.End != nil {
			fmt.Println(*w.Start, *w.End, w.Word)
		}
	}
	for _, u := range result.Utterances { // diarization built in
		fmt.Printf("%s: %s\\n", u.Speaker, u.Text)
	}
	for _, l := range result.Languages { // language spans
		fmt.Println(l.Start, l.End, l.Language)
	}
}`,
          },
          {
            label: "C#",
            language: "csharp",
            filename: "Program.cs",
            code: `using SpeechRevolutions;

// no GPU, no model files, no runtime package
using var client = new SpeechRevolutionsClient(); // SPEECHREVOLUTIONS_API_KEY
var result = await client.TranscribeAsync(
    "meeting.mp3", // MP3 as-is, no WAV conversion
    new TranscribeOptions { SpeakerLabels = true });

Console.WriteLine(result.Text);          // already assembled
foreach (var w in result.Words)          // word timestamps, in seconds
    Console.WriteLine($"{w.Start} {w.End} {w.Text}");
foreach (var u in result.Utterances)     // diarization built in
    Console.WriteLine($"{u.Speaker}: {u.Text}");
foreach (var l in result.Languages)      // language spans
    Console.WriteLine($"{l.Start} {l.End} {l.Language}");`,
          },
        ]}
      />

      <p>
        If you call the <code>whisper.cpp</code> binary directly instead of its server,
        this is the step the code above replaces, along with the WAV conversion:
      </p>
      <CodeBlock
        language="bash"
        filename="whisper_cpp.sh"
        code={`# convert to 16 kHz mono WAV first (whisper.cpp requirement)
ffmpeg -i meeting.mp3 -ar 16000 -ac 1 -c:a pcm_s16le meeting.wav

# run inference on the compiled binary; you manage the model files + build
./main -m models/ggml-large-v3.bin -f meeting.wav \\
    --output-srt --max-len 1
# no built-in diarization`}
      />

      <h2>What you stop maintaining</h2>
      <ul>
        <li>
          <strong>GPU fleet.</strong> No instances to provision, right-size, or
          pay for while idle.
        </li>
        <li>
          <strong>Toolkit versions.</strong> No CUDA/cuDNN/CTranslate2 drift or
          rebuilds.
        </li>
        <li>
          <strong>Cold starts and batching.</strong> No model warming or throughput
          tuning.
        </li>
        <li>
          <strong>Diarization stack.</strong> No separate{" "}
          <code>pyannote</code> pipeline and word-alignment code.
        </li>
        <li>
          <strong>Audio preprocessing.</strong> No <code>ffmpeg</code> conversion to
          16 kHz WAV (required by <code>whisper.cpp</code>).
        </li>
      </ul>

      <h2>Common pitfalls</h2>
      <ul>
        <li>
          <strong>Handling the lazy generator.</strong> Code that assumed{" "}
          <code>faster-whisper</code>&apos;s lazy <code>segments</code> should read the
          finished <code>result</code> fields directly.
        </li>
        <li>
          <strong>Concurrency model.</strong> You don&apos;t need to serialize work behind a
          single GPU. Issue calls concurrently with <code>submit()</code> or the async
          client.
        </li>
        <li>
          <strong>Preprocessing assumptions.</strong> Drop the forced 16 kHz mono
          WAV conversion; send the original file.
        </li>
      </ul>

      <Callout title="Next steps" tone="info">
        <p>
          See the <Link href="/migrate/playbook">migration playbook</Link> for cutover,
          the <Link href="/sdks/python">Python SDK</Link> for concurrency and async, and
          the <Link href="/benchmarks">benchmarks</Link> for accuracy and diarization
          compared with self-hosted Whisper.
        </p>
      </Callout>
    </>
  );
}
