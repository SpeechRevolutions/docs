/**
 * JSON-LD for the docs site.
 *
 * Two audiences read this and neither reads the prose: search engines building a knowledge
 * panel, and the crawlers behind assistants deciding what this company is and whether its
 * API can be described from memory. Both are currently guessing from the HTML.
 *
 * Every value here has to be independently true — structured data is a claim in a machine
 * format, and a wrong one is worse than a missing one because nothing renders it for a human
 * to catch. Pricing comes from the same constant the pages render.
 */

import { PRICING, SITE } from "@/lib/constants";

const ORG_ID = `https://${SITE.domain}/#organization`;
const SITE_ID = `https://${SITE.docsDomain}/#website`;

export function docsJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORG_ID,
        name: SITE.name,
        url: SITE.landingUrl,
        description:
          "Batch speech-to-text API with speaker diarization and word-level timestamps.",
        sameAs: [
          "https://github.com/SpeechRevolutions",
          "https://pypi.org/project/speechrevolutions/",
          "https://www.npmjs.com/package/speechrevolutions",
          "https://www.nuget.org/packages/SpeechRevolutions",
        ],
      },
      {
        "@type": "WebSite",
        "@id": SITE_ID,
        url: `https://${SITE.docsDomain}`,
        name: `${SITE.name} Docs`,
        description:
          "API reference, SDK guides, and quickstarts for the Speech Revolutions speech-to-text API.",
        publisher: { "@id": ORG_ID },
        inLanguage: "en",
      },
      {
        // The product the docs document. `WebAPI` is still pending on schema.org, so this is
        // a SoftwareApplication carrying the API's own machine-readable description.
        "@type": "SoftwareApplication",
        "@id": `https://${SITE.domain}/#api`,
        name: `${SITE.name} API`,
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Any",
        url: SITE.apiBase,
        documentation: `https://${SITE.docsDomain}`,
        provider: { "@id": ORG_ID },
        featureList: [
          "Batch speech-to-text transcription",
          "Speaker diarization",
          "Word-level timestamps",
          "Automatic language detection across 99+ languages",
          "Output as JSON, TXT, SRT, VTT, DOCX or PDF",
          "Webhooks and server-sent progress events",
        ],
        offers: {
          "@type": "Offer",
          price: PRICING.standardPerMinute,
          priceCurrency: "USD",
          // Per minute of audio, which is the unit the pricing page quotes.
          unitText: "audio minute",
          url: `${SITE.landingUrl}/pricing`,
        },
        softwareHelp: {
          "@type": "CreativeWork",
          url: `https://${SITE.docsDomain}/openapi.json`,
          encodingFormat: "application/json",
          name: "OpenAPI 3.1 specification",
        },
      },
    ],
  };
}

/** A single docs page, for the pages that carry their own heading and description. */
export function techArticleJsonLd(title: string, description: string, path: string) {
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: title,
    description,
    url: `https://${SITE.docsDomain}${path}`,
    isPartOf: { "@id": SITE_ID },
    publisher: { "@id": ORG_ID },
    inLanguage: "en",
  };
}
