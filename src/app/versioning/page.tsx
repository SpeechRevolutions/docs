import { CodeBlock } from "@/components/CodeBlock";
import { Callout } from "@/components/DocsUI";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Versioning and deprecation",
  description:
    "How the Speech Revolutions API is versioned, what counts as a breaking change, and the notice you get before anything is removed.",
};

export default function VersioningPage() {
  return (
    <>
      <h1>Versioning and deprecation</h1>
      <p>
        This page describes how the API is versioned, which changes can happen without
        notice, and how you are notified before anything is removed.
      </p>

      <h2>How the API is versioned</h2>
      <p>
        The version is in the path: every endpoint lives under <code>/api/v1/</code>. A new
        major version would appear at <code>/api/v2/</code> alongside it, not in place of it.
      </p>

      <h2>What is not a breaking change</h2>
      <p>
        These changes can happen at any time. Your client must tolerate them.
      </p>
      <ul>
        <li>A new field in a response object.</li>
        <li>A new optional field in a request.</li>
        <li>A new endpoint, or a new value in a list we already return.</li>
        <li>
          A new event type on the progress stream. Ignore event types you do not recognize
          rather than failing.
        </li>
        <li>
          The order of fields in a JSON object, and the exact wording of an error{" "}
          <code>detail</code> string. Match on the status code and the error type, never on
          prose.
        </li>
      </ul>

      <h2>What is a breaking change</h2>
      <ul>
        <li>Removing or renaming a field, an endpoint or an enum value.</li>
        <li>Changing a field&apos;s type, or making an optional request field required.</li>
        <li>Changing the meaning of an existing status code.</li>
      </ul>
      <p>
        Breaking changes ship only in a new major version. <code>v1</code> receives no
        breaking changes.
      </p>

      <h2>Deprecation policy</h2>
      <p>
        A deprecated endpoint returns these headers on every response, per{" "}
        <a href="https://www.rfc-editor.org/rfc/rfc9745.html">RFC 9745</a> and{" "}
        <a href="https://www.rfc-editor.org/rfc/rfc8594.html">RFC 8594</a>:
      </p>

      <p>
        For example (illustrative dates — nothing is deprecated today):
      </p>
      <CodeBlock
        language="http"
        code={`Deprecation: @1893456000
Sunset: Wed, 01 Jan 2031 00:00:00 GMT
Link: <https://docs.speechrevolutions.com/versioning>; rel="deprecation"`}
      />

      <ul>
        <li>
          <code>Deprecation</code> — when the endpoint was deprecated. It still works.
        </li>
        <li>
          <code>Sunset</code> — the date it stops working. Always at least{" "}
          <strong>12 months</strong> after the <code>Deprecation</code> date for anything in a
          stable version.
        </li>
        <li>
          <code>Link</code> — where to read what replaces it.
        </li>
      </ul>

      <p>
        The account owner also gets an email at deprecation, three months before the sunset,
        and one month before it. Log a warning whenever you see a <code>Sunset</code> header.
      </p>

      <Callout tone="info" title="Nothing is deprecated today">
        The <code>v1</code> API has no deprecated endpoints and no scheduled sunsets.
      </Callout>

      <h2>SDK versioning</h2>
      <p>
        The Python, JavaScript, Go and C# SDKs follow semantic versioning independently of the
        API. A major SDK release may change the SDK&apos;s interface without any API change. Pin
        a major version and read the changelog before you upgrade.
      </p>

      <h2>Security exception</h2>
      <p>
        If a field or behavior exposes customer data, it is changed immediately, without the
        notice period above, and you are notified afterwards.
      </p>
    </>
  );
}
