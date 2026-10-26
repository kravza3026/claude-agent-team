#!/usr/bin/env node
/*
 * Генерує таблиці в docs/ із frontmatter агентів і навичок, щоб документація не розходилась із файлами.
 * Маркери у файлах docs: <!-- BEGIN:назва --> ... <!-- END:назва -->
 * Використання: node tools/gen-docs.js          (перезаписати блоки)
 *               node tools/gen-docs.js --check  (код виходу 1, якщо docs застаріли)
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

/** Мінімальний парсер frontmatter: key: value, quoted-рядки, списки "  - x". */
function parseFrontmatter(text) {
  const m = String(text).replace(/^﻿/, '').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const o = {}; let key = null;
  for (const line of m[1].split(/\r?\n/)) {
    const li = line.match(/^\s+-\s+(.*)$/);
    if (li && key) { if (!Array.isArray(o[key])) o[key] = []; o[key].push(unq(li[1].trim())); continue; }
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (kv) { key = kv[1]; o[key] = kv[2] === '' ? '' : unq(kv[2].trim()); continue; }
    const nested = line.match(/^\s+([A-Za-z_][\w-]*):\s*(.*)$/); // metadata.author тощо
    if (nested && key) { if (typeof o[key] !== 'object') o[key] = {}; o[key][nested[1]] = unq(nested[2].trim()); }
  }
  return o;
}
function unq(s) {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) return s.slice(1, -1).replace(/''/g, "'");
  return s;
}

function loadAgents() {
  const dir = path.join(ROOT, 'agents');
  return fs.readdirSync(dir).filter(f => f.endsWith('.md')).sort().map(f => {
    const fm = parseFrontmatter(fs.readFileSync(path.join(dir, f), 'utf8')) || {};
    return { file: f, name: fm.name, description: fm.description || '', model: fm.model || 'inherit',
      tools: String(fm.tools || '').split(',').map(s => s.trim()).filter(Boolean), skills: Array.isArray(fm.skills) ? fm.skills : [] };
  });
}
function loadSkills() {
  const dir = path.join(ROOT, 'skills');
  return fs.readdirSync(dir, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name).sort().map(n => {
    const f = path.join(dir, n, 'SKILL.md');
    const fm = fs.existsSync(f) ? (parseFrontmatter(fs.readFileSync(f, 'utf8')) || {}) : {};
    const author = fm.metadata && fm.metadata.author;
    return { dir: n, name: fm.name, description: fm.description || '', license: fm.license || '', author: author || '' };
  });
}

// Сторонні навички без вказаної в джерелі ліцензії (див. THIRD_PARTY_NOTICES.md)
const NO_LICENSE_SKILLS = ['business-analyst'];
const esc = s => String(s).replace(/</g, '&lt;').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
const short = (s, n) => { s = String(s).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s; };
const code = s => '`' + s + '`';

// Англійські описи: docs/i18n/descriptions.en.json (frontmatter лишається українським, Claude Code його не торкаємось)
const I18N_EN = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'i18n', 'descriptions.en.json'), 'utf8'));
const L = {
  uk: { ag: ['Агент', 'Модель', 'Інструменти', 'Навички', 'Опис'], agsk: ['Агент', 'Навички (з `skills:` у frontmatter)'], sk: ['Навичка', 'Опис', 'Використовують агенти', 'Джерело / ліцензія'],
    own: 'авторська (MIT, цей репозиторій)', see: 'див. THIRD_PARTY_NOTICES.md', nolic: 'ліцензію в джерелі не вказано, див. THIRD_PARTY_NOTICES.md', none: '— (викликається за потреби)',
    counts: (a, s) => `**Агентів: ${a}, навичок: ${s}.**` },
  en: { ag: ['Agent', 'Model', 'Tools', 'Skills', 'Description'], agsk: ['Agent', 'Skills (from `skills:` in frontmatter)'], sk: ['Skill', 'Description', 'Used by agents', 'Source / license'],
    own: 'original (MIT, this repository)', see: 'see THIRD_PARTY_NOTICES.md', nolic: 'license not stated in source, see THIRD_PARTY_NOTICES.md', none: '— (invoked on demand)',
    counts: (a, s) => `**Agents: ${a}, skills: ${s}.**` },
};
const descOf = (kind, item, lang) => lang === 'en' ? ((I18N_EN[kind] || {})[item.name] || item.description) : item.description;
const row = cells => '| ' + cells.join(' | ') + ' |';
const head = cols => [row(cols), row(cols.map(() => '---'))];

