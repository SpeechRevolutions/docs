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
        "mt-6 rounded-xl border px-4 py-3 text-[14px] leading-6",
        tone === "info" && "border-brand-500/25 bg-brand-500/8 text-zinc-300",
        tone === "tip" && "border-emerald-500/25 bg-emerald-500/8 text-zinc-300",
        tone === "warn" && "border-amber-500/25 bg-amber-500/8 text-zinc-300",
      )}
    >
      {title && (
        <p
          className={cn(
            "mb-1 text-xs font-semibold tracking-wide uppercase",
            tone === "info" && "text-brand-link",
            tone === "tip" && "text-emerald-400",
            tone === "warn" && "text-amber-400",
          )}
        >
          {title}
        </p>
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
  const color =
    method === "GET"
      ? "bg-sky-500/15 text-sky-300"
      : method === "PUT"
        ? "bg-amber-500/15 text-amber-300"
        : "bg-emerald-500/15 text-emerald-300";

  return (
    <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 font-mono text-sm">
      <span className={cn("rounded-md px-2 py-0.5 text-xs font-bold", color)}>
        {method}
      </span>
      <span className="text-zinc-200">{path}</span>
    </div>
  );
}
