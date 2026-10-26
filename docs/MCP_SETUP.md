**🇺🇦 Українська** | [🇬🇧 English](en/MCP_SETUP.md)

# Підключення MCP-серверів (Figma, Playwright)

Як підключити до Claude Code два MCP-сервери, потрібні агентам цього набору. Команди звірено з виводом `claude mcp --help` і `claude mcp add --help` (Claude Code 2.1.309, Linux). Усе інше — в офіційній документації Claude Code.

## 1. Навіщо потрібен MCP

MCP-сервер дає агентові додаткові інструменти (імена виду `mcp__<сервер>__<інструмент>`).

| Агент | Потрібний MCP | Для чого |
|---|---|---|
| `figma-reader` | `mcp__figma` | читання макета Figma, `docs/design-spec.md` |
| `tester` | `mcp__playwright` | браузерні перевірки: адаптив, консоль, мережа, FPS |
| `pagespeed` | `mcp__playwright` | вимірювання до/після оптимізації |

Якщо сервер не підключено, відповідні інструменти недоступні: `figma-reader` не прочитає макет, а `tester`/`pagespeed` не зможуть відкрити сторінку в браузері. Решта агентів MCP не потребує.

## 2. Figma MCP

1. Підключення (HTTP-транспорт, синтаксис `claude mcp add --transport http <ім'я> <url>`):
   ```sh
   claude mcp add --transport http figma https://mcp.figma.com/mcp
   ```
2. Автентифікація HTTP-сервера: `claude mcp login figma`; вихід: `claude mcp logout figma`.
3. Перевірка: `claude mcp list`. Для підключеного сервера виводиться рядок `figma: https://mcp.figma.com/mcp (HTTP) - ✔ Connected`.
4. Дайте агентові в завданні посилання на фрейм Figma (URL з `node-id`).
5. `figma-reader` читає макет і пише `docs/design-spec.md` (токени, сітка, компоненти, стани, асети); код не пише, прогалини фіксує у «Відкриті питання».
6. Файл має бути доступний вашому акаунту Figma.

## 3. Playwright MCP

1. Підключення (stdio, синтаксис `claude mcp add <ім'я> -- <команда> [аргументи]`):
   ```sh
   claude mcp add playwright -- npx -y @playwright/mcp@latest --headless
   ```
2. Перевірка: `claude mcp list` показує рядок `playwright: npx -y @playwright/mcp@latest --headless - ✔ Connected`.
3. Правило набору: один браузер одночасно; `tester` і `pagespeed` не запускаються паралельно на один сервер.
4. `tester` відкриває сторінки на 375/768/1440 px, читає консоль і мережу та пише `docs/test-report.md`; `pagespeed` міряє метрики до/після й пише `docs/perf-report.md`.

## 4. Області конфігурації й безпека

`claude mcp add` має опцію `-s, --scope <scope>` зі значеннями `local`, `user`, `project` (типово `local`). `claude mcp reset-project-choices` скидає схвалення й відхилення серверів із `.mcp.json` у проєкті; такі сервери без схвалення показуються як «Pending approval» і не підключаються (`claude mcp get <ім'я>`, `claude mcp list`).

Приклад: `claude mcp add --scope user --transport http figma https://mcp.figma.com/mcp`.

Ризики:
- MCP-сервер виконує код на вашій машині (stdio) або діє від імені вашого акаунта (HTTP). Підключайте лише довірені сервери.
- Ніколи не комітьте токени, заголовки `--header "Authorization: ..."` і значення `-e KEY=...` у `.mcp.json`; перед комітом перегляньте `git diff`.
- Видалення сервера: `claude mcp remove <ім'я>`.

## 5. Перевірка з боку команди агентів

1. Запустіть оркестратора: `claude --agent orchestrator` (див. [CLAUDE_SETUP.md](CLAUDE_SETUP.md)).
2. Figma: «Прочитай макет <URL фрейму> і підготуй docs/design-spec.md». Очікується виклик `figma-reader` і файл `docs/design-spec.md`.
3. Playwright: «Протестуй http://localhost:8000/ на 375 і 1440 px». Очікується виклик `tester` і вердикт PASS/FAIL у `docs/test-report.md`.
4. Агенти бачать `mcp__figma` / `mcp__playwright`, бо ці інструменти вказані в їхньому frontmatter (`figma-reader`, `tester`, `pagespeed`; див. [AGENTS.md](AGENTS.md)).

## 6. Усунення несправностей

| Симптом | Імовірна причина | Що робити |
|---|---|---|
| Сервера нема в `claude mcp list` | не додано або інша область (scope) | `claude mcp add ...` у потрібній області |
| Figma: потрібна автентифікація | не виконано вхід | `claude mcp login figma` |
| Figma: застарілий токен | сесія входу завершилась | `claude mcp logout figma`, потім `claude mcp login figma` |
| Figma: нема доступу до файлу | файл недоступний вашому акаунту | відкрийте доступ у Figma або увійдіть під іншим акаунтом |
| Playwright не запускається | нема Node/`npx` або мережі | `node -v`, `npx -v` |
| Playwright: зависання, нестача пам'яті | кілька браузерів одночасно | один браузер; закрийте зайве |
| Сервер із `.mcp.json` не підключається | очікує схвалення (Pending approval) | `claude mcp get <ім'я>`; схваліть сервер |

Інші проблеми набору: [TROUBLESHOOTING.md](TROUBLESHOOTING.md).