function agentsTable(agents, lang) {
  const l = L[lang], rows = head(l.ag);
  for (const a of agents) rows.push(row([code(a.name), code(a.model), esc(a.tools.map(code).join(', ') || '—'), esc(a.skills.map(code).join(', ') || '—'), esc(short(descOf('agents', a, lang), 220))]));
  return rows.join('\n');
}
function agentsSkillsMatrix(agents, lang) {
  const rows = head(L[lang].agsk);
  for (const a of agents) rows.push(row([code(a.name), a.skills.length ? esc(a.skills.map(code).join(', ')) : '—']));
  return rows.join('\n');
}
function skillsTable(skills, agents, lang) {
  const l = L[lang], rows = head(l.sk);
  for (const s of skills) {
    const users = agents.filter(a => a.skills.includes(s.name)).map(a => code(a.name));
    const src = NO_LICENSE_SKILLS.includes(s.name) ? l.nolic : s.author ? `${s.author} (${s.license || '?'}), ${l.see}` : l.own;
    rows.push(row([code(s.name), esc(short(descOf('skills', s, lang), 260)), users.join(', ') || l.none, src]));
  }
  return rows.join('\n');
}
const counts = (agents, skills, lang) => L[lang].counts(agents.length, skills.length);

function replaceBlock(text, name, body) {
  const re = new RegExp(`(<!-- BEGIN:${name} -->)[\\s\\S]*?(<!-- END:${name} -->)`);
  if (!re.test(text)) return { text, found: false };
  return { text: text.replace(re, (_, a, b) => `${a}\n${body}\n${b}`), found: true };
}

function generate({ check = false } = {}) {
  const agents = loadAgents(), skills = loadSkills();
  const blocksFor = lang => ({
    'agents-table': agentsTable(agents, lang), 'agents-skills': agentsSkillsMatrix(agents, lang),
    'skills-table': skillsTable(skills, agents, lang), 'counts': counts(agents, skills, lang),
  });
  const docs = ['INSTALL', 'AGENTS', 'SKILLS', 'DASHBOARD'];
  const targets = [['README.md', 'uk'], ['README.en.md', 'en']];
  for (const d of docs) { targets.push([`docs/${d}.md`, 'uk']); targets.push([`docs/en/${d}.md`, 'en']); }
  const stale = [];
  for (const [rel, lang] of targets) {
    const f = path.join(ROOT, rel);
    if (!fs.existsSync(f)) continue;
    const orig = fs.readFileSync(f, 'utf8');
    let t = orig;
    for (const [n, b] of Object.entries(blocksFor(lang))) t = replaceBlock(t, n, b).text;
    if (t !== orig) { stale.push(rel); if (!check) fs.writeFileSync(f, t); }
  }
  return { agents, skills, stale, i18nMissing: [...agents.map(a => a.name).filter(n => !I18N_EN.agents[n]), ...skills.map(s => s.name).filter(n => !I18N_EN.skills[n])] };
}

module.exports = { parseFrontmatter, loadAgents, loadSkills, generate };

if (require.main === module) {
  const check = process.argv.includes('--check');
  const r = generate({ check });
  if (check) {
    if (r.i18nMissing.length) { console.error('Нема англійського опису в docs/i18n/descriptions.en.json: ' + r.i18nMissing.join(', ')); process.exit(1); }
    if (r.stale.length) { console.error('Застарілі docs (запустіть node tools/gen-docs.js): ' + r.stale.join(', ')); process.exit(1); }
    console.log(`docs актуальні (агентів: ${r.agents.length}, навичок: ${r.skills.length})`);
  } else console.log(`Оновлено: ${r.stale.join(', ') || 'без змін'} (агентів: ${r.agents.length}, навичок: ${r.skills.length})`);
}
