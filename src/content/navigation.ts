export type NavItem = {
  title: string;
  href: string;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

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
    title: "Guides",
    items: [
      { title: "Terminal & cURL", href: "/guides/terminal" },
      { title: "Live progress", href: "/guides/live-progress" },
      { title: "Timestamps", href: "/guides/timestamps" },
      { title: "Speaker diarization", href: "/guides/diarization" },
      { title: "Output formats & subtitles", href: "/guides/output-formats" },
      { title: "Features & formats", href: "/guides/features" },
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
    title: "SDKs",
    items: [
      { title: "Python", href: "/sdks/python" },
      { title: "JavaScript", href: "/sdks/javascript" },
      { title: "Go", href: "/sdks/go" },
      { title: "C#", href: "/sdks/csharp" },
    ],
  },
  {
    title: "API reference",
    items: [
      { title: "Overview", href: "/api-reference/overview" },
      { title: "Upload (SDK)", href: "/api-reference/upload" },
      { title: "Transcribe (cURL)", href: "/api-reference/transcribe" },
      { title: "Jobs", href: "/api-reference/jobs" },
      { title: "Benchmarks", href: "/benchmarks" },
    ],
  },
];
