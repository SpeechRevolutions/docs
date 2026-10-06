"use client";

import { CopyButton } from "@/components/CopyButton";
import { cn } from "@/lib/utils";
import { useLanguagePreference } from "@/lib/useLanguagePreference";
import { useState } from "react";

export type RenderedSide = {
  langKey: string;
  filename?: string;
  /** Build-time Shiki output. */
  html: string;
  /** Raw source, for the clipboard. */
  code: string;
  lineNumbers: boolean;
};

export type ComparedLanguage = {
  /** Shown on the language tab: "Python", "JavaScript", ... */
  label: string;
  langKey: string;
  before: RenderedSide;
  after: RenderedSide;
};

type Side = "before" | "after";

export function MigrationCompareClient({
  from,
  languages,
}: {
  from: string;
  languages: ComparedLanguage[];
}) {
  const [active, select] = useLanguagePreference(languages.map((l) => l.langKey));
  const [side, setSide] = useState<Side>("before");

  const lang = languages[active] ?? languages[0];
  if (!lang) return null;
  const shown = lang[side];

  const sides: { key: Side; label: string }[] = [
    { key: "before", label: `From ${from}` },
    { key: "after", label: "To Speech Revolutions" },
  ];

  return (
    <div className="mt-5 overflow-hidden rounded-lg border border-hairline/10 bg-code-bg">
      {/* Chrome, not content — keeps labels and "Copy" out of search excerpts and llms.txt. */}
      <div data-pagefind-ignore data-docs-chrome>
        <div className="flex items-center justify-between gap-2 border-b border-hairline/8 pr-2">
          <div role="tablist" aria-label="Language" className="flex min-w-0 flex-wrap items-center">
            {languages.map((l, i) => (
              <button
                key={l.langKey}
                type="button"
                role="tab"
                aria-selected={i === active}
                onClick={() => select(i)}
                className={cn(
                  "-mb-px border-b px-3.5 py-2.5 font-mono text-xs transition-colors focus-visible:ring-2 focus-visible:ring-brand-link/60 focus-visible:outline-none",
                  i === active
                    ? "border-fg text-fg"
                    : "border-transparent text-zinc-500 hover:text-zinc-300",
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
          <CopyButton code={shown.code} className="shrink-0" />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-hairline/8 px-3 py-2">
          <div
            role="radiogroup"
            aria-label="Show code"
            className="inline-flex rounded-md border border-hairline/10 p-0.5"
          >
            {sides.map((s) => (
              <button
                key={s.key}
                type="button"
                role="radio"
                aria-checked={side === s.key}
                onClick={() => setSide(s.key)}
                className={cn(
                  "rounded px-3 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-brand-link/60 focus-visible:outline-none",
                  side !== s.key && "text-zinc-500 hover:text-zinc-300",
                  side === s.key && s.key === "before" && "bg-hairline/10 text-fg",
                  side === s.key && s.key === "after" && "bg-brand-500/15 text-brand-link",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
          {shown.filename ? (
            <span className="truncate font-mono text-xs text-zinc-500">{shown.filename}</span>
          ) : null}
        </div>
      </div>

      {/* Every panel is in the HTML so llms.txt carries both sides in every language;
          only the visible one is indexed for search. */}
      {languages.flatMap((l, i) =>
        sides.map((s) => {
          const visible = i === active && s.key === side;
          const panel = l[s.key];
          return (
            <div
              key={`${l.langKey}-${s.key}`}
              hidden={!visible}
              data-pagefind-ignore={i === 0 && s.key === "before" ? undefined : true}
            >
              <p className="sr-only">
                {s.label} — {l.label}
                {panel.filename ? ` (${panel.filename})` : ""}
              </p>
              <div
                // Read by scripts/generate-llms.mjs — Shiki's output doesn't record the language.
                data-lang={panel.langKey}
                className={cn("code-surface", panel.lineNumbers && "with-line-numbers")}
                dangerouslySetInnerHTML={{ __html: panel.html }}
              />
            </div>
          );
        }),
      )}
    </div>
  );
}
