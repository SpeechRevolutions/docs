"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";
import { CodeBlock } from "./CodeBlock";

export type CodeTab = {
  label: string;
  language?: string;
  filename?: string;
  code: string;
};

type CodeTabsProps = {
  tabs: CodeTab[];
  className?: string;
};

export function CodeTabs({ tabs, className }: CodeTabsProps) {
  const [active, setActive] = useState(0);
  const tab = tabs[active] ?? tabs[0];
  if (!tab) return null;

  return (
    <div className={cn("mt-5", className)}>
      <div className="flex flex-wrap gap-1 rounded-t-xl border border-b-0 border-white/10 bg-[#0b1220] px-2 pt-2">
        {tabs.map((t, i) => (
          <button
            key={t.label}
            type="button"
            onClick={() => setActive(i)}
            className={cn(
              "rounded-t-lg px-3 py-2 text-xs font-medium transition-colors",
              i === active
                ? "bg-white/8 text-white"
                : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <CodeBlock
        code={tab.code}
        language={tab.language}
        filename={tab.filename ?? tab.label}
        className="mt-0 rounded-t-none"
      />
    </div>
  );
}
