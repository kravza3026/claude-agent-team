#!/usr/bin/env node
// Запуск дашборду у фоні + відкриття браузера (Linux/macOS/Windows).
// Використання: node start.js [--port <n>] [--no-open] [--foreground] [--stop]
// Порт: --port, або змінна AGENTS_DASHBOARD_PORT, або 7777. Слухає лише 127.0.0.1.
'use strict';
const fs = require('fs'), path = require('path'), http = require('http'), { spawn, execFile } = require('child_process');

const args = process.argv.slice(2);
const opt = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const PORT = +(opt('--port') || process.env.AGENTS_DASHBOARD_PORT || 7777);
const URL_ = `http://127.0.0.1:${PORT}/`;

function ping() {
  return new Promise(res => {
    const r = http.get(URL_, { timeout: 1000 }, x => { x.resume(); res(x.statusCode === 200); });
    r.on('error', () => res(false)); r.on('timeout', () => { r.destroy(); res(false); });
  });
}
function openBrowser(url) {
  try {
    if (process.platform === 'darwin') execFile('open', [url], () => {});
    else if (process.platform === 'win32') execFile('cmd.exe', ['/c', 'start', '""', url], { windowsHide: true }, () => {});
    else execFile('xdg-open', [url], () => {});
  } catch (_) {}
}

function stopServer() {
  try {
    const pid = +fs.readFileSync(path.join(__dirname, 'server.pid'), 'utf8').trim();
    process.kill(pid); fs.unlinkSync(path.join(__dirname, 'server.pid')); console.log('Зупинено процес ' + pid);
  } catch (e) { console.log('Не вдалось зупинити через server.pid (' + (e.code || e.message) + '). Завершіть процес node …/dashboard/server.js вручну.'); }
}

(async () => {
  if (args.includes('--stop')) return stopServer();
  if (args.includes('--foreground')) { process.env.AGENTS_DASHBOARD_PORT = String(PORT); require('./server.js'); return; }
  if (await ping()) {
    console.log('Уже працює: ' + URL_);
  } else {
    let out = 'ignore';
    try { out = fs.openSync(path.join(__dirname, 'server.log'), 'a'); } catch (_) {}
    const child = spawn(process.execPath, [path.join(__dirname, 'server.js')], {
      cwd: __dirname, detached: true, stdio: ['ignore', out, out], windowsHide: true,
      env: { ...process.env, AGENTS_DASHBOARD_PORT: String(PORT) },
    });
    child.on('error', e => console.error('Не вдалось запустити:', e.message));
    try { fs.writeFileSync(path.join(__dirname, 'server.pid'), String(child.pid)); } catch (_) {}
    child.unref();
    let ok = false;
    for (let i = 0; i < 20 && !ok; i++) { await new Promise(r => setTimeout(r, 250)); ok = await ping(); }
    if (!ok) { console.error('Дашборд не відповів за 5 с. Дивіться server.log у теці дашборду (можливо, порт ' + PORT + ' зайнятий).'); process.exit(1); }
    console.log('Дашборд: ' + URL_);
  }
  if (!args.includes('--no-open')) openBrowser(URL_);
})();
