import { Callout } from "@/components/DocsUI";
import { ADD_ONS, PRICING } from "@/lib/constants";
import { docMeta } from "@/lib/metadata";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = docMeta({
  title: "Features & formats",
  description:
    "Transcription options, output formats and add-on pricing: the base rate covers timestamps, punctuation, language detection and every output format; diarization, keyterms, summaries and the profanity filter are per-hour add-ons.",
});

export default function FeaturesPage() {
  return (
    <>
      <h1>Features & formats</h1>
      <p>
        The base rate (${PRICING.standardPerHour.toFixed(2)} per audio hour) covers word
        timestamps, punctuation, language detection, paragraphs and every output format.
        A few options are{" "}
        <a href="#pricing">add-ons</a>, charged per audio hour only on requests that turn them on.
      </p>

      <h2>Transcription options</h2>
      <div className="table-scroll">
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
              <td>Start and end time of each word, in seconds</td>
            </tr>
            <tr>
              <td>
                <code>speaker_labels</code>
              </td>
              <td>
                <code>false</code>
              </td>
              <td>
                Speaker diarization (who spoke when). Add-on, +${ADD_ONS[0].perHour.toFixed(2)}/hr
              </td>
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
              <td>
                Names and terms to recognize, given to the model and matched by sound.
                Add-on, +${ADD_ONS[1].perHour.toFixed(2)}/hr
              </td>
            </tr>
            <tr>
              <td>
                <code>language</code>
              </td>
              <td>auto</td>
              <td>
                ISO 639-1 code (e.g. <code>en</code>) to skip detection and transcribe the
                whole file in that language — see{" "}
                <Link href="/cookbook#pin-language">pinning the language</Link>
              </td>
            </tr>
            <tr>
              <td>
                <code>summarize</code>
              </td>
              <td>
                <code>false</code>
              </td>
              <td>
                Adds <code>summary</code> (<code>text</code> and <code>bullets</code>) to the
                JSON output. Add-on, +${ADD_ONS[2].perHour.toFixed(2)}/hr
              </td>
            </tr>
            <tr>
              <td>
                <code>filter_profanity</code>
              </td>
              <td>
                <code>false</code>
              </td>
              <td>
                Masks strong profanity (<code>s***</code>) in every output format. Add-on, +$
                {ADD_ONS[3].perHour.toFixed(2)}/hr
              </td>
            </tr>
            <tr>
              <td>
                <code>paragraphs</code>
              </td>
              <td>
                <code>false</code>
              </td>
              <td>
                Adds <code>paragraphs</code> (speaker-aware, with their sentences and times) to the
                JSON output
              </td>
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
      </div>

      <h2 id="pricing">Pricing</h2>
      <p>
        Batch transcription is ${PRICING.standardPerHour.toFixed(2)} per audio hour, billed by
        the second from prepaid credit. Add-ons are charged per audio hour on top, only when the
        request turns them on:
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Add-on</th>
              <th>Option</th>
              <th>Per audio hour</th>
            </tr>
          </thead>
          <tbody>
            {ADD_ONS.map((a) => (
              <tr key={a.option}>
                <td>{a.name}</td>
                <td>
                  <code>{a.option}</code>
                </td>
                <td>+${a.perHour.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        An hour with speaker labels costs $
        {(PRICING.standardPerHour + ADD_ONS[0].perHour).toFixed(2)}. Full details:{" "}
        <a href="https://www.speechrevolutions.com/pricing">pricing</a>.
      </p>

      <h2>Output types</h2>
      <div className="table-scroll">
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
                Structured <code>words</code>, plus diarization when enabled. The
                SDKs parse this into <code>text</code>, <code>words</code>, and{" "}
                <code>utterances</code>.
              </td>
            </tr>
            <tr>
              <td>
                <code>txt</code>
              </td>
              <td>Plain transcript, in speaker blocks when <code>speaker_labels</code> is on</td>
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
      </div>

      <h2>JSON shape (native)</h2>
      <p>The default JSON output looks like this:</p>
      <pre className="mt-5 overflow-x-auto rounded-lg border border-hairline/10 bg-code-bg p-4 text-[13px] leading-6 text-zinc-200">
        <code>{`{
  "words": [
    {"word": "Hello,", "start": 0.12, "end": 0.40, "speaker": "SPEAKER_1", "language": "en"},
    {"word": "world.", "start": 0.41, "end": 0.70, "speaker": "SPEAKER_1", "language": "en"}
  ],
  "diarization": [
    {"start": 0.12, "end": 0.70, "speaker": "SPEAKER_1"}
  ],
  "languages": [
    {"start": 0.12, "end": 0.70, "language": "en"}
  ]
}`}</code>
      </pre>

      <h2>Live progress</h2>
      <p>
        Every SDK reports progress for <strong>both</strong> the file upload
        and the transcription, either as console bars (the <code>progress</code>{" "}
        option) or through <code>onProgress</code> / <code>onUploadProgress</code>{" "}
        callbacks. Each callback receives <code>completed</code>,{" "}
        <code>total</code>, <code>step</code>, and a computed{" "}
        <code>percent</code>. The values come from the{" "}
        <Link href="/api-reference/jobs">job SSE stream</Link>&apos;s{" "}
        <code>completed</code>/<code>total</code> counts, so they track
        completed work, not an estimate.
      </p>

      <Callout title="SDK adapters" tone="tip">
        <p>
          The Python and JavaScript SDKs expose AssemblyAI-style{" "}
          <code>result.text</code> and <code>result.utterances</code>, plus{" "}
          <code>result.to_deepgram()</code> for code that expects Deepgram&apos;s
          response shape.
        </p>
      </Callout>
    </>
  );
}
