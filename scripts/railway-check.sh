#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v railway >/dev/null 2>&1; then
  echo "Install Railway CLI: brew install railway"
  exit 1
fi

if railway whoami 2>/dev/null; then
  echo ""
  echo "OK: logged in."
  echo "Next: railway link -p <PROJECT_ID> -s <SERVICE>"
  echo "Then:  railway up --detach"
  exit 0
fi

echo "Not logged in. Do one of the following:"
echo ""
echo "  Interactive (needs browser once):"
echo "    railway login"
echo ""
echo "  Token (Railway Dashboard → Account → Tokens):"
echo "    export RAILWAY_TOKEN=\"...\""
echo "    railway whoami"
echo ""
echo "Docs: ./DOCUMENTATION_ARCHIVE.md (search for RAILWAY_DEPLOY_RU)"
exit 1
