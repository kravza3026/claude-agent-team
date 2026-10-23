// Спільна допоміжна функція: «проєкт» за іменем теки транскрипту Claude Code.
// Claude Code кодує шлях проєкту в імені теки (кожен не-буквено-цифровий символ → «-»):
//   Linux:   -home-<user>-Documents-work-site   macOS: -Users-<user>-dev-site
//   Windows: C--Users-<user>-dev-site
// Функція best-effort: на невідомому форматі повертає ім'я теки як є й ніколи не кидає виняток.
'use strict';
const path = require('path');

function projName(dirName) {
  try {
    let d = String(dirName || '');
    d = d.replace(/^-(?:home|Users)-[^-]+-?/, '')   // Linux / macOS
         .replace(/^[A-Za-z]--Users-[^-]+-?/, '')   // Windows (C--Users-name-...)
         .replace(/^Documents-/, '')
         .replace(/^work-/, '');
    return d || '~';
  } catch (_) { return '~'; }
}

// transcript_path (повний шлях до .jsonl) → ім'я проєкту або undefined
function projOfTranscript(tp) {
  try {
    if (typeof tp !== 'string' || !tp) return undefined;
    const d = path.basename(path.dirname(tp.replace(/\\/g, '/')));
    if (!/^(-|[A-Za-z]--)/.test(d)) return undefined;
    return projName(d);
  } catch (_) { return undefined; }
}

module.exports = { projName, projOfTranscript };
