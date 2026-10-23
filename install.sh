#!/bin/sh
# Обгортка установника (Linux/macOS). Уся логіка - в installer/install.js.
# Використання: ./install.sh [опції]   (див. ./install.sh --help)
DIR=$(cd "$(dirname "$0")" && pwd)
if ! command -v node >/dev/null 2>&1; then
  cat >&2 <<'MSG'
Node.js не знайдено. Потрібен Node.js 18 або новіший. / Node.js not found. Node.js 18 or newer is required.
  macOS:   brew install node        (або/or https://nodejs.org)
  Ubuntu/Debian: https://nodejs.org/en/download  (або/or nvm: https://github.com/nvm-sh/nvm)
  Fedora:  sudo dnf install nodejs
  Arch:    sudo pacman -S nodejs npm
Після встановлення відкрийте новий термінал і запустіть ./install.sh ще раз.
After installing, open a new terminal and run ./install.sh again.
MSG
  exit 1
fi
exec node "$DIR/installer/install.js" "$@"
