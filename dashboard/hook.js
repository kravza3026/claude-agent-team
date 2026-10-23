#!/usr/bin/env node
// Приймає JSON хука зі stdin, дописує стислу подію в events.jsonl. Без секретів: лише короткий підсумок дії.
const fs = require('fs'), path = require('path');
const FILE = path.join(__dirname, 'events.jsonl');
// проєкт сесії = тека, з якої її запущено (з імені теки транскрипту); cwd може змінюватись через cd
// (формат імені теки залежить від ОС — див. projname.js; помилки не критичні)
let projOfTranscript = () => undefined;
try { projOfTranscript = require('./projname').projOfTranscript; } catch (_) {}
function projOf(e) { return projOfTranscript(e.transcript_path); }
// читаємо транскрипт лише всередині теки конфігурації Claude Code (батько теки dashboard)
const CLAUDE_DIR = path.resolve(__dirname, '..');
const norm = p => (process.platform === 'win32' ? p.toLowerCase() : p);
const underClaudeDir = tp => { try { return norm(path.resolve(tp)).startsWith(norm(CLAUDE_DIR) + path.sep); } catch (_) { return false; } };
let raw = '';
process.stdin.on('data', d => raw += d);
process.stdin.on('end', () => {
  try {
    const e = JSON.parse(raw || '{}');
    const redact = s => String(s)
      .replace(/(api[_-]?key|secret|token|passw(or)?d|APP_KEY|authorization)(["'\s:=]+)[^\s"']+/gi, '$1$3***')
      .replace(/\b(sk|pk|ghp|xox[bp])[-_][A-Za-z0-9_-]{10,}/g, '***')
      .replace(/base64:[A-Za-z0-9+\/=]{20,}/g, 'base64:***');
    const cut = (s, n) => { s = redact(s).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n) + '…' : s; };
    const ti = e.tool_input || {};
    let detail = '';
    switch (e.tool_name) {
      case 'Bash': detail = cut(ti.command || '', 160); break;
      case 'Read': case 'Write': case 'Edit': case 'NotebookEdit': detail = cut(ti.file_path || '', 160); break;
      case 'Grep': case 'Glob': detail = cut(ti.pattern || '', 120); break;
      case 'Agent': case 'Task': detail = cut((ti.subagent_type || '') + ': ' + (ti.description || ''), 160); break;
      case 'Skill': detail = cut(ti.skill || ti.name || ti.command || '', 80); break;
      case 'SendMessage': detail = cut('→ ' + (ti.to || ''), 80); break;
      default: detail = e.tool_name && e.tool_name.startsWith('mcp__') ? cut(e.tool_name.replace(/^mcp__/, ''), 100) : '';
    }
    try { if (fs.statSync(FILE).size > 5e6) fs.renameSync(FILE, FILE + '.old'); } catch (_) {}
    if (e.hook_event_name === 'UserPromptSubmit') {
      const p = String(e.prompt || '');
      const mk = p.match(/^\[dashboard:([0-9a-f]{6})\]\s*/);
      if (mk) { // команду введено дашбордом через tmux: позначити як доставлену, не дублювати в історії
        const now = Date.now();
        fs.appendFileSync(path.join(__dirname, 'acks.jsonl'), JSON.stringify({ id: mk[1], t: now, via: 'tmux' }) + '\n');
        fs.appendFileSync(FILE, JSON.stringify({ t: now, event: 'CommandDelivered', id: mk[1], proj: projOf(e), session: (e.session_id || '').slice(0, 8), via: 'tmux' }) + '\n');
        return;
      }
      const tg = p.match(/<channel source="plugin:telegram[^>]*?user="([^"]*)"/);
      const sub = !!(e.agent_id || e.agent_type);
      fs.appendFileSync(FILE, JSON.stringify({ t: Date.now(), event: 'Command', proj: projOf(e), session: (e.session_id || '').slice(0, 8), source: tg ? 'telegram' : 'terminal', who: tg ? tg[1] : undefined, text: cut(tg ? p.replace(/<[^>]+>/g, ' ') : p, 400), sub }) + '\n');
      return;
    }
    // tmux: запам'ятати, в якій панелі працює ця сесія (хуки успадковують TMUX/TMUX_PANE)
    if (process.env.TMUX_PANE && process.env.TMUX && e.session_id && !(e.agent_id || e.agent_type)) {
      const PF = path.join(__dirname, 'panes.json'), sid8 = e.session_id.slice(0, 8);
      let m = {}; try { m = JSON.parse(fs.readFileSync(PF, 'utf8')); } catch {}
      const cur = m[sid8], socket = process.env.TMUX.split(',')[0];
      if (!cur || cur.pane !== process.env.TMUX_PANE || cur.socket !== socket) {
        m[sid8] = { pane: process.env.TMUX_PANE, socket, cwd: e.cwd ? path.basename(e.cwd) : '', proj: projOf(e), t: Date.now() };
        for (const k of Object.keys(m)) if (Date.now() - m[k].t > 7 * 864e5) delete m[k];
        try { fs.writeFileSync(PF + '.tmp', JSON.stringify(m)); fs.renameSync(PF + '.tmp', PF); } catch {}
      }
    }
    if (e.hook_event_name === 'Stop' && !(e.agent_id || e.agent_type)) {
      let txt = typeof e.last_assistant_message === 'string' ? e.last_assistant_message : '';
      const tp = e.transcript_path;
      if (!txt && typeof tp === 'string' && underClaudeDir(tp) && tp.endsWith('.jsonl')) {
        try {
          const fd = fs.openSync(tp, 'r'), size = fs.fstatSync(fd).size, len = Math.min(size, 400000), buf = Buffer.alloc(len);
          fs.readSync(fd, buf, 0, len, size - len); fs.closeSync(fd);
          const lines = buf.toString('utf8').split('\n').filter(Boolean);
          for (let i = lines.length - 1; i >= 0 && !txt; i--) {
            let j; try { j = JSON.parse(lines[i]); } catch { continue; }
            if (j.type === 'assistant' && j.message && Array.isArray(j.message.content)) txt = j.message.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
          }
        } catch (_) {}
      }
      if (txt) {
        const r = redact(txt).trim();
        fs.appendFileSync(FILE, JSON.stringify({ t: Date.now(), event: 'Reply', proj: projOf(e), session: (e.session_id || '').slice(0, 8), text: r.length > 4000 ? r.slice(0, 4000) + '…' : r }) + '\n');
      }
    }
    const ev = {
      proj: projOf(e),
      t: Date.now(),
      event: e.hook_event_name,
      session: (e.session_id || '').slice(0, 8),
      agent: e.agent_type || (e.agent_id ? 'subagent' : 'main'),
      agent_id: e.agent_id || null,
      tool: e.tool_name || null,
      detail,
      ok: e.tool_response && e.tool_response.is_error ? false : undefined,
      cwd: e.cwd ? path.basename(e.cwd) : undefined,
      msg: e.hook_event_name === 'SubagentStop' ? cut(e.last_assistant_message || '', 240) : (e.hook_event_name === 'Notification' ? cut(e.message || '', 160) : undefined),
    };
    fs.appendFileSync(FILE, JSON.stringify(ev) + '\n');
  } catch (_) {}
});
