import { CodeTabs } from "@/components/CodeTabs";
import { Callout } from "@/components/DocsUI";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Redaction, entities & summaries",
  description:
    "PII redaction, entity detection, profanity filtering, paragraphs, speaker names, summaries and chapters, and deleting a job's transcripts.",
};

export default function AudioIntelligencePage() {
  return (
    <>
      <h1>Redaction, entities &amp; summaries</h1>
      <p>
        These options run on the finished transcript, after diarization. Each one is a request flag, and
        each is off by default. Results that are not words, such as entities, paragraphs, speaker names,
        summaries and chapters, are added to the <code>json</code> output as top-level fields.
      </p>

      <h2 id="flags">Options</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Option</th>
              <th>What it does</th>
              <th>JSON field</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>redact_pii</code></td>
              <td>
                Replaces personal data in the transcript. Each match becomes one word, such as{" "}
                <code>[PHONE_NUMBER]</code>, that spans the original words&apos; time. Narrow it with{" "}
                <code>redact_pii_policies</code> (<code>email_address</code>, <code>phone_number</code>,{" "}
                <code>credit_card_number</code>, <code>us_social_security_number</code>, <code>ip_address</code>;
                all by default). Set <code>redact_pii_sub</code> to <code>&quot;hash&quot;</code> for{" "}
                <code>####</code> instead.
              </td>
              <td>(the words)</td>
            </tr>
            <tr>
              <td><code>entity_detection</code></td>
              <td>Lists the same kinds of data with their times, without redacting them.</td>
              <td><code>entities</code></td>
            </tr>
            <tr>
              <td><code>filter_profanity</code></td>
              <td>Masks profanity, for example <code>f***</code>.</td>
              <td>(the words)</td>
            </tr>
            <tr>
              <td><code>paragraphs</code></td>
              <td>
                Groups the words into paragraphs of sentences. A new paragraph starts at a speaker change,
                after a long pause, or every few sentences.
              </td>
              <td><code>paragraphs</code></td>
            </tr>
            <tr>
              <td><code>speaker_names</code></td>
              <td>
                Names the speakers, when the conversation itself makes it clear who is who (&quot;I&apos;m
                Alice&quot;, &quot;thanks, Bob&quot;). Speakers it can&apos;t identify are left out.
              </td>
              <td><code>speaker_names</code></td>
            </tr>
            <tr>
              <td><code>summarize</code></td>
              <td>A short summary and the key points, in the recording&apos;s language.</td>
              <td><code>summary</code></td>
            </tr>
            <tr>
              <td><code>auto_chapters</code></td>
              <td>Topic sections, each with a headline, a one-sentence gist, and its start and end time.</td>
              <td><code>chapters</code></td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 id="example">Example</h2>
      <CodeTabs
        tabs={[
          {
            label: "Python",
            language: "python",
            code: `result = client.transcribe(
    "support_call.mp3",
    redact_pii=True,
    entity_detection=True,
    speaker_names=True,
    summarize=True,
    auto_chapters=True,
)`,
          },
          {
            label: "JavaScript",
            language: "ts",
            code: `const result = await client.transcribe("support_call.mp3", {
  redactPii: true,
  entityDetection: true,
  speakerNames: true,
  summarize: true,
  autoChapters: true,
});`,
          },
          {
            label: "cURL",
            language: "bash",
            code: `curl -X POST "https://api.speechrevolutions.com/api/v1/transcribe?redact_pii=true&entity_detection=true&speaker_names=true&summarize=true&auto_chapters=true" \\
  -H "X-API-Key: $SPEECHREVOLUTIONS_API_KEY" \\
  --data-binary @support_call.mp3`,
          },
        ]}
      />
      <p>The JSON transcript then carries, next to <code>words</code>:</p>
      <CodeTabs
        tabs={[
          {
            label: "JSON",
            language: "json",
            code: `{
  "words": [ ..., { "word": "[PHONE_NUMBER].", "start": 12.4, "end": 14.1, "speaker": "SPEAKER_1" }, ... ],
  "entities": [ { "entity_type": "phone_number", "text": "555-123-4567.", "start": 12.4, "end": 14.1 } ],
  "speaker_names": { "SPEAKER_1": "Alice", "SPEAKER_2": "Bob" },
  "summary": { "text": "Alice called about a refund ...", "bullets": ["...", "..."] },
  "chapters": [ { "start": 0.0, "end": 95.3, "headline": "Refund request", "gist": "..." } ]
}`,
          },
        ]}
      />
      <Callout title="What is detected">
        Detection of personal data uses patterns: it reads spoken digits (&quot;five five five ...&quot;) and spoken
        email addresses (&quot;jane at gmail dot com&quot;), and checks card numbers&apos; checksums. Names, organisations
        and addresses are not redacted yet. Speaker names, summaries and chapters come from a language model that
        only uses what is in the transcript: a speaker is named only when the transcript contains the evidence, and
        every chapter time is a word&apos;s real timestamp.
      </Callout>

      <h2 id="delete">Delete a job&apos;s transcripts</h2>
      <p>
        Transcripts are deleted automatically after 24 hours. To delete one sooner, call{" "}
        <code>DELETE /api/v1/jobs/&#123;job_id&#125;</code> with the key that created the job. The usage record is
        kept for billing.
      </p>
      <CodeTabs
        tabs={[
          { label: "Python", language: "python", code: `client.delete_job(job_id)` },
          { label: "JavaScript", language: "ts", code: `await client.deleteJob(jobId);` },
          {
            label: "cURL",
            language: "bash",
            code: `curl -X DELETE "https://api.speechrevolutions.com/api/v1/jobs/$JOB_ID" \\
  -H "X-API-Key: $SPEECHREVOLUTIONS_API_KEY"`,
          },
        ]}
      />
      <p>
        See <Link href="/guides/features">Features &amp; formats</Link> for every other option.
      </p>
    </>
  );
}
