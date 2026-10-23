#!/usr/bin/env node
// Перевірка i18n: паритет ключів, порожні значення, ключі з index.html/server.js існують у словниках.
// node tools/check-i18n.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const langs = fs.readdirSync(path.join(root, 'locales')).filter(f => /^[a-z]{2}\.json$/.test(f)).map(f => f.slice(0, 2));
const D = Object.fromEntries(langs.map(l => [l, JSON.parse(fs.readFileSync(path.join(root, 'locales', l + '.json'), 'utf8'))]));
let bad = 0; const err = m => { bad++; console.log('ERROR:', m); };
const base = new Set(Object.keys(D.uk));
for (const l of langs) {
  const ks = new Set(Object.keys(D[l]));
  for (const k of base) if (!ks.has(k)) err(`${l}: немає ключа ${k}`);
  for (const k of ks) if (!base.has(k)) err(`${l}: зайвий ключ ${k}`);
  for (const [k, v] of Object.entries(D[l])) {
    if (typeof v !== 'string' || !v.trim()) err(`${l}: порожнє значення ${k}`);
    else {
      const ph = s => (s.match(/\{\w+\}/g) || []).sort().join();
      if (l !== 'uk' && ph(v.split('|').join(' ')) && ph(D.uk[k] || '') && [...new Set(ph(v).split(','))].join() !== [...new Set(ph(D.uk[k]).split(','))].join()) err(`${l}: різні {плейсхолдери} у ${k}`);
    }
  }
}
const used = new Map(), prefixes = new Set();
const add = (k, where) => { if (!used.has(k)) used.set(k, where); };
for (const file of ['index.html', 'server.js']) {
  const src = fs.readFileSync(path.join(root, file), 'utf8');
  for (const m of src.matchAll(/data-i18n(?:-html)?="([\w.-]+)"/g)) add(m[1], file);
  for (const m of src.matchAll(/data-i18n-attr="([^"]+)"/g)) for (const p of m[1].split(';')) { const k = p.split(':')[1]; if (k) add(k.trim(), file); }
  for (const m of src.matchAll(/\b(?:t|tr|tn|I\.t|O\.t|setI18n\([^,]+,)\s*\(?\s*'([a-z][\w.-]*\.[\w.-]+)'/g)) add(m[1], file);
  for (const m of src.matchAll(/\b(?:t|tr|tn|has)\('([a-z][\w-]*\.)'\s*\+/g)) prefixes.add(m[1]);
  for (const m of src.matchAll(/\$:'([\w.]+)'(?!\s*\+)/g)) add(m[1], file);
  for (const m of src.matchAll(/'([a-z][\w-]*\.[\w.-]+)'/g)) if (base.has(m[1])) add(m[1], file + ' (літерал)');
  for (const m of src.matchAll(/'(err\.)' \+/g)) prefixes.add(m[1]);
}
for (const [k, w] of used) if (!base.has(k)) err(`ключ «${k}» (${w}) відсутній у словниках`);
for (const p of prefixes) if (![...base].some(k => k.startsWith(p))) err(`жодного ключа з префіксом ${p}`);
const unused = [...base].filter(k => !used.has(k) && ![...prefixes].some(p => k.startsWith(p)));
console.log(`мови: ${langs.join(', ')}; ключів: ${base.size}; використано (літерально): ${used.size}; динамічні префікси: ${[...prefixes].join(' ')}`);
if (unused.length) console.log('не знайдено літеральних посилань (можливо, динамічні/невикористані):', unused.join(' '));
console.log(bad ? `ПОМИЛОК: ${bad}` : 'OK: паритет ключів, значення непорожні, всі використані ключі існують');
process.exit(bad ? 1 : 0);
