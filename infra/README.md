# Docs hosting

`npm run build` writes a fully static site to `out/`. It is served from a private
S3 bucket behind CloudFront at `docs.speechrevolutions.com`. There is no server.
`.github/workflows/ci.yml` builds, checks and deploys it on every push to `main`.

```
browser ─▶ CloudFront (docs.speechrevolutions.com, ACM cert in us-east-1)
             ├─ viewer-request: index-rewrite.js   /sdks/python/ → /sdks/python/index.html
             ├─ 403/404 from origin → /404.html, status 404
             └─▶ S3 bucket (private, Block Public Access on, read only via OAC)
```

## Pieces

| Piece | Name | Notes |
|---|---|---|
| S3 bucket | `sr-docs-site` (us-west-2) | Private. No static-website hosting: the website endpoint is HTTP-only and needs a public bucket. |
| Origin Access Control | `sr-docs-oac` | SigV4. The bucket policy admits `cloudfront.amazonaws.com` for this distribution only. |
| ACM certificate | `docs.speechrevolutions.com` | Must be in **us-east-1**; CloudFront reads certificates from no other region. The ALB's us-west-2 certificate cannot be reused. |
| CloudFront Function | `sr-docs-index-rewrite` | `index-rewrite.js`, runtime `cloudfront-js-2.0`, on viewer request. |
| Distribution | alias `docs.speechrevolutions.com` | Default root object `index.html`, redirect HTTP to HTTPS, compression on, managed `CachingOptimized` cache policy and `SecurityHeadersPolicy` response headers, price class 100. |
| Error responses | 403 and 404 → `/404.html`, 404 | A missing key comes back as 403, not 404, because OAC is not granted `s3:ListBucket`. |
| GitHub OIDC provider | `token.actions.githubusercontent.com` | Account-wide, created once. |
| Deploy role | `sr-docs-deploy` | Trusts only `repo:SpeechRevolutions/docs:environment:docs-prod`. Allows `s3:ListBucket` on the bucket, `s3:PutObject` and `s3:DeleteObject` on its objects, and `cloudfront:CreateInvalidation` on this distribution. Nothing else. |

## Caching

The deploy job sets `Cache-Control` per object, and CloudFront honours it:

- `_next/*`: hashed names, `max-age=31536000, immutable`. Uploaded first, and
  never deleted by a deploy, so a tab that is already open keeps working.
- Everything else: `max-age=0, must-revalidate`, plus an invalidation of `/*` on
  each deploy. That counts as one path against the 1,000 free paths a month.

## Repository settings

Environment `docs-prod`, restricted to the `main` branch, and these repository
variables:

- `DOCS_DEPLOY_ROLE_ARN`
- `DOCS_BUCKET`
- `DOCS_DISTRIBUTION_ID`

## DNS (Namecheap)

| Type | Host | Value |
|---|---|---|
| CNAME | `docs` | the distribution's `dxxxx.cloudfront.net` |
| CNAME | ACM validation name | ACM validation value |

`docs` points at CloudFront, not the ALB.

## Checking a deploy

```sh
curl -sI https://docs.speechrevolutions.com/ | head -1                      # 200
curl -sI https://docs.speechrevolutions.com/sdks/python | grep -i location   # → /sdks/python/
curl -s -o /dev/null -w '%{http_code}\n' https://docs.speechrevolutions.com/nope/   # 404
```
