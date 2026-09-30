import { CodeBlock } from "@/components/CodeBlock";
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

/**
 * A real two-voice recording: 47 seconds of Maupassant's "The Diamond Necklace" from a LibriVox
 * dramatic reading (Dramatic Reading Scene and Story Collection, Vol. 2), which is in the public
 * domain. A different reader voices each part, so speaker labels have something to show.
 */
const SAMPLE = `https://${SITE.docsDomain}/samples/diamond-necklace.mp3`;

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

      <h2>2a. SDK (recommended)</h2>
      <p>
        The SDK uploads the file for you (in parts, for large files), then waits for the
        transcript.
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
      <p>
        Then transcribe something. The code below uses a 47-second sample we host — a
        two-voice passage from Maupassant&apos;s <em>The Diamond Necklace</em> — so you can
        try it before you have audio of your own. Swap in a local path or your own URL when
        you&apos;re ready.
      </p>
      <audio controls preload="none" src="/samples/diamond-necklace.mp3" className="w-full">
        <a href="/samples/diamond-necklace.mp3">Download the sample</a>
      </audio>
      <p className="text-sm text-zinc-500">
        Sample: a public-domain{" "}
        <a href="https://librivox.org/dramatic-reading-scene-and-story-collection-volume-002-by-various/">
          LibriVox dramatic reading
        </a>
        .
      </p>
      <CodeTabs
        tabs={[
          {
            label: "Python",
            language: "python",
            filename: "quickstart.py",
            code: `from speechrevolutions import SpeechRevolutions

client = SpeechRevolutions()  # reads SPEECHREVOLUTIONS_API_KEY
result = client.transcribe("${SAMPLE}", speaker_labels=True)

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
const result = await client.transcribe("${SAMPLE}", { speakerLabels: true });

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

	result, err := client.Transcribe(context.Background(), "${SAMPLE}",
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
var result = await client.TranscribeAsync("${SAMPLE}",
    new TranscribeOptions { SpeakerLabels = true });

Console.WriteLine(result.Text);
foreach (var u in result.Utterances)
    Console.WriteLine($"{u.Speaker}: {u.Text}");`,
          },
        ]}
      />
      <p>Output:</p>
      <CodeBlock
        language="text"
        code={`Why, my dear? I thought you would be glad you never go out and this is such a fine opportunity. I had great trouble to get it. Every one wants to go. It is very select and they are not giving many invitations to clerks. The whole official world will be there. She looked at him with an irritated glance and said impatiently, And what do you wish me to put on my back? He had not thought of that, he stammered. Why the gown you go to the theater in? It looks very well to me. He stopped distracted, seeing that his wife was weeping, Two great tears ran slowly from the corners of her eyes toward the corners of her mouth.
SPEAKER_1: Why, my dear? I thought you would be glad you never go out and this is such a fine opportunity. I had great trouble to get it. Every one wants to go. It is very select and they are not giving many invitations to clerks. The whole official world will be there.
SPEAKER_2: She looked at him with an irritated glance and said impatiently, And what do you wish me to put on my back? He had not thought of that, he stammered.
SPEAKER_1: Why the gown you go to the theater in? It looks very well to me.
SPEAKER_2: He stopped distracted, seeing that his wife was weeping, Two great tears ran slowly from the corners of her eyes toward the corners of her mouth.`}
      />

      <h2>2b. Quick test from a terminal</h2>
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
            code: `curl -sO ${SAMPLE}

curl -N -X POST \\
  "${SITE.apiBase}/api/v1/transcribe?output_type=json&word_timestamps=true&speaker_labels=true&nltk=true" \\
  -H "X-API-Key: $SPEECHREVOLUTIONS_API_KEY" \\
  --data-binary @diamond-necklace.mp3`,
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
        <code>percent</code> field, so a long file is never a silent wait.
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
