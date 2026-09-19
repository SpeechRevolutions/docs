import { CodeTabs } from "@/components/CodeTabs";
import { Callout } from "@/components/DocsUI";
import { SITE } from "@/lib/constants";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Quickstart",
  description:
    "Get an API key, install an SDK (or use cURL), and transcribe a file.",
};

export default function QuickstartPage() {
  return (
    <>
      <h1>Quickstart</h1>
      <p>
        Get an API key, install an SDK (or use cURL), and transcribe a file.
      </p>

      <h2>1. Get an API key</h2>
      <p>
        Create a key in the{" "}
        <a href={SITE.consoleUrl}>developer console</a>. Export it in your
        shell:
      </p>
      <CodeTabs
        tabs={[
          {
            label: "bash",
            code: `export SPEECHREVOLUTIONS_API_KEY=stt_...`,
          },
        ]}
      />

      <h2>2a. SDK (recommended for apps)</h2>
      <p>
        The SDK uses the upload flow under the hood (
        <code>POST /api/v1/upload</code> → storage → complete → SSE wait).
      </p>
      <CodeTabs
        tabs={[
          {
            label: "Python",
            language: "bash",
            code: `pip install speechrevolutions`,
          },
          {
            label: "JavaScript",
            language: "bash",
            code: `npm install speechrevolutions`,
          },
          {
            label: "Go",
            language: "bash",
            code: `go get github.com/speechrevolutions/speechrevolutions-go`,
          },
          {
            label: "C#",
            language: "bash",
            code: `dotnet add package SpeechRevolutions`,
          },
        ]}
      />
      <p>Then transcribe a file:</p>
      <CodeTabs
        tabs={[
          {
            label: "Python",
            language: "python",
            filename: "quickstart.py",
            code: `from speechrevolutions import SpeechRevolutions

client = SpeechRevolutions()  # reads SPEECHREVOLUTIONS_API_KEY
result = client.transcribe("audio.mp3", speaker_labels=True)

print(result.text)
for u in result.utterances:
    print(f"{u.speaker}: {u.text}")`,
          },
          {
            label: "JavaScript",
            language: "ts",
            filename: "quickstart.mjs",
            code: `import { SpeechRevolutions } from "speechrevolutions";

const client = new SpeechRevolutions(); // reads SPEECHREVOLUTIONS_API_KEY
const result = await client.transcribe("audio.mp3", { speakerLabels: true });

console.log(result.text);
for (const u of result.utterances) {
  console.log(\`\${u.speaker}: \${u.text}\`);
}`,
          },
          {
            label: "Go",
            language: "go",
            filename: "quickstart.go",
            code: `package main

import (
	"context"
	"fmt"
	"log"

	stt "github.com/speechrevolutions/speechrevolutions-go"
)

func main() {
	client, err := stt.NewClient("") // reads SPEECHREVOLUTIONS_API_KEY
	if err != nil {
		log.Fatal(err)
	}

	result, err := client.Transcribe(context.Background(), "audio.mp3",
		stt.TranscribeOptions{SpeakerLabels: stt.Bool(true)}, nil)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println(result.Text())
	for _, u := range result.Utterances {
		fmt.Printf("%s: %s\\n", u.Speaker, u.Text)
	}
}`,
          },
          {
            label: "C#",
            language: "csharp",
            filename: "Program.cs",
            code: `using SpeechRevolutions;

using var client = new SpeechRevolutionsClient(); // reads SPEECHREVOLUTIONS_API_KEY
var result = await client.TranscribeAsync("audio.mp3",
    new TranscribeOptions { SpeakerLabels = true });

Console.WriteLine(result.Text);
foreach (var u in result.Utterances)
    Console.WriteLine($"{u.Speaker}: {u.Text}");`,
          },
        ]}
      />

      <h2>2b. Terminal (one request)</h2>
      <p>
        For scripts and one-off jobs, stream the file to{" "}
        <code>POST /api/v1/transcribe</code>. The connection stays open and
        emits percentage-style progress until the transcript is ready.
      </p>
      <CodeTabs
        tabs={[
          {
            label: "cURL",
            language: "bash",
            code: `curl -N -X POST \\
  "${SITE.apiBase}/api/v1/transcribe?output_type=json&word_timestamps=true&speaker_labels=true&nltk=true" \\
  -H "X-API-Key: $SPEECHREVOLUTIONS_API_KEY" \\
  --data-binary @audio.mp3`,
          },
        ]}
      />
      <Callout title="SDK vs terminal" tone="tip">
        <p>
          Prefer the <Link href="/sdks/python">SDK</Link> in application code.
          Prefer <Link href="/guides/terminal">/transcribe</Link> when you want
          a single streaming HTTP call from a shell.
        </p>
      </Callout>

      <h2>3. Watch live progress (optional)</h2>
      <p>
        The SDKs surface real-time upload <em>and</em> transcription progress —
        as console bars (<code>progress=True</code>) or callbacks with a{" "}
        <code>percent</code> field. Neither AssemblyAI nor Deepgram exposes this
        for pre-recorded audio.
      </p>
      <CodeTabs
        tabs={[
          {
            label: "Python",
            language: "python",
            code: `result = client.transcribe("audio.mp3", progress=True)

# or a callback
result = client.transcribe(
    "audio.mp3",
    on_progress=lambda e: print(e.percent, e.step),
)`,
          },
          {
            label: "JavaScript",
            language: "ts",
            code: `await client.transcribe("audio.mp3", { progress: true });

// or a callback
await client.transcribe("audio.mp3", {
  onProgress: (e) => console.log(e.percent, e.step),
});`,
          },
          {
            label: "Go",
            language: "go",
            code: `// console bars
result, _ := client.Transcribe(ctx, "audio.mp3", stt.TranscribeOptions{
    Progress: true,
}, nil)

// or a callback — the last argument
onProgress := func(e stt.ProgressEvent) {
    if pct, ok := e.Percent(); ok {
        fmt.Printf("%.0f%% %s\\n", pct, e.Step)
    }
}
result, _ = client.Transcribe(ctx, "audio.mp3", stt.TranscribeOptions{}, onProgress)`,
          },
          {
            label: "C#",
            language: "csharp",
            code: `// console bars
var result = await client.TranscribeAsync("audio.mp3", new TranscribeOptions
{
    Progress = true,
});

// or a callback
var same = await client.TranscribeAsync(
    "audio.mp3",
    new TranscribeOptions
    {
        OnUploadProgress = e => Console.WriteLine($"upload {e.Percent:0}%"),
    },
    onProgress: e => Console.WriteLine($"{e.Percent:0}% {e.Step}"));`,
          },
        ]}
      />
      <p>
        See each <Link href="/sdks/python">SDK page</Link> for the full{" "}
        <code>onProgress</code> / <code>onUploadProgress</code> API.
      </p>

      <h2>Next steps</h2>
      <ul>
        <li>
          <Link href="/authentication">Authentication</Link>
        </li>
        <li>
          <Link href="/guides/features">Features & formats</Link>
        </li>
        <li>
          <Link href="/api-reference/overview">API reference</Link>
        </li>
      </ul>
    </>
  );
}
