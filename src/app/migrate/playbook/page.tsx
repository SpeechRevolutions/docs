import { CodeTabs } from "@/components/CodeTabs";
import { Callout } from "@/components/DocsUI";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Switching STT APIs in under 30 minutes",
  description:
    "A provider-agnostic playbook for switching speech-to-text APIs: put transcription behind an interface, compare on your own audio, and roll out gradually with a fallback.",
};

export default function MigrationPlaybookPage() {
  return (
    <>
      <h1>Switching STT APIs in under 30 minutes</h1>
      <p>
        To switch speech-to-text providers safely, put transcription behind an
        interface, compare outputs on your own audio, and roll out gradually with a
        fallback. This page is the provider-agnostic playbook. The per-provider guides
        (
        <Link href="/migrate/deepgram">Deepgram</Link>,{" "}
        <Link href="/migrate/assemblyai">AssemblyAI</Link>,{" "}
        <Link href="/migrate/openai-whisper">OpenAI Whisper</Link>,{" "}
        <Link href="/migrate/elevenlabs">ElevenLabs</Link>,{" "}
        <Link href="/migrate/self-hosted-whisper">self-hosted Whisper</Link>)
        cover the exact field mappings.
      </p>

      <h2>1. Why teams switch</h2>
      <ul>
        <li>
          <strong>Accuracy on your audio.</strong> General WER doesn&apos;t show how a
          model performs on your domain, accents, and multi-speaker recordings.
        </li>
        <li>
          <strong>Diarization and timestamps.</strong> Speaker labels and word times make
          a transcript searchable and seekable.
        </li>
        <li>
          <strong>Price at volume</strong>, output formats (SRT/VTT/DOCX), and
          operational simplicity (no GPUs to manage).
        </li>
      </ul>

      <h2>2. What to evaluate</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Dimension</th>
              <th>How to judge it</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Accuracy</td>
              <td>WER on a sample of your own audio, not a vendor&apos;s demo clip</td>
            </tr>
            <tr>
              <td>Diarization</td>
              <td>DER, and whether speaker labels hold up on your own recordings</td>
            </tr>
            <tr>
              <td>Timestamps</td>
              <td>Word-level start/end accuracy (important for subtitles and search)</td>
            </tr>
            <tr>
              <td>Languages</td>
              <td>The specific languages and code-switching you serve</td>
            </tr>
            <tr>
              <td>Formats and features</td>
              <td>JSON shape, SRT/VTT/DOCX, custom vocabulary, webhooks</td>
            </tr>
            <tr>
              <td>Throughput and price</td>
              <td>Batch latency and cost at your monthly volume</td>
            </tr>
          </tbody>
        </table>
      </div>
      <Callout title="Measure on your data" tone="tip">
        <p>
          The <Link href="/benchmarks">public benchmark suite</Link> is reproducible
          and provider-agnostic. Run it on your own audio against the providers
          you&apos;re comparing.
        </p>
      </Callout>

      <h2>3. Migrate behind an interface</h2>
      <p>
        Put transcription behind one function that returns your own normalized shape,
        instead of calling a vendor SDK throughout your codebase. Switching providers then
        changes one file. The Speech Revolutions result exposes <code>.text</code>,{" "}
        <code>.words</code>, and <code>.utterances</code>, and{" "}
        <code>to_deepgram()</code> returns a Deepgram-shaped dict if you are migrating
        from Deepgram.
      </p>
      <CodeTabs
        tabs={[
          {
            label: "Python",
            language: "python",
            code: `# transcription.py — the ONE place your app calls
from speechrevolutions import SpeechRevolutions

_client = SpeechRevolutions()  # SPEECHREVOLUTIONS_API_KEY

def transcribe(audio: str) -> dict:
    r = _client.transcribe(audio, speaker_labels=True, word_timestamps=True)
    return {
        "text": r.text,
        "speakers": [{"speaker": u.speaker, "text": u.text} for u in r.utterances],
        "words": [w.to_dict() for w in r.words],
    }`,
          },
          {
            label: "JavaScript",
            language: "ts",
            code: `// transcription.ts — the ONE place your app calls
import { SpeechRevolutions } from "speechrevolutions";

const client = new SpeechRevolutions(); // SPEECHREVOLUTIONS_API_KEY

export async function transcribe(audio: string) {
  const r = await client.transcribe(audio, { speakerLabels: true, wordTimestamps: true });
  return {
    text: r.text,
    speakers: r.utterances.map((u) => ({ speaker: u.speaker, text: u.text })),
    words: r.words.map((w) => ({ ...w })), // words are plain objects in JS
  };
}`,
          },
          {
            label: "Go",
            language: "go",
            code: `// transcription.go — the ONE place your app calls
package transcription

import (
	"context"

	stt "github.com/speechrevolutions/speechrevolutions-go"
)

type Speaker struct {
	Speaker string \`json:"speaker"\`
	Text    string \`json:"text"\`
}

type Result struct {
	Text     string           \`json:"text"\`
	Speakers []Speaker        \`json:"speakers"\`
	Words    []stt.Word       \`json:"words"\`
}

// Built once; reads SPEECHREVOLUTIONS_API_KEY.
var client = newClient()

func newClient() *stt.Client {
	c, err := stt.NewClient("")
	if err != nil {
		panic(err) // e.g. SPEECHREVOLUTIONS_API_KEY is not set
	}
	return c
}

func Transcribe(ctx context.Context, audio string) (*Result, error) {
	r, err := client.Transcribe(ctx, audio, stt.TranscribeOptions{
		SpeakerLabels:  stt.Bool(true),
		WordTimestamps: stt.Bool(true),
	}, nil)
	if err != nil {
		return nil, err
	}

	speakers := make([]Speaker, 0, len(r.Utterances))
	for _, u := range r.Utterances {
		speakers = append(speakers, Speaker{Speaker: u.Speaker, Text: u.Text})
	}
	return &Result{Text: r.Text(), Speakers: speakers, Words: r.Words}, nil
}`,
          },
          {
            label: "C#",
            language: "csharp",
            code: `// Transcription.cs — the ONE place your app calls
using SpeechRevolutions;

public record SpeakerTurn(string? Speaker, string Text);

public record TranscriptionResult(
    string Text,
    IReadOnlyList<SpeakerTurn> Speakers,
    IReadOnlyList<Word> Words);

public sealed class Transcription : IDisposable
{
    private readonly SpeechRevolutionsClient _client = new(); // SPEECHREVOLUTIONS_API_KEY

    public async Task<TranscriptionResult> TranscribeAsync(string audio)
    {
        var r = await _client.TranscribeAsync(audio, new TranscribeOptions
        {
            SpeakerLabels = true,
            WordTimestamps = true,
        });

        return new TranscriptionResult(
            r.Text,
            r.Utterances.Select(u => new SpeakerTurn(u.Speaker, u.Text)).ToList(),
            r.Words);
    }

    public void Dispose() => _client.Dispose();
}`,
          },
        ]}
      />

      <h2>4. Compare outputs before you cut over</h2>
      <p>
        Run both providers on the same sample set through your interface, store both
        outputs, and compare them. Measure WER against a reference transcript if you have
        one; otherwise, spot-check the transcripts, speaker turns, and timestamps your
        product depends on. Keep the sample as a regression set.
      </p>

      <h2>5. Roll out incrementally</h2>
      <ul>
        <li>
          <strong>Shadow.</strong> Send a copy of production traffic to Speech Revolutions
          and compare results without serving them.
        </li>
        <li>
          <strong>Ramp.</strong> Route 5% → 25% → 100% of traffic behind a feature flag,
          and check quality and error metrics at each step.
        </li>
        <li>
          <strong>Fall back.</strong> On error or timeout, have the interface call the old
          provider until the rollout is complete.
        </li>
      </ul>
      <Callout title="For large backfills" tone="info">
        <p>
          To re-transcribe an existing library, use <code>submit()</code> with polling or
          webhooks instead of blocking calls. See the{" "}
          <Link href="/tutorials/batch">batch tutorial</Link>.
        </p>
      </Callout>

      <h2>6. The 30-minute quickstart</h2>
      <p>Install the SDK, set your API key, transcribe, and read the result.</p>
      <CodeTabs
        tabs={[
          {
            label: "Python",
            language: "bash",
            code: `pip install speechrevolutions
export SPEECHREVOLUTIONS_API_KEY=stt_...`,
          },
          {
            label: "JavaScript",
            language: "bash",
            code: `npm install speechrevolutions
export SPEECHREVOLUTIONS_API_KEY=stt_...`,
          },
          {
            label: "Go",
            language: "bash",
            code: `go get github.com/speechrevolutions/speechrevolutions-go
export SPEECHREVOLUTIONS_API_KEY=stt_...`,
          },
          {
            label: "C#",
            language: "bash",
            code: `dotnet add package SpeechRevolutions
export SPEECHREVOLUTIONS_API_KEY=stt_...`,
          },
        ]}
      />
      <CodeTabs
        tabs={[
          {
            label: "Python",
            language: "python",
            code: `from speechrevolutions import SpeechRevolutions

client = SpeechRevolutions()
result = client.transcribe("meeting.mp3", speaker_labels=True)
print(result.text)`,
          },
          {
            label: "JavaScript",
            language: "ts",
            code: `import { SpeechRevolutions } from "speechrevolutions";

const client = new SpeechRevolutions();
const result = await client.transcribe("meeting.mp3", { speakerLabels: true });
console.log(result.text);`,
          },
          {
            label: "Go",
            language: "go",
            code: `client, err := stt.NewClient("")
if err != nil {
	log.Fatal(err)
}

result, err := client.Transcribe(ctx, "meeting.mp3", stt.TranscribeOptions{
	SpeakerLabels: stt.Bool(true),
}, nil)
if err != nil {
	log.Fatal(err)
}
fmt.Println(result.Text())`,
          },
          {
            label: "C#",
            language: "csharp",
            code: `using SpeechRevolutions;

using var client = new SpeechRevolutionsClient();
var result = await client.TranscribeAsync("meeting.mp3",
    new TranscribeOptions { SpeakerLabels = true });

Console.WriteLine(result.Text);`,
          },
        ]}
      />
      <p>
        Next, see the <Link href="/migrate/deepgram">provider-specific guide</Link> for
        exact field mappings, or the <Link href="/getting-started">Quickstart</Link>.
      </p>
    </>
  );
}
