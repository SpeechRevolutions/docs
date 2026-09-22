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

Every push to `main` deploys through `.github/workflows/ci.yml`: typecheck,
compile the published snippets, build, then sync `out/` to S3, invalidate
CloudFront and smoke-check the live site. The bucket, distribution and the
deploy role (assumed via GitHub OIDC; no AWS key in GitHub) are defined in
`infra/terraform/docs.tf` in the API repo. `workflow_dispatch` re-runs a deploy of the current `main` by hand.
