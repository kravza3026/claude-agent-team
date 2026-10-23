#!/usr/bin/env node
/*
 * Smoke-тест: node tests/smoke.js
 * Усе виконується в тимчасових теках (HOME/USERPROFILE підміняються); реальний ~/.claude не чіпається.
 * Дашборд запускається на порту SMOKE_PORT (типово 17777), не на 7777.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const assert = require('assert');
const { spawnSync, spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const INSTALL = path.join(ROOT, 'installer', 'install.js');
const PORT = +process.env.SMOKE_PORT || 17777;
const TMP = fs.mkdtempSync(path.join(process.env.SMOKE_TMP_BASE || os.tmpdir(), 'kit-test-'));
const HOME = path.join(TMP, 'home'); fs.mkdirSync(HOME, { recursive: true });

let passed = 0, failed = 0;
const failures = [];
async function t(name, fn) {
  try { await fn(); passed++; console.log('  ok   ' + name); }
  catch (e) { failed++; failures.push(name); console.log('  FAIL ' + name + '\n       ' + String(e && e.message || e).split('\n').join('\n       ')); }
}
const sect = s => console.log('\n== ' + s);

function inst(args, extraEnv = {}) {
  const env = { ...process.env, HOME, USERPROFILE: HOME, ...extraEnv };
  delete env.CLAUDE_CONFIG_DIR;
  const a2 = args.includes('--lang') ? args : ['--lang', 'uk', ...args];
  const r = spawnSync(process.execPath, [INSTALL, ...a2], { encoding: 'utf8', env });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}
const rd = f => fs.readFileSync(f, 'utf8');
const rj = f => JSON.parse(rd(f));
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', '.idea', '.vscode'].includes(e.name)) continue;
    const f = path.join(dir, e.name);
    if (e.isDirectory()) walk(f, out); else out.push(f);
  }
  return out;
}
const isText = buf => !buf.includes(0);
function get(url, headers) {
  return new Promise((res, rej) => http.get(url, { headers, timeout: 4000 }, r => { let b = ''; r.setEncoding('utf8'); r.on('data', d => b += d); r.on('end', () => res({ status: r.statusCode, body: b })); }).on('error', rej));
}
function sseRead(url, ms) {
  return new Promise(res => { let b = ''; const r = http.get(url, x => { x.setEncoding('utf8'); x.on('data', d => b += d); }); r.on('error', () => {}); setTimeout(() => { r.destroy(); res(b); }, ms); });
}

const { parseFrontmatter } = require('../tools/gen-docs.js');
const inst_ = require('../installer/install.js');

(async () => {
  console.log('Smoke-тест claude-agent-team ' + inst_.VERSION + '  (тимчасова тека: ' + TMP + ')');

  // ---------------------------------------------------------------- статичні перевірки
  sect('Синтаксис і структура');
  const allFiles = walk(ROOT);
  await t('node --check для всіх .js (крім vendor/)', () => {
    const js = allFiles.filter(f => f.endsWith('.js') && !f.includes(path.sep + 'vendor' + path.sep));
    assert(js.length >= 8, 'замало .js: ' + js.length);
    const bad = js.filter(f => spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' }).status !== 0);
    assert.deepStrictEqual(bad, [], 'синтаксична помилка: ' + bad.join(', '));
  });
  await t('обов\'язкові файли репозиторію', () => {
    for (const f of ['README.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md', 'VERSION', 'CHANGELOG.md', 'install.sh', 'install.ps1', 'install.cmd', 'uninstall.sh', 'uninstall.ps1', 'installer/install.js',
      'docs/CLAUDE_SETUP.md', 'docs/en/CLAUDE_SETUP.md', 'docs/INSTALL.md', 'docs/AGENTS.md', 'docs/SKILLS.md', 'docs/DASHBOARD.md', 'docs/SECURITY.md', 'docs/TROUBLESHOOTING.md', 'docs/CONTRIBUTING.md', 'docs/TELEGRAM.md',
      'tools/gen-docs.js', '.github/workflows/ci.yml', 'dashboard/server.js', 'dashboard/hook.js', 'dashboard/log.js', 'dashboard/start.js', 'dashboard/start.ps1', 'dashboard/start.cmd', 'dashboard/vendor/three.module.js', 'dashboard/vendor/THREE-LICENSE'])
      assert(fs.existsSync(path.join(ROOT, f)), 'нема ' + f);
    assert.strictEqual(rd(path.join(ROOT, 'VERSION')).trim(), inst_.VERSION);
  });
  await t('у репозиторії нема службових файлів (*.bak*, *.orig, runtime-даних дашборду)', () => {
    const bad = allFiles.map(f => path.relative(ROOT, f)).filter(r => /\.(bak|orig)/.test(r) || /dashboard\/(events|inbox|acks)\.jsonl$|dashboard\/(panes|status|usage-cache)\.json$|dashboard\/\.token$|dashboard\/backups\//.test(r.split(path.sep).join('/')));
    assert.deepStrictEqual(bad, []);
  });

  await t('dashboard/tools/check-i18n.js: паритет ключів uk/en, усі ключі існують', () => {
    const r = spawnSync(process.execPath, [path.join(ROOT, 'dashboard', 'tools', 'check-i18n.js')], { encoding: 'utf8', cwd: path.join(ROOT, 'dashboard') });
    assert.strictEqual(r.status, 0, r.stdout + r.stderr); assert(/OK/.test(r.stdout));
  });
  await t('локалі: en.json без кирилиці, в uk.json є кирилиця', () => {
    const en = rd(path.join(ROOT, 'dashboard', 'locales', 'en.json'));
    const lines = en.split('\n').filter(l => /[\u0400-\u04FF]/.test(l));
    assert.deepStrictEqual(lines.filter(l => !/"(lang\.uk|role\.general-purpose|role\.[\w-]+)"/.test(l)), [], 'кирилиця в en.json (крім назв мов/ролей)');
  });

  sect('Frontmatter агентів і навичок');
  const agentFiles = fs.readdirSync(path.join(ROOT, 'agents')).filter(f => f.endsWith('.md'));
  const skillDirs = fs.readdirSync(path.join(ROOT, 'skills'), { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name);
  await t('12 агентів із валідним frontmatter (name = ім\'я файла, description, tools, model)', () => {
    assert.strictEqual(agentFiles.length, 12);
    for (const f of agentFiles) {
      const fm = parseFrontmatter(rd(path.join(ROOT, 'agents', f)));
      assert(fm, f + ': нема frontmatter');
      assert.strictEqual(fm.name, f.replace(/\.md$/, ''), f + ': name != файл');
      assert(fm.description && fm.description.length > 20, f + ': description');
      assert(fm.tools, f + ': tools');
      assert(/^(opus|sonnet|haiku|fable|inherit)$/.test(fm.model), f + ': model=' + fm.model);
      for (const s of fm.skills || []) assert(skillDirs.includes(s), f + ': невідома навичка ' + s);
    }
  });
  await t('23 навички із SKILL.md, name = ім\'я теки, description', () => {
    assert.strictEqual(skillDirs.length, 23);
    for (const d of skillDirs) {
      const p = path.join(ROOT, 'skills', d, 'SKILL.md');
      assert(fs.existsSync(p), d + ': нема SKILL.md');
      const fm = parseFrontmatter(rd(p));
      assert(fm, d + ': нема frontmatter');
      assert.strictEqual(fm.name, d, d + ': name != тека');
      assert(fm.description && fm.description.length > 20, d + ': description');
    }
  });
  await t('навички Laravel мають license: MIT і автора laravel', () => {
    for (const d of ['fortify-development', 'inertia-vue-development', 'laravel-best-practices', 'tailwindcss-development', 'testing-best-practices', 'wayfinder-development']) {
      const fm = parseFrontmatter(rd(path.join(ROOT, 'skills', d, 'SKILL.md')));
      assert.strictEqual(fm.license, 'MIT', d); assert.strictEqual(fm.metadata && fm.metadata.author, 'laravel', d);
    }
    assert(/laravel/i.test(rd(path.join(ROOT, 'THIRD_PARTY_NOTICES.md'))));
  });
  await t('docs актуальні (tools/gen-docs.js --check)', () => {
    const r = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'gen-docs.js'), '--check'], { encoding: 'utf8' });
    assert.strictEqual(r.status, 0, r.stderr + r.stdout);
    const ag = rd(path.join(ROOT, 'docs', 'AGENTS.md'));
    for (const f of agentFiles) assert(ag.includes('`' + f.replace('.md', '') + '`'), 'AGENTS.md без ' + f);
    const sk = rd(path.join(ROOT, 'docs', 'SKILLS.md'));
    for (const d of skillDirs) assert(sk.includes('`' + d + '`'), 'SKILLS.md без ' + d);
  });

  sect('Двомовність документації (UA/EN)');
  const UA_DOCS = ['CLAUDE_SETUP', 'INSTALL', 'AGENTS', 'SKILLS', 'DASHBOARD', 'SECURITY', 'TELEGRAM', 'TROUBLESHOOTING', 'CONTRIBUTING'];
  const pairs = [['README.md', 'README.en.md'], ...UA_DOCS.map(d => [`docs/${d}.md`, `docs/en/${d}.md`])];
  const h2 = s => (s.replace(/```[\s\S]*?```/g, '').match(/^## /gm) || []).length;
  await t('паритет файлів UA/EN', () => {
    for (const [ua, en] of pairs) { assert(fs.existsSync(path.join(ROOT, ua)), 'нема ' + ua); assert(fs.existsSync(path.join(ROOT, en)), 'нема ' + en); }
    const enDir = fs.readdirSync(path.join(ROOT, 'docs', 'en')).filter(f => f.endsWith('.md')).sort();
    assert.deepStrictEqual(enDir, UA_DOCS.map(d => d + '.md').sort(), 'зайві/відсутні файли в docs/en');
    const uaDir = fs.readdirSync(path.join(ROOT, 'docs')).filter(f => f.endsWith('.md')).sort();
    assert.deepStrictEqual(uaDir, UA_DOCS.map(d => d + '.md').sort(), 'файли docs/ без англійського відповідника');
  });
  await t('перемикач мов у верху кожного файла і він веде на існуючий відповідник', () => {
    for (const [ua, en] of pairs) {
      const a = rd(path.join(ROOT, ua)).split('\n')[0], b = rd(path.join(ROOT, en)).split('\n')[0];
      assert(a.includes('🇺🇦 Українська') && a.includes('🇬🇧 English'), ua + ': перемикач');
      assert(b.includes('🇺🇦 Українська') && b.includes('🇬🇧 English'), en + ': перемикач');
      const la = a.match(/\]\(([^)]+)\)/)[1], lb = b.match(/\]\(([^)]+)\)/)[1];
      assert.strictEqual(path.resolve(path.dirname(path.join(ROOT, ua)), la), path.join(ROOT, en), ua + ' -> ' + la);
      assert.strictEqual(path.resolve(path.dirname(path.join(ROOT, en)), lb), path.join(ROOT, ua), en + ' -> ' + lb);
    }
  });
  await t('однакова кількість заголовків H2 у парних файлах', () => {
    for (const [ua, en] of pairs) assert.strictEqual(h2(rd(path.join(ROOT, en))), h2(rd(path.join(ROOT, ua))), `${ua} (${h2(rd(path.join(ROOT, ua)))}) vs ${en} (${h2(rd(path.join(ROOT, en)))})`);
  });
  await t('англійські файли без кирилиці (виняток: перемикач, фрагменти коду)', () => {
    const files = [...pairs.map(p => p[1]), 'docs/i18n/descriptions.en.json'];
    for (const f of files) {
      let s = rd(path.join(ROOT, f)).split('\n').slice(f.endsWith('.json') ? 0 : 1).join('\n');
      s = s.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
      const m = s.split('\n').findIndex(l => /[\u0400-\u04FF]/.test(l));
      assert(m < 0, f + ': кирилиця: ' + s.split('\n')[m]);
    }
  });
  await t('відносні посилання між файлами документації не биті', () => {
    const files = [...pairs.flat(), 'docs/CONTRIBUTING.md'];
    const bad = [];
    for (const f of new Set(files)) {
      const text = rd(path.join(ROOT, f)).replace(/```[\s\S]*?```/g, '');
      for (const m of text.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
        const l = m[1]; if (/^(https?:|mailto:|#)/.test(l)) continue;
        const target = path.resolve(path.dirname(path.join(ROOT, f)), l.split('#')[0]);
        if (!fs.existsSync(target)) bad.push(f + ' -> ' + l);
      }
    }
    assert.deepStrictEqual(bad, []);
  });
  await t('кожен агент і навичка мають англійський опис', () => {
    const j = JSON.parse(rd(path.join(ROOT, 'docs', 'i18n', 'descriptions.en.json')));
    for (const f of agentFiles) assert(j.agents[f.replace('.md', '')], 'агент ' + f);
    for (const d of skillDirs) assert(j.skills[d], 'навичка ' + d);
    assert.strictEqual(Object.keys(j.agents).length, 12); assert.strictEqual(Object.keys(j.skills).length, 23);
  });

  sect('Санітизація (персональні дані, токени, ключі)');
  const SELF = path.join('tests', 'smoke.js');
  const textFiles = allFiles.filter(f => path.relative(ROOT, f) !== SELF).map(f => ({ f, buf: fs.readFileSync(f) })).filter(x => isText(x.buf));
  const scan = (re) => { const hits = []; for (const { f, buf } of textFiles) { const lines = buf.toString('utf8').split(/\r?\n/); lines.forEach((l, i) => { if (re.test(l)) hits.push(`${path.relative(ROOT, f)}:${i + 1}: ${l.trim().slice(0, 90)}`); }); } return hits; };
  await t('нема персональних даних і специфіки автора', () => {
    const re = new RegExp([
      '670440168', 'tm_kravets', 'kravza(?!3026/claude-agent-team)', 'real-estate', 'paveltherealest', 'calventa', 'vellardo', 'meranion|meravion', 'lumeranto', 'vionix',
      'gitlab\\.[a-z]', 'git@gitlab', '(leo|лео)\\s+кераміка', 'кераміка\\s+(leo|лео)', 'MEMORY\\.md', 'auto-memory', "див\\. пам'ять", '/home/(?!USER\\b)[A-Za-z0-9_.-]+',
    ].join('|'), 'i');
    assert.deepStrictEqual(scan(re), []);
    assert.deepStrictEqual(scan(/\/Users\/(?!USER\b|test\b|me\b|A&B\b|Іван)[A-Za-z0-9_.-]+/), []); // шляхи macOS: регістрозалежно
  });
  await t('нема e-mail адрес (крім example.* і laravel.com)', () => {
    const re = /[\w.+-]+@(?!example\.(com|org|net)|laravel\.com)[\w-]+\.[a-z]{2,}/i;
    // @-імена пакетів/версій (npm, @vue/…) не мають крапки після домену, тож не збігаються
    assert.deepStrictEqual(scan(re).filter(h => !/@\d|@claude-plugins|@latest/.test(h)), []);
  });
  await t('нема токенів Telegram-ботів, ключів API, приватних ключів, .env', () => {
    const hits = scan(/\b\d{8,10}:[A-Za-z0-9_-]{35}\b|\bsk-[A-Za-z0-9]{20,}|\bghp_[A-Za-z0-9]{30,}|\bxox[bp]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|AIza[0-9A-Za-z_-]{35}/);
    assert.deepStrictEqual(hits, []);
    const envs = allFiles.map(f => path.basename(f)).filter(n => n === '.env' || /^\.env\./.test(n) || n === '.token');
    assert.deepStrictEqual(envs, []);
  });

  // ---------------------------------------------------------------- установник
  sect('Установник: dry-run, установка, ідемпотентність');
  const T1 = path.join(TMP, 'target1');
  await t('--help / --version / невірні аргументи', () => {
    assert.strictEqual(inst(['--version']).out.trim(), inst_.VERSION);
    assert.strictEqual(inst(['--help']).code, 0);
    assert.strictEqual(inst(['--port', '80']).code, 2);
    assert.strictEqual(inst(['--bogus']).code, 2);
  });
  await t('--dry-run нічого не пише', () => {
    const r = inst(['--dry-run', '--target', T1]);
    assert.strictEqual(r.code, 0, r.out);
    assert(!fs.existsSync(T1), 'теку створено');
    assert(!fs.existsSync(path.join(HOME, '.claude')), 'торкнулись ~/.claude');
    assert(/dry-run/.test(r.out));
  });
  await t('установка: файли на місці, settings.json валідний і містить рівно очікувані хуки', () => {
    const r = inst(['--yes', '--target', T1]);
    assert.strictEqual(r.code, 0, r.out);
    assert.strictEqual(fs.readdirSync(path.join(T1, 'agents')).length, 12);
    assert.strictEqual(fs.readdirSync(path.join(T1, 'skills')).length, 23);
    for (const f of ['server.js', 'hook.js', 'deliver.js', 'statusline.js', 'log.js', 'start.js', 'index.html', 'projname.js', 'vendor/three.module.js']) assert(fs.existsSync(path.join(T1, 'dashboard', f)), f);
    for (const bad of ['events.jsonl', '.token', 'launch.sh', 'vendor/OrbitControls.js']) assert(!fs.existsSync(path.join(T1, 'dashboard', bad)), 'зайве: ' + bad);
    assert(!rd(path.join(T1, 'agents', 'orchestrator.md')).includes('{{CLAUDE_DIR}}'), 'не підставлено {{CLAUDE_DIR}}');
    assert(rd(path.join(T1, 'agents', 'orchestrator.md')).includes(T1.split(path.sep).join('/') + '/dashboard/log.js'));
    const s = rj(path.join(T1, 'settings.json'));
    const got = [];
    for (const [ev, groups] of Object.entries(s.hooks)) for (const g of groups) for (const h of g.hooks) {
      assert.strictEqual(h.type, 'command'); assert.strictEqual(h.timeout, 5);
      const m = h.command.match(/^node (\S+)\/dashboard\/(hook|deliver)\.js$/); assert(m, 'формат команди: ' + h.command);
      assert.strictEqual(m[1], T1);
      assert.strictEqual(!!h.async, m[2] === 'hook', 'async лише у hook.js: ' + ev);
      got.push(ev + ':' + m[2]);
    }
    const want = []; for (const [ev, kinds] of inst_.HOOK_SPEC) for (const k of kinds) want.push(ev + ':' + k);
    assert.deepStrictEqual(got.sort(), want.sort());
    assert.strictEqual(got.length, 12);
    assert.strictEqual(s.statusLine.command, 'node ' + T1 + '/dashboard/statusline.js');
    const m = rj(path.join(T1, 'agent-team-manifest.json'));
    assert.strictEqual(m.version, inst_.VERSION); assert(Object.keys(m.files).length > 80); assert.strictEqual(m.hooks.length, 12);
  });
  await t('повторна установка ідемпотентна (settings.json не змінюється, дублів і бекапів нема)', () => {
    const before = rd(path.join(T1, 'settings.json'));
    const r = inst(['--yes', '--target', T1]);
    assert.strictEqual(r.code, 0, r.out);
    assert.strictEqual(rd(path.join(T1, 'settings.json')), before);
    assert(/без змін \(однакові\)/.test(r.out)); assert(!/встановлено нових/.test(r.out));
    assert(!fs.existsSync(path.join(T1, 'backups-agent-team')), 'зайві бекапи');
    assert(((before.match(/hook\.js/g) || []).length) === 9, 'дублі хуків');
  });
  await t('--list працює', () => { const r = inst(['--list', '--target', T1]); assert.strictEqual(r.code, 0); assert(/актуальний/.test(r.out)); });

  sect('Установник: файли, змінені користувачем');
  await t('змінений агент: без --force пропуск + попередження; з --force бекап і оновлення', () => {
    const f = path.join(T1, 'agents', 'tester.md'); const orig = rd(f);
    fs.writeFileSync(f, orig + '\nМоя правка\n');
    let r = inst(['--yes', '--target', T1]);
    assert.strictEqual(r.code, 0, r.out);
    assert(/ПРОПУЩЕНО/.test(r.out) && r.out.includes('agents/tester.md'));
    assert(rd(f).endsWith('Моя правка\n'), 'файл перезаписано без --force');
    r = inst(['--yes', '--force', '--target', T1]);
    assert.strictEqual(r.code, 0, r.out);
    assert.strictEqual(rd(f), orig);
    const bdirs = fs.readdirSync(path.join(T1, 'backups-agent-team'));
    assert.strictEqual(bdirs.length, 1);
    assert(rd(path.join(T1, 'backups-agent-team', bdirs[0], 'agents', 'tester.md')).endsWith('Моя правка\n'), 'бекап без правки');
  });

  sect('Установник: чужі налаштування');
  const T2 = path.join(TMP, 'target2');
  const foreign = {
    permissions: { allow: ['Bash(ls:*)', 'Read(*)'], deny: ['Read(./.env)', 'Bash(rm -rf:*)'] },
    env: { FOO: 'bar' }, model: 'opus', language: 'Ukrainian', autoMode: { x: 1 }, enabledPlugins: { 'a@b': true },
    hooks: { Stop: [{ hooks: [{ type: 'command', command: 'echo my-own-stop-hook' }] }], PostToolUse: [{ matcher: 'Edit', hooks: [{ type: 'command', command: 'prettier --write' }] }] },
    statusLine: { type: 'command', command: 'my-own-statusline' },
  };
  await t('чужі ключі зберігаються байт-у-байт; власні хуки лишаються; чужий statusLine не перезаписано', () => {
    fs.mkdirSync(T2, { recursive: true });
    fs.writeFileSync(path.join(T2, 'settings.json'), JSON.stringify(foreign, null, 2) + '\n');
    const r = inst(['--yes', '--target', T2]);
    assert.strictEqual(r.code, 0, r.out);
    assert(/ВАШ statusLine/.test(r.out));
    const text = rd(path.join(T2, 'settings.json')), s = JSON.parse(text);
    for (const k of ['permissions', 'env', 'model', 'language', 'autoMode', 'enabledPlugins', 'statusLine']) {
      assert.deepStrictEqual(s[k], foreign[k], k);
      assert(text.includes('  "' + k + '": ' + JSON.stringify(foreign[k], null, 2).replace(/\n/g, '\n  ')), 'байти ' + k);
    }
    assert(s.hooks.Stop.some(g => g.hooks.some(h => h.command === 'echo my-own-stop-hook')));
    assert(s.hooks.PostToolUse.some(g => g.matcher === 'Edit'));
    assert.strictEqual(s.hooks.Stop.length, 3); // свій + deliver + hook
    const bk = fs.readdirSync(path.join(T2, 'backups-agent-team'));
    assert.strictEqual(rd(path.join(T2, 'backups-agent-team', bk[0], 'settings.json')), JSON.stringify(foreign, null, 2) + '\n');
    const again = inst(['--yes', '--target', T2]); assert.strictEqual(again.code, 0);
    assert.strictEqual(rd(path.join(T2, 'settings.json')), text, 'не ідемпотентно');
  });
  await t('--force замінює чужий statusLine (з бекапом), --uninstall відновлює його', () => {
    const r = inst(['--yes', '--force', '--target', T2]); assert.strictEqual(r.code, 0, r.out);
    assert(/statusLine.*замінено/.test(r.out));
    assert(/statusline\.js/.test(rj(path.join(T2, 'settings.json')).statusLine.command));
    const u = inst(['--yes', '--uninstall', '--target', T2]); assert.strictEqual(u.code, 0, u.out);
    const s = rj(path.join(T2, 'settings.json'));
    assert.deepStrictEqual(s.statusLine, foreign.statusLine);
  });
  await t('після --uninstall лишились лише чужі ключі й чужі хуки', () => {
    const s = rj(path.join(T2, 'settings.json'));
    assert.deepStrictEqual(s, foreign);
    assert(!fs.existsSync(path.join(T2, 'agents')) || fs.readdirSync(path.join(T2, 'agents')).length === 0);
    assert(!fs.existsSync(path.join(T2, 'agent-team-manifest.json')));
  });
  await t('невалідний settings.json не чіпається (код 3), файли ставляться', () => {
    const T3 = path.join(TMP, 'target3'); fs.mkdirSync(T3, { recursive: true });
    const bad = '{ "permissions": { "allow": [ }\n'; fs.writeFileSync(path.join(T3, 'settings.json'), bad);
    const r = inst(['--yes', '--target', T3]);
    assert.strictEqual(r.code, 3, r.out); assert(/НЕ змінено/.test(r.out));
    assert.strictEqual(rd(path.join(T3, 'settings.json')), bad);
    assert(fs.existsSync(path.join(T3, 'agents', 'orchestrator.md')));
  });
  await t('--no-hooks / --no-dashboard / --no-skills / --no-agents', () => {
    const T4 = path.join(TMP, 'target4');
    const r = inst(['--yes', '--no-hooks', '--no-dashboard', '--no-skills', '--target', T4]); assert.strictEqual(r.code, 0, r.out);
    assert(!fs.existsSync(path.join(T4, 'settings.json'))); assert(!fs.existsSync(path.join(T4, 'dashboard'))); assert(!fs.existsSync(path.join(T4, 'skills')));
    assert.strictEqual(fs.readdirSync(path.join(T4, 'agents')).length, 12);
  });

  sect('Установник: видалення (target1, є змінений файл)');
  await t('--uninstall видаляє лише своє; змінене лишає; settings.json очищено від наших хуків', () => {
    const f = path.join(T1, 'agents', 'planner.md'); fs.writeFileSync(f, rd(f) + '\nМоє\n');
    // дані дашборду (імітація)
    fs.writeFileSync(path.join(T1, 'dashboard', 'events.jsonl'), '{}\n');
    const r = inst(['--yes', '--uninstall', '--target', T1]); assert.strictEqual(r.code, 0, r.out);
    assert(/ЛИШЕНО/.test(r.out) && r.out.includes('agents/planner.md'));
    assert(fs.existsSync(f)); assert(!fs.existsSync(path.join(T1, 'agents', 'tester.md')));
    assert(!fs.existsSync(path.join(T1, 'skills'))); assert(!fs.existsSync(path.join(T1, 'dashboard', 'server.js')));
    assert(fs.existsSync(path.join(T1, 'dashboard', 'events.jsonl')), 'дані без --purge мали лишитись');
    const s = rj(path.join(T1, 'settings.json')); assert.deepStrictEqual(s, {});
    assert(fs.readdirSync(path.join(T1, 'backups-agent-team')).length >= 1);
  });
  await t('--uninstall --purge прибирає дані дашборду', () => {
    const r = inst(['--yes', '--uninstall', '--purge', '--target', T1]); assert.strictEqual(r.code, 0, r.out);
    assert(!fs.existsSync(path.join(T1, 'dashboard', 'events.jsonl')));
  });
  await t('реальний ~/.claude не створювався (HOME підмінено)', () => { assert(!fs.existsSync(path.join(HOME, '.claude'))); });

  sect('Установник: англійський вивід (--lang en)');
  await t('--lang en: вивід усіх сценаріїв без кирилиці; --lang uk — українською', () => {
    const T7 = path.join(TMP, 'target7'); const cyr = /[\u0400-\u04FF]/;
    const runs = [['--help'], ['--dry-run', '--target', T7], ['--yes', '--target', T7], ['--yes', '--target', T7], ['--list', '--target', T7], ['--bogus'], ['--port', '5']];
    fs.mkdirSync(T7, { recursive: true });
    fs.writeFileSync(path.join(T7, 'settings.json'), JSON.stringify({ statusLine: { type: 'command', command: 'mine' } }, null, 2));
    for (const a of runs) { const r = inst(['--lang', 'en', ...a]); assert(!cyr.test(r.out), 'кирилиця (' + a.join(' ') + '): ' + r.out.split('\n').find(l => cyr.test(l))); }
    const f = path.join(T7, 'agents', 'tester.md'); fs.writeFileSync(f, rd(f) + 'x');
    for (const a of [['--yes', '--target', T7], ['--yes', '--force', '--target', T7], ['--yes', '--uninstall', '--target', T7], ['--yes', '--uninstall', '--target', T7], ['--yes', '--update', '--target', T7]]) {
      const r = inst(['--lang', 'en', ...a]); assert(!cyr.test(r.out), 'кирилиця (' + a.join(' ') + '): ' + r.out.split('\n').find(l => cyr.test(l)));
    }
    assert(/Summary|Uninstall summary/.test(inst(['--lang', 'en', '--dry-run', '--target', path.join(TMP, 't8')]).out));
    assert(/Підсумок/.test(inst(['--dry-run', '--target', path.join(TMP, 't8')]).out));
  });
  await t('мова за замовчуванням за LANG (uk* -> uk, інакше en)', () => {
    const env = { ...process.env, HOME, USERPROFILE: HOME }; delete env.CLAUDE_CONFIG_DIR;
    const run = lang => spawnSync(process.execPath, [INSTALL, '--dry-run', '--target', path.join(TMP, 't9')], { encoding: 'utf8', env: { ...env, LC_ALL: lang, LANG: lang, LANGUAGE: lang } }).stdout;
    assert(/Підсумок/.test(run('uk_UA.UTF-8'))); assert(/Summary/.test(run('en_US.UTF-8'))); assert(/Summary/.test(run('de_DE.UTF-8')));
  });

  // ---------------------------------------------------------------- платформи (чисті функції і dry-run)
  sect('Windows/macOS/Linux: побудова рядків (статично, без виконання на цих ОС)');
  await t('hookCommand/quote для трьох ОС', () => {
    assert.strictEqual(inst_.hookCommand('C:\\Users\\Test User\\.claude\\dashboard\\hook.js', 'win32'), 'node "C:\\Users\\Test User\\.claude\\dashboard\\hook.js"');
    assert.strictEqual(inst_.hookCommand('/home/u/.claude/dashboard/hook.js', 'linux'), 'node /home/u/.claude/dashboard/hook.js');
    assert.strictEqual(inst_.hookCommand('/Users/Іван П/.claude/dashboard/hook.js', 'darwin'), "node '/Users/Іван П/.claude/dashboard/hook.js'");
    assert.strictEqual(inst_.hookCommand("/tmp/o'neil/h.js", 'linux'), "node '/tmp/o'\\''neil/h.js'");
  });
  for (const [platform, dash] of [['win32', 'C:\\Users\\Test User\\.claude\\dashboard'], ['darwin', '/Users/test/.claude/dashboard'], ['linux', '/home/USER/.claude/dashboard']]) {
    await t(`applySettings/unapplySettings (${platform}): 12 хуків, ідемпотентність, зворотність`, () => {
      const base = { permissions: { deny: ['x'] }, model: 'opus' };
      const a = inst_.applySettings(base, { dashDir: dash, platform });
      assert.strictEqual(a.added.length, 12); assert.strictEqual(a.statusLine, 'added');
      assert.deepStrictEqual(JSON.parse(JSON.stringify(a.settings)).permissions, base.permissions);
      const cmds = Object.values(a.settings.hooks).flat().flatMap(g => g.hooks.map(h => h.command));
      if (platform === 'win32') assert(cmds.every(c => c.startsWith('node "C:\\Users\\Test User\\.claude\\dashboard\\') && c.endsWith('.js"')), cmds[0]);
      const b = inst_.applySettings(a.settings, { dashDir: dash, platform });
      assert.strictEqual(b.added.length, 0); assert.strictEqual(b.statusLine, 'present');
      const u = inst_.unapplySettings(a.settings, { dashDir: dash, platform });
      assert.strictEqual(u.removed, 12); assert.deepStrictEqual(u.settings, base);
    });
  }
  await t('applySettings: чужий statusLine і некоректні типи hooks', () => {
    const r = inst_.applySettings({ statusLine: { command: 'x' } }, { dashDir: '/d', platform: 'linux' });
    assert.strictEqual(r.statusLine, 'foreign'); assert.deepStrictEqual(r.settings.statusLine, { command: 'x' });
    assert(inst_.applySettings({ hooks: [] }, { dashDir: '/d', platform: 'linux' }).error);
    assert(inst_.applySettings({ hooks: { Stop: {} } }, { dashDir: '/d', platform: 'linux' }).error);
  });
  await t('systemd unit, XDG autostart, LaunchAgent plist, VBS, schtasks', () => {
    const ctx = { nodePath: '/usr/bin/node', dashDir: '/home/USER/.claude/dashboard', port: 7777 };
    const u = inst_.buildSystemdUnit(ctx);
    assert(u.includes('ExecStart="/usr/bin/node" "/home/USER/.claude/dashboard/server.js"') && u.includes('Environment=AGENTS_DASHBOARD_PORT=7777') && u.includes('WantedBy=default.target'));
    assert(inst_.buildXdgAutostart(ctx).includes('Exec=env AGENTS_DASHBOARD_PORT=7777 "/usr/bin/node"'));
    const p = inst_.buildLaunchdPlist({ nodePath: '/opt/homebrew/bin/node', dashDir: '/Users/A&B/.claude/dashboard', port: 7790 });
    assert(p.includes('<string>com.claude-agent-team.dashboard</string>') && p.includes('/Users/A&amp;B/') && p.includes('<key>RunAtLoad</key><true/>') && p.includes('7790'));
    assert((p.match(/<dict>/g) || []).length === (p.match(/<\/dict>/g) || []).length && p.includes('<plist version="1.0">'));
    const v = inst_.buildWinVbs({ nodePath: 'C:\\Program Files\\nodejs\\node.exe', dashDir: 'C:\\Users\\T U\\.claude\\dashboard', port: 7777 });
    assert(v.includes('sh.Run "\"C:\\Program Files\\nodejs\\node.exe\" \"C:\\Users\\T U\\.claude\\dashboard\\server.js\""'.replace(/\\"/g, '""')) || v.includes('""C:\\Program Files\\nodejs\\node.exe""'), v);
    assert(v.includes('AGENTS_DASHBOARD_PORT') && v.includes('\r\n'));
    const s = inst_.buildSchtasksCreateArgs({ vbsPath: 'C:\\Users\\T U\\.claude\\dashboard\\start-hidden.vbs' });
    assert.deepStrictEqual(s.slice(0, 4), ['/Create', '/TN', 'ClaudeAgentTeamDashboard', '/TR']);
    assert.strictEqual(s[4], 'wscript.exe "C:\\Users\\T U\\.claude\\dashboard\\start-hidden.vbs"'); assert(s.includes('ONLOGON') && s.includes('/F'));
    assert(inst_.buildDesktopEntry(ctx).includes('Exec="/usr/bin/node" "/home/USER/.claude/dashboard/start.js"'));
    assert(inst_.buildMacCommand(ctx).startsWith('#!/bin/sh\n'));
    assert(inst_.buildPsShortcutScript({ lnkPath: "C:\\a\\it's.lnk", dashDir: 'C:\\d' }).includes("it''s.lnk"));
  });
  for (const platform of ['linux', 'darwin', 'win32']) {
    await t(`--service --shortcut --dry-run для ${platform} (в процесі, без запису)`, async () => {
      const T5 = path.join(TMP, 'target5-' + platform);
      let out = ''; const w = process.stdout.write;
      process.stdout.write = s => { out += s; return true; };
      let code; const oh = process.env.HOME; process.env.HOME = HOME; process.env.USERPROFILE = HOME;
      try { code = await inst_.main(['--lang', 'uk', '--dry-run', '--service', '--shortcut', '--port', '17790', '--target', T5], { platform }); }
      finally { process.stdout.write = w; process.env.HOME = oh; }
      assert.strictEqual(code, 0, out);
      assert(!fs.existsSync(T5));
      const re = { linux: /systemd --user|XDG autostart/, darwin: /LaunchAgent/, win32: /Scheduled Task/ }[platform];
      assert(re.test(out), out);
      assert(/ярлик:/.test(out));
    });
  }

  // ---------------------------------------------------------------- дашборд
  sect('Дашборд: реальний запуск з тимчасового target на порту ' + PORT);
  const T6 = path.join(TMP, 'target6');
  let server = null;
  await t('встановлення для запуску', () => { const r = inst(['--yes', '--no-hooks', '--target', T6]); assert.strictEqual(r.code, 0, r.out); });
  const dash = path.join(T6, 'dashboard');
  const denv = { ...process.env, HOME, USERPROFILE: HOME, AGENTS_DASHBOARD_PORT: String(PORT) };
  try {
    server = spawn(process.execPath, [path.join(dash, 'server.js')], { env: denv, stdio: ['ignore', 'pipe', 'pipe'] });
    let log = ''; server.stdout.on('data', d => log += d); server.stderr.on('data', d => log += d);
    let up = false; for (let i = 0; i < 30 && !up; i++) { await new Promise(r => setTimeout(r, 200)); try { up = (await get(`http://127.0.0.1:${PORT}/`)).status === 200; } catch (_) {} }
    await t('GET / → 200 (HTML із підставленим токеном)', async () => {
      assert(up, 'сервер не стартував: ' + log);
      const r = await get(`http://127.0.0.1:${PORT}/`); assert.strictEqual(r.status, 200); assert(/<html/i.test(r.body)); assert(!r.body.includes('__TOKEN__'));
      assert(fs.existsSync(path.join(dash, '.token')));
      if (process.platform !== 'win32') assert.strictEqual(fs.statSync(path.join(dash, '.token')).mode & 0o777, 0o600);
    });
    await t('GET /agents → 12 агентів із навичками', async () => {
      const r = await get(`http://127.0.0.1:${PORT}/agents`); assert.strictEqual(r.status, 200);
      const j = JSON.parse(r.body); assert.strictEqual(Object.keys(j).length, 12); assert(j.orchestrator && j['frontend-developer'].skills.length > 5);
    });
    await t('захист: чужий Host → 403; POST /command без токена → 403; /vendor віддається', async () => {
      assert.strictEqual((await get(`http://127.0.0.1:${PORT}/`, { Host: 'evil.example:80' })).status, 403);
      const r = await new Promise(res => { const q = http.request({ host: '127.0.0.1', port: PORT, path: '/command', method: 'POST', headers: { 'content-type': 'application/json' } }, x => { x.resume(); res(x.statusCode); }); q.end('{"text":"x"}'); });
      assert.strictEqual(r, 403);
      assert.strictEqual((await get(`http://127.0.0.1:${PORT}/vendor/three.module.js`)).status, 200);
    });
    await t('i18n: /locales/uk.json і en.json = 200, валідний JSON, однакові ключі; чужа мова = 404', async () => {
      const u = await get(`http://127.0.0.1:${PORT}/locales/uk.json`), e = await get(`http://127.0.0.1:${PORT}/locales/en.json`);
      assert.strictEqual(u.status, 200); assert.strictEqual(e.status, 200);
      const ju = JSON.parse(u.body), je = JSON.parse(e.body);
      assert.deepStrictEqual(Object.keys(ju).sort(), Object.keys(je).sort()); assert(Object.keys(ju).length > 200);
      assert.strictEqual((await get(`http://127.0.0.1:${PORT}/locales/fr.json`)).status, 404);
      assert.strictEqual(JSON.parse((await get(`http://127.0.0.1:${PORT}/state`)).body).lang, 'uk');
    });
    await t('i18n: POST /lang без токена = 403; lang "fr" з токеном = 400; "en" з токеном = 200 і пишеться файл lang', async () => {
      const token = rd(path.join(dash, '.token')).trim();
      const post = (body, tok) => new Promise(res => { const h = { 'content-type': 'application/json', host: `127.0.0.1:${PORT}` }; if (tok) h['x-token'] = tok; const q = http.request({ host: '127.0.0.1', port: PORT, path: '/lang', method: 'POST', headers: h }, x => { let b = ''; x.on('data', d => b += d); x.on('end', () => res({ status: x.statusCode, body: b })); }); q.end(JSON.stringify(body)); });
      assert.strictEqual((await post({ lang: 'en' })).status, 403);
      assert.strictEqual((await post({ lang: 'fr' }, token)).status, 400);
      assert(!fs.existsSync(path.join(dash, 'lang')), 'файл lang створено після відмов');
      const ok = await post({ lang: 'en' }, token); assert.strictEqual(ok.status, 200); assert.strictEqual(JSON.parse(ok.body).lang, 'en');
      assert.strictEqual(rd(path.join(dash, 'lang')).trim(), 'en');
      assert.strictEqual(JSON.parse((await get(`http://127.0.0.1:${PORT}/state`)).body).lang, 'en');
      assert.strictEqual((await post({ lang: 'uk' }, token)).status, 200);
    });
    await t('подія через hook.js (stdin JSON) з\'являється в /events', async () => {
      const ev = { hook_event_name: 'PreToolUse', session_id: 'abcdef1234567890', tool_name: 'Bash', tool_input: { command: 'echo smoke-marker api_key=SECRETVALUE123' }, transcript_path: path.join(HOME, '.claude', 'projects', '-home-someone-Documents-work-demo-site', 's.jsonl'), cwd: '/tmp/demo' };
      const r = spawnSync(process.execPath, [path.join(dash, 'hook.js')], { input: JSON.stringify(ev), env: denv, encoding: 'utf8' });
      assert.strictEqual(r.status, 0, r.stderr);
      const body = await sseRead(`http://127.0.0.1:${PORT}/events`, 900);
      assert(body.includes('smoke-marker'), 'події нема в /events: ' + body.slice(-300));
      assert(!body.includes('SECRETVALUE123'), 'секрет не відредаговано');
      assert(body.includes('"proj":"demo-site"'), 'proj: ' + body.slice(-300));
    });
    await t('hook.js для транскриптів macOS/Windows і сміття не падає', () => {
      const { projOfTranscript } = require('../dashboard/projname.js');
      assert.strictEqual(projOfTranscript('/Users/me/.claude/projects/-Users-me-dev-site/x.jsonl'), 'dev-site');
      assert.strictEqual(projOfTranscript('C:\\Users\\me\\.claude\\projects\\C--Users-me-dev-site\\x.jsonl'), 'dev-site');
      assert.strictEqual(projOfTranscript('/weird/path/x.jsonl'), undefined); assert.strictEqual(projOfTranscript(null), undefined);
      const r = spawnSync(process.execPath, [path.join(dash, 'hook.js')], { input: 'not json', env: denv, encoding: 'utf8' }); assert.strictEqual(r.status, 0);
    });
    await t('log.js додає крок плану; deliver.js нічого не друкує без черги', async () => {
      const r = spawnSync(process.execPath, [path.join(dash, 'log.js'), 'tester', 'running', 'smoke-plan-marker'], { env: denv, encoding: 'utf8' }); assert.strictEqual(r.status, 0);
      assert(rd(path.join(dash, 'events.jsonl')).includes('smoke-plan-marker'));
      const d = spawnSync(process.execPath, [path.join(dash, 'deliver.js')], { input: JSON.stringify({ hook_event_name: 'Stop', session_id: 'abcdef12' }), env: denv, encoding: 'utf8' });
      assert.strictEqual(d.status, 0); assert.strictEqual(d.stdout, '');
    });
    await t('друга копія на тому ж порту завершується з підказкою (EADDRINUSE)', () => {
      const r = spawnSync(process.execPath, [path.join(dash, 'server.js')], { env: denv, encoding: 'utf8', timeout: 8000 });
      assert.notStrictEqual(r.status, 0); assert(/зайнятий/.test(r.stdout + r.stderr), r.stdout + r.stderr);
    });
  } finally {
    if (server) { server.kill(); await new Promise(r => setTimeout(r, 300)); }
  }
  await t('сервер зупинено (порт вільний)', async () => { let alive = true; try { await get(`http://127.0.0.1:${PORT}/`); } catch (_) { alive = false; } assert(!alive); });
  await t('start.js: запуск у фоні, 200, --stop', async () => {
    const r = spawnSync(process.execPath, [path.join(dash, 'start.js'), '--no-open', '--port', String(PORT)], { env: denv, encoding: 'utf8', timeout: 15000 });
    assert.strictEqual(r.status, 0, r.stdout + r.stderr);
    assert.strictEqual((await get(`http://127.0.0.1:${PORT}/`)).status, 200);
    spawnSync(process.execPath, [path.join(dash, 'start.js'), '--stop', '--port', String(PORT)], { env: denv, encoding: 'utf8' });
    await new Promise(r2 => setTimeout(r2, 500));
    let alive = true; try { await get(`http://127.0.0.1:${PORT}/`); } catch (_) { alive = false; } assert(!alive, 'не зупинився');
  });

  // ---------------------------------------------------------------- підсумок
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (_) {}
  console.log(`\nПідсумок: ${passed} пройдено, ${failed} провалено`);
  if (failed) { console.log('Провалені: ' + failures.join('; ')); process.exit(1); }
})();
