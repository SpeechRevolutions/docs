"use client";

import { CopyButton } from "@/components/CopyButton";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export type RenderedTab = {
  label: string;
  /** Normalised language id, used to sync selection across blocks. */
  langKey: string;
  /** Build-time Shiki output. */
  html: string;
  /** Raw source, for the clipboard. */
  code: string;
  lineNumbers: boolean;
};

const STORAGE_KEY = "docs:preferred-language";
const SYNC_EVENT = "docs:language-change";

/**
 * Picking Python in one block switches every block on the page — and the choice
 * survives navigation. Matches the `groupId` behaviour on AssemblyAI's docs.
 */
export function CodeTabsClient({
  tabs,
  className,
}: {
  tabs: RenderedTab[];
  className?: string;
}) {
  // Always start at 0 so the client's first paint matches the server HTML; the
  // stored preference is applied after mount to avoid a hydration mismatch.
  const [active, setActive] = useState(0);

  useEffect(() => {
    const apply = (lang: string | null) => {
      if (!lang) return;
      const i = tabs.findIndex((t) => t.langKey === lang);
      if (i >= 0) setActive(i);
    };

    apply(window.localStorage.getItem(STORAGE_KEY));

    const onSync = (e: Event) => apply((e as CustomEvent<string>).detail);
    window.addEventListener(SYNC_EVENT, onSync);
    return () => window.removeEventListener(SYNC_EVENT, onSync);
  }, [tabs]);

  function select(i: number) {
    setActive(i);
    const lang = tabs[i]?.langKey;
    if (!lang) return;
    window.localStorage.setItem(STORAGE_KEY, lang);
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: lang }));
  }

  const tab = tabs[active] ?? tabs[0];
  if (!tab) return null;

  return (
    <div
      className={cn(
        "mt-5 overflow-hidden rounded-xl border border-white/10 bg-[#0b1220]",
        className,
      )}
    >
      {/* Chrome, not content — keeps tab labels and "Copy" out of search excerpts. */}
      <div
        data-pagefind-ignore
        className="flex items-center justify-between gap-2 border-b border-white/8 pr-2"
      >
        <div role="tablist" className="flex min-w-0 flex-wrap">
          {tabs.map((t, i) => (
            <button
              key={t.label}
              type="button"
              role="tab"
              aria-selected={i === active}
              onClick={() => select(i)}
              className={cn(
                "-mb-px border-b-2 px-3.5 py-2.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-brand-link/60 focus-visible:outline-none",
                i === active
                  ? "border-brand-link text-white"
                  : "border-transparent text-zinc-500 hover:text-zinc-300",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <CopyButton code={tab.code} className="shrink-0" />
      </div>
      <div
        // Read by scripts/generate-llms.mjs — Shiki's output doesn't record the language.
        data-lang={tab.langKey}
        className={cn("code-surface", tab.lineNumbers && "with-line-numbers")}
        dangerouslySetInnerHTML={{ __html: tab.html }}
      />
    </div>
  );
}
