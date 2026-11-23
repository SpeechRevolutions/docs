import { CodeBlock } from "@/components/CodeBlock";
import { docMeta } from "@/lib/metadata";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = docMeta({
  title: "Deepgram-compatible streaming",
  description:
    "wss://api.speechrevolutions.com/v1/listen speaks Deepgram's live-streaming protocol, so LiveKit, Pipecat, Vapi and the Deepgram SDKs switch with a URL change.",
});

export default function DeepgramCompatiblePage() {
  return (
    <>
      <h1>Deepgram-compatible streaming</h1>
      <p>
        <code>wss://api.speechrevolutions.com/v1/listen</code> speaks Deepgram&apos;s live
        streaming protocol. Point any Deepgram streaming client at it with your Speech Revolutions
        API key and it runs on our <Link href="/streaming">real-time streaming</Link>: LiveKit&apos;s{" "}
        <code>deepgram.STT</code>, Pipecat&apos;s <code>DeepgramSTTService</code>, Vapi&apos;s
        Deepgram credential, and the Deepgram SDKs.
      </p>

      <h2 id="connect">Connect</h2>
      <p>
        Authenticate as Deepgram clients do: <code>Authorization: Token &lt;key&gt;</code> (or{" "}
        <code>Bearer</code>), the <code>token, &lt;key&gt;</code> subprotocol, <code>X-API-Key</code>{" "}
        or <code>?token=</code>. Send binary audio frames; send{" "}
        <code>{"{"}&quot;type&quot;: &quot;CloseStream&quot;{"}"}</code> at the end.
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Query parameter</th>
              <th>Supported</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>encoding</code></td>
              <td><code>linear16</code> (default), <code>mulaw</code>, <code>alaw</code></td>
            </tr>
            <tr>
              <td><code>sample_rate</code></td>
              <td>8000, 11025, 12000, 16000, 22050, 24000, 32000, 44100, 48000</td>
            </tr>
            <tr>
              <td><code>channels</code></td>
              <td>1–8 (mixed to mono)</td>
            </tr>
            <tr>
              <td><code>language</code></td>
              <td>An ISO code, or <code>multi</code> / absent to detect</td>
            </tr>
            <tr>
              <td><code>interim_results</code></td>
              <td>Interim <code>Results</code> (<code>is_final: false</code>)</td>
            </tr>
            <tr>
              <td><code>keyterm</code> / <code>keywords</code></td>
              <td>Session vocabulary</td>
            </tr>
            <tr>
              <td><code>vad_events</code></td>
              <td><code>SpeechStarted</code> events</td>
            </tr>
            <tr>
              <td><code>utterance_end_ms</code></td>
              <td><code>UtteranceEnd</code> after each final</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Other parameters (<code>model</code>, <code>smart_format</code>…) are accepted and ignored.{" "}
        <code>KeepAlive</code> is accepted; <code>Finalize</code> ends the current utterance now.
        Finals arrive with <code>is_final</code> and <code>speech_final</code> both true; word times
        within a final are spread over the utterance, which is flagged in the response metadata.
      </p>

      <h2 id="example">Example: phone audio</h2>
      <p>8 kHz μ-law, the format of most telephony streams, with interim results:</p>
      <CodeBlock
        language="python"
        code={`# pip install websockets
import asyncio, json, os
import websockets

async def main():
    url = ("wss://api.speechrevolutions.com/v1/listen"
           "?encoding=mulaw&sample_rate=8000&interim_results=true&language=en")
    headers = {"Authorization": f"Token {os.environ['SPEECHREVOLUTIONS_API_KEY']}"}
    async with websockets.connect(url, additional_headers=headers) as ws:
        audio = open("call.ulaw", "rb").read()   # raw 8 kHz mu-law

        async def send():
            for i in range(0, len(audio), 800):   # 100 ms per frame
                await ws.send(audio[i:i + 800])
                await asyncio.sleep(0.1)
            await ws.send(json.dumps({"type": "CloseStream"}))

        sender = asyncio.create_task(send())
        async for raw in ws:
            m = json.loads(raw)
            if m.get("type") == "Results" and m["is_final"]:
                print(m["channel"]["alternatives"][0]["transcript"])
        await sender

asyncio.run(main())`}
      />
      <p>
        For LiveKit, Pipecat and Vapi, see their pages:{" "}
        <Link href="/integrations/livekit">LiveKit</Link>,{" "}
        <Link href="/integrations/pipecat">Pipecat</Link>,{" "}
        <Link href="/integrations/vapi">Vapi</Link>.
      </p>
    </>
  );
}
