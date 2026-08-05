import { DocsHeader } from "@/components/DocsHeader";
import { DocsSidebar } from "@/components/DocsSidebar";
import { TableOfContents } from "@/components/TableOfContents";
import type { ReactNode } from "react";

export function DocsShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <DocsHeader />
      <div className="mx-auto flex max-w-[90rem]">
        <DocsSidebar />
        <main className="min-w-0 flex-1 px-4 py-10 sm:px-8 lg:px-12 lg:py-12">
          {/* Scopes the Pagefind index to page content — without this it would also
              index the sidebar and header on every single page. */}
          <div data-pagefind-body className="docs-prose mx-auto max-w-3xl">
            {children}
          </div>
        </main>
        <TableOfContents />
      </div>
    </div>
  );
}
