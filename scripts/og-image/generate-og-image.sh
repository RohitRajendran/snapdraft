#!/usr/bin/env bash
# Renders og-image.html → public/og-image.png at 1200×630.
# Usage: npm run generate:og-image

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

PORT=9988
python3 -m http.server $PORT --directory "$SCRIPT_DIR" &> /tmp/og-server.log &
SERVER_PID=$!
trap "kill $SERVER_PID 2>/dev/null" EXIT

sleep 0.5
npx playwright screenshot \
  --browser chromium \
  --viewport-size "1200,630" \
  "http://localhost:$PORT/og-image.html" \
  "$REPO_ROOT/public/og-image.png"

echo "✓ public/og-image.png updated"
