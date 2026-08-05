import { CodeTabsClient, type RenderedTab } from "@/components/CodeTabsClient";
import { highlight, resolveLang, showsLineNumbers } from "@/lib/highlight";

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

/**
 * Server component: every tab is highlighted at build time, then handed to a thin
 * client shell that only tracks which one is visible.
 */
export async function CodeTabs({ tabs, className }: CodeTabsProps) {
  const rendered: RenderedTab[] = await Promise.all(
    tabs.map(async (t): Promise<RenderedTab> => {
      const lang = resolveLang(t.language, t.filename ?? t.label);
      return {
        label: t.label,
        langKey: lang,
        html: await highlight(t.code, lang),
        code: t.code,
        lineNumbers: showsLineNumbers(lang),
      };
    }),
  );

  return <CodeTabsClient tabs={rendered} className={className} />;
}
