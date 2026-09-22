import { CodeTabs } from "@/components/CodeTabs";
import { Callout } from "@/components/DocsUI";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Switching STT APIs in under 30 minutes",
  description:
    "Changing speech-to-text providers sounds risky. It isn't — if you do it behind an interface, compare on your own audio, and roll out gradually with a…",
};

export default function MigrationPlaybookPage() {
  return (
    <>
      <h1>Switching STT APIs in under 30 minutes</h1>
      <p>
        Changing speech-to-text providers sounds risky. It isn&apos;t — if you
        do it behind an interface, compare on your own audio, and roll out
        gradually with a fallback. This is the provider-agnostic playbook; the{" "}
        per-provider guides (
        <Link href="/migrate/deepgram">Deepgram</Link>,{" "}
        <Link href="/migrate/assemblyai">AssemblyAI</Link>,{" "}
        <Link href="/migrate/openai-whisper">OpenAI Whisper</Link>,{" "}
        <Link href="/migrate/elevenlabs">ElevenLabs</Link>,{" "}
        <Link href="/migrate/self-hosted-whisper">self-hosted Whisper</Link>)
        fill in the exact field mappings.
      </p>

      <h2>1. Why teams switch</h2>
      <ul>
        <li>
          <strong>Accuracy on their audio</strong> — general WER hides how a
          model does on your domain, accents, and multi-speaker recordings.
        </li>
        <li>
          <strong>Diarization &amp; timestamps</strong> — the difference between
          &quot;a transcript&quot; and a usable, speaker-labeled, seekable one.
        </li>
        <li>
          <strong>Price at volume</strong>, output formats (SRT/VTT/DOCX), and
          operational simplicity (no GPUs to babysit).
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
              <td>DER + does the speaker labeling actually hold up on your meetings</td>
            </tr>
            <tr>
              <td>Timestamps</td>
              <td>Word-level start/end accuracy (matters for subtitles &amp; search)</td>
            </tr>
            <tr>
              <td>Languages</td>
              <td>The specific languages and code-switching you serve</td>
            </tr>
            <tr>
              <td>Formats &amp; features</td>
              <td>JSON shape, SRT/VTT/DOCX, custom vocabulary, webhooks</td>
            </tr>
            <tr>
              <td>Throughput &amp; price</td>
              <td>Batch latency and cost at your monthly volume</td>
            </tr>
          </tbody>
        </table>
      </div>
      <Callout title="Measure on your data" tone="tip">
        <p>
          Our <Link href="/benchmarks">public benchmark suite</Link> is
          reproducible and provider-agnostic — point it at your own audio and the
          providers you&apos;re comparing. The most honest benchmark is always
          yours.
        </p>
      </Callout>

      <h2>3. Migrate behind an interface</h2>
      <p>
        Don&apos;t sprinkle vendor SDK calls across your codebase. Put
        transcription behind one function that returns your own normalized shape.
        Swapping providers then touches exactly one file. The Speech Revolutions result
        object is already transcript-first (<code>.text</code>,{" "}
        <code>.words</code>, <code>.utterances</code>) and can emit a
        Deepgram-shaped dict via <code>to_deepgram()</code> if you&apos;re
        mid-migration.
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
    words: r.words.map((w) => w.toDict()),
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

var client *stt.Client // built once with SPEECHREVOLUTIONS_API_KEY

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
        Run both providers over the same sample set through your interface,
        store both outputs, and diff them: WER against a reference if you have
        one, otherwise spot-check the transcripts, speaker turns, and timestamps
        that matter to your product. Keep the sample around as a regression set.
      </p>

      <h2>5. Roll out incrementally</h2>
      <ul>
        <li>
          <strong>Shadow</strong> — send a copy of production traffic to Speech Revolutions,
          compare, don&apos;t serve it yet.
        </li>
        <li>
          <strong>Ramp</strong> — route 5% → 25% → 100% behind a feature flag,
          watching your quality and error metrics at each step.
        </li>
        <li>
          <strong>Fall back</strong> — on error or timeout, have the interface
          fall back to the old provider until you&apos;re fully confident. One
          interface makes this a few lines.
        </li>
      </ul>
      <Callout title="For large backfills" tone="info">
        <p>
          Re-transcribing an existing library? Use{" "}
          <code>submit()</code> + polling or webhooks instead of blocking calls —
          see the <Link href="/tutorials/batch">batch tutorial</Link>.
        </p>
      </Callout>

      <h2>6. The 30-minute quickstart</h2>
      <p>Authenticate, transcribe, read the result — that&apos;s the whole loop.</p>
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
        Next: pick your <Link href="/migrate/deepgram">provider-specific guide</Link>{" "}
        for exact field mappings, or the{" "}
        <Link href="/getting-started">Quickstart</Link> to go deeper.
      </p>
    </>
  );
}
