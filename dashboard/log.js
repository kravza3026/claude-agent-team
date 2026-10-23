#!/usr/bin/env node
// log.js <agent> <queued|running|done|failed> "<опис>" — запис кроку плану оркестратора в events.jsonl.
// Кросплатформна заміна log.sh. Ніколи не падає (код виходу завжди 0): журнал — допоміжний.
'use strict';
const fs = require('fs'), path = require('path');
try {
  const [agent, status, msg] = process.argv.slice(2);
  if (!agent || !status) { console.error('Використання: node log.js <agent> <queued|running|done|failed> "<опис>"'); process.exit(0); }
  const ev = { t: Date.now(), event: 'Plan', agent: String(agent).slice(0, 60), status: String(status).slice(0, 20), detail: String(msg || '').slice(0, 240) };
  fs.appendFileSync(path.join(__dirname, 'events.jsonl'), JSON.stringify(ev) + '\n');
} catch (_) {}
