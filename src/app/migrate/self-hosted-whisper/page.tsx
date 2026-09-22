import { CodeBlock } from "@/components/CodeBlock";
import { CodeTabs } from "@/components/CodeTabs";
import { Callout, EndpointBadge } from "@/components/DocsUI";
import { SITE } from "@/lib/constants";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Migrating from self-hosted Whisper to Speech Revolutions",
  description:
    "Move a faster-whisper or whisper.cpp deployment to Speech Revolutions' hosted API: retire the GPU ops, keep word timestamps, and get built-in diarization.",
};

export default function MigrateSelfHostedWhisperPage() {
  return (
    <>
      <h1>Migrating from self-hosted Whisper to Speech Revolutions</h1>
      <p>
        Running Whisper yourself — <code>faster-whisper</code> (CTranslate2) on a
        GPU box, or <code>whisper.cpp</code> on CPU/Metal — starts as a one-liner
        and quietly turns into an infrastructure project: provisioning GPUs,
        pinning CUDA/cuDNN, sizing VRAM for <code>large-v3</code>, warming models
        to avoid cold starts, batching for throughput, autoscaling for load,
        bolting on a separate diarization stack, and keeping all of it patched.
        Speech Revolutions is the same Whisper-class quality as a hosted API call — no GPUs to
        run — and it ships word timestamps and diarization in one response.
      </p>

      <Callout title="The real cost of self-hosting" tone="tip">
        <p>
          The transcription code is easy. What&apos;s hard is everything around
          it: GPU availability and cost, driver/toolkit version drift, VRAM
          pressure, cold-start latency, concurrency and queueing, and a
          diarization pipeline neither <code>faster-whisper</code> nor{" "}
          <code>whisper.cpp</code> includes out of the box. Migrating to Speech Revolutions
          deletes that entire layer.
        </p>
      </Callout>

      <h2>Authentication</h2>
      <p>
        A local model has no auth — it runs on your own machine. With Speech Revolutions you
        add one API key, read from the environment by the SDK.
      </p>
      <CodeBlock
        language="bash"
        code={`export SPEECHREVOLUTIONS_API_KEY=stt_...`}
      />

      <h2>From a function call to an API call</h2>
      <p>
        Self-hosted Whisper is an in-process function: you load a model into GPU
        memory once, then call <code>.transcribe()</code> on it. Speech Revolutions moves the
        compute off your box — the SDK uploads the file and waits for the result —
        but the call site stays a single line.
      </p>
      <table>
        <thead>
          <tr>
            <th>Self-hosted</th>
            <th>Speech Revolutions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>WhisperModel(&quot;large-v3&quot;, device=&quot;cuda&quot;)</code>{" "}
              (loads weights into VRAM)
            </td>
            <td>
              <code>SpeechRevolutions()</code> (just reads the API key)
            </td>
          </tr>
          <tr>
            <td>
              <code>model.transcribe(path, ...)</code> (runs on your GPU)
            </td>
            <td>
              <code>client.transcribe(path, ...)</code> (runs on Speech Revolutions)
            </td>
          </tr>
          <tr>
            <td>
              lazy <code>segments</code> generator you must iterate
            </td>
            <td>
              a materialized result: <code>.text</code>, <code>.words</code>,{" "}
              <code>.utterances</code>
            </td>
          </tr>
          <tr>
            <td>you operate the GPU, queue, and scaling</td>
            <td>hosted; nothing to operate</td>
          </tr>
        </tbody>
      </table>
      <EndpointBadge method="POST" path="/api/v1/upload" />

      <h2>Input / upload differences</h2>
      <p>
        <code>faster-whisper</code> reads a local file path directly.{" "}
        <code>whisper.cpp</code> is stricter still — it wants 16 kHz mono WAV, so
        most pipelines shell out to <code>ffmpeg</code> to convert first. Speech Revolutions
        accepts common audio/video formats and uploads through a presigned URL
        (the SDK handles the presign → PUT → complete flow), so you pass a path,
        URL, or bytes and skip the transcode step.
      </p>

      <h2>Response shape</h2>
      <p>
        <code>faster-whisper</code> yields <code>Segment</code> objects, each with
        a <code>words</code> list (<code>start</code>, <code>end</code>,{" "}
        <code>word</code>) when <code>word_timestamps=True</code>, plus an{" "}
        <code>info</code> with the detected <code>language</code>. Speech Revolutions returns a
        transcript-first object.
      </p>
      <table>
        <thead>
          <tr>
            <th>faster-whisper</th>
            <th>Speech Revolutions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              join <code>segment.text</code> across the generator
            </td>
            <td>
              <code>result.text</code> (already assembled)
            </td>
          </tr>
          <tr>
            <td>
              <code>segment.words[]</code> (<code>word</code>, <code>start</code>,{" "}
              <code>end</code>)
            </td>
            <td>
              <code>result.words</code> (<code>text</code>, <code>start</code>,{" "}
              <code>end</code>, <code>speaker</code>)
            </td>
          </tr>
          <tr>
            <td>— (no speaker labels)</td>
            <td>
              <code>result.utterances</code> (speaker turns)
            </td>
          </tr>
          <tr>
            <td>
              <code>info.language</code>
            </td>
            <td>
              <code>result.languages</code>
            </td>
          </tr>
        </tbody>
      </table>
      <Callout title="No more draining the generator" tone="info">
        <p>
          <code>faster-whisper</code>&apos;s <code>segments</code> is a lazy
          generator — transcription only runs as you iterate it. Speech Revolutions hands you
          a finished result, so there&apos;s no generator to exhaust before the
          work actually happens.
        </p>
      </Callout>

      <h2>Diarization</h2>
      <p>
        Neither <code>faster-whisper</code> nor <code>whisper.cpp</code> diarizes
        on its own — you run a separate pipeline (typically{" "}
        <code>pyannote.audio</code>) and align its speaker turns onto the Whisper
        words yourself, which means a second model, more VRAM, and alignment code
        to maintain. Speech Revolutions diarizes in the same call: set{" "}
        <code>speaker_labels</code> (on by default) and read{" "}
        <code>result.utterances</code>. Diarization is one of Zephyr&apos;s strongest results; see the <Link href="/benchmarks">benchmarks</Link> and{" "}
        <a href={SITE.landingUrl}>comparison table</a>.
      </p>

      <h2>Timestamps</h2>
      <p>
        With <code>faster-whisper</code> word timestamps require{" "}
        <code>word_timestamps=True</code> (extra alignment cost). On Speech Revolutions{" "}
        <code>word_timestamps</code> is on by default and the times are on{" "}
        <code>result.words</code> in seconds.
      </p>

      <h2>Language selection</h2>
      <p>
        <code>faster-whisper</code> auto-detects, or you pass{" "}
        <code>language=</code> to <code>transcribe()</code>. Speech Revolutions always
        auto-detects, including code-switching mid-file — there&apos;s no
        language parameter to set. <code>result.languages</code> is a list of{" "}
        <code>{`{start, end, language}`}</code> segments covering the whole
        file, and every word in <code>result.words</code> also carries a{" "}
        <code>language</code>.
      </p>

      <h2>Side by side</h2>
      <CodeTabs
        tabs={[
          {
            label: "Before — faster-whisper",
            language: "python",
            filename: "faster_whisper_transcribe.py",
            code: `from faster_whisper import WhisperModel

# loads weights into GPU memory; you own the box, drivers, and VRAM
model = WhisperModel("large-v3", device="cuda", compute_type="float16")

segments, info = model.transcribe("meeting.mp3", word_timestamps=True)

# 'segments' is a lazy generator — transcription runs as you iterate
text = []
for segment in segments:
    text.append(segment.text)
    for w in segment.words:
        print(w.start, w.end, w.word)
print("".join(text))
print("language:", info.language)
# diarization? bring your own pyannote pipeline and align it yourself.`,
          },
          {
            label: "Before — whisper.cpp",
            language: "bash",
            filename: "whisper_cpp.sh",
            code: `# convert to 16 kHz mono WAV first (whisper.cpp requirement)
ffmpeg -i meeting.mp3 -ar 16000 -ac 1 -c:a pcm_s16le meeting.wav

# run inference on the compiled binary; you manage the model files + build
./main -m models/ggml-large-v3.bin -f meeting.wav \\
    --output-srt --max-len 1
# no built-in diarization`,
          },
          {
            label: "After — Speech Revolutions (Python)",
            language: "python",
            filename: "stt_transcribe.py",
            code: `from speechrevolutions import SpeechRevolutions

client = SpeechRevolutions()  # SPEECHREVOLUTIONS_API_KEY — no GPU, no model files
result = client.transcribe("meeting.mp3", speaker_labels=True)

print(result.text)                  # already assembled
for w in result.words:              # word timestamps, in seconds
    print(w.start, w.end, w.text)
for u in result.utterances:         # diarization built in
    print(f"{u.speaker}: {u.text}")
print("languages:", result.languages)  # [{start, end, language}, ...]`,
          },
        ]}
      />

      <h2>What you stop maintaining</h2>
      <ul>
        <li>
          <strong>GPU fleet.</strong> No instances to provision, right-size, or
          pay for while idle.
        </li>
        <li>
          <strong>Toolkit versions.</strong> No CUDA/cuDNN/CTranslate2 drift or
          rebuilds.
        </li>
        <li>
          <strong>Cold starts &amp; batching.</strong> No model-warming or
          throughput tuning to keep latency sane under load.
        </li>
        <li>
          <strong>Diarization stack.</strong> No separate{" "}
          <code>pyannote</code> pipeline and word-alignment code.
        </li>
        <li>
          <strong>Audio preprocessing.</strong> No mandatory{" "}
          <code>ffmpeg</code> 16 kHz WAV conversion (as <code>whisper.cpp</code>{" "}
          needs).
        </li>
      </ul>

      <h2>Common pitfalls</h2>
      <ul>
        <li>
          <strong>Handling the lazy generator.</strong> Code that assumed{" "}
          <code>faster-whisper</code>&apos;s deferred <code>segments</code> should
          switch to reading the finished <code>result</code> fields directly.
        </li>
        <li>
          <strong>Concurrency model.</strong> You no longer serialize work behind
          a single GPU — issue calls concurrently (use <code>submit()</code> or
          the async client) instead of queueing.
        </li>
        <li>
          <strong>Preprocessing assumptions.</strong> Drop the forced 16 kHz mono
          WAV conversion; send the original file.
        </li>
      </ul>

      <Callout title="Next steps" tone="info">
        <p>
          See the <Link href="/migrate/playbook">migration playbook</Link> for
          cutover strategy, the <Link href="/sdks/python">Python SDK</Link> for
          concurrency and async, and the{" "}
          <Link href="/benchmarks">benchmarks</Link> for how hosted Speech Revolutions
          compares to a self-hosted Whisper on accuracy and diarization.
        </p>
      </Callout>
    </>
  );
}
