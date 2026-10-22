import { NAV } from "@/content/navigation";
import { SITE } from "@/lib/constants";
import type { MetadataRoute } from "next";
import { execFileSync } from "node:child_process";

// `output: export` needs routes pinned static — the generated file is written at build.
export const dynamic = "force-static";

/**
 * When a page's source last changed in git, or nothing if git can't say.
 *
 * Endpoint pages are rendered from public/openapi.json, so that file is their source. A
 * date nobody can vouch for is worse than none — a crawler that finds it wrong learns to
 * ignore the field — so a shallow clone (every file "changed" at the one commit it has) or a
 * build outside git leaves lastmod off. CI checks out full history for this reason.
 */
function lastModified(href: string): Date | undefined {
  const source = href.startsWith("/api-reference/endpoints/")
    ? "public/openapi.json"
    : `src/app${href === "/" ? "" : href}/page.tsx`;
  try {
    const shallow = execFileSync("git", ["rev-parse", "--is-shallow-repository"], {
      encoding: "utf8",
    }).trim();
    if (shallow === "true") return undefined;
    const iso = execFileSync("git", ["log", "-1", "--format=%cI", "--", source], {
      encoding: "utf8",
    }).trim();
    return iso ? new Date(iso) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Derived from the sidebar rather than hand-maintained: a page that isn't in `NAV`
 * isn't linked from anywhere, so it shouldn't be advertised either.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = `https://${SITE.docsDomain}`;

  return NAV.flatMap((section) =>
    section.items.map((item) => ({
      // `trailingSlash: true` — match the canonical form exactly or the two compete.
      url: item.href === "/" ? `${base}/` : `${base}${item.href}/`,
      lastModified: lastModified(item.href),
      changeFrequency: "weekly" as const,
      // The entry points people land on rank above the long tail of guides.
      priority:
        item.href === "/"
          ? 1
          : section.title === "Get started" || section.title === "API reference"
            ? 0.9
            : 0.7,
    })),
  );
}
