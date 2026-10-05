import { CodeBlock } from "@/components/CodeBlock";
import { CodeTabs } from "@/components/CodeTabs";
import { Callout } from "@/components/DocsUI";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Output formats & subtitles",
  description:
    "The six Speech Revolutions output_type values — txt, json, srt, vtt, docx, pdf — the JSON schema, and generating subtitles and documents.",
};

export default function OutputFormatsGuidePage() {
  return (
    <>
      <h1>Output formats &amp; subtitles</h1>
      <p>
        Set <code>output_type</code> to choose what the server returns:
        structured JSON, plain text, subtitle files, or formatted documents.
        The default is <code>json</code>. The server does the formatting. The
        SDK writes a file only when you call <code>save()</code>.
      </p>

      <h2 id="formats">The six formats</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>
                <code>output_type</code>
              </th>
              <th>What you get</th>
              <th>Use it when</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>json</code> <em>(default)</em>
              </td>
              <td>
                Structured document with per-word timings and speakers. The SDK parses it into{" "}
                <code>.text</code>, <code>.words</code>, <code>.utterances</code>.
              </td>
              <td>You&apos;re writing code against the result.</td>
            </tr>
            <tr>
              <td>
                <code>txt</code>
              </td>
              <td>Plain transcript text, no timing or structure.</td>
              <td>You just need the words.</td>
            </tr>
            <tr>
              <td>
                <code>srt</code>
              </td>
              <td>SubRip subtitles: numbered cues with start and end times.</td>
              <td>Captions for most video players and editors.</td>
            </tr>
            <tr>
              <td>
                <code>vtt</code>
              </td>
              <td>WebVTT subtitles.</td>
              <td>
                Web video (<code>&lt;track&gt;</code>) and HTML5 players.
              </td>
            </tr>
            <tr>
              <td>
                <code>docx</code>
              </td>
              <td>Formatted Word document.</td>
              <td>Shareable transcripts for non-technical readers.</td>
            </tr>
            <tr>
              <td>
                <code>pdf</code>
              </td>
              <td>Formatted PDF document.</td>
              <td>Fixed-layout, print-ready transcripts.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Every SDK accepts <code>output_type</code>: as a keyword argument in
        Python, an option field in JavaScript, and the <code>OutputType</code>{" "}
        enum in <Link href="/sdks/go">Go</Link> (<code>stt.OutputSRT</code>) and{" "}
        <Link href="/sdks/csharp">C#</Link> (<code>OutputType.Srt</code>).
      </p>

      <h2 id="json">The JSON schema</h2>
      <p>
        The default <code>json</code> output is a document built around a{" "}
        <code>words</code> array. Each word has the token plus optional{" "}
        <code>start</code>, <code>end</code>, <code>speaker</code>,{" "}
        <code>confidence</code>, and <code>language</code> fields. With
        diarization on, the document may also include <code>diarization</code>{" "}
        segments. When the audio switches languages, it may also include a{" "}
        <code>languages</code> array. The SDK reads this into a transcript
        object: it derives <code>.text</code>, groups words into{" "}
        <code>.utterances</code>, and keeps the original in <code>.raw</code>.
      </p>
      <CodeBlock
        language="json"
        filename="json output"
        code={`{
  "words": [
    { "word": "Hi",      "start": 0.50, "end": 0.68, "speaker": "SPEAKER_1", "language": "en" },
    { "word": "there",   "start": 0.68, "end": 0.94, "speaker": "SPEAKER_1", "language": "en" }
  ],
  "diarization": [
    { "speaker": "SPEAKER_1", "start": 0.50, "end": 0.94 }
  ],
  "languages": [
    { "language": "en", "start": 0.50, "end": 0.94 }
  ]
}`}
      />
      <p>
        Use{" "}
        <code>result.to_dict()</code> for a provider-neutral dict:
      </p>
      <CodeBlock
        language="json"
        filename="result.to_dict()"
        code={`{
  "id": "d1f2...-job-id",
  "status": "completed",
  "text": "Hi there ...",
  "words": [
    { "word": "Hi", "text": "Hi", "start": 0.5, "end": 0.68, "speaker": "SPEAKER_1", "language": "en" }
  ],
  "utterances": [
    { "text": "Hi there", "transcript": "Hi there", "speaker": "SPEAKER_1",
      "start": 0.5, "end": 0.94, "words": [ ... ] }
  ],
  "languages": [
    { "start": 0.5, "end": 0.94, "language": "en" }
  ],
  "output_type": "json"
}`}
      />
      <p>
        For migrations, <code>result.to_deepgram()</code> returns the same data
        in Deepgram&apos;s pre-recorded response shape, with the text at{" "}
        <code>results.channels[0].alternatives[0].transcript</code>. See the{" "}
        <Link href="/sdks/python">Python SDK</Link> result-shape table for the
        full member list.
      </p>

      <h2 id="subtitles">Subtitles: SRT &amp; VTT</h2>
      <p>
        Request <code>srt</code> or <code>vtt</code> and the server returns a
        formatted subtitle file. For these outputs, <code>result.text</code> is
        the decoded file contents and <code>result.save()</code> writes it to
        disk, adding the extension for the output type when your path has none.
      </p>
      <CodeTabs
        tabs={[
          {
            label: "Python",
            language: "python",
            code: `srt = client.transcribe("meeting.mp3", output_type="srt")
print(srt.text)          # the decoded .srt contents
srt.save("meeting")      # -> meeting.srt

vtt = client.transcribe("meeting.mp3", output_type="vtt")
vtt.save("meeting")      # -> meeting.vtt`,
          },
          {
            label: "JavaScript",
            language: "ts",
            code: `const srt = await client.transcribe("meeting.mp3", { outputType: "srt" });
console.log(srt.text);        // the decoded .srt contents
await srt.save("meeting");    // -> meeting.srt

const vtt = await client.transcribe("meeting.mp3", { outputType: "vtt" });
await vtt.save("meeting");    // -> meeting.vtt`,
          },
          {
            label: "Go",
            language: "go",
            code: `srt, err := client.Transcribe(ctx, "meeting.mp3", stt.TranscribeOptions{
	OutputType: stt.OutputSRT,
}, nil)
if err != nil {
	log.Fatal(err)
}
fmt.Println(srt.Text())     // the decoded .srt contents
srt.Save("meeting")         // -> meeting.srt

vtt, err := client.Transcribe(ctx, "meeting.mp3", stt.TranscribeOptions{
	OutputType: stt.OutputVTT,
}, nil)
if err != nil {
	log.Fatal(err)
}
vtt.Save("meeting")         // -> meeting.vtt`,
          },
          {
            label: "C#",
            language: "csharp",
            code: `var srt = await client.TranscribeAsync("meeting.mp3",
    new TranscribeOptions { OutputType = OutputType.Srt });
Console.WriteLine(srt.Text);      // the decoded .srt contents
await srt.SaveAsync("meeting");   // -> meeting.srt

var vtt = await client.TranscribeAsync("meeting.mp3",
    new TranscribeOptions { OutputType = OutputType.Vtt });
await vtt.SaveAsync("meeting");   // -> meeting.vtt`,
          },
        ]}
      />
      <h3 id="cues">How cues are built</h3>
      <p>
        Each cue is a run of consecutive words from <strong>one speaker</strong>, shown as at
        most two lines of up to 42 characters. A new cue starts when:
      </p>
      <ul>
        <li>the speaker changes (a cue never spans two speakers);</li>
        <li>the next word would need a third line, or would take the cue past 7 seconds;</li>
        <li>there is a pause of more than 1 second before the next word;</li>
        <li>a sentence ends (<code>.</code> <code>?</code> <code>!</code>) and the cue has already run for at least 1 second.</li>
      </ul>
      <p>
        A cue runs from its first word&apos;s start to its last word&apos;s end. With speaker
        labels on (the default), the cue&apos;s first line starts with the speaker, for example{" "}
        <code>SPEAKER_1: </code>. Turn <code>speaker_labels</code> off for captions without
        speaker names. SRT times are <code>HH:MM:SS,mmm</code>; VTT times are{" "}
        <code>HH:MM:SS.mmm</code>, after a <code>WEBVTT</code> header.
      </p>
      <CodeBlock
        language="text"
        filename="diamond-necklace.srt (excerpt)"
        code={`5
00:00:11,599 --> 00:00:15,820
SPEAKER_1: It is very select and they are not giving
many invitations to clerks.

6
00:00:16,769 --> 00:00:18,769
SPEAKER_1: The whole official world will be there.

7
00:00:19,629 --> 00:00:25,399
SPEAKER_2: She looked at him with an irritated glance
and said impatiently, And what do you wish

8
00:00:25,460 --> 00:00:26,600
SPEAKER_2: me to put on my back?`}
      />
      <CodeBlock
        language="text"
        filename="diamond-necklace.vtt (excerpt)"
        code={`WEBVTT

00:00:11.599 --> 00:00:15.820
SPEAKER_1: It is very select and they are not giving
many invitations to clerks.

00:00:16.769 --> 00:00:18.769
SPEAKER_1: The whole official world will be there.

00:00:19.629 --> 00:00:25.399
SPEAKER_2: She looked at him with an irritated glance
and said impatiently, And what do you wish

00:00:25.460 --> 00:00:26.600
SPEAKER_2: me to put on my back?`}
      />
      <Callout title="SRT or VTT?" tone="tip">
        <p>
          Both are cue lists with timings. Use <code>srt</code> for desktop video
          editors and most players; use <code>vtt</code> for the web, where the
          HTML5 <code>&lt;track&gt;</code> element expects WebVTT.
        </p>
      </Callout>

      <h2 id="documents">Documents: DOCX &amp; PDF</h2>
      <p>
        <code>docx</code> and <code>pdf</code> return a formatted document as raw
        bytes. Save them to disk or stream them to your user; don&apos;t decode
        them as text. <code>docx</code> is editable; <code>pdf</code>{" "}
        is fixed-layout and print-ready.
      </p>
      <CodeTabs
        tabs={[
          {
            label: "Python",
            language: "python",
            code: `docx = client.transcribe("meeting.mp3", output_type="docx")
docx.save("meeting")     # -> meeting.docx

pdf = client.transcribe("meeting.mp3", output_type="pdf")
# .content is the raw bytes if you'd rather stream than save
with open("meeting.pdf", "wb") as f:
    f.write(pdf.content)`,
          },
          {
            label: "JavaScript",
            language: "ts",
            code: `const docx = await client.transcribe("meeting.mp3", { outputType: "docx" });
await docx.save("meeting"); // -> meeting.docx

const pdf = await client.transcribe("meeting.mp3", { outputType: "pdf" });
// .content is the raw bytes if you'd rather stream than save
await pdf.save("meeting");  // -> meeting.pdf`,
          },
          {
            label: "Go",
            language: "go",
            code: `docx, err := client.Transcribe(ctx, "meeting.mp3", stt.TranscribeOptions{
	OutputType: stt.OutputDOCX,
}, nil)
if err != nil {
	log.Fatal(err)
}
docx.Save("meeting")        // -> meeting.docx

pdf, err := client.Transcribe(ctx, "meeting.mp3", stt.TranscribeOptions{
	OutputType: stt.OutputPDF,
}, nil)
if err != nil {
	log.Fatal(err)
}
// Content is the raw bytes if you'd rather stream than save.
os.WriteFile("meeting.pdf", pdf.Content, 0o644)`,
          },
          {
            label: "C#",
            language: "csharp",
            code: `var docx = await client.TranscribeAsync("meeting.mp3",
    new TranscribeOptions { OutputType = OutputType.Docx });
await docx.SaveAsync("meeting");  // -> meeting.docx

var pdf = await client.TranscribeAsync("meeting.mp3",
    new TranscribeOptions { OutputType = OutputType.Pdf });
// Content is the raw bytes if you'd rather stream than save.
await File.WriteAllBytesAsync("meeting.pdf", pdf.Content);`,
          },
        ]}
      />
      <Callout title="Retrieving a specific format later" tone="info">
        <p>
          When you <Link href="/cookbook#submit-poll">submit and poll</Link>, ask
          for the format at retrieval time. Python{" "}
          <code>get_transcript(job_id, output_type=&quot;srt&quot;)</code>, Go{" "}
          <code>GetTranscript(id, stt.OutputSRT)</code>. Submit with{" "}
          <code>json</code> to keep the richest data; you can render subtitles or
          documents from it later.
        </p>
      </Callout>

      <h2 id="choosing">Choosing a format</h2>
      <ul>
        <li>
          <strong>Building software</strong>: <code>json</code>. It is the only
          format with structured{" "}
          <Link href="/guides/timestamps">timestamps</Link> and{" "}
          <Link href="/guides/diarization">speaker</Link> data you can iterate.
        </li>
        <li>
          <strong>Captioning video</strong>: <code>srt</code> or{" "}
          <code>vtt</code>, formatted by the server.
        </li>
        <li>
          <strong>Sharing with people</strong>: <code>docx</code> (editable) or{" "}
          <code>pdf</code> (print-ready).
        </li>
        <li>
          <strong>Just the words</strong>: <code>txt</code>.
        </li>
      </ul>

      <Callout title="Related" tone="tip">
        <p>
          <Link href="/cookbook#subtitles">The cookbook</Link> has short subtitle
          recipes. <Link href="/guides/timestamps">Timestamps</Link> and{" "}
          <Link href="/guides/diarization">diarization</Link> cover the structured
          data behind the <code>json</code> output.
        </p>
      </Callout>
    </>
  );
}
