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

/**
 * Switch theme with a reveal: the new theme grows outward as a circle from `origin` (the
 * toggle the visitor clicked), using the View Transitions API. Browsers without it, and
 * visitors who ask for reduced motion, get the instant switch.
 */
export function transitionTheme(theme: Theme, origin?: { x: number; y: number }): void {
  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => { ready: Promise<void> };
  };
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!doc.startViewTransition || reduced) {
    applyTheme(theme);
    return;
  }

  const x = origin?.x ?? window.innerWidth / 2;
  const y = origin?.y ?? 0;
  // Far enough to cover the corner furthest from the origin.
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

  const transition = doc.startViewTransition(() => applyTheme(theme));
  transition.ready
    .then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        {
          duration: 560,
          easing: "cubic-bezier(0.4, 0, 0.2, 1)",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    })
    .catch(() => {});
}
