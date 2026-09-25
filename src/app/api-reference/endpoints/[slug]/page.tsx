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
  return {
    title: `${e.summary} — ${e.method} ${e.path}`,
    description: e.description.split("\n")[0].slice(0, 180),
  };
}

export default async function Page({ params }: Props) {
  const e = endpointBySlug((await params).slug);
  if (!e) notFound();
  return <EndpointPage endpoint={e} />;
}
