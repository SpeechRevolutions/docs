# Speech Revolutions — Docs

Developer documentation for [speechrevolutions.com](https://speechrevolutions.com), served at `docs.speechrevolutions.com`. Covers the quickstart, SDK guides, API reference, migration guides, tutorials, and integrations.

## Stack

Next.js (App Router), React, TypeScript, Tailwind CSS.

## Local development

```bash
npm install
npm run dev    # http://localhost:3003
npm run build
```

## Structure

Routes under `src/app/` map to site sections: `getting-started`, `api-reference`, `sdks`, `guides`, `migrate`, `tutorials`, `integrations`.

## Deploy

The site is a static export served from S3 behind CloudFront. The bucket and
distribution are defined in `infra/terraform/docs.tf` in the API repo. To ship
the current commit:

```bash
DOCS_DEPLOY_CONFIRM=yes scripts/cd/deploy.sh
```

The script typechecks, compiles the published snippets, builds, uploads,
invalidates the CDN and smoke-checks the live site. It refuses a dirty working
tree. Snippet compilation expects `speechrevolutions-go` and `csharp-sdk`
checked out next to this repo. CI (`.github/workflows/ci.yml`) runs the same
checks on every push.
