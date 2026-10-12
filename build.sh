#!/bin/sh
# Builds dashboard.html from the three source parts, then checks the script parses.
set -e
cd "$(dirname "$0")"
cat src/1-layout.html src/2-model.js src/3-app.js > dashboard.html
sed -n '/<script>/,/<\/script>/p' dashboard.html | sed '1d;$d' > /tmp/herd-check.js
node --check /tmp/herd-check.js && echo "dashboard.html built"
