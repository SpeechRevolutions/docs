import { CodeBlock } from "@/components/CodeBlock";
import { CodeTabs } from "@/components/CodeTabs";
import { Callout } from "@/components/DocsUI";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Using Speech Revolutions with Next.js",
  description:
    "Call Speech Revolutions from the server side of your Next.js app — a Route Handler or a Server Action — so your API key never ships to the browser. This guide wires up a…",
};

export default function NextjsIntegrationPage() {
  return (
    <>
      <h1>Using Speech Revolutions with Next.js</h1>
      <p>
        Call Speech Revolutions from the server side of your Next.js app — a Route Handler
        or a Server Action — so your API key never ships to the browser. This
        guide wires up a file upload, live progress you can poll from the
        client, and a webhook Route Handler for completion callbacks.
      </p>

      <Callout title="Keep the key on the server" tone="warn">
        <p>
          The <code>speechrevolutions</code> client reads{" "}
          <code>SPEECHREVOLUTIONS_API_KEY</code>.
          Only reference it from server code — Route Handlers, Server Actions,
          or <code>route.ts</code> files. Never expose it through a{" "}
          <code>NEXT_PUBLIC_*</code> variable or import the client into a{" "}
          <code>&quot;use client&quot;</code> component.
        </p>
      </Callout>

      <h2>Install</h2>
      <CodeBlock
        language="bash"
        code={`npm install speechrevolutions

# .env.local (server-only — no NEXT_PUBLIC_ prefix)
SPEECHREVOLUTIONS_API_KEY=stt_...`}
      />

      <h2>A shared server-only client</h2>
      <p>
        Create the client once in a module you only import from server code. The{" "}
        <code>import &quot;server-only&quot;</code> guard turns any accidental
        client-side import into a build error.
      </p>
      <CodeBlock
        language="ts"
        filename="lib/stt.ts"
        code={`import "server-only";
import { SpeechRevolutions } from "speechrevolutions";

// Reads SPEECHREVOLUTIONS_API_KEY from the server environment.
export const stt = new SpeechRevolutions();`}
      />

      <h2>Upload a user file from a Route Handler</h2>
      <p>
        Accept the browser&apos;s <code>multipart/form-data</code> in a Route
        Handler, hand the bytes straight to <code>transcribe()</code>, and
        return the transcript. The file never touches the client&apos;s view of
        your key.
      </p>
      <CodeBlock
        language="ts"
        filename="app/api/transcribe/route.ts"
        code={`import { NextRequest, NextResponse } from "next/server";
import { stt } from "@/lib/stt";

export const runtime = "nodejs"; // the SDK needs the Node runtime, not edge

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "no file" }, { status: 400 });
  }

  // Pass the raw bytes (a Buffer) to the SDK — blocks until done.
  const bytes = Buffer.from(await file.arrayBuffer());
  const result = await stt.transcribe(bytes, { speakerLabels: true });

  return NextResponse.json({ text: result.text });
}`}
      />

      <h2>Or a Server Action</h2>
      <p>
        Prefer a form that posts directly to a Server Action? Same rule — the
        function body runs only on the server, so the key never reaches the browser.
      </p>
      <CodeBlock
        language="ts"
        filename="app/actions.ts"
        code={`"use server";
import { stt } from "@/lib/stt";

export async function transcribeAction(formData: FormData) {
  const file = formData.get("file") as File;
  const bytes = Buffer.from(await file.arrayBuffer());
  const result = await stt.transcribe(bytes, { speakerLabels: true });
  return { text: result.text };
}`}
      />

      <h2>Show live progress to the client</h2>
      <p>
        The synchronous <code>transcribe()</code> above blocks the whole
        request, so the browser only sees the final result. To drive a real
        progress bar, start the work in the background, store the latest{" "}
        <code>onProgress</code> / <code>onUploadProgress</code> percentage per
        job, and expose a small progress endpoint the client polls.{" "}
        <Link href="/guides/live-progress">Live progress for web apps</Link>{" "}
        covers the weighting logic in depth; here is the Next.js wiring.
      </p>
      <CodeTabs
        tabs={[
          {
            label: "Start + progress store",
            language: "ts",
            filename: "app/api/jobs/route.ts",
            code: `import { NextRequest, NextResponse } from "next/server";
import { stt } from "@/lib/stt";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

// In-memory for a single instance. Use Redis / your DB in production so
// every instance and the progress route can read the same value.
type Snapshot = { phase: string; percent: number; text?: string };
const JOBS = new Map<string, Snapshot>();
export function getJob(id: string) {
  return JOBS.get(id);
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File;
  const bytes = Buffer.from(await file.arrayBuffer());
  const jobId = randomUUID();
  JOBS.set(jobId, { phase: "starting", percent: 0 });

  // Fire and forget — return the id immediately; the callbacks update the map.
  stt
    .transcribe(bytes, {
      onUploadProgress: (e) =>
        JOBS.set(jobId, { phase: "upload", percent: (e.percent ?? 0) * 0.15 }),
      onProgress: (e) =>
        JOBS.set(jobId, {
          phase: "transcribe",
          percent: 15 + (e.percent ?? 0) * 0.85,
        }),
    })
    .then((result) =>
      JOBS.set(jobId, { phase: "done", percent: 100, text: result.text }),
    )
    .catch(() => JOBS.set(jobId, { phase: "failed", percent: 0 }));

  return NextResponse.json({ jobId });
}`,
          },
          {
            label: "Progress endpoint",
            language: "ts",
            filename: "app/api/jobs/[id]/route.ts",
            code: `import { NextResponse } from "next/server";
import { getJob } from "../route";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const snapshot = getJob(id);
  if (!snapshot) {
    return NextResponse.json({ error: "unknown job" }, { status: 404 });
  }
  return NextResponse.json(snapshot); // { phase, percent, text? }
}`,
          },
          {
            label: "Client component",
            language: "tsx",
            filename: "app/upload.tsx",
            code: `"use client";
import { useState } from "react";

export function Upload() {
  const [percent, setPercent] = useState(0);
  const [text, setText] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = new FormData(e.currentTarget);
    const { jobId } = await fetch("/api/jobs", { method: "POST", body }).then(
      (r) => r.json(),
    );

    // Poll the progress endpoint until the job finishes.
    const timer = setInterval(async () => {
      const snap = await fetch(\`/api/jobs/\${jobId}\`).then((r) => r.json());
      setPercent(snap.percent);
      if (snap.phase === "done") {
        clearInterval(timer);
        setText(snap.text);
      }
    }, 1000);
  }

  return (
    <form onSubmit={onSubmit}>
      <input type="file" name="file" accept="audio/*" required />
      <button type="submit">Transcribe</button>
      <progress value={percent} max={100} />
      <pre>{text}</pre>
    </form>
  );
}`,
          },
        ]}
      />

      <Callout title="Why an in-memory map is a starting point" tone="info">
        <p>
          A <code>Map</code> only works when one process handles both the start
          and the poll requests. On serverless or multi-instance deployments,
          back the store with Redis, your database, or a durable KV so any
          instance can answer the poll.
        </p>
      </Callout>

      <h2>Webhook Route Handler</h2>
      <p>
        For long jobs, skip polling entirely: pass a <code>callbackUrl</code>{" "}
        when you submit and let Speech Revolutions POST you when the job finishes. The
        platform signs the raw body with HMAC-SHA256 in the{" "}
        <code>X-SR-Signature: sha256=&lt;hex&gt;</code> header. Read the raw
        bytes — not a re-serialized object — and compare in constant time.
      </p>
      <CodeBlock
        language="ts"
        filename="app/api/webhooks/stt/route.ts"
        code={`import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";

const SECRET = process.env.SPEECHREVOLUTIONS_WEBHOOK_SECRET!; // your signing secret

function verify(raw: string, header: string | null): boolean {
  const expected = "sha256=" + createHmac("sha256", SECRET).update(raw).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(header ?? "");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const raw = await req.text(); // verify against the exact bytes received
  if (!verify(raw, req.headers.get("x-sr-signature"))) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  const event = JSON.parse(raw);
  // { job_id, status: "completed" | "failed", download_url?, step?, reason? }
  if (event.status === "completed") {
    // mark the job done; fetch event.download_url or getTranscript(event.job_id)
  } else {
    // event.step / event.reason describe the failure
  }
  return NextResponse.json({ ok: true }); // a 2xx acks delivery; 5xx is retried
}`}
      />

      <Callout title="Under the hood" tone="info">
        <p>
          <code>transcribe()</code> runs the full{" "}
          <Link href="/api-reference/upload">upload</Link> flow and waits on the{" "}
          <Link href="/api-reference/jobs">SSE job stream</Link>, computing{" "}
          <code>percent</code> for the callbacks. See the{" "}
          <Link href="/sdks/javascript">JavaScript SDK</Link> for the full
          option and result surface.
        </p>
      </Callout>
    </>
  );
}
