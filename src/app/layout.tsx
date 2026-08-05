import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { DocsShell } from "@/components/DocsShell";
import { SITE } from "@/lib/constants";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans`}>
        <DocsShell>{children}</DocsShell>
      </body>
    </html>
  );
}
