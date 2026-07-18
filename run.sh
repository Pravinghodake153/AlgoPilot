#!/bin/bash
# ──────────────────────────────────────────────
# AlgoPilot — Server Runner Script
# ──────────────────────────────────────────────

echo "🚀 Starting AlgoPilot Startup Sequence..."

# 1. Check if env file exists and load it
if [ ! -f .env.local ]; then
  echo "❌ Error: .env.local is missing!"
  echo "Please copy .env.example to .env.local and fill in the placeholders."
  exit 1
fi

echo "🔌 Loading environment variables from .env.local..."
set -a
source .env.local
set +a

# 2. Push database schema to Supabase using Prisma
echo "📦 Syncing Prisma database schema..."
npx prisma db push

if [ $? -eq 0 ]; then
  echo "✅ Database schema sync completed successfully."
else
  echo "❌ Error: Database schema sync failed!"
  echo "Please verify DATABASE_URL in your .env.local file."
  exit 1
fi

# 3. Start the Next.js development server
echo "🔥 Launching Next.js development server on http://localhost:3000..."
npm run dev
