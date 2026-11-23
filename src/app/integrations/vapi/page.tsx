import { CodeBlock } from "@/components/CodeBlock";
import { docMeta } from "@/lib/metadata";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = docMeta({
  title: "Vapi",
  description:
    "Use Speech Revolutions as the transcriber of a Vapi voice assistant, through Vapi's custom transcriber and our wss://api.speechrevolutions.com/v1/vapi endpoint.",
});

export default function VapiPage() {
  return (
    <>
      <h1>Vapi</h1>
      <p>
        Vapi lets an assistant use a custom transcriber over WebSocket. Our endpoint{" "}
        <code>wss://api.speechrevolutions.com/v1/vapi</code> speaks Vapi&apos;s custom-transcriber
        protocol, so the setup is configuration only.
      </p>
      <ol>
        <li>
          In Vapi, create a custom credential of type Bearer holding your Speech Revolutions API key.
          (The legacy <code>secret</code> field works too: Vapi sends it as{" "}
          <code>x-vapi-secret</code>, which we accept.)
        </li>
        <li>Set the assistant&apos;s transcriber:</li>
      </ol>
      <CodeBlock
        language="json"
        code={`"transcriber": {
  "provider": "custom-transcriber",
  "server": {
    "url": "wss://api.speechrevolutions.com/v1/vapi",
    "credentialId": "<your Bearer credential id>"
  }
}`}
      />
      <p>
        By default only the customer&apos;s channel is transcribed: Vapi already knows what its
        assistant said, and each channel is billed as a stream. Add <code>?assistant=true</code> to
        the URL to transcribe both. Add <code>?language=en</code> to fix the language; otherwise it
        is detected.
      </p>
      <p>
        Vapi also accepts a Deepgram credential with a custom URL; our{" "}
        <Link href="/api-reference/deepgram-compatible">Deepgram-compatible endpoint</Link> works
        that way too. Pricing is our <Link href="/streaming">streaming</Link> rate.
      </p>
    </>
  );
}
