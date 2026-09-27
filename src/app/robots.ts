import { SITE } from "@/lib/constants";
import type { MetadataRoute } from "next";

// `output: export` needs routes pinned static — the generated file is written at build.
export const dynamic = "force-static";

/*
 * Assistant crawlers are named explicitly, although `*` already allows them.
 *
 * Three reasons. Some of these agents look for their own name before falling back to `*`,
 * and a named Allow is the unambiguous answer. A future blanket rule added to `*` cannot
 * silently shut them out, because the specific rule wins. And the file becomes a statement
 * of intent: we WANT to be read by the things that answer questions about speech-to-text
 * APIs, which for a company nobody can find by name yet is a channel, not a risk.
 *
 * Split into the two kinds on purpose. The first group trains and answers; the second only
 * fetches a page when a user has asked about it in a live conversation, which is the traffic
 * we most want. Both are allowed — the distinction is here so that if the policy ever
 * changes, the line to draw is already drawn.
 */
const TRAINING_AND_ANSWER_AGENTS = [
  "GPTBot",
  "ClaudeBot",
  "anthropic-ai",
  "PerplexityBot",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
  "Bytespider",
  "Amazonbot",
  "meta-externalagent",
];

/** Fetch-on-demand agents: they retrieve a page because a user is asking about it now. */
const USER_INITIATED_AGENTS = [
  "ChatGPT-User",
  "OAI-SearchBot",
  "Claude-User",
  "Claude-SearchBot",
  "Perplexity-User",
];

export default function robots(): MetadataRoute.Robots {
  const base = `https://${SITE.docsDomain}`;

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
      { userAgent: TRAINING_AND_ANSWER_AGENTS, allow: "/" },
      { userAgent: USER_INITIATED_AGENTS, allow: "/" },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
