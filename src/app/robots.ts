import { SITE } from "@/lib/constants";
import type { MetadataRoute } from "next";

// `output: export` needs routes pinned static — the generated file is written at build.
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  const base = `https://${SITE.docsDomain}`;

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
