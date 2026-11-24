import { CodeBlock } from "@/components/CodeBlock";
import { CodeTabs } from "@/components/CodeTabs";
import { Callout } from "@/components/DocsUI";
import { PRICING, STREAMING_ADD_ONS } from "@/lib/constants";
import { docMeta } from "@/lib/metadata";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = docMeta({
  title: "Real-time streaming",
  description:
    "Live speech-to-text over WebSocket: partials as people speak, finals about a second after each utterance, turn events, language detection and automatic resume after a dropped connection.",
});

export default function StreamingPage() {
  return (
    <>
      <h1>Real-time streaming</h1>
      <p>
        Stream live audio over a WebSocket and get text back as people speak: a partial for the
        open utterance about four times a second, and a final about a second after each utterance
        ends. For recorded files, use <Link href="/getting-started">batch transcription</Link>{" "}
        instead: it is faster, cheaper and more accurate on a whole file.
      </p>

      <Callout title="Early access" tone="tip">
        <p>
          Streaming is ${PRICING.streamingPerHour.toFixed(2)} per session hour, billed by the
          second, with keyterms included. It is in early access: the API below is stable, and
          we&apos;d like to hear how you use it.
        </p>
      </Callout>

      <h2 id="quickstart">Quickstart</h2>
      <p>
        Open a session, send audio as it is produced, and finish it. Audio is{" "}
        <strong>PCM16, mono, 16 kHz</strong> (little-endian). Each SDK has a helper that converts
        any file with ffmpeg, and a <code>stream_file</code> call that streams a recording in real
        time, which is the quickest way to try it:
      </p>
      <CodeTabs
        tabs={[
          {
            label: "Python",
            language: "python",
            code: `# pip install "speechrevolutions[streaming]"
from speechrevolutions import SpeechRevolutions

client = SpeechRevolutions()  # reads SPEECHREVOLUTIONS_API_KEY

def on_event(e):
    if e.type == "final":
        print(f"[{e.start:.2f}-{e.end:.2f}] {e.text}")

result = client.stream_file("meeting.mp3", language="en", on_event=on_event)
print(result.text)`,
          },
          {
            label: "JavaScript",
            language: "ts",
            code: `// npm install speechrevolutions ws   (Node 22+ doesn't need ws)
import { SpeechRevolutions } from "speechrevolutions";

const client = new SpeechRevolutions(); // reads SPEECHREVOLUTIONS_API_KEY

const result = await client.streamFile("meeting.mp3", {
  language: "en",
  onEvent: (e) => {
    if (e.type === "final") console.log(\`[\${e.start}-\${e.end}] \${e.text}\`);
  },
});
console.log(result.text);`,
          },
          {
            label: "Go",
            language: "go",
            code: `result, err := client.StreamFile(ctx, "meeting.mp3", stt.StreamOptions{
	Language: "en",
	OnEvent: func(e stt.StreamEvent) {
		if e.Type == "final" {
			fmt.Printf("[%.2f-%.2f] %s\\n", *e.Start, *e.End, e.Text)
		}
	},
})
if err != nil {
	log.Fatal(err)
}
fmt.Println(result.Text)`,
          },
          {
            label: "C#",
            language: "csharp",
            code: `var result = await client.StreamFileAsync("meeting.mp3", new StreamOptions
{
    Language = "en",
    OnEvent = e =>
    {
        if (e.Type == "final") Console.WriteLine($"[{e.Start:F2}-{e.End:F2}] {e.Text}");
    },
});
Console.WriteLine(result.Text);`,
          },
        ]}
      />

      <h2 id="live-audio">Live audio</h2>
      <p>
        For a microphone, a phone call or a WebRTC track, open a session and send chunks as they
        arrive (20–100 ms each is typical), then finish. <code>finish</code> waits for the last
        finals and returns the whole transcript.
      </p>
      <CodeTabs
        tabs={[
          {
            label: "Python",
            language: "python",
            code: `import time
from speechrevolutions import SpeechRevolutions, load_pcm16

client = SpeechRevolutions()
session = client.stream(language="en", on_event=lambda e: print(e.type, e.text or ""))

pcm = load_pcm16("meeting.mp3")        # stands in for your audio source
for i in range(0, len(pcm), 2560):     # 80 ms chunks of PCM16 mono 16 kHz
    session.send_audio(pcm[i:i + 2560])
    time.sleep(0.08)                   # a live source delivers in real time

result = session.finish()              # waits for transcription.done
print(result.job_id, result.text)`,
          },
          {
            label: "JavaScript",
            language: "ts",
            code: `import { SpeechRevolutions, loadPcm16 } from "speechrevolutions";

const client = new SpeechRevolutions();
const session = await client.stream({ language: "en" });

const pcm = await loadPcm16("meeting.mp3"); // stands in for your audio source
for (let i = 0; i < pcm.length; i += 2560) {
  session.sendAudio(pcm.subarray(i, i + 2560)); // 80 ms of PCM16 mono 16 kHz
  await new Promise((r) => setTimeout(r, 80)); // a live source delivers in real time
}

const result = await session.finish(); // waits for transcription.done
console.log(result.jobId, result.text);`,
          },
          {
            label: "Go",
            language: "go",
            code: `session, err := client.Stream(ctx, stt.StreamOptions{Language: "en"})
if err != nil {
	log.Fatal(err)
}
pcm, err := stt.LoadPCM16("meeting.mp3") // stands in for your audio source
if err != nil {
	log.Fatal(err)
}
for i := 0; i < len(pcm); i += 2560 {
	end := min(i+2560, len(pcm))
	session.SendAudio(pcm[i:end])     // 80 ms of PCM16 mono 16 kHz
	time.Sleep(80 * time.Millisecond) // a live source delivers in real time
}
result, err := session.Finish(ctx) // waits for transcription.done
if err != nil {
	log.Fatal(err)
}
fmt.Println(result.JobID, result.Text)`,
          },
          {
            label: "C#",
            language: "csharp",
            code: `await using var session = await client.StreamAsync(new StreamOptions { Language = "en" });

var pcm = await Streaming.LoadPcm16Async("meeting.mp3"); // stands in for your audio source
for (var i = 0; i < pcm.Length; i += 2560)
{
    session.SendAudio(pcm.AsSpan(i, Math.Min(2560, pcm.Length - i))); // 80 ms of PCM16 mono 16 kHz
    await Task.Delay(80); // a live source delivers in real time
}

var result = await session.FinishAsync(); // waits for transcription.done
Console.WriteLine($"{result.JobId} {result.Text}");`,
          },
        ]}
      />
      <p>
        A real source produces audio in real time, so it can&apos;t get ahead of the clock. The
        server accepts audio at most about 10 seconds ahead of real time and ends a faster stream
        with the error <code>use_batch</code>; for recordings, use{" "}
        <Link href="/getting-started">batch</Link> or <code>stream_file</code>, which paces itself.
      </p>

      <h2 id="events">Events</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Fields</th>
              <th>Meaning</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>session.created</code></td>
              <td><code>job_id</code></td>
              <td>The session started. The job id is the billing id and the resume handle.</td>
            </tr>
            <tr>
              <td><code>transcription.partial</code></td>
              <td><code>index</code>, <code>text</code>, <code>stable</code>, <code>audio_s</code></td>
              <td>
                The open utterance so far, about four times a second. It replaces the previous
                partial with the same <code>index</code>; the first <code>stable</code> characters
                won&apos;t change.
              </td>
            </tr>
            <tr>
              <td><code>final</code></td>
              <td><code>index</code>, <code>text</code>, <code>start</code>, <code>end</code></td>
              <td>An utterance, about a second after it ends. Times are seconds from the start of the session.</td>
            </tr>
            <tr>
              <td><code>final.revised</code></td>
              <td><code>index</code>, <code>text</code></td>
              <td>A better version of an earlier final (punctuation, a name, the language). Replace that final&apos;s text.</td>
            </tr>
            <tr>
              <td><code>speech.started</code></td>
              <td><code>audio_s</code></td>
              <td>Someone started speaking. Useful for barge-in in a voice agent.</td>
            </tr>
            <tr>
              <td><code>turn.ended</code></td>
              <td><code>index</code>, <code>start</code>, <code>end</code>, <code>probability</code>, <code>forced</code></td>
              <td>
                The speaker finished a turn. <code>probability</code> is the end-of-turn model&apos;s
                confidence (null when silence or length ended it); <code>forced</code> when you ended it.
              </td>
            </tr>
            <tr>
              <td><code>language.detected</code></td>
              <td><code>language</code>, <code>index</code></td>
              <td>The language, when you didn&apos;t set one. Earlier finals are revised into it.</td>
            </tr>
            <tr>
              <td><code>voice_focus</code></td>
              <td><code>active</code></td>
              <td>Answer to a <code>voiceprint</code> or <code>capture_voiceprint</code> option: whether the stream is locked to the voice.</td>
            </tr>
            <tr>
              <td><code>transcription.done</code></td>
              <td><code>text</code></td>
              <td>All finals joined. The session is over.</td>
            </tr>
            <tr>
              <td><code>error</code></td>
              <td><code>code</code>, <code>message</code></td>
              <td>See <a href="#errors">errors</a>.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Every SDK delivers these to an <code>on_event</code> callback, and also lets you iterate them
        (<code>for e in session</code> in Python, <code>for await</code> in JavaScript,{" "}
        <code>session.Events</code> in C#).
      </p>

      <h2 id="options">Session options</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Option</th>
              <th>Default</th>
              <th>What it does</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>language</code></td>
              <td>detect</td>
              <td>The spoken language (<code>&quot;en&quot;</code>, <code>&quot;ja&quot;</code>…). Leave it out to detect it.</td>
            </tr>
            <tr>
              <td><code>languages</code></td>
              <td>—</td>
              <td>Narrow detection to the languages you expect, e.g. <code>[&quot;en&quot;, &quot;ja&quot;]</code>.</td>
            </tr>
            <tr>
              <td><code>vocabulary</code></td>
              <td>—</td>
              <td>Names and terms to recognise (up to 200). Included in the streaming price.</td>
            </tr>
            <tr>
              <td><code>redact_pii</code></td>
              <td><code>false</code></td>
              <td>
                Redact personal information in finals before they reach you (same types and{" "}
                <code>redact_pii_policies</code> / <code>redact_pii_sub</code> as batch). Partials are
                not sent while it is on, unless you set <code>include_partials: true</code>, in which case
                they arrive unredacted. +${STREAMING_ADD_ONS[0].perHour.toFixed(2)} per session hour.
              </td>
            </tr>
            <tr>
              <td><code>voiceprint</code></td>
              <td>—</td>
              <td>
                Voice focus: lock the stream to one enrolled voice, so other people and background voices
                are left out. Get a voiceprint by sending <code>capture_voiceprint: true</code> in an
                earlier session (<code>transcription.done</code> returns it with a quality rating; capture
                again until it is <code>ok</code>). You keep the voiceprint; we keep none after the session. A{" "}
                <code>voice_focus</code> event says whether the lock is active, and only an active lock is
                billed: +${STREAMING_ADD_ONS[1].perHour.toFixed(2)} per session hour.
              </td>
            </tr>
            <tr>
              <td><code>turn_detection</code></td>
              <td>model defaults</td>
              <td>
                <code>{"{"}&quot;threshold&quot;: 0.05–0.99, &quot;max_silence_ms&quot;: 300–5000{"}"}</code>:
                a lower threshold ends turns sooner; <code>max_silence_ms</code> ends a turn after that
                much silence regardless.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        To end a turn yourself (push-to-talk release), call <code>end_turn()</code> (
        <code>endTurn</code>, <code>EndTurn</code>, <code>EndTurnAsync</code>). The open utterance
        becomes a final at once.
      </p>

      <h2 id="resume">Dropped connections</h2>
      <p>
        The SDKs handle these for you. A session keeps the audio the server hasn&apos;t
        acknowledged yet (at most about 30 seconds). If the connection drops, it reconnects with the
        session&apos;s job id for up to 60 seconds, the server says where to resume from, and the
        SDK replays the rest. The transcript comes back complete under the same job id, billed once.
        The same replay happens if the server moves your session to another GPU mid-stream.
      </p>

      <h2 id="protocol">The WebSocket protocol</h2>
      <p>
        Without an SDK: connect to <code>wss://api.speechrevolutions.com/api/v1/stream</code> with
        your key in the <code>X-API-Key</code> header, send JSON messages, and read JSON events.
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>You send</th>
              <th>When</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>{"{"}&quot;type&quot;: &quot;session.update&quot;, &quot;language&quot;: &quot;en&quot;, …{"}"}</code>
              </td>
              <td>First, with the <a href="#options">session options</a>.</td>
            </tr>
            <tr>
              <td><code>{"{"}&quot;type&quot;: &quot;input_audio_buffer.commit&quot;{"}"}</code></td>
              <td>Next: the audio starts.</td>
            </tr>
            <tr>
              <td>
                <code>{"{"}&quot;type&quot;: &quot;input_audio_buffer.append&quot;, &quot;audio&quot;: &quot;&lt;base64&gt;&quot;{"}"}</code>
              </td>
              <td>For each chunk of PCM16 mono 16 kHz audio.</td>
            </tr>
            <tr>
              <td><code>{"{"}&quot;type&quot;: &quot;turn.end&quot;{"}"}</code></td>
              <td>Optional: end the current turn now.</td>
            </tr>
            <tr>
              <td>
                <code>{"{"}&quot;type&quot;: &quot;input_audio_buffer.commit&quot;, &quot;final&quot;: true{"}"}</code>
              </td>
              <td>
                At the end of the audio. The server sends <code>transcription.done</code> and closes.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>A complete client in Python, with only the <code>websockets</code> package:</p>
      <CodeBlock
        language="python"
        code={`# pip install websockets   (ffmpeg converts the input to PCM16 mono 16 kHz)
import asyncio, base64, json, os, subprocess
import websockets

async def main(path):
    pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "s16le",
                          "-ac", "1", "-ar", "16000", "-"], capture_output=True).stdout
    url = "wss://api.speechrevolutions.com/api/v1/stream"
    headers = {"X-API-Key": os.environ["SPEECHREVOLUTIONS_API_KEY"]}
    async with websockets.connect(url, additional_headers=headers) as ws:
        await ws.send(json.dumps({"type": "session.update", "language": "en"}))
        await ws.send(json.dumps({"type": "input_audio_buffer.commit"}))

        async def send_audio():
            for i in range(0, len(pcm), 2560):      # 80 ms per message
                await ws.send(json.dumps({"type": "input_audio_buffer.append",
                                          "audio": base64.b64encode(pcm[i:i + 2560]).decode()}))
                await asyncio.sleep(0.08)           # real time, like a microphone
            await ws.send(json.dumps({"type": "input_audio_buffer.commit", "final": True}))

        sender = asyncio.create_task(send_audio())
        async for raw in ws:
            m = json.loads(raw)
            if m["type"] == "final":
                print(f"[{m['start']:.2f}-{m['end']:.2f}] {m['text']}")
            elif m["type"] == "transcription.done":
                print("done:", m["text"])
                break
            elif m["type"] == "error":
                raise RuntimeError(m)
        await sender

asyncio.run(main("meeting.mp3"))`}
      />
      <p>
        A raw client should also handle <code>audio.committed</code>{" "}
        (<code>{"{"}&quot;through_ms&quot;{"}"}</code>: audio before this point is covered, drop
        it from your buffer) and <code>resend</code>{" "}
        (<code>{"{"}&quot;from_ms&quot;{"}"}</code>: send{" "}
        <code>{"{"}&quot;type&quot;: &quot;input_audio_buffer.rewind&quot;, &quot;from_ms&quot;{"}"}</code>{" "}
        and re-send your buffer from that point). To resume after a drop, reconnect to{" "}
        <code>/api/v1/stream?job_id=&lt;job id&gt;</code> within 60 seconds and answer{" "}
        <code>session.resumed</code> the same way. The SDKs do all of this.
      </p>

      <h2 id="errors">Errors and limits</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>
                <code>code</code>
              </th>
              <th>Meaning</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>invalid_api_key</code>, <code>insufficient_balance</code></td>
              <td>Refused. Check the key, or top up in the console.</td>
            </tr>
            <tr>
              <td><code>rate_limited</code></td>
              <td>Too many sessions or connections at once (5 live sessions per account by default). Retry with backoff.</td>
            </tr>
            <tr>
              <td><code>no_capacity</code></td>
              <td>No streaming capacity right now. Start a new session with backoff.</td>
            </tr>
            <tr>
              <td><code>use_batch</code></td>
              <td>Audio arrived faster than real time. Send recordings to batch.</td>
            </tr>
            <tr>
              <td><code>idle_timeout</code></td>
              <td>No audio for 30 seconds.</td>
            </tr>
            <tr>
              <td><code>max_duration</code></td>
              <td>The session reached 3 hours.</td>
            </tr>
            <tr>
              <td><code>session_expired</code></td>
              <td>A resume came after the 60-second window. Start a new session.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 id="integrations">Voice-agent frameworks</h2>
      <p>
        LiveKit, Pipecat and Vapi can use streaming with a URL change. See{" "}
        <Link href="/integrations/livekit">LiveKit</Link>,{" "}
        <Link href="/integrations/pipecat">Pipecat</Link>,{" "}
        <Link href="/integrations/vapi">Vapi</Link> and the{" "}
        <Link href="/api-reference/deepgram-compatible">Deepgram-compatible endpoint</Link>.
      </p>
    </>
  );
}
