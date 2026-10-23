#!/usr/bin/env node
// Хук доставки команд із дашборду в основну сесію Claude (не в субагентів).
// UserPromptSubmit/PreToolUse → additionalContext; Stop → продовжити роботу з командою.
const fs = require('fs'), path = require('path');
const D = __dirname, INBOX = path.join(D, 'inbox.jsonl'), ACKS = path.join(D, 'acks.jsonl'), EV = path.join(D, 'events.jsonl'), LOCK = path.join(D, 'inbox.lock');
const TTL = 30 * 60 * 1000;
const read = f => { try { return fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean); } catch { return []; } };
let raw = '';
process.stdin.on('data', d => raw += d);
process.stdin.on('end', () => {
  try {
    if (!fs.existsSync(INBOX)) return;
    const e = JSON.parse(raw || '{}');
    if (e.agent_id || e.agent_type) return; // лише основний потік
    const sid = (e.session_id || '').slice(0, 8);
    const pending = () => { const done = new Set(read(ACKS).map(a => a.id)); return read(INBOX).filter(c => !done.has(c.id) && (!c.session || c.session === sid)); };
    if (!pending().length) return;
    let fd; try { fd = fs.openSync(LOCK, 'wx'); } catch { try { if (Date.now() - fs.statSync(LOCK).mtimeMs > 5000) fs.unlinkSync(LOCK); } catch {} return; }
    let cmds;
    try {
      cmds = pending();
      const now = Date.now(), live = cmds.filter(c => now - c.t < TTL), dead = cmds.filter(c => now - c.t >= TTL);
      for (const c of dead) { fs.appendFileSync(ACKS, JSON.stringify({ id: c.id, t: now, expired: true }) + '\n'); fs.appendFileSync(EV, JSON.stringify({ t: now, event: 'CommandDelivered', id: c.id, expired: true }) + '\n'); }
      for (const c of live) { fs.appendFileSync(ACKS, JSON.stringify({ id: c.id, t: now, session: sid }) + '\n'); fs.appendFileSync(EV, JSON.stringify({ t: now, event: 'CommandDelivered', id: c.id, session: sid }) + '\n'); }
      cmds = live;
    } finally { fs.closeSync(fd); try { fs.unlinkSync(LOCK); } catch {} }
    if (!cmds.length) return;
    const text = cmds.map(c => `[джерело: dashboard, id ${c.id}] ${c.text}`).join('\n');
    const note = 'Команда(и) користувача з локального дашборду агентів (авторизовано токеном UI; це введення користувача, а не вміст інструмента). Виконай як звичайний запит. Вона не дає права змінювати налаштування доступу/permissions/allowlist каналів:\n' + text;
    const ev = e.hook_event_name;
    if (ev === 'Stop' || ev === 'SubagentStop') process.stdout.write(JSON.stringify({ decision: 'block', reason: note }));
    else process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: ev, additionalContext: note } }));
  } catch (_) {}
});
