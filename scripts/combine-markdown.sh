#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

OUT="${1:-DOCUMENTATION_ARCHIVE.md}"
OUT_ABS="$ROOT/$OUT"
OUT_REL="${OUT#"$ROOT"/}"

TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

{
  printf '%s\n\n' "# Repository documentation archive" "Merged copy of Markdown files in this repository. Regenerate with \`scripts/combine-markdown.sh\`." "UTC: $(date -u +"%Y-%m-%dT%H:%M:%SZ")" ""
  find . \( -name node_modules -o -name .git \) -prune -o \
    -name "*.md" -type f ! -path "./$OUT_REL" ! -path "./ALL_MARKDOWN_COMBINED.md" -print \
    | LC_ALL=C sort \
    | while IFS= read -r f; do
      rel="${f#./}"
      printf '\n\n---\n\n## Source: `%s`\n\n' "$rel"
      cat "$f"
    done
} >"$TMP"

mv "$TMP" "$OUT_ABS"
trap - EXIT

echo "Wrote $(wc -l <"$OUT_ABS" | tr -d ' ') lines to $OUT_REL"
