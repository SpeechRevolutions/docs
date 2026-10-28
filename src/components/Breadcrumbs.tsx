"use client";

import { HUBS, NAV } from "@/content/navigation";
import { SITE } from "@/lib/constants";
import { usePathname } from "next/navigation";

/**
 * BreadcrumbList JSON-LD for the current page.
 *
 * Two reasons this is worth having on a 45-page reference site. A result for
 * /api-reference/endpoints/complete-multipart-upload currently shows that raw path; with a
 * breadcrumb trail Google shows "Docs › API reference › Complete multipart" instead, which is
 * legible and states where the page sits. And it tells a crawler the site's shape, which
 * nothing else here does — the sidebar is the hierarchy, and the sidebar is just links.
 *
 * The trail is derived from NAV rather than from the URL, so a page's crumb is the name the
 * sidebar gives it and the two cannot drift. A page missing from NAV emits nothing, which is
 * the right failure: a wrong breadcrumb is worse than none, because nothing renders it for a
 * human to notice.
 *
 * Emitted without visible breadcrumbs on the page. Google accepts that, and the sidebar
 * already shows a reader exactly where they are.
 */
export function Breadcrumbs() {
  const pathname = usePathname();
  // Static export serves /foo as /foo/index.html, so the pathname may carry a trailing slash.
  const path = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;

  // The home page is the root of the trail, not a page within it.
  if (path === "/") return null;

  const hub = HUBS.find((h) => h.path === path);
  const item = hub ?? NAV.flatMap((s) => s.items).find((i) => i.href === path);
  if (!item) return null;

  // Every URL ends in a slash (trailingSlash), so the crumbs do too: a crumb without one is a
  // URL that 301s, and Google reports those as "Page with redirect".
  const base = `https://${SITE.docsDomain}`;
  const url = (p: string) => `${base}${p}/`;
  // Each folder above the page is a hub page of its own, so each is a clickable level.
  const parents = HUBS.filter((h) => path.startsWith(`${h.path}/`)).sort(
    (a, b) => a.path.length - b.path.length,
  );
  const crumbs = [
    { name: `${SITE.name} Docs`, item: `${base}/` },
    ...parents.map((h) => ({ name: h.title, item: url(h.path) })),
    { name: item.title, item: url(path) },
  ];
  const json = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, ...c })),
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />
  );
}
