"use client";

import { SearchDialog } from "@/components/SearchDialog";
import { SITE } from "@/lib/constants";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The top bar carries the four things a reader needs from anywhere. It deliberately
 * mirrors the sidebar's always-open sections plus the two "pick one" sections most
 * people arrive looking for — not an arbitrary subset.
 */
const PRIMARY_NAV = [
  { title: "Quickstart", href: "/getting-started", match: "/getting-started" },
  { title: "Guides", href: "/guides/terminal", match: "/guides" },
  { title: "SDKs", href: "/sdks/python", match: "/sdks" },
  {
    title: "API reference",
    href: "/api-reference/overview",
    match: "/api-reference",
  },
] as const;

/** See DocsSidebar: `trailingSlash: true` means pathnames arrive with a trailing slash. */
function normalize(pathname: string) {
  return pathname !== "/" && pathname.endsWith("/")
    ? pathname.slice(0, -1)
    : pathname;
}

export function DocsHeader() {
  const pathname = normalize(usePathname());

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-header/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[90rem] items-center justify-between gap-6 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-8">
          <div className="flex shrink-0 items-center gap-3">
            <Link href="/" className="inline-flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/symbol.svg"
                alt=""
                width={32}
                height={22}
                className="h-6 w-auto"
              />
              {/* Below sm the full name doesn't fit beside search and Console, so the
                  mark stands alone; sr-only keeps the link's accessible name. */}
              <span className="sr-only text-sm font-semibold tracking-tight text-white sm:not-sr-only">
                Speech Revolutions
              </span>
            </Link>
            {/* A rule rather than a margin: "Docs" labels the site, it isn't part of
                the wordmark, and crowding it against the name read as a typo. */}
            <span aria-hidden className="h-4 w-px bg-white/15" />
            <span className="text-sm text-zinc-400">Docs</span>
          </div>

          <nav className="hidden items-center gap-1 md:flex">
            {PRIMARY_NAV.map((item) => {
              const active =
                pathname === item.match || pathname.startsWith(`${item.match}/`);
              return (
                <Link
                  key={item.title}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-lg px-2.5 py-1.5 text-sm transition-colors",
                    active
                      ? "text-white"
                      : "text-zinc-400 hover:bg-white/5 hover:text-white",
                  )}
                >
                  {item.title}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-3 text-sm">
          <SearchDialog />
          <a
            href={SITE.landingUrl}
            className="hidden text-zinc-400 transition-colors hover:text-white sm:inline"
          >
            Home
          </a>
          <a
            href={SITE.consoleUrl}
            className="rounded-lg bg-white/10 px-3 py-1.5 font-medium text-white transition-colors hover:bg-white/15"
          >
            Console
          </a>
        </div>
      </div>
    </header>
  );
}
