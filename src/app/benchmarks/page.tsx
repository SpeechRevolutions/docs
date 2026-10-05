import { CodeBlock } from "@/components/CodeBlock";
import { Callout } from "@/components/DocsUI";
import { SITE } from "@/lib/constants";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Benchmarks & methodology",
  description:
    "Zephyr benchmark results and methodology: a reproducible, provider-agnostic suite built from public datasets, with instructions to run it yourself.",
};

export default function BenchmarksPage() {
  return (
    <>
      <h1>Benchmarks & methodology</h1>
      <p>
        Zephyr, the Speech Revolutions speech-to-text engine, is evaluated with a
        reproducible, provider-agnostic suite. Every benchmark is generated from{" "}
        <strong>public datasets</strong> with deterministic, seeded scripts and
        is scored the same way for every provider. The harness is public, so you
        can verify the numbers yourself.
      </p>

      <h2>Headline results</h2>
      <p>
        Measured by Speech Revolutions on public datasets, last run 2026-07-12/13 against
        each provider&apos;s then-current model. Lower is better for every metric.
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Benchmark</th>
              <th>Dataset</th>
              <th>Zephyr</th>
              <th>Best other provider</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Diarization error rate</td>
              <td>AMI-SDM</td>
              <td>
                <strong>9.7%</strong>
              </td>
              <td>25.3% (AssemblyAI)</td>
            </tr>
            <tr>
              <td>Diarization error rate</td>
              <td>NotSoFar</td>
              <td>
                <strong>10.9%</strong>
              </td>
              <td>23.3% (AssemblyAI)</td>
            </tr>
            <tr>
              <td>Word error rate</td>
              <td>SPGISpeech</td>
              <td>
                <strong>2.54%</strong>
              </td>
              <td>2.6% (Deepgram)</td>
            </tr>
            <tr>
              <td>Timestamp accuracy (start MAE)</td>
              <td>Word alignment</td>
              <td>
                <strong>40 ms</strong>
              </td>
              <td>58 ms (ElevenLabs)</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        <strong>Diarization figures are overlap-aware and scored at a 0.25 s collar.</strong>{" "}
        This is the lenient condition and the one quoted throughout this site. The same run
        also reports strict collar-0 figures, which is the condition the DiariZen and pyannote
        model cards use; compare those against a published model card. The suite prints both,
        overall and per dataset.
      </p>

      <Callout title="The full table" tone="info">
        <p>
          Every provider, every benchmark, including multilingual and language switching,
          is on the <a href={SITE.landingUrl}>landing page</a>. This page explains{" "}
          <em>what</em> is measured and <em>how to reproduce it</em>.
        </p>
      </Callout>

      <h2>What is measured</h2>
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
                DER at the standard 0.25 s collar (the figure on this site), strict
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
              <td>FLEURS (14 languages)</td>
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
        repository. It calls the production API through the published{" "}
        <code>speechrevolutions</code> SDK, so there is nothing to host. To
        benchmark another provider, supply that provider&apos;s API key. Every
        provider&apos;s output is normalized to the same transcript shape, so
        scoring is identical.
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
        provider. Results are written as JSON, Markdown, and CSV. Run every
        command above from the repository root.
      </p>

      <h2>Methodology</h2>
      <ul>
        <li>
          WER uses the standard Whisper text normalizers. Diarization DER is
          overlap-aware and scored at the same 0.25 s collar for every provider,
          with strict collar-0 figures reported alongside.
        </li>
        <li>
          When a metric needs data a provider doesn&apos;t return (for example,
          per-word language labels for switch latency, or word timestamps from a
          text-only API), it is reported as <code>null</code>, never estimated.
        </li>
        <li>
          Custom-vocabulary glossaries, when used, are applied identically to
          every provider that supports keywords, through that provider&apos;s
          native parameter.
        </li>
      </ul>

      <Callout title="Test on your own audio" tone="tip">
        <p>
          The harness is public and deterministic. Clone it and run it on your
          own audio against the providers you care about. Your own data is the
          most relevant benchmark (see the{" "}
          <Link href="/migrate/playbook">migration playbook</Link>).
        </p>
      </Callout>
    </>
  );
}
