import { MethodTag } from "@/components/MethodTag";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Callout({
  title,
  children,
  tone = "info",
}: {
  title?: string;
  children: ReactNode;
  tone?: "info" | "tip" | "warn";
}) {
  return (
    <div
      // Marks the block for the Markdown export, which turns it into a blockquote —
      // the styling alone carries no meaning once the CSS is gone.
      data-callout={tone}
      data-callout-title={title}
      className={cn(
        "mt-6 rounded-lg border px-4 py-3.5 text-[14px] leading-6",
        tone === "info" && "border-brand-500/25 bg-brand-500/[0.06] text-zinc-300",
        tone === "tip" && "border-emerald-600/25 bg-emerald-500/[0.06] text-zinc-300",
        tone === "warn" && "border-amber-500/30 bg-amber-500/[0.07] text-zinc-300",
      )}
    >
      {title && (
        <div
          className={cn(
            "mb-1 text-sm font-medium",
            tone === "info" && "text-brand-link",
            tone === "tip" && "text-emerald-700 dark:text-emerald-400",
            tone === "warn" && "text-amber-700 dark:text-amber-400",
          )}
        >
          {title}
        </div>
      )}
      <div className="[&_p]:mt-0 [&_p]:text-[14px] [&_p]:leading-6 [&_p]:text-zinc-300">
        {children}
      </div>
    </div>
  );
}

export function EndpointBadge({
  method,
  path,
}: {
  method: "GET" | "POST" | "PUT";
  path: string;
}) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-hairline/10 bg-surface-900 px-4 py-3 font-mono text-sm">
      <MethodTag method={method} className="w-auto px-2 py-0.5 text-xs" />{" "}
      <span className="min-w-0 break-words text-zinc-200">{path}</span>
    </div>
  );
}
