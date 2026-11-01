#!/bin/sh
# Запуск дашборду: ./start.sh  → http://127.0.0.1:7777 ; оркестратор: claude --agent orchestrator
cd "$(dirname "$0")"
if curl -s -o /dev/null -m 1 http://127.0.0.1:7777/; then echo "Уже працює: http://127.0.0.1:7777"; exit 0; fi
nohup node server.js >server.log 2>&1 &
sleep 1; echo "Дашборд: http://127.0.0.1:7777"
(xdg-open http://127.0.0.1:7777 >/dev/null 2>&1 || true)
