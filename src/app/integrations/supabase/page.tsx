import { CodeBlock } from "@/components/CodeBlock";
import { CodeTabs } from "@/components/CodeTabs";
import { Callout } from "@/components/DocsUI";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Using Speech Revolutions with Supabase",
  description:
    "Transcribe audio in Supabase Storage without downloading it: create a signed URL, pass it to Speech Revolutions, write the transcript to a Postgres table, and stream progress over Realtime.",
};

export default function SupabaseIntegrationPage() {
  return (
    <>
      <h1>Using Speech Revolutions with Supabase</h1>
      <p>
        If your users upload audio to Supabase Storage, you can transcribe it without
        downloading it: create a signed URL for the object, pass it to Speech Revolutions,
        and write the transcript to a Postgres table. You can also stream progress to the
        browser over Supabase Realtime. The Speech Revolutions API key and the Supabase
        service role key stay on the server.
      </p>

      <Callout title="Use the service role key on the server only" tone="warn">
        <p>
          Creating signed URLs and privileged table writes use the Supabase service role
          key. Keep it, and <code>SPEECHREVOLUTIONS_API_KEY</code>, on your server. The
          browser uses only the anon key and reads rows through Row Level Security.
        </p>
      </Callout>

      <h2>The table</h2>
      <p>
        Create one row per job with the storage path, a status, a <code>0–100</code>{" "}
        progress value, and the transcript text when the job completes.
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
        Create a signed URL for the uploaded object, with an expiry longer than the
        transcription time, and pass it to <code>transcribe()</code>. The SDK detects the
        URL and Speech Revolutions fetches the audio directly from Supabase. Then write the
        transcript to the table.
      </p>
      <CodeTabs
        tabs={[
          {
            label: "JavaScript",
            language: "ts",
            filename: "transcribe-supabase.ts",
            code: `import { createClient } from "@supabase/supabase-js";
import { SpeechRevolutions } from "speechrevolutions";

// Server-side: service role key, never shipped to the browser.
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
const stt = new SpeechRevolutions(); // SPEECHREVOLUTIONS_API_KEY

export async function transcribeFromStorage(id: string, storagePath: string) {
  // 1. Signed URL so Speech Revolutions can read the private object.
  const { data, error } = await supabase.storage
    .from("audio")
    .createSignedUrl(storagePath, 3600); // seconds — outlast the transcription
  if (error) throw error;

  // 2. Pass the URL straight to Speech Revolutions (auto-detected as a URL).
  const result = await stt.transcribe(data.signedUrl, {
    speakerLabels: true,
    onProgress: (e) => {
      // A Supabase query only runs once it is awaited or then'd.
      void supabase
        .from("transcriptions")
        .update({ percent: e.percent ?? 0 })
        .eq("id", id) // drives Realtime updates (see below)
        .then(({ error }) => error && console.error(error));
    },
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
stt = SpeechRevolutions()  # SPEECHREVOLUTIONS_API_KEY


def transcribe_from_storage(row_id: str, storage_path: str) -> None:
    # 1. Signed URL so Speech Revolutions can read the private object.
    signed = supabase.storage.from_("audio").create_signed_url(
        storage_path, 3600  # seconds — outlast the transcription
    )

    # 2. Pass the URL straight to Speech Revolutions (auto-detected as a URL).
    def on_progress(e):
        supabase.table("transcriptions").update(
            {"percent": e.percent or 0}
        ).eq("id", row_id).execute()

    result = stt.transcribe(
        signed["signedURL"], speaker_labels=True, on_progress=on_progress
    )

    # 3. Store the transcript in Postgres.
    supabase.table("transcriptions").update(
        {"status": "completed", "percent": 100, "text": result.text}
    ).eq("id", row_id).execute()`,
          },
          {
            label: "Go",
            language: "go",
            filename: "transcribe_supabase.go",
            code: `package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	stt "github.com/speechrevolutions/speechrevolutions-go"
)

// Supabase ships client libraries for JavaScript and Python, not Go, so this
// calls the same REST endpoints those libraries wrap. Server-side: the service
// role key, never shipped to a client.
var (
	supabaseURL = os.Getenv("SUPABASE_URL")
	serviceKey  = os.Getenv("SUPABASE_SERVICE_ROLE_KEY")
)

func supabaseDo(ctx context.Context, method, path string, body any) (*http.Response, error) {
	var buf bytes.Buffer
	if body != nil {
		if err := json.NewEncoder(&buf).Encode(body); err != nil {
			return nil, err
		}
	}
	req, err := http.NewRequestWithContext(ctx, method, supabaseURL+path, &buf)
	if err != nil {
		return nil, err
	}
	req.Header.Set("apikey", serviceKey)
	req.Header.Set("Authorization", "Bearer "+serviceKey)
	req.Header.Set("Content-Type", "application/json")
	return http.DefaultClient.Do(req)
}

// signedURL asks Storage for a short-lived URL to a private object.
func signedURL(ctx context.Context, bucket, path string, expiresIn int) (string, error) {
	resp, err := supabaseDo(ctx, http.MethodPost,
		"/storage/v1/object/sign/"+bucket+"/"+path,
		map[string]int{"expiresIn": expiresIn})
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var out struct {
		SignedURL string \`json:"signedURL"\`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return "", err
	}
	return supabaseURL + "/storage/v1" + out.SignedURL, nil
}

func updateRow(ctx context.Context, id string, patch map[string]any) error {
	resp, err := supabaseDo(ctx, http.MethodPatch, "/rest/v1/transcriptions?id=eq."+id, patch)
	if err != nil {
		return err
	}
	return resp.Body.Close()
}

func transcribeFromStorage(ctx context.Context, client *stt.Client, id, storagePath string) error {
	// 1. Signed URL so Speech Revolutions can read the private object.
	audioURL, err := signedURL(ctx, "audio", storagePath, 3600) // outlast the transcription
	if err != nil {
		return err
	}

	// 2. Pass the URL straight to Speech Revolutions (auto-detected as a URL).
	result, err := client.Transcribe(ctx, audioURL, stt.TranscribeOptions{
		SpeakerLabels: stt.Bool(true),
	}, func(e stt.ProgressEvent) {
		pct, _ := e.Percent()
		updateRow(ctx, id, map[string]any{"percent": pct}) // drives Realtime updates
	})
	if err != nil {
		return err
	}

	// 3. Store the transcript in Postgres.
	return updateRow(ctx, id, map[string]any{
		"status":  "completed",
		"percent": 100,
		"text":    result.Text(),
	})
}

func main() {
	client, err := stt.NewClient("")
	if err != nil {
		log.Fatal(err)
	}
	if err := transcribeFromStorage(
		context.Background(), client, "row-id", "meeting.mp3"); err != nil {
		log.Fatal(err)
	}
	fmt.Println("done")
}`,
          },
          {
            label: "C#",
            language: "csharp",
            filename: "TranscribeSupabase.cs",
            code: `using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using SpeechRevolutions;

// Supabase ships client libraries for JavaScript and Python, not C#, so this
// calls the same REST endpoints those libraries wrap. Server-side: the service
// role key, never shipped to a client.
var supabaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL")!;
var serviceKey = Environment.GetEnvironmentVariable("SUPABASE_SERVICE_ROLE_KEY")!;

using var http = new HttpClient { BaseAddress = new Uri(supabaseUrl) };
http.DefaultRequestHeaders.Add("apikey", serviceKey);
http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", serviceKey);

using var client = new SpeechRevolutionsClient(); // SPEECHREVOLUTIONS_API_KEY

// Ask Storage for a short-lived URL to a private object.
async Task<string> SignedUrlAsync(string bucket, string path, int expiresIn)
{
    var res = await http.PostAsJsonAsync(
        $"/storage/v1/object/sign/{bucket}/{path}", new { expiresIn });
    res.EnsureSuccessStatusCode();

    using var doc = JsonDocument.Parse(await res.Content.ReadAsStringAsync());
    return supabaseUrl + "/storage/v1" + doc.RootElement.GetProperty("signedURL").GetString();
}

Task UpdateRowAsync(string id, object patch) =>
    http.PatchAsJsonAsync($"/rest/v1/transcriptions?id=eq.{id}", patch);

async Task TranscribeFromStorageAsync(string id, string storagePath)
{
    // 1. Signed URL so Speech Revolutions can read the private object.
    var audioUrl = await SignedUrlAsync("audio", storagePath, 3600);

    // 2. Pass the URL straight to Speech Revolutions (auto-detected as a URL).
    var result = await client.TranscribeAsync(audioUrl,
        new TranscribeOptions { SpeakerLabels = true },
        e => UpdateRowAsync(id, new { percent = e.Percent ?? 0 })); // drives Realtime

    // 3. Store the transcript in Postgres.
    await UpdateRowAsync(id, new { status = "completed", percent = 100, text = result.Text });
}

await TranscribeFromStorageAsync("row-id", "meeting.mp3");`,
          },
        ]}
      />

      <h2>Optional: live progress over Realtime</h2>
      <p>
        The <code>on_progress</code>/<code>onProgress</code> callback writes{" "}
        <code>percent</code> to the row, so the browser can subscribe to that row over
        Supabase Realtime and update a progress bar without polling.
      </p>
      <CodeBlock
        language="ts"
        filename="progress-subscription.ts"
        code={`// Browser: anon key + RLS. No Speech Revolutions key here.
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
          <code>transcribe()</code>, and update the row from your webhook handler after
          verifying <code>X-SR-Signature</code> with your signing secret (see{" "}
          <Link href="/guides/webhooks">Webhooks</Link>). The{" "}
          <Link href="/integrations/nextjs">Next.js</Link> and{" "}
          <Link href="/integrations/fastapi">FastAPI</Link> guides show complete
          receivers, and{" "}
          <Link href="/guides/live-progress">Live progress for web apps</Link> explains
          how to weight the callbacks into one progress bar.
        </p>
      </Callout>
    </>
  );
}
