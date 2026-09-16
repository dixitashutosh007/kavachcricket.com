#!/usr/bin/env bash
# ==============================================================================
# KAvach Cricket Club - One-Click Git Push & AWS S3 Sync Script
# ==============================================================================
set -e

BUCKET_NAME="kavachcricket.com"
BRANCH="main"

echo "🏏 =========================================="
echo "   KAvach Cricket Club Deployment"
echo "   Target S3: s3://${BUCKET_NAME}/"
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
echo "☁️  Syncing static assets (WebP images, CSS, JS) with 1-year immutable caching..."
aws s3 sync assets "s3://${BUCKET_NAME}/assets" \
  --cache-control "public, max-age=31536000, immutable" \
  --delete

echo "☁️  Syncing HTML pages, sitemaps, and manifests with smart revalidation..."
aws s3 sync . "s3://${BUCKET_NAME}/" \
  --exclude ".git/*" \
  --exclude ".github/*" \
  --exclude "deploy.sh" \
  --exclude "assets/*" \
  --cache-control "public, max-age=3600, must-revalidate" \
  --delete

echo ""
echo "🎉 DEPLOYMENT COMPLETE!"
echo "🌐 Live S3 Website Endpoint:"
echo "   http://${BUCKET_NAME}.s3-website-us-east-1.amazonaws.com"
echo "=============================================="
