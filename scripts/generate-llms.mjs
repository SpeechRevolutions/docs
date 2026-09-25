/**
 * Post-build: emit the agent-readable mirror of the docs.
 *
 *   out/<route>.md   clean Markdown for any page (append `.md` to its URL)
 *   out/llms.txt     an index of every page, with an instruction preamble
 *
 * Both are conventions our competitors ship (developers.deepgram.com/llms.txt,
 * assemblyai.com/docs/llms.txt) and both are read by coding agents writing
 * integrations against our API. Runs over the exported HTML, so it can never
 * drift from what the site actually renders.
 */
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { parse } from "node-html-parser";
import TurndownService from "turndown";

const OUT = new URL("../out/", import.meta.url).pathname;
const SITE = "https://docs.speechrevolutions.com";
// Deliberately free of Markdown-significant characters so Turndown passes it through.
const PLACEHOLDER = "@@SRCODE";

/** Every `<route>/index.html` under out/, as a site-root route. */
async function* pages(dir = OUT) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "_next") continue;
      yield* pages(path);
    } else if (entry.name === "index.html") {
      const rel = relative(OUT, dir).replace(/\\/g, "/");
      yield { file: path, route: rel === "" ? "/" : `/${rel}` };
    }
  }
}

const ENTITIES = {
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
  "&amp;": "&",
};

function decode(s) {
  // `&amp;` last, so "&amp;lt;" doesn't decode twice.
  return s.replace(/&(lt|gt|quot|#39|nbsp|amp);/g, (m) => ENTITIES[m]);
}

/**
 * Recover the original source from Shiki's markup.
 *
 * Done on the HTML string rather than through a DOM: `<pre>` is a raw-text element,
 * so parsers either refuse to descend into it or drop its children on rewrite. The
 * markup here is machine-generated and shallow, which makes this safe.
 */
function extractCode(inner) {
  const lines = inner.split(/<span class="line">/).slice(1);
  const text = lines.length
    ? lines
        // Each segment already carries the newline that separated it from the next
        // line span; strip it or joining doubles every break. An empty segment is a
        // genuinely blank line and must survive.
        .map((seg) => seg.replace(/<[^>]+>/g, "").replace(/\n+$/, ""))
        .join("\n")
    : inner.replace(/<[^>]+>/g, "");
  return decode(text).replace(/\s+$/, "");
}

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
});

// Callouts carry meaning that only the styling expresses on the page.
turndown.addRule("callout", {
  filter: (node) => node.nodeName === "DIV" && node.hasAttribute("data-callout"),
  replacement: (content, node) => {
    const title = node.getAttribute("data-callout-title");
    // The component also renders the title as a paragraph; keep one copy.
    const inner = content.trim().replace(new RegExp(`^${title}\\s*`, "i"), "").trim();
    const body = inner.replace(/^/gm, "> ");
    return `\n\n${title ? `> **${title}**\n>\n` : ""}${body}\n\n`;
  },
});

const index = [];

for await (const { file, route } of pages()) {
  if (route === "/404") continue;
  const html = await readFile(file, "utf8");
  // Default options keep `<pre>` as raw text, which is what we want: `innerHTML`
  // then round-trips the highlighted markup for extractCode to work on.
  const root = parse(html);

  const prose = root.querySelector(".docs-prose");
  if (!prose) continue;

  const title =
    prose.querySelector("h1")?.textContent?.trim() ??
    root.querySelector("title")?.textContent?.trim() ??
    route;
  const description =
    root.querySelector('meta[name="description"]')?.getAttribute("content") ?? "";

  for (const chrome of prose.querySelectorAll("button, svg, [role=tablist]")) {
    chrome.remove();
  }

  // Lift code blocks out to fenced Markdown, leaving a placeholder that survives
  // Turndown untouched, then substitute them back afterwards.
  const blocks = [];
  const withPlaceholders = prose.innerHTML.replace(
    /<div([^>]*\bcode-surface\b[^>]*)>([\s\S]*?)<\/div>/g,
    (_m, attrs, inner) => {
      const lang = /data-lang="([^"]*)"/.exec(attrs)?.[1] ?? "";
      blocks.push(`\`\`\`${lang}\n${extractCode(inner)}\n\`\`\``);
      return `<p>${PLACEHOLDER}${blocks.length - 1}@@</p>`;
    },
  );

  let markdown = turndown.turndown(withPlaceholders);
  markdown = markdown.replace(
    new RegExp(`${PLACEHOLDER}(\\d+)@@`, "g"),
    (_m, i) => blocks[Number(i)],
  );
  markdown = markdown
    // React splits interpolated text with `<!-- -->`; it survives into the HTML.
    .replace(/<!--\s*-->/g, "")
    // Root-relative hrefs are useless once the file is read on its own.
    .replace(/\]\(\/(?!\/)/g, `](${SITE}/`)
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const header = [
    "> ## Documentation index",
    `> Fetch the full index at: ${SITE}/llms.txt`,
    "> Append `.md` to any page URL for its clean Markdown.",
    "",
  ].join("\n");

  const target = route === "/" ? join(OUT, "index.md") : join(OUT, `${route.slice(1)}.md`);
  await writeFile(target, `${header}\n${markdown}\n`, "utf8");

  index.push({ route, title, description });
}

index.sort((a, b) => a.route.localeCompare(b.route));

const llms = [
  "# Speech Revolutions Docs",
  "",
  "> Production speech-to-text API — transcription with speaker diarization,",
  "> word-level timestamps, live progress, and multiple output formats.",
  "",
  "## Instructions for AI agents",
  "",
  "- For clean Markdown of any page, append `.md` to the page URL",
  `- Machine-readable OpenAPI 3.1 description of every public endpoint: ${SITE}/openapi.json`,
  `- The same reference in prose starts at ${SITE}/api-reference/overview/`,
  `- Authenticate with the \`X-API-Key\` header against https://api.speechrevolutions.com`,
  "- SDKs: Python, JavaScript/TypeScript, Go, C#",
  "",
  "## Docs",
  "",
  ...index.map(
    ({ route, title, description }) =>
      `- [${title}](${SITE}${route === "/" ? "/index" : route}.md)${description ? `: ${description}` : ""}`,
  ),
  "",
].join("\n");

await writeFile(join(OUT, "llms.txt"), llms, "utf8");

console.log(`llms.txt + ${index.length} page markdown files written to out/`);
