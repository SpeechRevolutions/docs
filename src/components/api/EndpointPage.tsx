import { CodeTabs } from "@/components/CodeTabs";
import { EndpointBadge } from "@/components/DocsUI";
import { PageActions } from "@/components/PageActions";
import { AUTH_HEADER, ENDPOINTS, requestSamples, type Endpoint, type Field } from "@/lib/openapi";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { ReactNode } from "react";

/** The spec's prose uses `backticks` and blank-line paragraphs; render just those. */
function Prose({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/\n\n+/)
        .filter(Boolean)
        .map((para, i) => (
          <p key={i}>{inline(para)}</p>
        ))}
    </>
  );
}

function inline(text: string): ReactNode[] {
  return text.split(/(`[^`]+`)/g).map((part, i) =>
    part.startsWith("`") && part.endsWith("`") ? <code key={i}>{part.slice(1, -1)}</code> : part,
  );
}

/**
 * Parameters as a definition list rather than a five-column table: names and types are
 * short, descriptions are long, and a table squeezes the part people actually read.
 * Order matches the house rule — name, type, required, default, then description.
 */
function FieldList({ fields }: { fields: Field[] }) {
  return (
    <ul className="!mt-4 !list-none divide-y divide-hairline/10 border-y border-hairline/10 !pl-0">
      {fields.map((f) => (
        <li key={f.name} className="!mt-0 py-4">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 font-mono text-[13px]">
            {/* Literal spaces between the spans: the gap is visual only, and the Markdown
                export (llms.txt, .md pages) reads text, where they would run together. */}
            <span className="font-medium text-fg">{f.name}</span>{" "}
            <span className="text-zinc-500">{f.type}</span>{" "}
            {f.required ? (
              <span className="text-xs text-amber-700 dark:text-amber-400">required</span>
            ) : null}{" "}
            {f.default !== undefined ? (
              <span className="text-xs text-zinc-500">default: {f.default}</span>
            ) : null}
          </div>
          {f.description ? (
            <p className="!mt-1.5 !text-sm !leading-6">{inline(f.description)}</p>
          ) : null}
          {f.values && f.values.length > 1 ? (
            <p className="!mt-1.5 !text-sm">
              One of{" "}
              {f.values.map((v, i) => (
                <span key={v}>
                  {i > 0 ? ", " : ""}
                  <code>{v}</code>
                </span>
              ))}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function statusTone(status: string) {
  if (status.startsWith("2")) return "text-emerald-700 dark:text-emerald-400";
  if (status.startsWith("4")) return "text-amber-700 dark:text-amber-400";
  return "text-red-700 dark:text-red-400";
}

export async function EndpointPage({ endpoint: e }: { endpoint: Endpoint }) {
  const samples = requestSamples(e);
  // The success example, plus one error: every 4xx shares the same `{ detail }` shape, and
  // seven status tabs wrapping onto two rows told the reader nothing the list below doesn't.
  const okExamples = e.responses.filter((r) => r.example && r.status.startsWith("2"));
  const errorExample = e.responses.find((r) => r.example && r.status === "422")
    ?? e.responses.find((r) => r.example && r.status.startsWith("4"));
  const withExamples = errorExample ? [...okExamples, errorExample] : okExamples;
  const success = e.responses.find((r) => r.status.startsWith("2"));
  const siblings = ENDPOINTS.filter((x) => x.tag === e.tag && x.slug !== e.slug);

  return (
    // `api-wide` widens the docs column and hides the "On this page" rail (see globals.css):
    // the right-hand space belongs to the request and response samples here.
    <div className="api-wide grid gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,27rem)] xl:gap-12">
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-4">
          <p className="eyebrow !mt-0">API reference · {e.tag}</p>
          <PageActions />
        </div>
        <h1 className="mt-3">{e.summary}</h1>
        <EndpointBadge method={e.method as "GET" | "POST" | "PUT"} path={e.path} />
        {e.description ? <Prose text={e.description} /> : null}
        <p className="!text-sm">
          Authenticate with your key in the <code>{AUTH_HEADER}</code> header —{" "}
          <Link href="/authentication">Authentication</Link>.
        </p>

        {e.pathParams.length > 0 ? (
          <>
            <h2>Path parameters</h2>
            <FieldList fields={e.pathParams} />
          </>
        ) : null}

        {e.queryParams.length > 0 ? (
          <>
            <h2>Query parameters</h2>
            <FieldList fields={e.queryParams} />
          </>
        ) : null}

        {e.body ? (
          <>
            <h2>Request body</h2>
            <p className="!text-sm">
              {e.body.required ? "Required. " : "Optional. "}
              {e.body.binary ? (
                <>
                  The raw file bytes — send the file itself, not JSON. Accepted types:{" "}
                  {e.body.contentTypes.map((t, i) => (
                    <span key={t}>
                      {i > 0 ? ", " : ""}
                      <code>{t}</code>
                    </span>
                  ))}
                  .
                </>
              ) : (
                <>
                  <code>{e.body.contentTypes.join(", ")}</code>
                  {e.body.description ? <> — {inline(e.body.description)}</> : null}
                </>
              )}
            </p>
            {e.body.fields.length > 0 ? <FieldList fields={e.body.fields} /> : null}
          </>
        ) : null}

        <h2>Responses</h2>
        <ul className="!mt-4 !list-none divide-y divide-hairline/10 border-y border-hairline/10 !pl-0">
          {e.responses.map((r) => (
            <li key={r.status} className="!mt-0 flex gap-4 py-3">
              <span className={cn("w-10 shrink-0 font-mono text-[13px] font-medium", statusTone(r.status))}>
                {r.status}
              </span>{" "}
              <span className="text-sm leading-6 text-zinc-400">{inline(r.description)}</span>
            </li>
          ))}
        </ul>

        {success && success.fields.length > 0 ? (
          <>
            <h3>{success.status} response fields</h3>
            <FieldList fields={success.fields} />
          </>
        ) : null}

        {siblings.length > 0 ? (
          <>
            <h2>Related endpoints</h2>
            <ul>
              {siblings.map((s) => (
                <li key={s.slug}>
                  <Link href={`/api-reference/endpoints/${s.slug}`}>{s.summary}</Link>{" "}
                  <span className="font-mono text-xs text-zinc-500">
                    {s.method} {s.path}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>

      <aside className="min-w-0 xl:sticky xl:top-24 xl:self-start">
        <CodeTabs
          title="Request"
          className="!mt-0"
          tabs={[
            { label: "cURL", language: "bash", code: samples.curl },
            { label: "Python", language: "python", code: samples.python },
            { label: "JavaScript", language: "ts", code: samples.javascript },
          ]}
        />
        {withExamples.length > 0 ? (
          <CodeTabs
            title="Response"
            sync={false}
            tabs={withExamples.map((r) => ({
              label: r.status,
              language: r.contentType === "application/json" ? "json" : "text",
              code: r.example!,
            }))}
          />
        ) : null}
      </aside>
    </div>
  );
}
