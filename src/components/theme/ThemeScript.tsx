import { THEME_STORAGE_KEY } from "@/lib/theme";

/**
 * Resolves the theme onto <html> before first paint: the stored choice if the visitor made
 * one, otherwise the device setting.
 *
 * It has to be a blocking inline script in <head> — the server cannot read localStorage or
 * the OS preference, so doing this in an effect would paint the wrong theme first and flash.
 */
const script = `
(function () {
  try {
    var stored = localStorage.getItem('${THEME_STORAGE_KEY}');
    var theme = stored === 'light' || stored === 'dark'
      ? stored
      : (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
  } catch (e) {}
})();
`;

export function ThemeScript() {
  return <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: script }} />;
}
