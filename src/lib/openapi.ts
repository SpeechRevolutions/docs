import "server-only";

import { ENDPOINT_NAV } from "@/content/navigation";
import spec from "../../public/openapi.json";

/*
 * Build-time reader for public/openapi.json — the one hand-maintained description of the
 * public API. The endpoint reference pages are generated from it, so a field documented
 * there cannot drift from a field documented here: there is only one copy.
 *
 * This resolves just what that file uses: local $refs, allOf, 3.1 type arrays
 * (["string", "null"]), enums, defaults and examples. It is not a general OpenAPI library.
 */

type Json = unknown;
type Schema = {
  $ref?: string;
  type?: string | string[];
  format?: string;
  enum?: Json[];
  default?: Json;
  example?: Json;
  description?: string;
  properties?: Record<string, Schema>;
  required?: string[];
  items?: Schema;
  allOf?: Schema[];
};

type RawParam = {
  $ref?: string;
  name: string;
  in: "query" | "path" | "header";
  required?: boolean;
  description?: string;
  schema?: Schema;
  example?: Json;
};

type RawResponse = {
  $ref?: string;
  description?: string;
  content?: Record<string, { schema?: Schema; example?: Json }>;
};

type RawOperation = {
  operationId: string;
  tags?: string[];
  summary?: string;
  description?: string;
  parameters?: RawParam[];
  requestBody?: {
    required?: boolean;
    description?: string;
    content?: Record<string, { schema?: Schema; example?: Json }>;
  };
  responses?: Record<string, RawResponse>;
};

export type Field = {
  name: string;
  type: string;
  required: boolean;
  default?: string;
  description?: string;
  values?: string[];
};

export type ResponseDoc = {
  status: string;
  description: string;
  contentType?: string;
  fields: Field[];
  example?: string;
};

export type Endpoint = {
  slug: string;
  operationId: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  tag: string;
  summary: string;
  description: string;
  pathParams: Field[];
  queryParams: Field[];
  body?: {
    contentTypes: string[];
    required: boolean;
    description?: string;
    fields: Field[];
    binary: boolean;
    example?: string;
  };
  responses: ResponseDoc[];
};

const doc = spec as unknown as {
  servers: { url: string }[];
  paths: Record<string, Record<string, RawOperation>>;
  components: {
    schemas: Record<string, Schema>;
    parameters: Record<string, RawParam>;
    responses: Record<string, RawResponse>;
    securitySchemes: Record<string, { name: string; description?: string }>;
  };
};

export const API_BASE = doc.servers[0]?.url ?? "https://api.speechrevolutions.com";
export const AUTH_HEADER = Object.values(doc.components.securitySchemes)[0]?.name ?? "X-API-Key";

