export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "WSS";

export type NavItem = {
  title: string;
  href: string;
  /** Endpoint pages show their HTTP method as a tag beside the title. */
  method?: HttpMethod;
};

export type NavSection = {
  title: string;
  items: NavItem[];
  /**
   * Collapsed by default, and expanded only when it contains the current page.
   *
   * Set this on "pick the one that applies to you" sections — you migrate from one
   * provider, you use one SDK. Sections read start-to-finish (Get started, Guides,
   * API reference) stay open so the reading path is always visible.
   */
  collapsible?: boolean;
};

/**
 * One entry per operation in public/openapi.json, in the file's order. Written out rather
 * than derived so the sidebar does not ship the 30 KB spec to every browser; lib/openapi.ts
 * fails the build if this list and the spec ever disagree.
 */
export const ENDPOINT_NAV: NavItem[] = [
  { title: "List jobs", href: "/api-reference/endpoints/list-jobs", method: "GET" },
  { title: "Get job", href: "/api-reference/endpoints/get-job", method: "GET" },
  { title: "Stream progress", href: "/api-reference/endpoints/stream-job-progress", method: "GET" },
  { title: "Cancel job", href: "/api-reference/endpoints/cancel-job", method: "POST" },
  { title: "Check failed jobs", href: "/api-reference/endpoints/check-failed-jobs", method: "POST" },
  { title: "Transcribe", href: "/api-reference/endpoints/transcribe", method: "POST" },
];

/*
 * Order and openness follow AssemblyAI, Deepgram and ElevenLabs: every top-level section is
 * always open (a reader scanning for a page should never have to guess which heading hides
 * it), reading order runs from first call to reference to "pick yours" material, and
 * endpoints sit flat in the API reference with their method beside them.
 */
export const NAV: NavSection[] = [
  {
    title: "Get started",
    items: [
      { title: "Introduction", href: "/" },
      { title: "Quickstart", href: "/getting-started" },
      { title: "Authentication", href: "/authentication" },
    ],
  },
  {
    title: "Guides",
    items: [
      { title: "Uploading files", href: "/api-reference/upload" },
      { title: "One-request transcription", href: "/api-reference/transcribe" },
      { title: "Job lifecycle", href: "/api-reference/jobs" },
      { title: "Terminal & cURL", href: "/guides/terminal" },
      { title: "Live progress", href: "/guides/live-progress" },
      { title: "Webhooks", href: "/guides/webhooks" },
      { title: "Timestamps", href: "/guides/timestamps" },
      { title: "Speaker diarization", href: "/guides/diarization" },
      { title: "Output formats & subtitles", href: "/guides/output-formats" },
      { title: "Features & formats", href: "/guides/features" },
    ],
  },
  {
    title: "API reference",
    items: [{ title: "Overview", href: "/api-reference/overview" }, ...ENDPOINT_NAV],
  },
  {
    title: "SDKs",
    items: [
      { title: "Python", href: "/sdks/python" },
      { title: "JavaScript", href: "/sdks/javascript" },
      { title: "Go (Golang)", href: "/sdks/go" },
      { title: "C#", href: "/sdks/csharp" },
    ],
  },
  {
    title: "Migrate",
    items: [
      { title: "Switching STT APIs", href: "/migrate/playbook" },
      { title: "From Deepgram", href: "/migrate/deepgram" },
      { title: "From AssemblyAI", href: "/migrate/assemblyai" },
      { title: "From OpenAI Whisper API", href: "/migrate/openai-whisper" },
      { title: "From ElevenLabs", href: "/migrate/elevenlabs" },
      { title: "From self-hosted Whisper", href: "/migrate/self-hosted-whisper" },
    ],
  },
  {
    title: "Recipes & tutorials",
    items: [
      { title: "Cookbook", href: "/cookbook" },
      { title: "Meeting transcription app", href: "/tutorials/meeting-app" },
      { title: "Batch transcription", href: "/tutorials/batch" },
      { title: "Subtitle generation", href: "/tutorials/subtitles" },
    ],
  },
  {
    title: "Integrations",
    items: [
      { title: "Next.js", href: "/integrations/nextjs" },
      { title: "FastAPI", href: "/integrations/fastapi" },
      { title: "Django", href: "/integrations/django" },
      { title: "Amazon S3", href: "/integrations/s3" },
      { title: "Supabase", href: "/integrations/supabase" },
    ],
  },
  {
    title: "Resources",
    items: [
      { title: "MCP server", href: "/mcp" },
      { title: "Versioning & deprecation", href: "/versioning" },
      { title: "Benchmarks", href: "/benchmarks" },
    ],
  },
];

export type Hub = { path: string; title: string; description: string };

/**
 * Index pages for the URL folders. Crawlers trim a URL back to its folder (Google reported
 * /guides/, /sdks/ and the rest as 404s on 2026-10-28), and a breadcrumb level is only a link
 * when its folder is a page. Each hub lists the NAV pages under its path, so it can't go stale.
 */
export const HUBS: Hub[] = [
  {
    path: "/guides",
    title: "Guides",
    description:
      "How-to guides for the Speech Revolutions API: the terminal, live progress, webhooks, timestamps, speaker diarization and output formats.",
  },
  {
    path: "/api-reference",
    title: "API reference",
    description:
      "The Speech Revolutions REST API: uploading files, one-request transcription, the job lifecycle, and every endpoint.",
  },
  {
    path: "/api-reference/endpoints",
    title: "Endpoints",
    description:
      "Every Speech Revolutions API endpoint, with its parameters, responses and request samples.",
  },
  {
    path: "/sdks",
    title: "SDKs",
    description:
      "Official Speech Revolutions clients for Python, JavaScript, Go and C#.",
  },
  {
    path: "/migrate",
    title: "Migrate",
    description:
      "Move to Speech Revolutions from Deepgram, AssemblyAI, the OpenAI Whisper API, ElevenLabs or self-hosted Whisper.",
  },
  {
    path: "/tutorials",
    title: "Tutorials",
    description:
      "End-to-end builds with the Speech Revolutions API: a meeting transcription app, batch jobs and subtitles.",
  },
  {
    path: "/integrations",
    title: "Integrations",
    description:
      "Use Speech Revolutions with Next.js, FastAPI, Django, Amazon S3 and Supabase.",
  },
];

/** NAV pages that live under a hub's path, in sidebar order. */
export function hubItems(path: string): NavItem[] {
  return NAV.flatMap((s) => s.items).filter((i) =>
    i.href.startsWith(`${path}/`),
  );
}
