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
        Integrations outlive the decisions that shaped them. This page says what we will and
        will not change under you, so you can decide how much to pin.
      </p>

      <h2>How the API is versioned</h2>
      <p>
        The version is in the path: every endpoint lives under <code>/api/v1/</code>. A new
        major version would appear at <code>/api/v2/</code> alongside it, not in place of it.
      </p>

      <h2>What is not a breaking change</h2>
      <p>
        These can land at any time, and your client must tolerate them. Treat this list as the
        contract it is — code written to break on any of these is code that will break.
      </p>
      <ul>
        <li>A new field in a response object.</li>
        <li>A new optional field in a request.</li>
        <li>A new endpoint, or a new value in a list we already return.</li>
        <li>
          A new event type on the progress stream. Ignore event types you do not recognise
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
        Anything in this list goes into a new major version. We do not make breaking changes to{" "}
        <code>v1</code>.
      </p>

      <h2>Deprecation policy</h2>
      <p>
        When something is on its way out, you find out from the API itself rather than from a
        blog post you did not read. A deprecated endpoint returns two headers on every
        response, per{" "}
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
          <code>Deprecation</code> — when it became deprecated. It still works.
        </li>
        <li>
          <code>Sunset</code> — the date it stops working. Never less than{" "}
          <strong>12 months</strong> after the <code>Deprecation</code> date for anything in a
          stable version.
        </li>
        <li>
          <code>Link</code> — where to read what replaces it.
        </li>
      </ul>

      <p>
        We will also email the account owner at deprecation, at three months, and at one month.
        Log a warning when you see a <code>Sunset</code> header and you will never be surprised
        by one.
      </p>

      <Callout tone="info" title="Nothing is deprecated today">
        The <code>v1</code> API has no deprecated endpoints and no scheduled sunsets. This page
        exists so the policy is known in advance rather than written when it is first needed.
      </Callout>

      <h2>SDK versioning</h2>
      <p>
        The Python, JavaScript, Go and C# SDKs follow semantic versioning independently of the
        API. A major SDK release may change its own surface without any API change; pin a major
        version and read the changelog before moving.
      </p>

      <h2>Security exception</h2>
      <p>
        One thing overrides all of the above: if a field or behaviour is actively exposing
        customer data, we will change it as fast as we can and tell you afterwards. A twelve
        month notice period on a data leak protects nobody.
      </p>
    </>
  );
}
