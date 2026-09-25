import { SITE } from "@/lib/constants";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Changelog",
  description:
    "Dated record of changes to the Speech Revolutions API, SDKs and documentation.",
};

/**
 * Only shipped, publicly observable changes belong here.
 *
 * A changelog is a claim like any other: an entry for something still sitting in a branch,
 * or waiting on a deploy, is a false statement in the most credible place on the site. If it
 * cannot be verified from outside — a version on a registry, a URL that resolves, behaviour
 * a caller can observe — it does not get an entry until it can.
 */
type Entry = {
  date: string;
  version?: string;
  changes: { kind: "Added" | "Changed" | "Fixed" | "Removed"; text: React.ReactNode }[];
};

const ENTRIES: Entry[] = [
  {
    date: "2026-09-24",
    changes: [
      {
        kind: "Added",
        text: (
          <>
            A machine-readable{" "}
            <a href="/openapi.json">OpenAPI 3.1 description</a> of every public endpoint,
            for client generators and coding agents.
          </>
        ),
      },
      {
        kind: "Added",
        text: (
          <>
            Reference sections for <Link href="/api-reference/overview">audio formats and
            errors</Link> — every status code, what <code>failed_stage</code> values mean, and
            which requests are safe to retry.
          </>
        ),
      },
      {
        kind: "Fixed",
        text: (
          <>
            Documentation showed diarized speakers as <code>SPEAKER_0</code>. The API numbers
            them from one — <code>SPEAKER_1</code>, <code>SPEAKER_2</code> — dense and in
            order of first appearance. The API did not change; the examples were wrong.
          </>
        ),
      },
    ],
  },
  {
    date: "2026-09-22",
    changes: [
      {
        kind: "Added",
        text: (
          <>
            These docs, at <code>{SITE.docsDomain}</code>: API reference, guides, tutorials,
            framework integrations and migration guides from five other providers.
          </>
        ),
      },
      {
        kind: "Added",
        text: (
          <>
            Webhook delivery headers documented — <code>X-SR-Signature</code>,{" "}
            <code>X-SR-Event</code> and <code>X-SR-Delivery</code> — with the retry contract.
          </>
        ),
      },
    ],
  },
  {
    date: "2026-09-21",
    version: "SDKs 0.3.0",
    changes: [
      {
        kind: "Changed",
        text: (
          <>
            <strong>Breaking.</strong> The base error type is now{" "}
            <code>SpeechRevolutionsError</code> (<code>SpeechRevolutionsException</code> in
            C#), replacing <code>STTError</code> / <code>SttException</code>. The{" "}
            <code>STTClient</code> and <code>AsyncSTTClient</code> aliases are gone.
          </>
        ),
      },
      {
        kind: "Removed",
        text: (
          <>
            <strong>Breaking.</strong> The SDKs no longer read <code>STT_API_KEY</code> or{" "}
            <code>STT_BASE_URL</code>. Use <code>SPEECHREVOLUTIONS_API_KEY</code> and{" "}
            <code>SPEECHREVOLUTIONS_BASE_URL</code>.
          </>
        ),
      },
      {
        kind: "Added",
        text: <>Published per-endpoint rate limits.</>,
      },
    ],
  },
  {
    date: "2026-09-20",
    version: "SDKs 0.2.1–0.2.3",
    changes: [
      {
        kind: "Fixed",
        text: (
          <>
            Each SDK announced a version it was not. The <code>User-Agent</code> is now
            derived from the package&apos;s own metadata, so it always matches what is
            installed.
          </>
        ),
      },
      {
        kind: "Fixed",
        text: (
          <>
            Job-creating requests are no longer blindly retried. A lost response to{" "}
            <code>/api/v1/upload</code> could create a second job for the same audio —
            transcribed twice, billed twice. Those two calls now retry only when the request
            provably never landed.
          </>
        ),
      },
    ],
  },
  {
    date: "2026-09-18",
    version: "SDKs 0.2.0",
    changes: [
      {
        kind: "Added",
        text: (
          <>
            First public release of the four official SDKs:{" "}
            <a href="https://pypi.org/project/speechrevolutions/">Python</a>,{" "}
            <a href="https://www.npmjs.com/package/speechrevolutions">JavaScript</a>,{" "}
            <a href="https://pkg.go.dev/github.com/speechrevolutions/speechrevolutions-go">
              Go
            </a>{" "}
            and <a href="https://www.nuget.org/packages/SpeechRevolutions">C#</a>.
          </>
        ),
      },
    ],
  },
];

const KIND_CLASS: Record<string, string> = {
  Added: "text-emerald-400",
  Changed: "text-amber-400",
  Fixed: "text-sky-400",
  Removed: "text-rose-400",
};

export default function ChangelogPage() {
  return (
    <>
      <h1>Changelog</h1>
      <p>
        Changes to the API, the SDKs and this documentation. Breaking changes are called out
        explicitly. For SDK releases, the{" "}
        <Link href="/sdks/python">SDK pages</Link> always describe the current version.
      </p>

      {ENTRIES.map((entry) => (
        <section key={entry.date}>
          <h2>
            <time dateTime={entry.date}>{entry.date}</time>
            {entry.version ? ` · ${entry.version}` : ""}
          </h2>
          <ul>
            {entry.changes.map((change, i) => (
              <li key={i}>
                <strong className={KIND_CLASS[change.kind]}>{change.kind}</strong>{" "}
                {change.text}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
