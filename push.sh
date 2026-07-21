#!/bin/bash

# Ensure we're in the repository root directory
cd "$(dirname "$0")"

# Check if there are changes to commit
if [ -z "$(git status --porcelain)" ]; then
  echo "No changes to push."
  exit 0
fi

# Add all changes
echo "Staging changes..."
git add -A

# Commit changes
commit_message="Refactor chat API to edge streaming runtime and fix timeout issue"
echo "Committing changes with message: '$commit_message'..."
git commit -m "$commit_message"

# Push to origin
echo "Pushing to GitHub..."
git push origin main

echo "Done!"
