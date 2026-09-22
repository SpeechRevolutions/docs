"use client";

import { NAV, type NavSection } from "@/content/navigation";
import { SITE } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { ChevronRight, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

/**
 * `trailingSlash: true` (required by the S3/CloudFront export) makes `usePathname()`
 * return "/guides/timestamps/", while nav hrefs are written without the slash. Compare
 * normalised or nothing ever matches — no active link, no auto-expand.
 */
function normalize(pathname: string) {
  return pathname !== "/" && pathname.endsWith("/")
    ? pathname.slice(0, -1)
    : pathname;
}

function sectionContains(section: NavSection, pathname: string) {
  return section.items.some((item) => item.href === normalize(pathname));
}

/** Open unless the section opts into collapsing and the reader isn't inside it. */
function initialOpenState(pathname: string) {
  return Object.fromEntries(
    NAV.map((s) => [s.title, !s.collapsible || sectionContains(s, pathname)]),
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = normalize(usePathname());
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    initialOpenState(pathname),
  );

  // Navigating into a collapsed section (via a link in the body, or a fresh load)
  // must reveal where you landed. Only ever forces open — a section the reader
  // opened by hand stays open.
  useEffect(() => {
    setOpen((prev) => {
      const target = NAV.find((s) => sectionContains(s, pathname));
      if (!target || prev[target.title]) return prev;
      return { ...prev, [target.title]: true };
    });
  }, [pathname]);

  const toggle = useCallback(
    (title: string) => setOpen((prev) => ({ ...prev, [title]: !prev[title] })),
    [],
  );

  return (
    <nav className="space-y-5">
      {NAV.map((section) => {
        const isOpen = open[section.title] ?? true;
        const panelId = `nav-${section.title.replace(/\W+/g, "-").toLowerCase()}`;

        return (
          <div key={section.title}>
            {/* Chevron sits at the trailing edge so every section label and every
                item shares one left edge, collapsible or not. */}
            {section.collapsible ? (
              <button
                type="button"
                onClick={() => toggle(section.title)}
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-zinc-500 uppercase transition-colors hover:text-zinc-300 focus-visible:ring-2 focus-visible:ring-brand-link/60 focus-visible:outline-none"
              >
                {section.title}
                <ChevronRight
                  aria-hidden
                  className={cn(
                    "h-3 w-3 shrink-0 transition-transform duration-150",
                    isOpen && "rotate-90",
                  )}
                />
              </button>
            ) : (
              <p className="px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-zinc-500 uppercase">
                {section.title}
              </p>
            )}

            {isOpen && (
              <ul id={panelId} className="mt-1.5 space-y-0.5">
                {section.items.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "block rounded-md px-3 py-1 text-[15px] leading-6 transition-colors",
                          active
                            ? "bg-brand-500/15 font-medium text-brand-link"
                            : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200",
                        )}
                      >
                        {item.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}

export function DocsSidebar() {
  const [open, setOpen] = useState(false);

  // A drawer that traps you is worse than no drawer.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* z-20, under the header's z-30: the search dialog renders inside the header's
          stacking context, so anything above z-30 here would sit on top of it. */}
      <button
        type="button"
        className="fixed right-4 bottom-4 z-20inline-flex items-center gap-2 rounded-full border border-white/15 bg-surface-900 px-4 py-2.5 text-sm text-white shadow-lg lg:hidden"
        onClick={() => setOpen(true)}
        aria-expanded={open}
      >
        <Menu className="h-4 w-4" aria-hidden />
        Menu
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(20rem,88vw)] flex-col border-r border-white/10 bg-page">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
              <span className="text-sm font-semibold text-white">Docs</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="thin-scrollbar flex-1 overflow-y-auto px-3 py-5">
              <NavLinks onNavigate={() => setOpen(false)} />
            </div>
            <div className="border-t border-white/10 p-4">
              <a
                href={SITE.consoleUrl}
                className="block rounded-lg bg-brand-500/15 px-3 py-2 text-center text-sm font-medium text-brand-link"
              >
                Get API key
              </a>
            </div>
          </aside>
        </div>
      )}

      <aside className="thin-scrollbar sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 overflow-y-auto border-r border-white/10 px-4 py-6 lg:block">
        <NavLinks />
      </aside>
    </>
  );
}
