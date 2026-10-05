import { CodeBlock } from "@/components/CodeBlock";
import { CodeTabs } from "@/components/CodeTabs";
import { Callout } from "@/components/DocsUI";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Generate subtitles automatically",
  description:
    "Speech Revolutions can hand you finished subtitle files, not just raw text. Set output_type to \"srt\" or \"vtt\" and the transcript comes back as a ready-to-ship caption…",
};

export default function SubtitlesTutorialPage() {
  return (
    <>
      <h1>Generate subtitles automatically</h1>
      <p>
        Speech Revolutions can hand you finished subtitle files, not just raw text. Set{" "}
        <code>output_type</code> to <code>&quot;srt&quot;</code> or{" "}
        <code>&quot;vtt&quot;</code> and the transcript comes back as a
        ready-to-ship caption file — correctly numbered, time-cued, and
        line-wrapped. No post-processing of word timestamps required. This
        tutorial covers picking the format, saving the file, and the choice
        between shipping it as a sidecar or burning it into the video.
      </p>

      <h2>SRT vs VTT</h2>
      <p>
        Both are supported values of <code>output_type</code> (alongside{" "}
        <code>txt</code>, <code>json</code>, <code>docx</code>, and{" "}
        <code>pdf</code>). They differ only in where they&apos;re used:
      </p>
      <ul>
        <li>
          <code>srt</code> (SubRip) — the universal default. Accepted by
          virtually every video player, editor, and platform (YouTube, Premiere,
          VLC). Reach for this unless you specifically need VTT.
        </li>
        <li>
          <code>vtt</code> (WebVTT) — the web-native format for the HTML5{" "}
          <code>&lt;track&gt;</code> element. Use it when captions are served to
          a browser <code>&lt;video&gt;</code> player.
        </li>
      </ul>
      <p>
        See the{" "}
        <Link href="/guides/output-formats">Output formats &amp; subtitles</Link>{" "}
        guide for the full list of formats and what each returns.
      </p>

      <h2>Generate and save the file</h2>
      <p>
        Pass the format as <code>output_type</code>, then call{" "}
        <code>result.save()</code>. It writes the raw content to disk and
        appends the correct extension if your path has none — <code>save(&quot;captions&quot;)</code>{" "}
        with <code>output_type=&quot;srt&quot;</code> writes{" "}
        <code>captions.srt</code> — and returns the path it wrote.
      </p>
      <CodeTabs
        tabs={[
          {
            label: "Python",
            language: "python",
            filename: "subtitles.py",
            code: `from speechrevolutions import SpeechRevolutions

client = SpeechRevolutions()  # reads SPEECHREVOLUTIONS_API_KEY

result = client.transcribe(
    "talk.mp4",              # audio or video: local path, URL, bytes, or file object
    output_type="srt",       # ask Speech Revolutions for SubRip captions (use "vtt" for WebVTT)
)

path = result.save("captions")  # writes captions.srt; returns the path
print(f"Wrote {path}")`,
          },
          {
            label: "JavaScript",
            language: "ts",
            filename: "subtitles.mjs",
            code: `import { SpeechRevolutions } from "speechrevolutions";

const client = new SpeechRevolutions();

const result = await client.transcribe("talk.mp4", {
  outputType: "srt", // SubRip captions (use "vtt" for WebVTT)
});

const path = await result.save("captions"); // writes captions.srt; returns the path
console.log(\`Wrote \${path}\`);`,
          },
          {
            label: "cURL",
            language: "bash",
            filename: "output_type",
            code: `# output_type=srt (or vtt): the transcript event carries the finished
# subtitle file, and the job's download_url serves the same file.
curl -N -X POST "https://api.speechrevolutions.com/api/v1/transcribe?output_type=srt" \\
  -H "X-API-Key: $SPEECHREVOLUTIONS_API_KEY" \\
  --data-binary @talk.mp3`,
          },
          {
            label: "Go",
            language: "go",
            filename: "subtitles.go",
            code: `package main

import (
	"context"
	"fmt"
	"log"

	stt "github.com/speechrevolutions/speechrevolutions-go"
)

func main() {
	client, err := stt.NewClient("") // reads SPEECHREVOLUTIONS_API_KEY
	if err != nil {
		log.Fatal(err)
	}

	result, err := client.Transcribe(context.Background(),
		"talk.mp4", // audio or video: local path, URL, or bytes
		stt.TranscribeOptions{
			OutputType: stt.OutputSRT, // SubRip captions (use OutputVTT for WebVTT)
		}, nil)
	if err != nil {
		log.Fatal(err)
	}

	path, err := result.Save("captions") // writes captions.srt; returns the path
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("Wrote %s\\n", path)
}`,
          },
          {
            label: "C#",
            language: "csharp",
            filename: "Subtitles.cs",
            code: `using SpeechRevolutions;

using var client = new SpeechRevolutionsClient(); // reads SPEECHREVOLUTIONS_API_KEY

var result = await client.TranscribeAsync(
    "talk.mp4",  // audio or video: local path, URL, or bytes
    new TranscribeOptions
    {
        OutputType = OutputType.Srt, // SubRip captions (use Vtt for WebVTT)
    });

var path = await result.SaveAsync("captions"); // writes captions.srt
Console.WriteLine($"Wrote {path}");`,
          },
        ]}
      />

      <Callout title="Timestamps are already handled" tone="tip">
        <p>
          When you ask for <code>srt</code> or <code>vtt</code>, Speech Revolutions does the
          cueing for you — you don&apos;t need to request{" "}
          <code>word_timestamps</code> or assemble cues from <code>.words</code>{" "}
          yourself. The file is ready to load into a player as-is.
        </p>
      </Callout>

      <h2>What the file looks like</h2>
      <p>
        Cues follow the usual captioning rules: one speaker per cue, at most two lines of 42
        characters, at most 7 seconds, and a break at pauses longer than a second and at
        sentence ends. With speaker labels on (the default), the first line of each cue starts
        with the speaker, like <code>SPEAKER_1: </code>; turn <code>speaker_labels</code> off
        for captions without it. The full rules are in{" "}
        <Link href="/guides/output-formats#cues">Output formats</Link>.
      </p>
      <CodeBlock
        language="text"
        filename="captions.srt (excerpt)"
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

      <h2>Sidecar vs burned-in</h2>
      <p>
        Once you have the file, there are two ways to get captions in front of a
        viewer, and the right one depends on where the video plays.
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Approach</th>
              <th>What it is</th>
              <th>Best when</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Sidecar</strong>
              </td>
              <td>
                Ship the <code>.srt</code>/<code>.vtt</code> as a separate file
                alongside the video; the player overlays it at playback.
              </td>
              <td>
                You control the player (a web <code>&lt;video&gt;</code>, a
                streaming platform, VLC). Viewers can toggle captions on/off and
                you can serve multiple languages.
              </td>
            </tr>
            <tr>
              <td>
                <strong>Burned-in</strong>
              </td>
              <td>
                Render the captions permanently into the video&apos;s pixels, so
                they&apos;re part of the picture.
              </td>
              <td>
                The destination has no caption support or you can&apos;t trust it
                to — social autoplay clips, embedded GIFs, downloads. Always
                visible; not toggleable.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>
        <strong>Sidecar</strong> is the default and needs nothing beyond the
        saved file. For a browser player, point a <code>&lt;track&gt;</code> at
        the VTT file:
      </p>
      <CodeBlock
        language="html"
        filename="player.html"
        code={`<video controls>
  <source src="talk.mp4" type="video/mp4" />
  <track src="captions.vtt" kind="subtitles" srclang="en" label="English" default />
</video>`}
      />

      <p>
        <strong>Burning in</strong> happens outside Speech Revolutions — Speech Revolutions produces the
        subtitle file; a video tool renders it into the frames. The common tool
        is <code>ffmpeg</code>, which reads your saved <code>.srt</code>:
      </p>
      <CodeBlock
        language="bash"
        filename="burn-in with ffmpeg"
        code={`# ffmpeg is third-party tooling, not part of Speech Revolutions — shown for completeness.
ffmpeg -i talk.mp4 -vf "subtitles=captions.srt" talk-captioned.mp4`}
      />

      <Callout title="Which should I ship?" tone="info">
        <p>
          Prefer <strong>sidecar</strong> whenever the player supports it — it
          keeps captions accessible, toggleable, translatable, and re-editable
          without re-encoding the video. Reach for <strong>burned-in</strong>{" "}
          only when the playback surface won&apos;t render a separate track.
        </p>
      </Callout>

      <p>
        That&apos;s subtitles end to end: one <code>output_type</code>, one{" "}
        <code>save()</code>, and a delivery choice. To generate captions from an
        upload with a live progress bar, combine this with the{" "}
        <Link href="/tutorials/meeting-app">meeting-app tutorial</Link>; for the
        full format reference see{" "}
        <Link href="/guides/output-formats">Output formats &amp; subtitles</Link>.
      </p>
    </>
  );
}
