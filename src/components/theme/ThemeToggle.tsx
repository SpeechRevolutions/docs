"use client";

import {
  readAppliedTheme,
  systemTheme,
  THEME_STORAGE_KEY,
  transitionTheme,
  type Theme,
} from "@/lib/theme";
import { cn } from "@/lib/utils";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Light/dark toggle. The icon shows the theme you would switch to — a sun while dark.
 *
 * Until the visitor clicks it, the page follows the device, live: switching the OS to dark
 * at sunset switches the page too. Once they choose, the choice sticks. Choosing the theme
 * the device already prefers clears the stored override, so they fall back to following it.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setTheme(readAppliedTheme());
    setReady(true);

    const media = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => {
      try {
        if (localStorage.getItem(THEME_STORAGE_KEY)) return;
      } catch {}
      const next = systemTheme();
      transitionTheme(next);
      setTheme(next);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  function toggle(event: React.MouseEvent<HTMLButtonElement>) {
    const next: Theme = theme === "dark" ? "light" : "dark";
    const rect = event.currentTarget.getBoundingClientRect();
    transitionTheme(next, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    setTheme(next);
    try {
      if (next === systemTheme()) localStorage.removeItem(THEME_STORAGE_KEY);
      else localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {}
  }

  const goingTo = theme === "dark" ? "light" : "dark";
  const Icon = theme === "dark" ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-hairline/5 hover:text-fg",
        className,
      )}
      aria-label={`Switch to ${goingTo} mode`}
      title={`Switch to ${goingTo} mode`}
    >
      {/* The real theme is unknown until mounted; hold the space rather than flash an icon. */}
      <Icon className={cn("h-4 w-4 transition-opacity", !ready && "opacity-0")} />
    </button>
  );
}
