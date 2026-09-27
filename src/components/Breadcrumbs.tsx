"use client";

import { NAV } from "@/content/navigation";
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

  const section = NAV.find((s) => s.items.some((i) => i.href === path));
  const item = section?.items.find((i) => i.href === path);
  if (!section || !item) return null;

  const base = `https://${SITE.docsDomain}`;
  const json = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: `${SITE.name} Docs`, item: base },
      // The section is a grouping in the sidebar, not a page of its own, so it carries no
      // `item` URL. A ListItem without one is valid and is how a non-clickable level is said.
      { "@type": "ListItem", position: 2, name: section.title },
      { "@type": "ListItem", position: 3, name: item.title, item: `${base}${path}` },
    ],
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />
  );
}
