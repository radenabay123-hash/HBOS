#!/bin/bash
# Simple script to push changes to GitHub
# Vercel will auto-deploy after push
# Usage: bash push-to-github.sh "commit message"

cd /home/z/my-project

COMMIT_MSG="${1:-Auto-update from Z.ai sandbox}"

# Add all changes
git add -A 2>/dev/null

# Check if there are changes to commit
if git diff --cached --quiet; then
  echo "ℹ️  No changes to push."
  exit 0
fi

# Commit
git commit -m "$COMMIT_MSG" 2>&1 | tail -2

# Push using stored token (if available)
TOKEN_FILE="/home/z/.github_token"
if [ -f "$TOKEN_FILE" ]; then
  TOKEN=$(cat "$TOKEN_FILE")
  git push "https://radenabay123-hash:${TOKEN}@github.com/radenabay123-hash/HBOS.git" main 2>&1 | tail -3
else
  echo "⚠️  No GitHub token found."
  echo "Please provide a GitHub Personal Access Token (PAT)."
  echo "Create one at: https://github.com/settings/tokens"
  exit 1
fi

echo ""
echo "✅ Pushed to GitHub!"
echo "🚀 Vercel will auto-deploy in 2-3 minutes."
echo "📱 Check: https://github.com/radenabay123-hash/HBOS"
