"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "docs:preferred-language";
const SYNC_EVENT = "docs:language-change";

/**
 * Which of `langKeys` is selected, kept in step with every other code block on the
 * page and remembered across navigation. Matches the `groupId` behaviour on
 * AssemblyAI's docs.
 *
 * Returns the active index and a setter that also broadcasts the choice.
 */
export function useLanguagePreference(langKeys: string[], sync = true) {
  // Always start at 0 so the client's first paint matches the server HTML; the
  // stored preference is applied after mount to avoid a hydration mismatch.
  const [active, setActive] = useState(0);
  const keys = langKeys.join("\n");

  useEffect(() => {
    if (!sync) return;
    const list = keys.split("\n");
    const apply = (lang: string | null) => {
      if (!lang) return;
      // A block can hold two tabs in one language. Selecting the second one
      // broadcasts its language back to this block too, and jumping to the first
      // match would undo the click, so stay put when the current tab already fits.
      setActive((cur) => {
        if (list[cur] === lang) return cur;
        const i = list.indexOf(lang);
        return i >= 0 ? i : cur;
      });
    };

    apply(readStored());

    const onSync = (e: Event) => apply((e as CustomEvent<string>).detail);
    window.addEventListener(SYNC_EVENT, onSync);
    return () => window.removeEventListener(SYNC_EVENT, onSync);
  }, [keys, sync]);

  function select(i: number) {
    setActive(i);
    const lang = langKeys[i];
    if (!lang || !sync) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Storage can be blocked (private mode); the in-page sync still works.
    }
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: lang }));
  }

  return [active, select] as const;
}

function readStored(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
