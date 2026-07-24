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
