#!/bin/sh
# Видалення (Linux/macOS): те саме, що ./install.sh --uninstall [опції]
DIR=$(cd "$(dirname "$0")" && pwd)
command -v node >/dev/null 2>&1 || { echo "Node.js не знайдено (потрібен 18+) / Node.js not found (18+ required): https://nodejs.org" >&2; exit 1; }
exec node "$DIR/installer/install.js" --uninstall "$@"
