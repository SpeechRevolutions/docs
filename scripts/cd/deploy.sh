#!/bin/bash
set -euo pipefail

# ==============================================================================
# PROD deploy of the docs (static export) to S3 + CloudFront.
#
# Serves https://docs.speechrevolutions.com. The bucket, the distribution and its
# index-rewrite function are created by infra/terraform/docs.tf in the API repo; this
# script only uploads a build. There is no server, so a deploy is atomic per object
# and needs no service roll.
#
# SAFETY: deploys to real AWS. Aborts unless DOCS_DEPLOY_CONFIRM=yes, and refuses a
# dirty working tree, so what goes live is always a commit.
#
# Flow: guard -> typecheck -> compile snippets -> build -> sync hashed assets
#       -> sync pages -> invalidate -> smoke check
# ==============================================================================

if [[ "${DOCS_DEPLOY_CONFIRM:-}" != "yes" ]]; then
  echo "Refusing to deploy: set DOCS_DEPLOY_CONFIRM=yes to run (this touches real AWS)." >&2
  exit 1
fi

# ----------------------------- CONFIGURATION ---------------------------------
REGION="us-west-2"
BUCKET="speechrevolutions-docs-153372322861"
DOMAIN="docs.speechrevolutions.com"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
OUT="${APP_ROOT}/out"

for bin in aws npm npx python3 git curl; do
  command -v "$bin" >/dev/null 2>&1 || { echo "❌  '$bin' not found on PATH"; exit 1; }
done

cd "${APP_ROOT}"
if [[ -n "$(git status --porcelain)" ]]; then
  echo "❌  Working tree is dirty; commit first so the live site matches a commit." >&2
  exit 1
fi
COMMIT="$(git rev-parse --short HEAD)"

# Looked up by alias rather than hard-coded: the id only exists after terraform's second apply.
DISTRIBUTION_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?contains(Aliases.Items || \`[]\`, '${DOMAIN}')].Id | [0]" \
  --output text)
[[ -n "${DISTRIBUTION_ID}" && "${DISTRIBUTION_ID}" != "None" ]] \
  || { echo "❌  No CloudFront distribution for ${DOMAIN} (terraform docs_cdn_enabled=true?)"; exit 1; }

# ----------------------------- CHECK & BUILD ---------------------------------
echo "➡️  Installing dependencies..."
npm ci --no-audit --no-fund

echo "➡️  Typechecking..."
npx tsc --noEmit

# Compiles every Go and C# snippet against the sibling SDK checkouts, the same as CI.
echo "➡️  Compiling published snippets..."
python3 scripts/check_snippets.py

# postbuild runs on its own after build: llms.txt, then the Pagefind index.
echo "➡️  Building static export..."
rm -rf "${OUT}"
npm run build

# ----------------------------- UPLOAD ----------------------------------------
# Hashed build assets never change under a given name, so they cache for a year. They go
# up first so a page never references a chunk that is not there yet, and are never deleted
# here: a tab opened before this deploy keeps loading its old chunks.
echo "➡️  Uploading hashed assets to s3://${BUCKET}/_next ..."
aws s3 sync "${OUT}/_next" "s3://${BUCKET}/_next" --region "${REGION}" --only-show-errors \
  --cache-control "public, max-age=31536000, immutable"

# Everything else keeps its name across deploys (HTML, llms.txt, the search index), so
# browsers revalidate it on every visit.
echo "➡️  Uploading pages..."
aws s3 sync "${OUT}" "s3://${BUCKET}" --region "${REGION}" --only-show-errors \
  --exclude "_next/*" --delete \
  --cache-control "public, max-age=0, must-revalidate"

# ----------------------------- INVALIDATE ------------------------------------
# One wildcard path counts as one against CloudFront's 1,000 free paths a month.
echo "➡️  Invalidating CloudFront ${DISTRIBUTION_ID}..."
INVALIDATION_ID=$(aws cloudfront create-invalidation --distribution-id "${DISTRIBUTION_ID}" \
  --paths "/*" --query 'Invalidation.Id' --output text)
aws cloudfront wait invalidation-completed --distribution-id "${DISTRIBUTION_ID}" --id "${INVALIDATION_ID}"

# ----------------------------- SMOKE CHECK -----------------------------------
echo "➡️  Smoke checking https://${DOMAIN} ..."
fail=0
check() {  # path expected-status
  local got; got=$(curl -s -o /dev/null -w '%{http_code}' "https://${DOMAIN}$1")
  if [[ "${got}" == "$2" ]]; then echo "   ok    $1 -> ${got}"; else echo "   FAIL  $1 -> ${got} (want $2)"; fail=1; fi
}
check /                          200
check /sdks/python/              200
check /sdks/python               301
check /llms.txt                  200
check /pagefind/pagefind.js      200
check /no-such-page/             404
[[ "${fail}" == 0 ]] || { echo "❌  Smoke check failed"; exit 1; }

echo "✅  Docs deploy complete"
echo "   Commit:       ${COMMIT}"
echo "   Distribution: ${DISTRIBUTION_ID}"
echo "   URL:          https://${DOMAIN}"
