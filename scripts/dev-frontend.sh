#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ ! -f apps/web/.env ] && [ -f apps/web/.env.example ]; then
  cp apps/web/.env.example apps/web/.env
fi

exec npm run dev --workspace=@challenge/web
