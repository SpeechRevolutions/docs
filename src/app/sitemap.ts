import { NAV } from "@/content/navigation";
import { SITE } from "@/lib/constants";
import type { MetadataRoute } from "next";

// `output: export` needs routes pinned static — the generated file is written at build.
export const dynamic = "force-static";

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
