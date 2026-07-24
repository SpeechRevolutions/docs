import { Callout } from "@/components/DocsUI";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Features & formats",
};

export default function FeaturesPage() {
  return (
    <>
      <h1>Features & formats</h1>
      <p>
        Every request can enable the full feature set — there are no paid
        add-ons.
      </p>

      <h2>Transcription options</h2>
      <table>
        <thead>
          <tr>
            <th>Option</th>
            <th>Default</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>word_timestamps</code>
            </td>
            <td>
              <code>true</code>
            </td>
            <td>Start/end time per word (seconds)</td>
          </tr>
          <tr>
            <td>
              <code>speaker_labels</code>
            </td>
            <td>
              <code>true</code>
            </td>
            <td>Diarization / speaker turns</td>
          </tr>
          <tr>
            <td>
              <code>diarize</code>
            </td>
            <td>—</td>
            <td>
              Deepgram-compatible alias for <code>speaker_labels</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>nltk</code>
            </td>
            <td>
              <code>true</code>
            </td>
            <td>Restore punctuation &amp; capitalization</td>
          </tr>
          <tr>
            <td>
              <code>custom_vocabulary</code>
            </td>
            <td>—</td>
            <td>List of names / jargon to recover</td>
          </tr>
          <tr>
            <td>
              <code>tier</code>
            </td>
            <td>
              <code>standard</code>
            </td>
            <td>
              <code>standard</code> — the only tier currently available
            </td>
          </tr>
          <tr>
            <td>
              <code>output_type</code>
            </td>
            <td>
              <code>json</code>
            </td>
            <td>Result file format</td>
          </tr>
        </tbody>
      </table>

      <h2>Output types</h2>
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Use for</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>json</code>
            </td>
            <td>
              Structured <code>words</code> (+ optional diarization). SDKs parse
              this into <code>text</code>, <code>words</code>,{" "}
              <code>utterances</code>.
            </td>
          </tr>
          <tr>
            <td>
              <code>txt</code>
            </td>
            <td>Plain transcript (speaker blocks when labels on)</td>
          </tr>
          <tr>
            <td>
              <code>srt</code> / <code>vtt</code>
            </td>
            <td>Subtitles / captions</td>
          </tr>
          <tr>
            <td>
              <code>docx</code> / <code>pdf</code>
            </td>
            <td>Shareable documents</td>
          </tr>
        </tbody>
      </table>

      <h2>JSON shape (native)</h2>
      <p>Default JSON looks like:</p>
      <pre className="mt-5 overflow-x-auto rounded-xl border border-white/10 bg-[#0b1220] p-4 text-[13px] leading-6 text-zinc-200">
        <code>{`{
  "words": [
    {"word": "Hello,", "start": 0.12, "end": 0.40, "speaker": "SPEAKER_0", "language": "en"},
    {"word": "world.", "start": 0.41, "end": 0.70, "speaker": "SPEAKER_0", "language": "en"}
  ],
  "diarization": [
    {"start": 0.12, "end": 0.70, "speaker": "SPEAKER_0"}
  ],
  "languages": [
    {"start": 0.12, "end": 0.70, "language": "en"}
  ]
}`}</code>
      </pre>

      <h2>Live progress</h2>
      <p>
        Every SDK reports real-time progress for <strong>both</strong> the file
        upload and the transcription — as console bars (<code>progress</code>{" "}
        toggle) or as <code>onProgress</code> / <code>onUploadProgress</code>{" "}
        callbacks that carry <code>completed</code>, <code>total</code>,{" "}
        <code>step</code>, and a computed <code>percent</code>. It is derived
        from the{" "}
        <Link href="/api-reference/jobs">job SSE stream</Link>&apos;s{" "}
        <code>completed</code>/<code>total</code> counts, and neither AssemblyAI
        nor Deepgram exposes it for pre-recorded audio.
      </p>

      <Callout title="SDK adapters" tone="tip">
        <p>
          Python/JS SDKs expose AssemblyAI-style <code>result.text</code> /{" "}
          <code>result.utterances</code>, plus{" "}
          <code>result.to_deepgram()</code> for Deepgram-shaped migrations.
        </p>
      </Callout>
    </>
  );
}
