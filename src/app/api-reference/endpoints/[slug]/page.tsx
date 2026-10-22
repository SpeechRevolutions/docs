import { EndpointPage } from "@/components/api/EndpointPage";
import { ENDPOINTS, endpointBySlug } from "@/lib/openapi";
import { docMeta } from "@/lib/metadata";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

/* One page per operation in public/openapi.json, generated at build time. */

export const dynamicParams = false;

export function generateStaticParams() {
  return ENDPOINTS.map((e) => ({ slug: e.slug }));
}

// The layout's title template appends this.
const TEMPLATE_SUFFIX = " · Speech Revolutions Docs";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const e = endpointBySlug((await params).slug);
  if (!e) return {};
  // Fall back to the summary so every page has a meta description.
  const lead = e.description.split("\n")[0].trim() || e.summary;
  /*
   * The method and path are what a developer searches for, but with the summary and the
   * brand template they ran to 65-98 characters, and a result shows about 60. Keep them when
   * the whole title fits; otherwise the summary alone, which the page's own H1 repeats.
   */
  const full = `${e.summary} — ${e.method} ${e.path}`;
  const title = `${full}${TEMPLATE_SUFFIX}`.length <= 65 ? full : e.summary;
  // A lead like "Rate limit: 30 requests per minute." says nothing about the endpoint, so
  // short ones are prefixed with what the operation is.
  const description =
    lead.length < 80 ? `${e.summary}: ${e.method} ${e.path}. ${lead}` : lead;
  return docMeta({
    title,
    description: description.slice(0, 180),
  });
}

export default async function Page({ params }: Props) {
  const e = endpointBySlug((await params).slug);
  if (!e) notFound();
  return <EndpointPage endpoint={e} />;
}
