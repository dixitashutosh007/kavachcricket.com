#!/usr/bin/env bash
# ==============================================================================
# KAvach Cricket Club - One-Click Git Push & AWS S3 Sync Script
# ==============================================================================
set -e

BUCKET_NAME="www.kavachcricket.com"
REGION="ap-south-1"
BRANCH="main"

echo "🏏 =========================================="
echo "   KAvach Cricket Club Deployment"
echo "   Target S3: s3://${BUCKET_NAME}/ (${REGION})"
echo "=============================================="

# 1. Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
  echo "📦 Staging and committing changes..."
  COMMIT_MSG="${1:-Update website content and assets}"
  git add .
  git commit -m "$COMMIT_MSG"
else
  echo "✅ No uncommitted changes detected."
fi

# 2. Push to GitHub
echo "🚀 Pushing to GitHub (origin/${BRANCH})..."
git push origin "$BRANCH"
echo "✅ Pushed to GitHub successfully!"

# 3. Sync to AWS S3 with High-Performance Cache-Control Headers
echo "☁️  Syncing image assets (WebP, JPG, PNG) with 1-year immutable caching..."
aws s3 sync assets/images "s3://${BUCKET_NAME}/assets/images" \
  --region "${REGION}" \
  --cache-control "public, max-age=31536000, immutable" \
  --delete

echo "☁️  Syncing CSS & JS with short revalidation caching (max-age=300)..."
aws s3 sync assets/css "s3://${BUCKET_NAME}/assets/css" \
  --region "${REGION}" \
  --cache-control "public, max-age=300, must-revalidate" \
  --delete
aws s3 sync assets/js "s3://${BUCKET_NAME}/assets/js" \
  --region "${REGION}" \
  --cache-control "public, max-age=300, must-revalidate" \
  --delete

echo "☁️  Syncing HTML pages, sitemaps, and manifests with smart revalidation..."
aws s3 sync . "s3://${BUCKET_NAME}/" \
  --region "${REGION}" \
  --exclude ".git/*" \
  --exclude ".github/*" \
  --exclude "deploy.sh" \
  --exclude "assets/*" \
  --cache-control "public, max-age=3600, must-revalidate" \
  --delete

echo "☁️  Uploading clean extensionless routing objects for S3 (/about, /kpl, /timeout, /policies)..."
aws s3 cp about.html "s3://${BUCKET_NAME}/about" --region "${REGION}" --content-type "text/html" --cache-control "public, max-age=3600, must-revalidate"
aws s3 cp kpl.html "s3://${BUCKET_NAME}/kpl" --region "${REGION}" --content-type "text/html" --cache-control "public, max-age=3600, must-revalidate"
aws s3 cp timeout.html "s3://${BUCKET_NAME}/timeout" --region "${REGION}" --content-type "text/html" --cache-control "public, max-age=3600, must-revalidate"
aws s3 cp policies.html "s3://${BUCKET_NAME}/policies" --region "${REGION}" --content-type "text/html" --cache-control "public, max-age=3600, must-revalidate"

echo ""
echo "🎉 DEPLOYMENT COMPLETE!"
echo "🌐 Live S3 Website Endpoint:"
echo "   http://${BUCKET_NAME}.s3-website.ap-south-1.amazonaws.com"
echo "=============================================="
