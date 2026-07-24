import { CodeBlock } from "@/components/CodeBlock";
import { CodeTabs } from "@/components/CodeTabs";
import { Callout } from "@/components/DocsUI";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Using Zephyr with Supabase",
};

export default function SupabaseIntegrationPage() {
  return (
    <>
      <h1>Using Zephyr with Supabase</h1>
      <p>
        If your users upload audio to Supabase Storage, you can transcribe it
        without downloading a byte: create a signed URL for the object, hand it
        to Zephyr, and write the transcript into a Postgres table. Optionally
        stream progress to the browser over Supabase Realtime. All Zephyr and
        service-role keys stay server-side.
      </p>

      <Callout title="Use the service role key on the server only" tone="warn">
        <p>
          Signed-URL creation and privileged table writes use the Supabase
          service role key — keep it (and{" "}
          <code>SPEECHREVOLUTIONS_API_KEY</code>) on your server. The browser
          only ever uses the anon key and reads rows through Row Level Security.
        </p>
      </Callout>

      <h2>The table</h2>
      <p>
        A row per job: the storage path, a status, a <code>0–100</code>{" "}
        progress number, and the transcript text once it lands.
      </p>
      <CodeBlock
        language="sql"
        filename="schema.sql"
        code={`create table transcriptions (
  id          uuid primary key default gen_random_uuid(),
  storage_path text not null,
  job_id       text,
  status       text not null default 'processing', -- processing|completed|failed
  percent      real not null default 0,            -- overall 0-100
  text         text,
  created_at   timestamptz not null default now()
);

-- so the browser can subscribe to its own rows over Realtime
alter publication supabase_realtime add table transcriptions;`}
      />

      <h2>Transcribe a file in Supabase Storage</h2>
      <p>
        Create a signed URL for the uploaded object (valid long enough to
        outlast transcription) and pass it to <code>transcribe()</code> — the
        SDK auto-detects the URL and streams the audio directly from Supabase.
        Then upsert the transcript into the table.
      </p>
      <CodeTabs
        tabs={[
          {
            label: "JavaScript",
            language: "ts",
            filename: "transcribe-supabase.ts",
            code: `import { createClient } from "@supabase/supabase-js";
import { SpeechRevolutions } from "@speechrevolutions/stt";

// Server-side: service role key, never shipped to the browser.
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
const zephyr = new SpeechRevolutions(); // SPEECHREVOLUTIONS_API_KEY / STT_API_KEY

export async function transcribeFromStorage(id: string, storagePath: string) {
  // 1. Signed URL so Zephyr can read the private object.
  const { data, error } = await supabase.storage
    .from("audio")
    .createSignedUrl(storagePath, 3600); // seconds — outlast the transcription
  if (error) throw error;

  // 2. Pass the URL straight to Zephyr (auto-detected as a URL).
  const result = await zephyr.transcribe(data.signedUrl, {
    speakerLabels: true,
    onProgress: (e) =>
      supabase
        .from("transcriptions")
        .update({ percent: e.percent ?? 0 })
        .eq("id", id), // drives Realtime updates (see below)
  });

  // 3. Store the transcript in Postgres.
  await supabase
    .from("transcriptions")
    .update({ status: "completed", percent: 100, text: result.text })
    .eq("id", id);
}`,
          },
          {
            label: "Python",
            language: "python",
            filename: "transcribe_supabase.py",
            code: `import os

from supabase import create_client
from speechrevolutions import SpeechRevolutions

supabase = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_ROLE_KEY"],  # server-side only
)
zephyr = SpeechRevolutions()  # SPEECHREVOLUTIONS_API_KEY / STT_API_KEY


def transcribe_from_storage(row_id: str, storage_path: str) -> None:
    # 1. Signed URL so Zephyr can read the private object.
    signed = supabase.storage.from_("audio").create_signed_url(
        storage_path, 3600  # seconds — outlast the transcription
    )

    # 2. Pass the URL straight to Zephyr (auto-detected as a URL).
    def on_progress(e):
        supabase.table("transcriptions").update(
            {"percent": e.percent or 0}
        ).eq("id", row_id).execute()

    result = zephyr.transcribe(
        signed["signedURL"], speaker_labels=True, on_progress=on_progress
    )

    # 3. Store the transcript in Postgres.
    supabase.table("transcriptions").update(
        {"status": "completed", "percent": 100, "text": result.text}
    ).eq("id", row_id).execute()`,
          },
        ]}
      />

      <h2>Optional: live progress over Realtime</h2>
      <p>
        Because the <code>on_progress</code>/<code>onProgress</code> callback
        writes <code>percent</code> back to the row, the browser can subscribe
        to that row over Supabase Realtime and update a progress bar with no
        polling. The percentage comes straight from the SDK callback.
      </p>
      <CodeBlock
        language="ts"
        filename="progress-subscription.ts"
        code={`// Browser: anon key + RLS. No Zephyr key here.
const channel = supabase
  .channel("job")
  .on(
    "postgres_changes",
    {
      event: "UPDATE",
      schema: "public",
      table: "transcriptions",
      filter: \`id=eq.\${rowId}\`,
    },
    (payload) => {
      const { percent, status, text } = payload.new;
      setPercent(percent); // 0-100 from the SDK callback
      if (status === "completed") setText(text);
    },
  )
  .subscribe();`}
      />

      <Callout title="Longer files" tone="tip">
        <p>
          For long recordings, use <code>submit()</code> with a{" "}
          <code>callback_url</code> instead of blocking on{" "}
          <code>transcribe()</code>, and update the row from a signed webhook
          handler (verify <code>X-SR-Signature</code>). The{" "}
          <Link href="/integrations/nextjs">Next.js</Link> and{" "}
          <Link href="/integrations/fastapi">FastAPI</Link> guides show complete
          receivers, and{" "}
          <Link href="/guides/live-progress">Live progress for web apps</Link>{" "}
          covers the callback-to-bar weighting.
        </p>
      </Callout>
    </>
  );
}
