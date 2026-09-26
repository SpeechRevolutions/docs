"use client";

import { SITE } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, Copy, ExternalLink, FileText } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** `trailingSlash: true` — see DocsSidebar. "/" maps to /index.md (scripts/generate-llms.mjs). */
function markdownPath(pathname: string) {
  const route = pathname !== "/" && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  return route === "/" ? "/index.md" : `${route}.md`;
}

/**
 * "Copy page" for readers who paste docs into an assistant, plus the ways to hand the page
 * to one directly — the same control AssemblyAI and ElevenLabs put at the top of each page.
 * The Markdown comes from the `.md` twin every page gets at build time.
 */
export function PageActions() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const mdPath = markdownPath(pathname);
  const mdUrl = `https://${SITE.docsDomain}${mdPath}`;
  const prompt = `Read ${mdUrl} so I can ask questions about it.`;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function copyPage() {
    setOpen(false);
    let text: string | null = null;
    try {
      const res = await fetch(mdPath);
      // Anything but HTML: the dev server answers a missing .md with its HTML 404 page, and
      // S3 may label the real file text/markdown, text/plain or octet-stream.
      if (res.ok && !(res.headers.get("content-type") ?? "").includes("html")) {
        text = await res.text();
      }
    } catch {}
    // The .md twins are written by the production build; under `next dev` they don't exist,
    // so fall back to the rendered text rather than copying nothing.
    if (text === null) {
      const body = document.querySelector<HTMLElement>("[data-pagefind-body]");
      text = `${document.title}\n${location.href}\n\n${body?.innerText ?? ""}`;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  const item =
    "flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-sm text-zinc-300 no-underline transition-colors hover:bg-hairline/5 hover:text-fg hover:no-underline";

  return (
    <div ref={menuRef} className="relative inline-flex" data-pagefind-ignore>
      <button
        type="button"
        onClick={copyPage}
        className="inline-flex h-8 items-center gap-2 rounded-l-md border border-hairline/15 px-3 text-sm text-zinc-300 transition-colors hover:bg-hairline/5 hover:text-fg"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied" : "Copy page"}
      </button>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="More ways to use this page"
        className="inline-flex h-8 w-8 items-center justify-center rounded-r-md border border-l-0 border-hairline/15 text-zinc-400 transition-colors hover:bg-hairline/5 hover:text-fg"
      >
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute top-full right-0 z-20 mt-1.5 w-64 rounded-lg border border-hairline/10 bg-surface-850 p-1.5 shadow-xl"
        >
          <button type="button" role="menuitem" onClick={copyPage} className={item}>
            <Copy className="h-4 w-4 shrink-0 text-zinc-500" />
            <span>
              <span className="block text-fg">Copy page</span>
              <span className="block text-xs text-zinc-500">As Markdown, for an LLM</span>
            </span>
          </button>
          <a role="menuitem" href={mdPath} target="_blank" rel="noopener noreferrer" className={item}>
            <FileText className="h-4 w-4 shrink-0 text-zinc-500" />
            <span>
              <span className="block text-fg">View as Markdown</span>
              <span className="block text-xs text-zinc-500">This page as plain text</span>
            </span>
          </a>
          <a
            role="menuitem"
            href={`https://chatgpt.com/?q=${encodeURIComponent(prompt)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={item}
          >
            <ExternalLink className="h-4 w-4 shrink-0 text-zinc-500" />
            <span>
              <span className="block text-fg">Open in ChatGPT</span>
              <span className="block text-xs text-zinc-500">Ask questions about this page</span>
            </span>
          </a>
          <a
            role="menuitem"
            href={`https://claude.ai/new?q=${encodeURIComponent(prompt)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={item}
          >
            <ExternalLink className="h-4 w-4 shrink-0 text-zinc-500" />
            <span>
              <span className="block text-fg">Open in Claude</span>
              <span className="block text-xs text-zinc-500">Ask questions about this page</span>
            </span>
          </a>
        </div>
      ) : null}
    </div>
  );
}
