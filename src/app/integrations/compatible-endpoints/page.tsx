import { CodeTabs } from "@/components/CodeTabs";
import { Callout } from "@/components/DocsUI";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Deepgram & OpenAI compatible endpoints",
  description:
    "Point a Deepgram or OpenAI client (LiveKit, Pipecat, Vapi, Open WebUI and others) at Speech Revolutions by changing its base URL.",
};

export default function CompatibleEndpointsPage() {
  return (
    <>
      <h1>Deepgram &amp; OpenAI compatible endpoints</h1>
      <p>
        Many platforms and SDKs already speak Deepgram&apos;s or OpenAI&apos;s speech-to-text protocol. Speech
        Revolutions accepts both, so you can switch by changing the base URL and the API key.
      </p>

      <h2 id="deepgram">Live streaming: Deepgram-compatible</h2>
      <p>
        <code>wss://api.speechrevolutions.com/v1/listen</code> takes Deepgram&apos;s live protocol: binary audio frames in,
        and <code>Results</code> messages out (interim and final), <code>UtteranceEnd</code> and a closing{" "}
        <code>Metadata</code> message. Audio can be <code>linear16</code>, <code>mulaw</code> or <code>alaw</code>, at any
        sample rate and channel count. <code>language</code> (or <code>multi</code> for detection) and{" "}
        <code>keyterm</code> are used. Other parameters, including <code>model</code>, are accepted and ignored.
      </p>
      <CodeTabs
        tabs={[
          {
            label: "LiveKit",
            language: "python",
            code: `from livekit.plugins import deepgram

stt = deepgram.STT(
    base_url="wss://api.speechrevolutions.com/v1/listen",
    api_key=os.environ["SPEECHREVOLUTIONS_API_KEY"],
)`,
          },
          {
            label: "Pipecat",
            language: "python",
            code: `from pipecat.services.deepgram.stt import DeepgramSTTService

stt = DeepgramSTTService(
    api_key=os.environ["SPEECHREVOLUTIONS_API_KEY"],
    base_url="wss://api.speechrevolutions.com",
)`,
          },
          {
            label: "Deepgram SDK",
            language: "python",
            code: `from deepgram import DeepgramClient, DeepgramClientOptions, LiveOptions

dg = DeepgramClient(
    os.environ["SPEECHREVOLUTIONS_API_KEY"],
    DeepgramClientOptions(url="wss://api.speechrevolutions.com"),
)
conn = dg.listen.websocket.v("1")
conn.start(LiveOptions(encoding="linear16", sample_rate=16000, interim_results=True))`,
          },
        ]}
      />
      <Callout title="Differences from Deepgram">
        Word times inside a final are spread across the final&apos;s span: each final carries the utterance&apos;s start
        and end, not per-word timestamps yet. <code>Finalize</code> is accepted; turn detection finalizes on its own.
      </Callout>

      <h2 id="openai">Files: OpenAI-compatible</h2>
      <p>
        <code>POST https://api.speechrevolutions.com/v1/audio/transcriptions</code> takes OpenAI&apos;s multipart form
        (<code>file</code>, <code>model</code>, <code>language</code>, <code>prompt</code>,{" "}
        <code>response_format</code>, <code>timestamp_granularities[]</code>). It returns <code>json</code>,{" "}
        <code>text</code>, <code>srt</code>, <code>vtt</code> or <code>verbose_json</code>, with words and segments,
        where segments are speaker turns. <code>model</code> is ignored, and names in <code>prompt</code> become custom
        vocabulary.
      </p>
      <CodeTabs
        tabs={[
          {
            label: "OpenAI SDK",
            language: "python",
            code: `from openai import OpenAI

client = OpenAI(api_key=os.environ["SPEECHREVOLUTIONS_API_KEY"],
                base_url="https://api.speechrevolutions.com/v1")
result = client.audio.transcriptions.create(
    model="whisper-1", file=open("call.mp3", "rb"),
    response_format="verbose_json", timestamp_granularities=["word", "segment"],
)`,
          },
          {
            label: "cURL",
            language: "bash",
            code: `curl https://api.speechrevolutions.com/v1/audio/transcriptions \\
  -H "Authorization: Bearer $SPEECHREVOLUTIONS_API_KEY" \\
  -F file=@call.mp3 -F model=whisper-1 -F response_format=srt`,
          },
        ]}
      />
    </>
  );
}
