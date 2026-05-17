#!/usr/bin/env bash
set -euo pipefail
command -v colima >/dev/null 2>&1 || {
  echo "colima not found."
  exit 1
}
colima stop >/dev/null 2>&1 || true
colima delete -f
colima start
docker context use colima 2>/dev/null || true
echo "Colima VM recreated. Run: npm run dev:backend"
