import { HUBS, hubItems } from "@/content/navigation";
import { docMeta } from "@/lib/metadata";
import { ENDPOINTS } from "@/lib/openapi";
import type { Metadata } from "next";
import Link from "next/link";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * A folder's index page: its pages, each with the description its own metadata gives.
 *
 * Read from the page source at build (this is a static export), so the hub says exactly what
 * the page's search snippet says. Endpoint pages take their OpenAPI summary.
 */
function describe(href: string): string {
  if (href.startsWith("/api-reference/endpoints/")) {
    const e = ENDPOINTS.find((x) => href.endsWith(`/${x.slug}`));
    return e?.summary ?? "";
  }
  try {
    const src = readFileSync(
      join(process.cwd(), "src/app", href, "page.tsx"),
      "utf8",
    );
    const m = /description:\s*((?:"(?:[^"\\]|\\.)*"\s*\+?\s*)+)/.exec(src);
    if (!m) return "";
    return [...m[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)]
      .map((x) => x[1].replace(/\\"/g, '"'))
      .join("");
  } catch {
    return "";
  }
}

function hub(path: string) {
  const h = HUBS.find((x) => x.path === path);
  if (!h) throw new Error(`no hub for ${path}`);
  return h;
}

export function hubMetadata(path: string): Metadata {
  const h = hub(path);
  return docMeta({ title: h.title, description: h.description });
}

export function HubPage({ path }: { path: string }) {
  const h = hub(path);
  const items = hubItems(path);
  return (
    <>
      <h1>{h.title}</h1>
      <p>{h.description}</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const body = describe(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-w-0 flex-col rounded-lg border border-hairline/10 bg-surface-900 p-4 no-underline transition-colors hover:border-hairline/25 hover:no-underline"
            >
              <p className="!mt-0 text-[15px] font-medium text-fg">
                {item.method && (
                  <span className="mr-2 font-mono text-xs text-zinc-500">
                    {item.method}
                  </span>
                )}
                {item.title}
              </p>
              {body && (
                <p className="!mt-1 flex-1 text-sm !leading-6 text-zinc-400">
                  {body}
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </>
  );
}
