#!/bin/zsh
cd "${0:A:h}"
if command -v node >/dev/null 2>&1; then
  exec node scripts/serve.mjs
elif [[ -x /Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node ]]; then
  exec /Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node scripts/serve.mjs
else
  print 'Install Node.js 24 or newer from https://nodejs.org, then open this launcher again.'
  read '?Press Return to close.'
fi
