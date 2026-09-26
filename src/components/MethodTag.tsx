import type { HttpMethod } from "@/content/navigation";
import { cn } from "@/lib/utils";

/** Colour follows the convention readers already know from Deepgram and AssemblyAI. */
const TONE: Record<HttpMethod, string> = {
  GET: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  POST: "bg-blue-500/12 text-blue-700 dark:text-blue-300",
  PUT: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
  DELETE: "bg-red-500/12 text-red-700 dark:text-red-300",
  WSS: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
};

export function MethodTag({ method, className }: { method: HttpMethod; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex w-10 shrink-0 justify-center rounded px-1 py-px font-mono text-[10px] leading-4 font-semibold tracking-wide",
        TONE[method],
        className,
      )}
    >
      {method === "DELETE" ? "DEL" : method}
    </span>
  );
}
