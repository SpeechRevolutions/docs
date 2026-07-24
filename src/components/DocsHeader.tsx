import { SITE } from "@/lib/constants";
import Link from "next/link";

export function DocsHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-header/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[90rem] items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="inline-flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/symbol.svg"
              alt=""
              width={32}
              height={22}
              className="h-6 w-auto"
            />
            <span className="text-sm font-semibold tracking-tight text-white">
              Speech Revolutions
              <span className="ml-2 font-normal text-zinc-500">Docs</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-4 text-sm text-zinc-400 md:flex">
            <Link href="/getting-started" className="hover:text-white">
              Quickstart
            </Link>
            <Link href="/api-reference/overview" className="hover:text-white">
              API
            </Link>
            <Link href="/sdks/python" className="hover:text-white">
              SDKs
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <a
            href={SITE.landingUrl}
            className="hidden text-zinc-400 hover:text-white sm:inline"
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
