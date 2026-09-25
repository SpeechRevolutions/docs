export type Theme = "light" | "dark";

/** Per app: landing, docs and console sit on different subdomains, so storage is separate. */
export const THEME_STORAGE_KEY = "sr-theme";

/**
 * Mirrors what ThemeScript does inline; keep the two in step.
 *
 * Transitions are suspended for the frame the theme flips in. Otherwise every button and
 * link with a colour transition fades between themes at its own speed, and the page passes
 * through half-inverted states on the way.
 */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.classList.add("theme-switching");
  root.setAttribute("data-theme", theme);
  root.style.colorScheme = theme;
  void root.offsetHeight; // commit styles before transitions come back
  requestAnimationFrame(() => root.classList.remove("theme-switching"));
}

/** The theme ThemeScript already resolved onto <html>, so the two never disagree. */
export function readAppliedTheme(): Theme {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

export function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}
