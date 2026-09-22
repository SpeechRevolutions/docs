import { CodeBlock } from "@/components/CodeBlock";
import { Callout } from "@/components/DocsUI";
import { SITE } from "@/lib/constants";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Benchmarks & methodology",
  description:
    "Zephyr is evaluated with a fully reproducible, provider-agnostic suite: every benchmark is generated from public datasets using deterministic, seeded…",
};

export default function BenchmarksPage() {
  return (
    <>
      <h1>Benchmarks & methodology</h1>
      <p>
        Zephyr, our speech-to-text engine, is evaluated with a fully reproducible,
        provider-agnostic suite:
        every benchmark is generated from <strong>public datasets</strong> using
        deterministic, seeded scripts, and produces identical outputs regardless
        of provider. We publish the harness so you can verify the numbers on your
        own — nothing here is hand-picked.
      </p>

      <Callout title="The numbers" tone="info">
        <p>
          The full cross-provider comparison table (WER, diarization, timestamps,
          multilingual, and more) lives on our{" "}
          <a href={SITE.landingUrl}>landing page</a>, kept in one place so it
          never drifts. This page explains <em>what</em> is measured and{" "}
          <em>how to reproduce it yourself</em>.
        </p>
      </Callout>

      <h2>What we measure</h2>
      <p>Six benchmarks, each from public data:</p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Benchmark</th>
              <th>Dataset(s)</th>
              <th>Measures</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>WER</td>
              <td>LibriSpeech clean/other, Earnings21, SPGISpeech</td>
              <td>Word error rate (accuracy)</td>
            </tr>
            <tr>
              <td>Entity accuracy</td>
              <td>Earnings21 (spaCy NER)</td>
              <td>Precision / recall / F1 on named entities</td>
            </tr>
            <tr>
              <td>Diarization</td>
              <td>AMI-SDM, AMI Mix-Headset, Earnings21, NotSoFar, DiPCo</td>
              <td>
                DER at the standard 0.25 s collar (the figure on our site), strict
                DER at collar 0, cpWER, speaker error, missed speech, false alarm —
                overall and per dataset, all overlap-aware
              </td>
            </tr>
            <tr>
              <td>Timestamps</td>
              <td>AMI (word-level refs)</td>
              <td>Word start/end MAE, within-50/100/200 ms</td>
            </tr>
            <tr>
              <td>Multilingual</td>
              <td>FLEURS (14 langs)</td>
              <td>WER per language (CER for zh/ja/th)</td>
            </tr>
            <tr>
              <td>Language switching</td>
              <td>FLEURS (generated)</td>
              <td>Switch-boundary WER, switch latency</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>Reproduce it yourself</h2>
      <p>
        The suite is the{" "}
        <a href="https://github.com/SpeechRevolutions/benchmarks">
          SpeechRevolutions/benchmarks
        </a>{" "}
        repository. It talks to the production API through the published{" "}
        <code>speechrevolutions</code> SDK — there is nothing to host and no
        local stack to run. Point it at any competitor with that provider&apos;s
        API key instead; every provider returns the same normalized transcript,
        so scoring is identical.
      </p>
      <CodeBlock
        language="bash"
        code={`git clone https://github.com/SpeechRevolutions/benchmarks
cd benchmarks

pip install -r requirements.txt
python -m spacy download en_core_web_sm          # entity benchmark

# 1. Build the frozen datasets from public sources (deterministic).
#    The audio is not committed, so this step is required.
python -m benchmarks.datasets.prepare_all

# 2. Run one benchmark, or all of them, against our production API
export SPEECHREVOLUTIONS_API_KEY=stt_...
python -m benchmarks.cli run wer
python -m benchmarks.cli run all

# 3. Run against another provider (needs that provider's API key)
DEEPGRAM_API_KEY=... python -m benchmarks.cli run all --provider deepgram
ASSEMBLYAI_API_KEY=... python -m benchmarks.cli run all --provider assemblyai`}
      />
      <p>
        <code>python -m benchmarks.cli list</code> shows every benchmark and
        provider. Results are written as JSON / Markdown / CSV. Every command
        above runs from the repository root.
      </p>

      <h2>Methodology we hold ourselves to</h2>
      <ul>
        <li>
          WER uses the standard Whisper text normalizers; diarization DER is
          overlap-aware and scored at the same 0.25 s collar for every provider,
          with strict collar-0 figures reported alongside.
        </li>
        <li>
          Where a metric requires data a provider can&apos;t emit (e.g. per-word
          language labels for switch latency, or word timestamps from a
          text-only API), it is reported as <code>null</code> —{" "}
          <strong>never fabricated</strong>.
        </li>
        <li>
          Custom-vocabulary glossaries, when used, are applied identically to
          every keyword-capable provider through its own native parameter, so
          comparisons stay fair.
        </li>
      </ul>

      <Callout title="Honest by construction" tone="tip">
        <p>
          Because the harness is public and deterministic, you don&apos;t have to
          take our word for any figure — clone it, point it at your own audio and
          the providers you care about, and see for yourself. The best benchmark
          is always <em>your</em> data (see the{" "}
          <Link href="/migrate/playbook">migration playbook</Link>).
        </p>
      </Callout>
    </>
  );
}
