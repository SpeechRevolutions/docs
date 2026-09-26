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
  { title: "Create upload", href: "/api-reference/endpoints/create-upload-job", method: "POST" },
  { title: "Upload heartbeat", href: "/api-reference/endpoints/report-upload-progress", method: "POST" },
  { title: "Complete upload", href: "/api-reference/endpoints/complete-upload", method: "POST" },
  { title: "Start multipart", href: "/api-reference/endpoints/create-multipart-upload", method: "POST" },
  { title: "Complete multipart", href: "/api-reference/endpoints/complete-multipart-upload", method: "POST" },
  { title: "Abort multipart", href: "/api-reference/endpoints/abort-multipart-upload", method: "POST" },
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
      { title: "Go", href: "/sdks/go" },
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
      { title: "Benchmarks", href: "/benchmarks" },
      { title: "Changelog", href: "/changelog" },
    ],
  },
];
