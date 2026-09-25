import { CopyButton } from "@/components/CopyButton";
import { highlight, resolveLang, showsLineNumbers } from "@/lib/highlight";
import { cn } from "@/lib/utils";

type CodeBlockProps = {
  code: string;
  language?: string;
  filename?: string;
  className?: string;
};

/**
 * Server component: highlighting happens during `next build`, so the browser gets
 * plain pre-rendered HTML and no highlighter bundle.
 */
export async function CodeBlock({
  code,
  language,
  filename,
  className,
}: CodeBlockProps) {
  const lang = resolveLang(language, filename);
  const html = await highlight(code, lang);

  return (
    <div
      className={cn(
        "group relative mt-5 overflow-hidden rounded-lg border border-hairline/10 bg-code-bg",
        className,
      )}
    >
      {/* Chrome, not content — keeps "bash"/"Copy" out of search excerpts. */}
      <div
        data-pagefind-ignore
        className="flex items-center justify-between border-b border-hairline/8 px-4 py-2"
      >
        <span className="font-mono text-xs text-zinc-500">
          {filename ?? language ?? lang}
        </span>
        <CopyButton code={code} />
      </div>
      <div
        // Read by scripts/generate-llms.mjs — Shiki's output doesn't record the language.
        data-lang={lang}
        className={cn("code-surface", showsLineNumbers(lang) && "with-line-numbers")}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
