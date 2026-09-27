import { EndpointPage } from "@/components/api/EndpointPage";
import { ENDPOINTS, endpointBySlug } from "@/lib/openapi";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

/* One page per operation in public/openapi.json, generated at build time. */

export const dynamicParams = false;

export function generateStaticParams() {
  return ENDPOINTS.map((e) => ({ slug: e.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const e = endpointBySlug((await params).slug);
  if (!e) return {};
  // The summary is the fallback, not "": an operation added to the spec without prose used to
  // produce a page with no meta description at all, which is invisible in review because the
  // page itself still reads fine. A one-line summary is a worse description than a written one
  // and a far better one than none.
  const lead = e.description.split("\n")[0].trim() || e.summary;
  return {
    title: `${e.summary} — ${e.method} ${e.path}`,
    description: lead.slice(0, 180),
  };
}

export default async function Page({ params }: Props) {
  const e = endpointBySlug((await params).slug);
  if (!e) notFound();
  return <EndpointPage endpoint={e} />;
}
