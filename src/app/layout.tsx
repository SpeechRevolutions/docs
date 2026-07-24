import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { DocsShell } from "@/components/DocsShell";
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
  title: {
    default: "Speech Revolutions Docs",
    template: "%s · Speech Revolutions Docs",
  },
  description:
    "API reference, SDK guides, and quickstarts for the Speech Revolutions speech-to-text API.",
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
