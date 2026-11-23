export const SITE = {
  name: "Speech Revolutions",
  domain: "speechrevolutions.com",
  docsDomain: "docs.speechrevolutions.com",
  apiBase: "https://api.speechrevolutions.com",
  consoleUrl:
    process.env.NEXT_PUBLIC_CONSOLE_URL ?? "https://console.speechrevolutions.com",
  landingUrl:
    process.env.NEXT_PUBLIC_LANDING_URL ?? "https://www.speechrevolutions.com",
} as const;

/** Kept in step with landing/src/lib/constants.ts and with what the clusters bill. */
export const PRICING = {
  standardPerMinute: 0.0015,
  standardPerHour: 0.09,
  streamingPerHour: 0.15,
} as const;

/** Batch add-ons, per audio hour, charged only on requests that turn them on. */
export const ADD_ONS = [
  { option: "speaker_labels", name: "Speaker diarization", perHour: 0.02 },
  { option: "custom_vocabulary", name: "Keyterms prompting", perHour: 0.05 },
  { option: "summarize", name: "Summarization", perHour: 0.02 },
  { option: "filter_profanity", name: "Profanity filter", perHour: 0.01 },
] as const;

/**
 * Request limits, mirroring the server. Keep in step with
 * user_cluster/configs/constants.py:
 *   TRANSCRIBE_MAX_UPLOAD_BYTES = 200 MB  (cURL / transcribe path)
 *   MAX_UPLOAD_BYTES            = 5 GB    (SDK upload path)
 *
 * NOTE 2026-09-24: the advertised SDK maximum was raised to 10 GB by decision, and the
 * server still rejects anything over MAX_UPLOAD_BYTES (5 GB). Raise that constant before
 * this number is true, or a 6 GB file is refused by the very API these pages document.
 */
export const LIMITS = {
  apiUploadMax: "200 MB",
  sdkUploadMax: "10 GB",
  jobDeadlineMinutes: 10,
  dataRetentionMinutes: 30,
} as const;

/**
 * Per-key request limits, mirroring the server. Keep in step with
 * user_cluster/server/rate_limit.py (class RateLimit, production values).
 * Publishing a limit the server does not enforce is the same bug as documenting
 * a response field it does not send, so these are the real numbers.
 */
export const RATE_LIMITS = [
  { endpoint: "POST /api/v1/transcribe", perMinute: 120 },
  { endpoint: "GET /api/v1/jobs, /api/v1/jobs/{id}", perMinute: 120 },
  { endpoint: "GET /api/v1/jobs/{id}/stream", perMinute: 120 },
  { endpoint: "POST /api/v1/jobs/check-failed", perMinute: 60 },
  { endpoint: "POST /api/v1/jobs/cancel", perMinute: 30 },
] as const;
