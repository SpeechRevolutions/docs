import type { CodeTab } from "@/components/CodeTabs";
import {
  MigrationCompareClient,
  type ComparedLanguage,
  type RenderedSide,
} from "@/components/MigrationCompareClient";
import { highlight, resolveLang, showsLineNumbers } from "@/lib/highlight";

type MigrationCompareProps = {
  /** The provider being migrated from, e.g. "AssemblyAI". */
  from: string;
  /** The reader's existing code, one tab per language. `label` is the language name. */
  before: CodeTab[];
  /** The same program on Speech Revolutions, in the same languages. */
  after: CodeTab[];
};

/**
 * Before/after code for a migration guide: pick a language, then flip between the
 * provider's code and ours.
 *
 * A plain CodeTabs with "Before (Python)" and "After (Python)" tabs cannot do this:
 * both tabs are Python, so selecting the second one broadcasts "python" and the
 * language sync lands it back on the first. Language and side are separate choices
 * here, and only the language is synced across the page.
 */
export async function MigrationCompare({ from, before, after }: MigrationCompareProps) {
  const render = async (t: CodeTab): Promise<RenderedSide> => {
    const lang = resolveLang(t.language, t.filename ?? t.label);
    return {
      langKey: lang,
      filename: t.filename,
      html: await highlight(t.code, lang),
      code: t.code,
      lineNumbers: showsLineNumbers(lang),
    };
  };

  const [b, a] = await Promise.all([
    Promise.all(before.map(render)),
    Promise.all(after.map(render)),
  ]);

  // Every language needs both sides; a missing one would leave the toggle pointing
  // at nothing. Fail the build rather than ship that.
  const languages: ComparedLanguage[] = after.map((t, i) => {
    const match = b.find((side) => side.langKey === a[i].langKey);
    if (!match) {
      throw new Error(`MigrationCompare (${from}): no "before" code for ${t.label}`);
    }
    return { label: t.label, langKey: a[i].langKey, before: match, after: a[i] };
  });
  if (b.length !== a.length) {
    throw new Error(`MigrationCompare (${from}): before and after cover different languages`);
  }

  return <MigrationCompareClient from={from} languages={languages} />;
}
