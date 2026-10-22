import type { Metadata } from "next";
import { SITE } from "@/lib/constants";

/*
 * Share-card fields for one page.
 *
 * Next does not derive og:title or og:description from a page's own title and description,
 * and a child's `openGraph` REPLACES the layout's rather than merging with it. So while the
 * layout alone set them, every docs page — the Deepgram migration guide, the diarization
 * guide, each endpoint — unfurled in Slack and in AI answer cards as the same "Speech
 * Revolutions Docs" with the same one-line blurb. Every page now goes through this, which
 * restates the layout's card (type, site name, image) with the page's own title and text.
 */
export const OG_IMAGE = {
  url: "/brand/og-card.png",
  width: 1200,
  height: 630,
  alt: "Speech Revolutions — batch speech-to-text API documentation",
};

type PageMeta = Omit<Metadata, "title" | "description"> & {
  title: string | { absolute: string };
  description: string;
};

export function docMeta(meta: PageMeta): Metadata {
  // A bare string gets the layout's title template, so the card says what the tab says.
  const title =
    typeof meta.title === "string" ? `${meta.title} · Speech Revolutions Docs` : meta.title.absolute;
  return {
    ...meta,
    openGraph: {
      type: "website",
      siteName: `${SITE.name} Docs`,
      url: "./",
      title,
      description: meta.description,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: meta.description,
      images: [OG_IMAGE.url],
    },
  };
}
