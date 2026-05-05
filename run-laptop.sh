#!/usr/bin/env bash
# Run the SAT Practice app on this laptop.
# Starts a local HTTP server (needed for the service worker / PWA) and opens the browser.
set -euo pipefail

PORT="${PORT:-8765}"
HERE="$(cd "$(dirname "$0")" && pwd)"

cd "$HERE/www"

URL="http://localhost:$PORT/"
echo "▶  Serving SAT Practice at $URL"
echo "    (Ctrl+C to stop)"

# Open the browser after a short delay
( sleep 1; xdg-open "$URL" >/dev/null 2>&1 || true ) &

exec python3 -m http.server "$PORT" --bind 127.0.0.1
