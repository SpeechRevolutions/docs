import type { Metadata } from "next";
import { Archivo, Geist, Geist_Mono } from "next/font/google";
import { DocsShell } from "@/components/DocsShell";
import { SITE } from "@/lib/constants";
import { docsJsonLd } from "@/lib/structured-data";
import { ThemeScript } from "@/components/theme/ThemeScript";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** Display face for headings — see landing/src/app/layout.tsx for the pairing. */
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  // Required for canonical/OG URLs to resolve to absolute addresses in a static export.
  metadataBase: new URL(`https://${SITE.docsDomain}`),
  title: {
    default: "Speech Revolutions Docs",
    template: "%s · Speech Revolutions Docs",
  },
  description:
    "API reference, SDK guides, and quickstarts for the Speech Revolutions speech-to-text API.",
  applicationName: SITE.name,
  // Resolved per-route against metadataBase, so every page self-canonicalises.
  alternates: { canonical: "./" },
  openGraph: {
    type: "website",
    siteName: `${SITE.name} Docs`,
    url: "./",
    title: "Speech Revolutions Docs",
    description:
      "API reference, SDK guides, and quickstarts for the Speech Revolutions speech-to-text API.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Speech Revolutions Docs",
    description:
      "API reference, SDK guides, and quickstarts for the Speech Revolutions speech-to-text API.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-snippet": -1, "max-image-preview": "large" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Font variables belong on <html>: Tailwind's @theme emits --font-sans on
    // :root, and a var() there cannot see a property defined on a descendant.
    // On <body> they resolved to nothing and the page fell back to system fonts.
    // data-theme is the SSR default; ThemeScript overwrites it before paint from the stored
    // choice or the device setting, hence suppressHydrationWarning.
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${archivo.variable}`}
      data-theme="dark"
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
        {/*
          RFC 8631: the standard way an HTML page advertises the machine-readable
          description of the API it documents. Without it, a client has to guess at
          /openapi.json — which is exactly what an agent-readiness scan reported us as
          lacking while the file sat there, served and valid.
        */}
        <link rel="service-desc" type="application/json" href="/openapi.json" />
        <link rel="alternate" type="text/plain" href="/llms.txt" title="llms.txt" />
      </head>
      <body className="font-sans">
        {/*
          JSON-LD for search engines and for the crawlers behind assistants. It is inert to
          the page — no styles, no hydration — and is the only machine-readable statement of
          what this company is, what the API does and what it costs.
        */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(docsJsonLd()) }}
        />
        <DocsShell>{children}</DocsShell>
      </body>
    </html>
  );
}