function deref<T>(value: T & { $ref?: string }): T {
  if (!value?.$ref) return value;
  const parts = value.$ref.replace(/^#\//, "").split("/");
  let node: unknown = doc;
  for (const p of parts) node = (node as Record<string, unknown>)[p];
  return deref(node as T & { $ref?: string });
}

/** Merge allOf into one object schema and resolve every $ref on the way. */
function resolve(schema: Schema | undefined): Schema {
  if (!schema) return {};
  const s = deref(schema);
  if (s.allOf) {
    const merged: Schema = { type: "object", properties: {}, required: [] };
    for (const part of s.allOf.map(resolve)) {
      Object.assign(merged.properties!, part.properties ?? {});
      merged.required!.push(...(part.required ?? []));
      merged.description ??= part.description;
    }
    return merged;
  }
  return s;
}

function typeLabel(schema: Schema): string {
  const s = resolve(schema);
  const types = Array.isArray(s.type) ? s.type : s.type ? [s.type] : [];
  const nonNull = types.filter((t) => t !== "null");
  let base = nonNull.join(" | ") || (s.enum ? "string" : "object");
  if (base === "array") base = `${typeLabel(s.items ?? {})}[]`;
  if (s.format && s.format !== "binary") base += ` (${s.format})`;
  if (s.format === "binary") base = "binary";
  return types.includes("null") ? `${base} | null` : base;
}

function fmt(value: Json): string | undefined {
  if (value === undefined) return undefined;
  return typeof value === "string" ? value : JSON.stringify(value);
}

function fieldsOf(schema: Schema | undefined): Field[] {
  const s = resolve(schema);
  const required = new Set(s.required ?? []);
  return Object.entries(s.properties ?? {}).map(([name, raw]) => {
    const prop = resolve(raw);
    // A $ref'd enum (Model, OutputType) carries its description on the target; a local
    // description on the property wins when both exist.
    return {
      name,
      type: typeLabel(raw),
      required: required.has(name),
      default: fmt(prop.default),
      description: deref(raw).description ?? prop.description,
      values: prop.enum?.map(String),
    };
  });
}

function paramField(raw: RawParam): Field {
  const p = deref(raw);
  const schema = resolve(p.schema);
  return {
    name: p.name,
    type: typeLabel(p.schema ?? {}),
    required: Boolean(p.required),
    default: fmt(schema.default),
    description: p.description ?? schema.description,
    values: schema.enum?.map(String),
  };
}

/** An illustrative value for a schema: its example, else default, else a typed placeholder. */
function sample(schema: Schema | undefined, name = ""): Json {
  const s = resolve(schema);
  if (s.example !== undefined) return s.example;
  if (s.default !== undefined) return s.default;
  if (s.enum?.length) return s.enum[0];
  const types = Array.isArray(s.type) ? s.type.filter((t) => t !== "null") : [s.type];
  const t = types[0] ?? (s.properties ? "object" : "string");
  if (t === "object") {
    // An optional nullable field is null in a typical response (a job still processing has
    // no failure reason), and a sample showing it filled in describes a state that is not.
    const required = new Set(s.required ?? []);
    return Object.fromEntries(
      Object.entries(s.properties ?? {}).map(([k, v]) => {
        const prop = resolve(v);
        // URLs are the exception: `upload_url` is nullable but present on the normal path.
        const nullable =
          Array.isArray(prop.type) && prop.type.includes("null") && prop.format !== "uri";
        return [k, nullable && !required.has(k) && prop.example === undefined ? null : sample(v, k)];
      }),
    );
  }
  if (t === "array") return [sample(s.items, name)];
  if (t === "integer" || t === "number") {
    if (/size|bytes/.test(name)) return 52428800;
    if (/expires/.test(name)) return 3600;
    if (/duration|seconds/.test(name)) return 1843.2;
    if (/part/.test(name)) return 4;
    if (/completed|total|count/.test(name)) return 8;
    return 1;
  }
  if (t === "boolean") return true;
  if (s.format === "uuid") return "7c1f3a52-9d0e-4b8e-8a8e-2f6d4c1b9e70";
  if (s.format === "uri") return name.includes("callback") ? "https://example.com/webhooks/stt" : "https://…";
  if (s.format === "date-time") return "2026-09-25T14:03:11Z";
  if (name === "content_type") return "audio/mpeg";
  if (name === "detail") return "Explanation of what went wrong.";
  if (name === "filename") return "meeting.mp3";
  return "string";
}

/** Request examples show only what a caller would plausibly send: required fields plus
 *  the ones with a documented example. Every optional field at its default is noise. */
function requestSample(schema: Schema | undefined): Record<string, Json> {
  const s = resolve(schema);
  const required = new Set(s.required ?? []);
  const out: Record<string, Json> = {};
  for (const [k, raw] of Object.entries(s.properties ?? {})) {
    const prop = resolve(raw);
    if (required.has(k) || prop.example !== undefined || k === "file_size" || k === "filename") {
      out[k] = sample(raw, k);
    }
  }
  return out;
}

function slugOf(operationId: string) {
  return operationId.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

function buildEndpoint(path: string, method: string, op: RawOperation): Endpoint {
  const params = (op.parameters ?? []).map((p) => ({ raw: deref(p), field: paramField(p) }));

  let body: Endpoint["body"];
  if (op.requestBody?.content) {
    const contentTypes = Object.keys(op.requestBody.content);
    const first = op.requestBody.content[contentTypes[0]];
    const schema = resolve(first.schema);
    const binary = schema.format === "binary";
    body = {
      contentTypes,
      required: Boolean(op.requestBody.required),
      description: op.requestBody.description,
      fields: binary ? [] : fieldsOf(first.schema),
      binary,
      example: binary
        ? undefined
        : JSON.stringify(first.example ?? requestSample(first.schema), null, 2),
    };
  }

  const responses: ResponseDoc[] = Object.entries(op.responses ?? {}).map(([status, raw]) => {
    const r = deref(raw);
    const [contentType, media] = Object.entries(r.content ?? {})[0] ?? [];
    const schema = media?.schema;
    let example: string | undefined;
    if (media?.example !== undefined) {
      example = typeof media.example === "string" ? media.example : JSON.stringify(media.example, null, 2);
    } else if (schema && contentType === "application/json") {
      const value = sample(schema) as Record<string, Json>;
      if (!status.startsWith("2") && value && typeof value === "object" && "detail" in value) {
        value.detail = (r.description ?? "").split(". ")[0].replace(/\.$/, "");
      }
      example = JSON.stringify(value, null, 2);
    }
    return {
      status,
      description: r.description ?? "",
      contentType,
      fields: contentType === "application/json" ? fieldsOf(schema) : [],
      example,
    };
  });

  return {
    slug: slugOf(op.operationId),
    operationId: op.operationId,
    method: method.toUpperCase() as Endpoint["method"],
    path,
    tag: op.tags?.[0] ?? "Other",
    summary: op.summary ?? op.operationId,
    description: op.description ?? "",
    pathParams: params.filter((p) => p.raw.in === "path").map((p) => p.field),
    queryParams: params.filter((p) => p.raw.in === "query").map((p) => p.field),
    body,
    responses,
  };
}

export const ENDPOINTS: Endpoint[] = Object.entries(doc.paths).flatMap(([path, ops]) =>
  Object.entries(ops)
    .filter(([m]) => ["get", "post", "put", "delete"].includes(m))
    .map(([m, op]) => buildEndpoint(path, m, op)),
);

// The sidebar's endpoint list is written out by hand; fail the build rather than let it drift.
{
  const inSpec = ENDPOINTS.map((e) => `/api-reference/endpoints/${e.slug}`);
  const inNav = ENDPOINT_NAV.map((n) => n.href);
  const wrongMethod = ENDPOINTS.filter(
    (e) => ENDPOINT_NAV.find((n) => n.href === `/api-reference/endpoints/${e.slug}`)?.method !== e.method,
  ).map((e) => e.slug);
  const missing = inSpec.filter((h) => !inNav.includes(h));
  const stale = inNav.filter((h) => !inSpec.includes(h));
  if (missing.length || stale.length || wrongMethod.length) {
    throw new Error(
      `content/navigation.ts ENDPOINT_NAV is out of step with public/openapi.json.` +
        (missing.length ? ` Missing: ${missing.join(", ")}.` : "") +
        (stale.length ? ` Not in spec: ${stale.join(", ")}.` : "") +
        (wrongMethod.length ? ` Wrong method tag: ${wrongMethod.join(", ")}.` : ""),
    );
  }
}

/** Tag order as the endpoints first appear in the file — which is the order a caller uses them. */
export const TAGS: string[] = [...new Set(ENDPOINTS.map((e) => e.tag))];

export function endpointBySlug(slug: string) {
  return ENDPOINTS.find((e) => e.slug === slug);
}

/* ---- Request samples ------------------------------------------------------------------ */

function exampleUrl(e: Endpoint) {
  const path = e.path.replace("{job_id}", "7c1f3a52-9d0e-4b8e-8a8e-2f6d4c1b9e70");
  const query = e.queryParams
    .filter((q) => q.name === "output_type" || q.name === "speaker_labels" || q.name === "limit")
    .map((q) => `${q.name}=${q.default ?? "true"}`)
    .join("&");
  return `${API_BASE}${path}${query ? `?${query}` : ""}`;
}

export function requestSamples(e: Endpoint) {
  const url = exampleUrl(e);
  const body = e.body?.example;
  const stream = e.path.endsWith("/stream") || e.operationId === "transcribe";

  const curl = [
    `curl ${stream ? "-N " : ""}-X ${e.method} \\`,
    `  "${url}" \\`,
    `  -H "${AUTH_HEADER}: $SPEECHREVOLUTIONS_API_KEY"${e.body ? " \\" : ""}`,
    ...(e.body?.binary
      ? ["  --data-binary @audio.mp3"]
      : body
        ? ['  -H "Content-Type: application/json" \\', `  -d '${body.replace(/\n/g, "\n  ")}'`]
        : []),
  ].join("\n");

  const pyBody = body
    ? body.replace(/\btrue\b/g, "True").replace(/\bfalse\b/g, "False").replace(/\bnull\b/g, "None")
    : undefined;
  const python = [
    "import os",
    "import requests",
    "",
    `resp = requests.${e.method.toLowerCase()}(`,
    `    "${url}",`,
    `    headers={"${AUTH_HEADER}": os.environ["SPEECHREVOLUTIONS_API_KEY"]},`,
    ...(e.body?.binary
      ? ['    data=open("audio.mp3", "rb"),', "    stream=True,"]
      : pyBody
        ? [`    json=${pyBody.replace(/\n/g, "\n    ")},`]
        : stream
          ? ["    stream=True,"]
          : []),
    ")",
    "resp.raise_for_status()",
    stream ? "for line in resp.iter_lines():\n    print(line.decode())" : "print(resp.json())",
  ].join("\n");

  const javascript = [
    `const resp = await fetch("${url}", {`,
    `  method: "${e.method}",`,
    `  headers: {`,
    `    "${AUTH_HEADER}": process.env.SPEECHREVOLUTIONS_API_KEY,`,
    ...(body ? ['    "Content-Type": "application/json",'] : []),
    `  },`,
    ...(e.body?.binary
      ? ['  body: await (await import("node:fs/promises")).readFile("audio.mp3"),']
      : body
        ? [`  body: JSON.stringify(${body.replace(/\n/g, "\n  ")}),`]
        : []),
    `});`,
    stream
      ? "for await (const chunk of resp.body) process.stdout.write(chunk);"
      : "console.log(await resp.json());",
  ].join("\n");

  return { curl, python, javascript };
}
