#!/bin/sh
# Builds dashboard.html (for the Claude artifact) and index.html (standalone, for GitHub Pages),
# then checks the script parses.
set -e
cd "$(dirname "$0")"
cat src/1-layout.html src/2-model.js src/3-app.js > dashboard.html
{
  printf '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<style>[hidden]{display:none!important}img{max-width:100%%}</style>\n</head>\n<body>\n'
  cat dashboard.html
  printf '\n</body>\n</html>\n'
} > index.html
sed -n '/<script>/,/<\/script>/p' dashboard.html | sed '1d;$d' > /tmp/herd-check.js
node --check /tmp/herd-check.js && echo "dashboard.html and index.html built"
