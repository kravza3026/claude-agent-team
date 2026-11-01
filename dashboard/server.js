#!/usr/bin/env node
// Дашборд агентів: node server.js  → http://127.0.0.1:7777  (лише localhost, без залежностей)
const http = require('http'), fs = require('fs'), path = require('path'), { execFile } = require('child_process');
const FILE = path.join(__dirname, 'events.jsonl');
const PORT = +process.env.PORT || 7777;
fs.closeSync(fs.openSync(FILE, 'a'));
const crypto = require('crypto');
const TOKEN_FILE = path.join(__dirname, '.token'), INBOX = path.join(__dirname, 'inbox.jsonl');
if (!fs.existsSync(TOKEN_FILE)) fs.writeFileSync(TOKEN_FILE, crypto.randomBytes(24).toString('hex'), { mode: 0o600 });
const TOKEN = fs.readFileSync(TOKEN_FILE, 'utf8').trim();
const HOSTS = new Set([`127.0.0.1:${PORT}`, `localhost:${PORT}`]);
const sameOrigin = req => HOSTS.has(req.headers.host || '') && (!req.headers.origin || HOSTS.has(req.headers.origin.replace(/^https?:\/\//, '')));
const clients = new Set();
// ---- команда: машинне джерело team.json (групи, агенти, псевдоніми, ребра) ----
const TEAM_F = path.join(__dirname, 'team.json');
let _team = { raw: null, alias: new Map(), ids: new Set(), edges: [] }, _teamM = -1;
let _teamChk = 0;
function team(force) {
  if (!force && Date.now() - _teamChk < 2000) return _team; _teamChk = Date.now();
  try {
    const st = fs.statSync(TEAM_F);
    if (st.mtimeMs !== _teamM) {
      _teamM = st.mtimeMs; const j = JSON.parse(fs.readFileSync(TEAM_F, 'utf8'));
      if (j && Array.isArray(j.agents)) {
        const alias = new Map(), ids = new Set();
        for (const a of j.agents) { ids.add(a.id); for (const x of a.aliases || []) alias.set(x, a.id); }
        _team = { raw: j, alias, ids, edges: (j.edges || []).filter(e => ids.has(e.from) && ids.has(e.to)) };
      }
    }
  } catch { _teamM = -1; }
  return _team;
}
const normAgent = a => { if (!a || a === 'main') return 'orchestrator'; const T = team(); return T.alias.get(a) || a; };
function teamLabel(id, lang) {
  if (id === 'orchestrator') { const o = (team().raw || {}).orchestrator; return (o && o.label && (o.label[lang] || o.label.uk)) || id; }
  const a = ((team().raw || {}).agents || []).find(x => x.id === id); return (a && a.label && (a.label[lang] || a.label.uk)) || id;
}
// ---- мови (i18n): словники в locales/*.json; поточна мова UI зберігається у файлі lang ----
const LANGS = ['uk', 'en'], LANG_F = path.join(__dirname, 'lang'), LOC_DIR = path.join(__dirname, 'locales');
const curLang = () => { try { const l = fs.readFileSync(LANG_F, 'utf8').trim(); if (LANGS.includes(l)) return l; } catch {} return 'uk'; };
function tr(key, params) {
  let d = {}, f = {}; try { d = JSON.parse(fs.readFileSync(path.join(LOC_DIR, curLang() + '.json'), 'utf8')); } catch {}
  try { f = JSON.parse(fs.readFileSync(path.join(LOC_DIR, 'uk.json'), 'utf8')); } catch {}
  const s = d[key] != null ? d[key] : f[key] != null ? f[key] : key;
  return params ? s.replace(/\{(\w+)\}/g, (m, n) => (n in params ? params[n] : m)) : s;
}
// стан основних сесій за подіями хуків: idle | busy | waiting (очікує дозволу)
const sess = {}, projOfSess = {};
function track(line) {
  let e; try { e = JSON.parse(line); } catch { return; }
  if (e.session && e.proj) projOfSess[e.session] = e.proj;
  if (!e.session || e.sub) return;
  const main = !e.agent || e.agent === 'main', ev = e.event;
  let st = null;
  if (ev === 'Stop' || ev === 'SessionStart') st = 'idle';
  else if (ev === 'PermissionRequest') st = 'waiting';
  else if (ev === 'Notification') st = /permission|approve|allow|дозвіл/i.test(e.msg || '') ? 'waiting' : null;
  else if (main && (ev === 'UserPromptSubmit' || (ev === 'Command' && e.source !== 'dashboard') || ev === 'PreToolUse' || ev === 'PostToolUse')) st = 'busy';
  else if (ev === 'SubagentStart') st = 'busy';
  if (st) sess[e.session] = { state: st, t: e.t };
}
try { fs.readFileSync(FILE, 'utf8').split('\n').filter(Boolean).slice(-3000).forEach(track); } catch {}
const projFor = sid => projOfSess[sid] || undefined;
const PANES = path.join(__dirname, 'panes.json');
const TMUX_BIN = fs.existsSync(path.join(require('os').homedir(), '.local/bin/tmux')) ? path.join(require('os').homedir(), '.local/bin/tmux') : 'tmux';
const tmuxRun = (socket, args, timeout = 1500) => new Promise(res => execFile(TMUX_BIN, ['-S', socket, ...args], { timeout }, (err, out) => res(err ? null : String(out))));
async function paneInfo(sid) {
  let m = {}; try { m = JSON.parse(fs.readFileSync(PANES, 'utf8')); } catch {}
  const p = m[sid]; if (!p || !/^%\d+$/.test(p.pane) || !/^\/[\w.\/-]+$/.test(p.socket)) return null;
  const alive = await tmuxRun(p.socket, ['display-message', '-p', '-t', p.pane, '#{pane_id}']);
  return alive && alive.trim() === p.pane ? p : null;
}

// ---- облік токенів із транскриптів Claude Code (інкрементально, у фоні) ----
const USAGE_F = path.join(__dirname, 'usage-cache.json'), PROJ_ROOT = path.join(require('os').homedir(), '.claude', 'projects'), BUCKET = 300000, UV = 2, KEEP_D = 8;
let U = { v: UV, files: {}, b: {} }, usageScanning = false, usageLoaded = false;
try { const x = JSON.parse(fs.readFileSync(USAGE_F, 'utf8')); if (x && x.v === UV) { U = x; usageLoaded = true; } } catch {}
const projName = d => d.replace(/^-home-[^-]+-?/, '').replace(/^Documents-work-/, '') || '~';
function listTranscripts() {
  const out = [], cut = Date.now() - KEEP_D * 864e5;
  let dirs = []; try { dirs = fs.readdirSync(PROJ_ROOT); } catch {}
  const walk = (dir, proj, depth) => {
    let ents = []; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      const f = path.join(dir, e.name);
      if (e.isDirectory() && depth < 3) walk(f, proj, depth + 1);
      else if (e.isFile() && e.name.endsWith('.jsonl')) { try { const st = fs.statSync(f); if (st.mtimeMs > cut) out.push({ f, proj, size: st.size }); } catch {} }
    }
  };
  for (const d of dirs) walk(path.join(PROJ_ROOT, d), projName(d), 0);
  return out;
}
function scanFile(file) {
  return new Promise(resolve => {
    const rec = U.files[file.f] || { off: 0, last: '' };
    if (file.size < rec.off) { rec.off = 0; rec.last = ''; }
    // агент: основна сесія = оркестратор; файл субагента (…/subagents/agent-<id>.jsonl) = agentType з сусіднього .meta.json
    let ag = 'orchestrator';
    if (/[\/\\]subagents[\/\\]/.test(file.f)) {
      ag = rec.ag || 'subagent';
      if (!rec.ag) { try { const mt = JSON.parse(fs.readFileSync(file.f.replace(/\.jsonl$/, '.meta.json'), 'utf8')); if (mt && mt.agentType) { ag = normAgent(String(mt.agentType)); rec.ag = ag; } } catch {} }
    }
    if (file.size === rec.off) { if (rec.ag) U.files[file.f] = rec; return resolve(); }
    let buf = '', pos = rec.off, seen = new Set(), last = rec.last;
    const rs = fs.createReadStream(file.f, { start: rec.off, encoding: 'utf8', highWaterMark: 4 << 20 });
    rs.on('data', chunk => {
      buf += chunk; const lines = buf.split('\n'); buf = lines.pop();
      pos += Buffer.byteLength(lines.join('\n')) + (lines.length ? lines.length : 0);
      for (const l of lines) {
        if (l.indexOf('"usage"') < 0 || l.indexOf('"assistant"') < 0) continue;
        let j; try { j = JSON.parse(l); } catch { continue; }
        const m = j.message; if (!m || !m.usage || j.type !== 'assistant') continue;
        const id = (m.id || '') + '|' + (j.requestId || ''); if (id === last || seen.has(id)) continue; seen.add(id); last = id;
        const ts = Date.parse(j.timestamp); if (!ts) continue;
        const u = m.usage, key = Math.floor(ts / BUCKET) + '|' + (m.model || '?') + '|' + file.proj + '|' + (j.isSidechain ? 1 : 0) + '|' + ag;
        const a = U.b[key] || (U.b[key] = [0, 0, 0, 0, 0]);
        a[0] += u.input_tokens || 0; a[1] += u.output_tokens || 0; a[2] += u.cache_creation_input_tokens || 0; a[3] += u.cache_read_input_tokens || 0; a[4]++;
      }
    });
    rs.on('end', () => { U.files[file.f] = { off: file.size - Buffer.byteLength(buf), last, ag: rec.ag }; resolve(); });
    rs.on('error', () => resolve());
  });
}
async function usageScan() {
  if (usageScanning) return; usageScanning = true;
  try {
    const list = listTranscripts(), live = new Set(list.map(x => x.f)); let changed = false;
    for (const f of list) { const before = (U.files[f.f] || {}).off; await scanFile(f); if ((U.files[f.f] || {}).off !== before) changed = true; }
    for (const k of Object.keys(U.files)) if (!live.has(k)) { delete U.files[k]; changed = true; }
    const cut = Math.floor((Date.now() - KEEP_D * 864e5) / BUCKET);
    for (const k of Object.keys(U.b)) if (+k.split('|')[0] < cut) { delete U.b[k]; changed = true; }
    if (changed || !usageLoaded) { fs.writeFileSync(USAGE_F + '.tmp', JSON.stringify(U)); fs.renameSync(USAGE_F + '.tmp', USAGE_F); }
    usageLoaded = true;
  } catch (e) { console.error('usage scan', e.message); }
  usageScanning = false;
}
usageScan(); setInterval(usageScan, 30000);
function usageSummary(wq, pq) {
  const now = Date.now(), W = { h5: now - 5 * 3600e3, d1: now - 24 * 3600e3, d7: now - 7 * 864e5 };
  const z = () => ({ in: 0, out: 0, cc: 0, cr: 0, n: 0 }), tot = { h5: z(), d1: z(), d7: z() }, byModel = { h5: {}, d7: {} }, byProj = {}, hourly = new Array(24).fill(0);
  for (const [k, a] of Object.entries(U.b)) {
    const [bk, model, proj] = k.split('|'), t = +bk * BUCKET + BUCKET / 2;
    for (const w of ['h5', 'd1', 'd7']) if (t >= W[w]) { const x = tot[w]; x.in += a[0]; x.out += a[1]; x.cc += a[2]; x.cr += a[3]; x.n += a[4]; }
    for (const w of ['h5', 'd7']) if (t >= W[w]) { const x = byModel[w][model] || (byModel[w][model] = z()); x.in += a[0]; x.out += a[1]; x.cc += a[2]; x.cr += a[3]; x.n += a[4]; }
    if (t >= W.d7) { const x = byProj[proj] || (byProj[proj] = z()); x.in += a[0]; x.out += a[1]; x.cc += a[2]; x.cr += a[3]; x.n += a[4]; }
    if (t >= W.d1) { const h = 23 - Math.floor((now - t) / 3600e3); if (h >= 0 && h < 24) hourly[h] += a[0] + a[1] + a[2]; }
  }
  let status = {}; try { status = JSON.parse(fs.readFileSync(path.join(__dirname, 'status.json'), 'utf8')); } catch {}
  const top = Object.entries(byProj).sort((a, b) => (b[1].in + b[1].out + b[1].cc) - (a[1].in + a[1].out + a[1].cc)).slice(0, 6);
  return { now, scanning: usageScanning, ready: usageLoaded, windows: tot, byModel, byProject: top, hourly, status, ...agentSummary(wq, pq) };
}

// ---- агрегація подій за агентами (запуски/виклики/помилки/передачі) — інкрементально, у пам'яті ----
const EA = { b: {}, e: {}, lastT: 0, stops: {}, recent: new Set(), tools: 0 };
function eaReset() { EA.b = {}; EA.e = {}; EA.lastT = 0; EA.stops = {}; EA.recent = new Set(); }
function eaAdd(line) {
  let e; try { e = JSON.parse(line); } catch { return; }
  if (!e.t || !e.event) return;
  const dk = e.t + '|' + e.event + '|' + (e.agent_id || '') + '|' + (e.tool || '') + '|' + (e.detail || '').slice(0, 40);
  if (EA.recent.has(dk)) return; EA.recent.add(dk); if (EA.recent.size > 300) EA.recent.delete(EA.recent.values().next().value);
  if (e.session && e.proj) projOfSess[e.session] = e.proj;
  const ev = e.event; if (ev !== 'SubagentStart' && ev !== 'SubagentStop' && ev !== 'PreToolUse' && ev !== 'PostToolUse') return;
  if (e.t > EA.lastT) EA.lastT = e.t;
  const proj = ((e.proj === 'home' ? '~' : e.proj) || projOfSess[e.session] || ''), ag = normAgent(e.agent), bk = Math.floor(e.t / BUCKET);
  const a = EA.b[bk + '|' + proj + '|' + ag] || (EA.b[bk + '|' + proj + '|' + ag] = [0, 0, 0]);
  if (ev === 'SubagentStart') {
    a[0]++;
    const st = EA.stops[e.session] || {};
    for (const ed of team().edges) if (ed.to === ag && st[ed.from] && st[ed.from] <= e.t && e.t - st[ed.from] < 30 * 60000) { const k = bk + '|' + proj + '|' + ed.from + '>' + ag; EA.e[k] = (EA.e[k] || 0) + 1; }
  } else if (ev === 'SubagentStop') { (EA.stops[e.session] || (EA.stops[e.session] = {}))[ag] = e.t; }
  else if (ev === 'PreToolUse') a[1]++;
  else if (e.ok === false) a[2]++;
}
function eaRebuild() {
  eaReset();
  for (const f of [FILE + '.old', FILE]) { let txt = ''; try { txt = fs.readFileSync(f, 'utf8'); } catch { continue; } for (const l of txt.split('\n')) if (l) eaAdd(l); }
}
eaRebuild();
const WIN_MS = { 5: 5 * 6e4, 15: 15 * 6e4, 60: 60 * 6e4, 1440: 864e5, 10080: 7 * 864e5 };
function agentSummary(wq, pq) {
  const now = Date.now(), w = String(wq || '15'), span = w === 'all' ? Infinity : (WIN_MS[w] || WIN_MS[15]), cutB = Number.isFinite(span) ? Math.floor((now - span) / BUCKET) : -1, proj = pq || '';
  const agents = {}, edges = {}, row = k => agents[k] || (agents[k] = { runs: 0, calls: 0, err: 0, in: 0, out: 0, cc: 0, cr: 0, n: 0 });
  for (const [k, a] of Object.entries(EA.b)) { const [bk, pr, ag] = k.split('|'); if (+bk < cutB || (proj && pr !== proj)) continue; const r = row(ag); r.runs += a[0]; r.calls += a[1]; r.err += a[2]; }
  for (const [k, n] of Object.entries(EA.e)) { const [bk, pr, ed] = k.split('|'); if (+bk < cutB || (proj && pr !== proj)) continue; edges[ed] = (edges[ed] || 0) + n; }
  let subTok = false;
  for (const [k, a] of Object.entries(U.b)) {
    const [bk, , pr, , ag] = k.split('|'); if (+bk < cutB || (proj && pr !== proj)) continue;
    const r = row(ag || 'orchestrator'); r.in += a[0]; r.out += a[1]; r.cc += a[2]; r.cr += a[3]; r.n += a[4]; if (ag && ag !== 'orchestrator') subTok = true;
  }
  return { agentWin: w, agentProj: proj, byAgent: agents, edges, evT: EA.lastT, tokensByAgent: usageLoaded && subTok, tokKeepDays: KEEP_D };
}

// ---- вибір моделі Claude: поточна сесія (tmux), типова (settings.json), моделі агентів (frontmatter) ----
const HOME_CLAUDE = path.join(require('os').homedir(), '.claude');
const MODELS = ['fable', 'opus', 'sonnet', 'haiku'], MODEL_RE = /^[a-z0-9][a-z0-9.\-]{0,40}$/;
const BK_DIR = path.join(__dirname, 'backups');
function backupFile(f) { try { fs.mkdirSync(BK_DIR, { recursive: true }); const dst = path.join(BK_DIR, path.basename(f) + '.' + Date.now()); fs.copyFileSync(f, dst); const all = fs.readdirSync(BK_DIR).filter(x => x.startsWith(path.basename(f) + '.')).sort(); while (all.length > 10) fs.unlinkSync(path.join(BK_DIR, all.shift())); } catch {} }
function readAgentModels() {
  const out = {}; let files = []; try { files = fs.readdirSync(path.join(HOME_CLAUDE, 'agents')).filter(f => f.endsWith('.md')); } catch {}
  for (const f of files) { try { const a = fm(fs.readFileSync(path.join(HOME_CLAUDE, 'agents', f), 'utf8')); out[a.name || f.replace(/\.md$/, '')] = { file: f, model: a.model || 'inherit' }; } catch {} }
  return out;
}
function modelsInfo() {
  let def = null; try { def = JSON.parse(fs.readFileSync(path.join(HOME_CLAUDE, 'settings.json'), 'utf8')).model || null; } catch {}
  let st = {}; try { st = JSON.parse(fs.readFileSync(path.join(__dirname, 'status.json'), 'utf8')); } catch {}
  const sessions = {}; for (const [id, x] of Object.entries(st.sessions || {})) if (Date.now() - x.t < 3600e3) sessions[id] = { model: x.model, t: x.t, state: (sess[id] || {}).state || 'unknown' };
  return { available: MODELS, defaultModel: def, agents: readAgentModels(), sessions };
}
function setDefaultModel(model) {
  const f = path.join(HOME_CLAUDE, 'settings.json'), j = JSON.parse(fs.readFileSync(f, 'utf8')); backupFile(f);
  if (!model || model === 'default') delete j.model; else j.model = model;
  fs.writeFileSync(f + '.tmp', JSON.stringify(j, null, 2) + '\n'); fs.renameSync(f + '.tmp', f);
}
function setAgentModel(name, model) {
  if (!/^[A-Za-z0-9_-]+$/.test(name)) throw new Error('bad agent');
  const f = path.join(HOME_CLAUDE, 'agents', name + '.md'); if (!fs.existsSync(f)) throw new Error('no agent');
  const t = fs.readFileSync(f, 'utf8'), m = t.match(/^---\r?\n([\s\S]*?)\r?\n---/); if (!m) throw new Error('no frontmatter');
  backupFile(f); let head = m[1];
  if (model === 'inherit') head = head.replace(/^model:.*\r?\n?/m, ''); else if (/^model:/m.test(head)) head = head.replace(/^model:.*$/m, 'model: ' + model); else head += '\nmodel: ' + model;
  fs.writeFileSync(f + '.tmp', t.replace(m[0], '---\n' + head.replace(/\n+$/, '') + '\n---')); fs.renameSync(f + '.tmp', f);
}

const BLOCKED = /(Do you want to|Esc to cancel|\(y\/n\)|Allow this|Yes, and don't ask|Press Enter to|Enter to confirm)/i;
let size = fs.statSync(FILE).size;

function readFrom(pos) {
  const fd = fs.openSync(FILE, 'r'), len = fs.fstatSync(fd).size - pos, buf = Buffer.alloc(Math.max(len, 0));
  if (len > 0) fs.readSync(fd, buf, 0, len, pos);
  fs.closeSync(fd);
  return buf.toString('utf8').split('\n').filter(Boolean);
}
const nameOf = a => teamLabel(normAgent(a), curLang());
const MUTE = path.join(__dirname, 'mute'), lastN = {};
function notify(line) {
  let e; try { e = JSON.parse(line); } catch { return; }
  if (Date.now() - e.t > 15000 || fs.existsSync(MUTE)) return;
  let title, body, urgency = 'normal';
  const who = nameOf(e.agent);
  if (e.event === 'SubagentStop') { title = tr('srv.done', { who }); body = e.msg || ''; }
  else if (e.event === 'Plan' && e.status === 'failed') { title = tr('srv.failed', { who }); body = e.detail || ''; urgency = 'critical'; }
  else return;
  const key = title; if (Date.now() - (lastN[key] || 0) < 3000) return; lastN[key] = Date.now();
  execFile('notify-send', ['-a', tr('srv.app'), '-u', urgency, '-i', path.join(__dirname, 'icon.svg'), '--', title, body.slice(0, 200)], () => {});
}
fs.watchFile(FILE, { interval: 300 }, () => {
  const now = fs.statSync(FILE).size;
  if (now < size) { // файл скорочено: ротація (новий малий файл) або ручне перезаписування
    eaRebuild(); const ls = readFrom(0); for (const l of ls) { track(l); if (now < 65536) for (const c of clients) c.write(`data: ${l}\n\n`); } size = now; return;
  }
  for (const line of readFrom(size)) { track(line); eaAdd(line); notify(line); for (const c of clients) c.write(`data: ${line}\n\n`); }
  size = now;
});

const CLAUDE = path.join(require('os').homedir(), '.claude');
function fm(txt) {
  const m = String(txt).match(/^---\r?\n([\s\S]*?)\r?\n---/); if (!m) return {};
  const o = {}; let key = null;
  for (const line of m[1].split(/\r?\n/)) {
    const li = line.match(/^\s+-\s+(.*)$/);
    if (li && key) { (o[key] = Array.isArray(o[key]) ? o[key] : []).push(li[1].trim()); continue; }
    const kv = line.match(/^([A-Za-z_-]+):\s*(.*)$/); if (kv) { key = kv[1]; o[key] = kv[2].trim(); }
  }
  return o;
}
function agentsInfo() {
  const out = {};
  let files = []; try { files = fs.readdirSync(path.join(CLAUDE, 'agents')).filter(f => f.endsWith('.md')); } catch {}
  for (const f of files) {
    try {
      const a = fm(fs.readFileSync(path.join(CLAUDE, 'agents', f), 'utf8')); const name = a.name || f.replace(/\.md$/, '');
      const skills = (Array.isArray(a.skills) ? a.skills : []).filter(n => /^[A-Za-z0-9_:-]+$/.test(n)).map(n => {
        let d = ''; try { d = fm(fs.readFileSync(path.join(CLAUDE, 'skills', n, 'SKILL.md'), 'utf8')).description || ''; } catch {}
        return { name: n, description: d.slice(0, 240) };
      });
      out[name] = { description: (a.description || '').slice(0, 300), model: a.model || '', tools: String(a.tools || '').split(',').map(x => x.trim()).filter(Boolean), skills };
    } catch {}
  }
  return out;
}
// автооновлення відкритих вкладок, коли змінюється index.html (або перезапускається сервер)
const INDEX_F = path.join(__dirname, 'index.html');
for (const l of LANGS) fs.watchFile(path.join(LOC_DIR, l + '.json'), { interval: 700 }, (cur, prev) => { if (cur.mtimeMs !== prev.mtimeMs) for (const c of clients) c.write('event: reload\ndata: 1\n\n'); });
fs.watchFile(TEAM_F, { interval: 700 }, (cur, prev) => { if (cur.mtimeMs !== prev.mtimeMs) { team(true); eaRebuild(); } if (cur.mtimeMs !== prev.mtimeMs) for (const c of clients) c.write('event: reload\ndata: 1\n\n'); });
fs.watchFile(INDEX_F, { interval: 700 }, (cur, prev) => { if (cur.mtimeMs !== prev.mtimeMs) for (const c of clients) c.write('event: reload\ndata: 1\n\n'); });
const STATIC = { '/office.js': { p: path.join(__dirname, 'office.js'), t: 'text/javascript; charset=utf-8' }, '/vendor/three.module.js': { p: path.join(__dirname, 'vendor', 'three.module.js'), t: 'text/javascript; charset=utf-8' } };
http.createServer((req, res) => {
  if (!HOSTS.has(req.headers.host || '')) { res.writeHead(403); return res.end('forbidden'); }
  if (req.method === 'GET' && /^\/usage(\?.*)?$/.test(req.url)) { const q = new URL(req.url, 'http://x').searchParams; res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify(usageSummary(q.get('w'), q.get('proj')))); }
  // статика «Офісу»: явний allowlist шляхів (жодного довільного читання файлів)
  if (req.method === 'GET' && STATIC[req.url.split('?')[0]]) { const f = STATIC[req.url.split('?')[0]]; return fs.readFile(f.p, (err, buf) => { if (err) { res.writeHead(404); return res.end('not found'); } res.writeHead(200, { 'Content-Type': f.t, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' }); res.end(buf); }); }
  if (req.method === 'GET' && req.url === '/team.json') { return fs.readFile(TEAM_F, (err, buf) => { if (err) { res.writeHead(404, { 'Content-Type': 'application/json' }); return res.end('{}'); } res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(buf); }); }
  if (req.method === 'GET' && req.url === '/models') { res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' }); return res.end(JSON.stringify(modelsInfo())); }
  if (req.method === 'POST' && req.url === '/model') {
    const bad = (c, code, raw) => { res.writeHead(c, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(code ? (raw ? { ok: false, why: raw } : { ok: false, code, why: tr('err.' + code) }) : { ok: false })); };
    if (!sameOrigin(req) || req.headers['x-token'] !== TOKEN || !/^application\/json/.test(req.headers['content-type'] || '')) return bad(403);
    let b = ''; req.on('data', d => { b += d; if (b.length > 2000) req.destroy(); });
    return req.on('end', async () => {
      let j; try { j = JSON.parse(b); } catch { return bad(400); }
      const model = String(j.model || ''), scope = j.scope;
      const okModel = scope === 'agent' ? (model === 'inherit' || MODELS.includes(model)) : scope === 'default' ? (model === 'default' || MODELS.includes(model)) : MODELS.includes(model);
      if (!okModel) return bad(400, 'unknown_model');
      try {
        if (scope === 'default') { setDefaultModel(model); }
        else if (scope === 'agent') { setAgentModel(String(j.agent || ''), model); }
        else if (scope === 'session') {
          const sid = /^[0-9a-f]{8}$/.test(j.session || '') ? j.session : null; if (!sid) return bad(400, 'pick_session');
          const pane = await paneInfo(sid); if (!pane) return bad(409, 'no_pane');
          const st = (sess[sid] || {}).state || 'unknown'; if (st !== 'idle') return bad(409, st === 'busy' ? 'busy_turn' : 'waiting');
          const tail = await tmuxRun(pane.socket, ['capture-pane', '-p', '-t', pane.pane, '-S', '-25']); if (tail && BLOCKED.test(tail)) return bad(409, 'dialog');
          const a = await tmuxRun(pane.socket, ['send-keys', '-t', pane.pane, '-l', '--', '/model ' + model]); await new Promise(r => setTimeout(r, 200));
          const c = a !== null && await tmuxRun(pane.socket, ['send-keys', '-t', pane.pane, 'Enter']); if (a === null || c === null) return bad(502, 'send_failed');
          sess[sid] = { state: 'busy', t: Date.now() };
        } else return bad(400, 'unknown_scope');
      } catch (e) { return bad(500, 'internal', String(e.message || e).slice(0, 120)); }
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: true, ...modelsInfo() }));
    });
  }
  if (req.method === 'GET' && req.url === '/state') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ mute: fs.existsSync(MUTE), lang: curLang() })); }
  if (req.method === 'POST' && req.url === '/lang') {
    if (!sameOrigin(req) || req.headers['x-token'] !== TOKEN || !/^application\/json/.test(req.headers['content-type'] || '')) { res.writeHead(403); return res.end(); }
    let b = ''; req.on('data', d => { b += d; if (b.length > 200) req.destroy(); });
    return req.on('end', () => { let l = ''; try { l = String(JSON.parse(b).lang); } catch {} if (!LANGS.includes(l)) { res.writeHead(400, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ ok: false })); } try { fs.writeFileSync(LANG_F, l); } catch {} res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: true, lang: curLang() })); });
  }
  if (req.method === 'POST' && req.url === '/mute') {
    if (!sameOrigin(req) || req.headers['x-token'] !== TOKEN) { res.writeHead(403); return res.end(); }
    let b = ''; req.on('data', d => { b += d; if (b.length > 200) req.destroy(); });
    return req.on('end', () => { let on = false; try { on = !!JSON.parse(b).on; } catch {} try { if (on) fs.writeFileSync(MUTE, ''); else fs.unlinkSync(MUTE); } catch {} res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ mute: fs.existsSync(MUTE) })); });
  }
  if (req.method === 'GET' && req.url === '/panes') {
    return (async () => { let m = {}; try { m = JSON.parse(fs.readFileSync(PANES, 'utf8')); } catch {} const out = {}; for (const k of Object.keys(m)) { if (await paneInfo(k)) out[k] = { state: (sess[k] || {}).state || 'unknown', cwd: m[k].cwd, proj: m[k].proj || projFor(k) }; } res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(out)); })();
  }
  if (req.method === 'GET' && req.url === '/agents') { res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' }); return res.end(JSON.stringify(agentsInfo())); }
  if (req.method === 'POST' && req.url === '/command') {
    const bad = (c, code, raw) => { res.writeHead(c, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(code ? (raw ? { ok: false, why: raw } : { ok: false, code, why: tr('err.' + code) }) : { ok: false })); };
    if (!sameOrigin(req) || req.headers['x-token'] !== TOKEN || !/^application\/json/.test(req.headers['content-type'] || '')) return bad(403);
    let body = '';
    req.on('data', d => { body += d; if (body.length > 8000) req.destroy(); });
    return req.on('end', () => {
      let j; try { j = JSON.parse(body); } catch { return bad(400); }
      const text = String(j.text || '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, 2000);
      const session = /^[0-9a-f]{8}$/.test(j.session || '') ? j.session : undefined;
      if (!text) return bad(400);
      const done = new Set(); try { fs.readFileSync(path.join(__dirname, 'acks.jsonl'), 'utf8').split('\n').filter(Boolean).forEach(l => done.add(JSON.parse(l).id)); } catch {}
      let pend = 0; try { pend = fs.readFileSync(INBOX, 'utf8').split('\n').filter(Boolean).filter(l => !done.has(JSON.parse(l).id)).length; } catch {}
      if (pend >= 20) return bad(429);
      const id = crypto.randomBytes(3).toString('hex'), t = Date.now();
      if (j.mode === 'tmux') {
        return (async () => {
          let sid = session;
          if (!sid) { const live = []; let m = {}; try { m = JSON.parse(fs.readFileSync(PANES, 'utf8')); } catch {} for (const k of Object.keys(m)) if (await paneInfo(k)) live.push(k); if (live.length === 1) sid = live[0]; else if (live.length) return bad(409, 'pick_to'); else { fs.appendFileSync(INBOX, JSON.stringify({ id, t, text }) + '\n'); fs.appendFileSync(FILE, JSON.stringify({ t, event: 'Command', id, source: 'dashboard', text: text.slice(0, 400), queued: true, via: 'queue', note: tr('err.no_tmux_sessions') }) + '\n'); res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ ok: true, id, via: 'queue', code: 'no_tmux_sessions', why: tr('err.no_tmux_sessions') })); } }
          const pane = await paneInfo(sid);
          let code = !pane ? 'no_pane' : null;
          const st = (sess[sid] || {}).state || 'unknown';
          if (!code && st === 'waiting') code = 'waiting';
          if (!code && st === 'busy') code = 'busy';
          if (!code) { const tail = await tmuxRun(pane.socket, ['capture-pane', '-p', '-t', pane.pane, '-S', '-25']); if (tail && BLOCKED.test(tail)) code = 'dialog'; }
          if (code) { const why = tr('err.' + code); // безпечний запасний варіант: черга з хуками
            fs.appendFileSync(INBOX, JSON.stringify({ id, t, text, session: sid }) + '\n');
            fs.appendFileSync(FILE, JSON.stringify({ t, event: 'Command', id, source: 'dashboard', proj: projFor(sid), session: sid, text: text.slice(0, 400), queued: true, via: 'queue', note: why }) + '\n');
            res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ ok: true, id, via: 'queue', code, why }));
          }
          const line = `[dashboard:${id}] ` + text.replace(/\s+/g, ' ').slice(0, 1500);
          const a = await tmuxRun(pane.socket, ['send-keys', '-t', pane.pane, '-l', '--', line]);
          await new Promise(r => setTimeout(r, 200));
          const b = a !== null && await tmuxRun(pane.socket, ['send-keys', '-t', pane.pane, 'Enter']);
          if (b === null || a === null) return bad(502, 'send_failed');
          sess[sid] = { state: 'busy', t };
          fs.appendFileSync(FILE, JSON.stringify({ t, event: 'Command', id, source: 'dashboard', proj: projFor(sid), session: sid, text: text.slice(0, 400), via: 'tmux' }) + '\n');
          res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: true, id, via: 'tmux' }));
        })();
      }
      fs.appendFileSync(INBOX, JSON.stringify({ id, t, text, session }) + '\n');
      fs.appendFileSync(FILE, JSON.stringify({ t, event: 'Command', id, source: 'dashboard', proj: projFor(session), session, text: text.slice(0, 400), queued: true }) + '\n');
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: true, id }));
    });
  }
  if (req.url === '/events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    const all = readFrom(0).slice(-1500);
    for (const line of all) res.write(`data: ${line}\n\n`);
    clients.add(res);
    req.on('close', () => clients.delete(res));
  } else if (req.method === 'GET' && /^\/locales\/(uk|en)\.json(\?.*)?$/.test(req.url)) {
    return fs.readFile(path.join(LOC_DIR, req.url.match(/^\/locales\/(uk|en)\.json/)[1] + '.json'), (err, buf) => { if (err) { res.writeHead(404); return res.end('not found'); } res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(buf); });
  } else if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8').replace('__TOKEN__', TOKEN));
  } else { res.writeHead(404); res.end('not found'); }
}).listen(PORT, '127.0.0.1', () => console.log(`Дашборд: http://127.0.0.1:${PORT}`));
