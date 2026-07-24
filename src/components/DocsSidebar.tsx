"use client";

import { NAV } from "@/content/navigation";
import { SITE } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-8">
      {NAV.map((section) => (
        <div key={section.title}>
          <p className="px-3 text-[11px] font-semibold tracking-[0.14em] text-zinc-500 uppercase">
            {section.title}
          </p>
          <ul className="mt-2 space-y-0.5">
            {section.items.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "block rounded-lg px-3 py-1.5 text-sm transition-colors",
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
        </div>
      ))}
    </nav>
  );
}

export function DocsSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="fixed right-4 bottom-4 z-40 inline-flex items-center gap-2 rounded-full border border-white/15 bg-surface-900 px-4 py-2.5 text-sm text-white shadow-lg lg:hidden"
        onClick={() => setOpen(true)}
      >
        <Menu className="h-4 w-4" />
        Menu
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
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
                className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-5">
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

      <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 overflow-y-auto border-r border-white/10 px-4 py-8 lg:block">
        <NavLinks />
      </aside>
    </>
  );
}
