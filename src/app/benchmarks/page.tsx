import { CodeBlock } from "@/components/CodeBlock";
import { Callout } from "@/components/DocsUI";
import { SITE } from "@/lib/constants";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Benchmarks & methodology",
};

export default function BenchmarksPage() {
  return (
    <>
      <h1>Benchmarks & methodology</h1>
      <p>
        Zephyr is evaluated with a fully reproducible, provider-agnostic suite:
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
      <p>Eight benchmarks, each from public data:</p>
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
            <td>LibriSpeech clean/other, Earnings21</td>
            <td>Word error rate (accuracy)</td>
          </tr>
          <tr>
            <td>Entity accuracy</td>
            <td>Earnings21 (spaCy NER)</td>
            <td>Precision / recall / F1 on named entities</td>
          </tr>
          <tr>
            <td>Diarization</td>
            <td>AMI, Earnings21</td>
            <td>DER, speaker error, missed speech, false alarm</td>
          </tr>
          <tr>
            <td>Timestamps</td>
            <td>AMI (word-level refs)</td>
            <td>Word start/end MAE, within-50/100/200 ms</td>
          </tr>
          <tr>
            <td>Multilingual</td>
            <td>FLEURS (~25 langs)</td>
            <td>WER per language (CER for zh/ja/th)</td>
          </tr>
          <tr>
            <td>Language switching</td>
            <td>FLEURS (generated)</td>
            <td>Switch-boundary WER, switch latency</td>
          </tr>
          <tr>
            <td>Long-form</td>
            <td>AMI, Earnings21, podcasts</td>
            <td>WER, hallucination / duplicate / drift rates</td>
          </tr>
          <tr>
            <td>Price / performance</td>
            <td>LibriSpeech subset</td>
            <td>RTF, hours per dollar, p95/p99 latency</td>
          </tr>
        </tbody>
      </table>

      <h2>Reproduce it yourself</h2>
      <p>
        The suite lives under <code>public_benchmarks/</code>. Run it against the
        local Zephyr stack, or against any competitor with that provider&apos;s
        API key — every provider returns the same normalized transcript, so
        scoring is identical.
      </p>
      <CodeBlock
        language="bash"
        code={`# from the repo root
pip install -r public_benchmarks/requirements.txt
python -m spacy download en_core_web_sm          # entity benchmark

# 1. Build the frozen datasets from public sources (deterministic)
python -m public_benchmarks.datasets.prepare_all

# 2. Run one benchmark, or all of them, against the local Zephyr stack
python -m public_benchmarks.cli run wer
python -m public_benchmarks.cli run all

# 3. Run against another provider (needs that provider's API key)
DEEPGRAM_API_KEY=... python -m public_benchmarks.cli run all --provider deepgram
ASSEMBLYAI_API_KEY=... python -m public_benchmarks.cli run all --provider assemblyai`}
      />
      <p>
        <code>python -m public_benchmarks.cli list</code> shows every benchmark
        and provider. Results are written as JSON / Markdown / CSV.
      </p>

      <h2>Methodology we hold ourselves to</h2>
      <ul>
        <li>
          WER uses the standard Whisper text normalizers; diarization DER is
          overlap-aware and reported at a matched collar.
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
