#!/usr/bin/env node
// statusLine Claude Code: зберігає JSON сесії (моделі, контекст, ліміти) для дашборду й друкує короткий рядок стану.
const fs = require('fs'), path = require('path');
let raw = '';
process.stdin.on('data', d => raw += d);
process.stdin.on('end', () => {
  let j = {}; try { j = JSON.parse(raw); } catch {}
  try {
    const f = path.join(__dirname, 'status.json'), old = (() => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return {}; } })();
    const sid = (j.session_id || '').slice(0, 8) || 'unknown';
    old.t = Date.now();
    old.sessions = old.sessions || {};
    old.sessions[sid] = { t: Date.now(), model: j.model && (j.model.display_name || j.model.id), cwd: j.workspace && j.workspace.current_dir, cost: j.cost, context: j.context_window, exceeds_200k: j.exceeds_200k_tokens };
    for (const k of Object.keys(old.sessions)) if (Date.now() - old.sessions[k].t > 24 * 3600e3) delete old.sessions[k];
    if (j.rate_limits) old.rate_limits = j.rate_limits;
    old.raw_keys = Object.keys(j);
    fs.writeFileSync(f + '.tmp', JSON.stringify(old)); fs.renameSync(f + '.tmp', f);
  } catch {}
  const parts = [];
  const m = j.model && (j.model.display_name || j.model.id); if (m) parts.push(m);
  const cw = j.context_window; if (cw && typeof cw.used_percentage === 'number') parts.push('ctx ' + Math.round(cw.used_percentage) + '%');
  const rl = j.rate_limits; if (rl) { const a = rl.five_hour, b = rl.seven_day; if (a && typeof a.used_percentage === 'number') parts.push('5h ' + Math.round(a.used_percentage) + '%'); if (b && typeof b.used_percentage === 'number') parts.push('7d ' + Math.round(b.used_percentage) + '%'); }
  process.stdout.write(parts.join(' · '));
});
