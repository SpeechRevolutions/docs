import "server-only";

import { createHighlighter, type Highlighter } from "shiki";

/**
 * Languages actually used by code samples in `src/app`. Keep this list tight —
 * every entry is a grammar loaded at build time.
 */
const LANGS = [
  "bash",
  "csharp",
  "go",
  "html",
  "json",
  "python",
  "sql",
  "tsx",
  "typescript",
  "xml",
] as const;

const THEMES = {
  light: "github-light-default",
  dark: "github-dark-default",
} as const;

/**
 * One highlighter for the whole build. `createHighlighter` loads WASM plus every
 * grammar and theme, so creating it per code block would cost ~30x on a 31-page build.
 */
let highlighterPromise: Promise<Highlighter> | undefined;

function getHighlighter() {
  highlighterPromise ??= createHighlighter({
    themes: Object.values(THEMES),
    langs: [...LANGS],
  });
  return highlighterPromise;
}

type Lang = (typeof LANGS)[number] | "plaintext";

/** Aliases used in page source, plus the labels `CodeTabs` falls back to. */
const ALIASES: Record<string, Lang> = {
  ts: "typescript",
  js: "typescript",
  javascript: "typescript",
  node: "typescript",
  react: "tsx",
  jsx: "tsx",
  py: "python",
  python: "python",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  curl: "bash",
  golang: "go",
  "c#": "csharp",
  cs: "csharp",
  text: "plaintext",
  txt: "plaintext",
};

/**
 * Resolve a Shiki language id from an explicit `language` prop, falling back to the
 * tab label. Labels in the wild look like "Python", "cURL", "After — Speech Revolutions (Python)",
 * so we match the first known token rather than the whole string.
 */
export function resolveLang(language?: string, label?: string): Lang {
  for (const raw of [language, label]) {
    if (!raw) continue;
    const key = raw.trim().toLowerCase();
    if (ALIASES[key]) return ALIASES[key];
    if ((LANGS as readonly string[]).includes(key)) return key as Lang;

    // "After — Speech Revolutions (Python)" → python
    for (const token of key.split(/[^a-z#+]+/).filter(Boolean)) {
      if (ALIASES[token]) return ALIASES[token];
      if ((LANGS as readonly string[]).includes(token)) return token as Lang;
    }
  }
  return "plaintext";
}

/**
 * Highlight at build time and return HTML. Nothing from Shiki reaches the browser —
 * every page is prerendered, so this runs only during `next build`.
 */
export async function highlight(code: string, lang: Lang): Promise<string> {
  const highlighter = await getHighlighter();
  return highlighter.codeToHtml(code.trimEnd(), {
    lang,
    themes: THEMES,
    // Emit dark inline and keep `--shiki-light` vars alongside, so a future light
    // theme is a CSS change rather than a re-highlight.
    defaultColor: "dark",
    cssVariablePrefix: "--shiki-",
  });
}

/** Line numbers are noise on shell transcripts — Deepgram omits them there too. */
export function showsLineNumbers(lang: Lang): boolean {
  return lang !== "bash" && lang !== "plaintext";
}
