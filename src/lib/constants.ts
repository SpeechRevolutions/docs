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

export const PRICING = {
  standardPerMinute: 0.003,
} as const;

/**
 * Request limits, mirroring the server. Keep in step with
 * user_cluster/configs/constants.py:
 *   TRANSCRIBE_MAX_UPLOAD_BYTES = 200 MB  (cURL / transcribe path)
 *   MAX_UPLOAD_BYTES            = 5 GB    (SDK upload path)
 */
export const LIMITS = {
  apiUploadMax: "200 MB",
  sdkUploadMax: "5 GB",
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
  { endpoint: "POST /api/v1/upload", perMinute: 120 },
  { endpoint: "POST /api/v1/upload/progress", perMinute: 600 },
  { endpoint: "POST /api/v1/transcribe", perMinute: 120 },
  { endpoint: "GET /api/v1/jobs, /api/v1/jobs/{id}", perMinute: 120 },
  { endpoint: "GET /api/v1/jobs/{id}/stream", perMinute: 120 },
  { endpoint: "POST /api/v1/jobs/check-failed", perMinute: 60 },
  { endpoint: "POST /api/v1/jobs/cancel", perMinute: 30 },
] as const;
