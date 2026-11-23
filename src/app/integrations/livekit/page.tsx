import { CodeBlock } from "@/components/CodeBlock";
import { docMeta } from "@/lib/metadata";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = docMeta({
  title: "LiveKit Agents",
  description:
    "Use Speech Revolutions real-time speech-to-text in a LiveKit voice agent, through LiveKit's Deepgram plugin pointed at our Deepgram-compatible endpoint.",
});

export default function LiveKitPage() {
  return (
    <>
      <h1>LiveKit Agents</h1>
      <p>
        LiveKit&apos;s Deepgram plugin takes a <code>base_url</code>. Point it at our{" "}
        <Link href="/api-reference/deepgram-compatible">Deepgram-compatible endpoint</Link> with a
        Speech Revolutions API key, and the agent streams to us. Nothing else in the agent changes.
      </p>
      <CodeBlock
        language="python"
        code={`# pip install "livekit-agents" "livekit-plugins-deepgram"
import os
from livekit.plugins import deepgram

stt = deepgram.STT(
    base_url="wss://api.speechrevolutions.com/v1/listen",
    api_key=os.environ["SPEECHREVOLUTIONS_API_KEY"],
    language="en",          # or "multi" to detect
    interim_results=True,
)

# then, as usual:
# session = AgentSession(stt=stt, llm=..., tts=..., vad=...)`}
      />
      <p>
        You get interim and final transcripts, start-of-speech events, and the agent&apos;s turn
        handling as with Deepgram. Pricing is our{" "}
        <Link href="/streaming">streaming</Link> rate.
      </p>
    </>
  );
}
