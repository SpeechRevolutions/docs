"use client";

import { cn } from "@/lib/utils";
import { FileText, Loader2, Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type Result = {
  url: string;
  title: string;
  excerpt: string;
};

type PagefindResult = {
  data: () => Promise<{
    url: string;
    excerpt: string;
    meta?: { title?: string };
  }>;
};

type Pagefind = {
  search: (q: string) => Promise<{ results: PagefindResult[] }>;
  init?: () => Promise<void>;
};

/**
 * Pagefind ships as a static bundle produced *after* `next build`, so it can only be
 * loaded at runtime from its emitted path. The comment keeps the bundler from trying
 * to resolve it at compile time (it does not exist yet, and it must not be inlined).
 */
async function loadPagefind(): Promise<Pagefind | null> {
  try {
    // Held in a variable so TypeScript doesn't try to resolve a module that only
    // exists after `pagefind` has run over `out/`.
    const path = "/pagefind/pagefind.js";
    const mod = (await import(/* webpackIgnore: true */ path)) as Pagefind;
    await mod.init?.();
    return mod;
  } catch {
    // `next dev` has no index — search is a production-build feature.
    return null;
  }
}

export function SearchDialog() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [cursor, setCursor] = useState(0);

  const pagefind = useRef<Pagefind | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    restoreFocus.current?.focus();
  }, []);

  // ⌘K / Ctrl+K anywhere; bare "/" only when not already typing somewhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        restoreFocus.current = document.activeElement as HTMLElement;
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Deep link from the marketing site: docs.../?q=diarization opens straight into results.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (!q) return;
    setQuery(q);
    setOpen(true);
    // Drop the parameter so a refresh or share doesn't reopen the dialog.
    const url = new URL(window.location.href);
    url.searchParams.delete("q");
    window.history.replaceState({}, "", url);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const term = query.trim();

    if (term.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = window.setTimeout(async () => {
      pagefind.current ??= await loadPagefind();
      if (!pagefind.current) {
        if (!cancelled) {
          setUnavailable(true);
          setLoading(false);
        }
        return;
      }

      const search = await pagefind.current.search(term);
      const top = await Promise.all(search.results.slice(0, 8).map((r) => r.data()));
      if (cancelled) return;

      setResults(
        top.map((d) => ({
          url: d.url,
          title: d.meta?.title ?? d.url,
          excerpt: d.excerpt,
        })),
      );
      setCursor(0);
      setLoading(false);
    }, 150);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, open]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter" && results[cursor]) {
      e.preventDefault();
      window.location.href = results[cursor].url;
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          restoreFocus.current = document.activeElement as HTMLElement;
          setOpen(true);
        }}
        className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-zinc-500 transition-colors hover:border-white/20 hover:text-zinc-300"
        aria-label="Search docs"
      >
        <Search className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">Search</span>
        <kbd className="ml-4 hidden rounded border border-white/10 px-1.5 py-0.5 font-sans text-[10px] text-zinc-500 sm:inline">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Search docs">
          <button
            type="button"
            aria-label="Close search"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={close}
          />
          <div className="absolute inset-x-0 top-[10vh] mx-auto w-[min(40rem,92vw)] overflow-hidden rounded-xl border border-white/10 bg-surface-900 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-white/10 px-4">
              <Search className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search the docs…"
                className="flex-1 bg-transparent py-3.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
              />
              {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-zinc-500" aria-hidden />}
              <button
                type="button"
                onClick={close}
                aria-label="Close search"
                className="shrink-0 rounded-md p-1 text-zinc-500 hover:text-zinc-300"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2">
              {unavailable ? (
                <p className="px-3 py-6 text-center text-sm text-zinc-500">
                  Search index is generated at build time — run{" "}
                  <code className="text-zinc-400">npm run build</code> to use it locally.
                </p>
              ) : results.length > 0 ? (
                <ul>
                  {results.map((r, i) => (
                    <li key={r.url}>
                      <a
                        href={r.url}
                        onMouseEnter={() => setCursor(i)}
                        className={cn(
                          "flex gap-3 rounded-lg px-3 py-2.5 transition-colors",
                          i === cursor ? "bg-brand-500/15" : "hover:bg-white/5",
                        )}
                      >
                        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-zinc-600" aria-hidden />
                        <span className="min-w-0">
                          <span
                            className={cn(
                              "block text-sm font-medium",
                              i === cursor ? "text-brand-link" : "text-zinc-200",
                            )}
                          >
                            {r.title}
                          </span>
                          <span
                            className="mt-0.5 block text-xs leading-5 text-zinc-500 [&_mark]:bg-transparent [&_mark]:text-zinc-300"
                            dangerouslySetInnerHTML={{ __html: r.excerpt }}
                          />
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-3 py-6 text-center text-sm text-zinc-600">
                  {query.trim().length < 2
                    ? "Type at least two characters."
                    : loading
                      ? "Searching…"
                      : `No results for “${query.trim()}”.`}
                </p>
              )}
            </div>

            <div className="flex items-center gap-4 border-t border-white/10 px-4 py-2 text-[11px] text-zinc-600">
              <span>↑↓ navigate</span>
              <span>↵ open</span>
              <span>esc close</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
