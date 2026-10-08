#!/usr/bin/env bash
# Verify a vendored copy still matches its pinned sha256. Exits non-zero on any change.
# Usage: scripts/check-mos-prompt.sh <vendored-dir>
# Checks every pin file it finds in the folder: MOS-PROMPT.sha256 (the prompt module),
# MOS-PUSH.sha256 (the web push sender) and MOS-UI.sha256 (the app switcher). A folder with none fails, and so
# does a module with its pin file gone: index.ts without MOS-PROMPT.sha256, webpush.ts without MOS-PUSH.sha256,
# or mo-apps.core.js / mo-apps.js without MOS-UI.sha256 (a deleted pin must never read as green). Run it once per vendored folder.
set -euo pipefail
[ $# -eq 1 ] || { echo "usage: $0 <vendored-dir>" >&2; exit 2; }
cd "$1"
found=0; bad=0
for pair in "index.ts:MOS-PROMPT.sha256" "webpush.ts:MOS-PUSH.sha256" "mo-apps.core.js:MOS-UI.sha256" "mo-apps.js:MOS-UI.sha256"; do
  file="${pair%%:*}"; pin="${pair##*:}"
  if [ -f "$file" ] && [ ! -f "$pin" ]; then echo "$file is here but $pin is missing. Re-vendor from multiplyos." >&2; bad=1; fi
done
for pair in "MOS-PROMPT.sha256:mos-prompt" "MOS-PUSH.sha256:mos-push" "MOS-UI.sha256:mos-ui"; do
  pin="${pair%%:*}"; name="${pair##*:}"
  [ -f "$pin" ] || continue
  found=1
  if [ ! -s "$pin" ]; then echo "$name: $pin is empty. Re-vendor from multiplyos." >&2; bad=1; continue; fi
  if shasum -a 256 -c "$pin"; then echo "$name: OK"; else echo "$name: CHANGED. Re-vendor from multiplyos, do not edit by hand." >&2; bad=1; fi
done
[ $found -eq 1 ] || [ $bad -eq 1 ] || { echo "MOS-PROMPT.sha256 missing (and no MOS-PUSH.sha256)" >&2; exit 1; }
exit $bad
