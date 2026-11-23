import { CodeBlock } from "@/components/CodeBlock";
import { docMeta } from "@/lib/metadata";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = docMeta({
  title: "Pipecat",
  description:
    "Use Speech Revolutions real-time speech-to-text in a Pipecat pipeline, through Pipecat's DeepgramSTTService pointed at our Deepgram-compatible endpoint.",
});

export default function PipecatPage() {
  return (
    <>
      <h1>Pipecat</h1>
      <p>
        Pipecat&apos;s <code>DeepgramSTTService</code> takes a <code>base_url</code>. Point it at
        our <Link href="/api-reference/deepgram-compatible">Deepgram-compatible endpoint</Link>{" "}
        with a Speech Revolutions API key; the rest of the pipeline stays as it is.
      </p>
      <CodeBlock
        language="python"
        code={`# pip install "pipecat-ai[deepgram]"
import os
from pipecat.services.deepgram.stt import DeepgramSTTService

stt = DeepgramSTTService(
    api_key=os.environ["SPEECHREVOLUTIONS_API_KEY"],
    base_url="api.speechrevolutions.com",
)

# pipeline = Pipeline([transport.input(), stt, context_aggregator.user(), llm, tts, transport.output()])`}
      />
      <p>
        Interim and final transcriptions arrive as Pipecat&apos;s{" "}
        <code>InterimTranscriptionFrame</code> and <code>TranscriptionFrame</code>. Pricing is our{" "}
        <Link href="/streaming">streaming</Link> rate.
      </p>
    </>
  );
}
