#!/bin/sh
# Запуск дашборду (Linux/macOS): ./start.sh [--port N] [--no-open]
command -v node >/dev/null 2>&1 || { echo "Потрібен Node.js 18+ / Node.js 18+ is required (https://nodejs.org)"; exit 1; }
exec node "$(dirname "$0")/start.js" "$@"
