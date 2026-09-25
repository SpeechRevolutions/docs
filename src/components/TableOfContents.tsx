"use client";

import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Heading = { id: string; text: string; level: 2 | 3 };

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/**
 * Headings live inside hand-written page TSX, so there is no build-time list of them.
 * We read them from the rendered DOM instead and assign ids where the author didn't.
 */
export function TableOfContents() {
  const pathname = usePathname();
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    const nodes = Array.from(
      document.querySelectorAll<HTMLHeadingElement>(".docs-prose h2, .docs-prose h3"),
    );

    const seen = new Set<string>();
    const found = nodes.map((node) => {
      if (!node.id) {
        // Two sections can legitimately share a title ("Request", "Errors"), so
        // de-duplicate rather than emit colliding ids.
        const base = slugify(node.textContent ?? "") || "section";
        let id = base;
        for (let i = 2; seen.has(id); i++) id = `${base}-${i}`;
        node.id = id;
      }
      seen.add(node.id);
      return {
        id: node.id,
        text: node.textContent ?? "",
        level: node.tagName === "H3" ? (3 as const) : (2 as const),
      };
    });

    setHeadings(found);
    setActive(found[0]?.id ?? "");

    // Ids are assigned here rather than in the HTML, so a deep link that arrives
    // before hydration finds nothing to scroll to. Resolve it once, now.
    const hash = decodeURIComponent(window.location.hash.slice(1));
    if (hash) document.getElementById(hash)?.scrollIntoView();

    if (nodes.length === 0) return;

    // Trigger on a band near the top of the viewport so the highlighted entry is the
    // section you are reading, not whichever heading happens to be on screen.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 },
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [pathname]);

  if (headings.length < 2) return null;

  return (
    <aside className="thin-scrollbar sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 overflow-y-auto py-10 pr-6 xl:block">
      <p className="text-[11px] font-semibold tracking-[0.14em] text-zinc-500 uppercase">
        On this page
      </p>
      <ul className="mt-3 space-y-0.5 border-l border-hairline/10">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              aria-current={active === h.id ? "location" : undefined}
              onClick={() => setActive(h.id)}
              className={cn(
                "-ml-px block border-l py-1 text-sm transition-colors",
                h.level === 3 ? "pl-6" : "pl-4",
                active === h.id
                  ? "border-brand-link text-brand-link"
                  : "border-transparent text-zinc-500 hover:text-zinc-300",
              )}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}
