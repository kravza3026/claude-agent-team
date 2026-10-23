# Дашборд агентів

Локальний веб-дашборд для Claude Code: події агентів у реальному часі, схема/сцена, ліміти й витрати, команди з браузера, вибір моделі.

- Запуск: `node start.js` (або `start.sh` / `start.ps1` / `start.cmd`) → http://127.0.0.1:7777 (порт: `--port N` або `AGENTS_DASHBOARD_PORT`). Слухає лише 127.0.0.1.
- Оркестратор: `claude --agent orchestrator`.
- Події пишуть хуки (`hook.js`) у `events.jsonl`; команди з дашборду доставляє `deliver.js`; ліміти — `statusline.js`; кроки плану — `node log.js <агент> <queued|running|done|failed> "<опис>"`.
- Дані (`events.jsonl`, `inbox.jsonl`, `acks.jsonl`, `status.json`, `usage-cache.json`, `.token`) створюються під час роботи й не є частиною репозиторію.



## Мови / Languages
- Інтерфейс двомовний: українська (типово) і англійська. Перемикач «UA | EN» у шапці (поруч із 🔔 і темою); перемикання миттєве, без перезавантаження, стан (проєкт, вкладка, режим сцени/схеми, масштаб) зберігається. Вибір пишеться в `localStorage` (ключ `lang`); без збереженого значення береться мова браузера (`uk*` → українська, інакше англійська), далі українська. Якщо `localStorage` недоступний, інтерфейс усе одно працює (мова лише не запам'ятовується).
- Архітектура: словники `locales/uk.json` і `locales/en.json` (плоскі ключі `розділ.назва`; множина через `|`, напр. `"{n} agent|{n} agents"`; підстановка `{name}`). Сервер віддає їх як `GET /locales/uk.json|en.json` (білий список, `Cache-Control: no-store`); сторінка завантажує обидва до першого рендера, українська — запасна. У `index.html`: `t(key, params)`, `tn(key, n, params)` / `plural(n, forms)`, `nf()` (числа через `Intl`), `fmtTime()` (дати через `Intl`); статичний HTML — атрибути `data-i18n`, `data-i18n-html`, `data-i18n-attr="aria-label:key;title:key;placeholder:key"`.
- Сервер: при перемиканні UI надсилає `POST /lang {lang}` (Host/Origin + `X-Token`, білий список `uk|en`); мова пишеться у файл `lang` у теці дашборду й використовується для сповіщень `notify-send` (імена ролей, заголовки) та текстів помилок API (поле `why` + код `code`; UI перекладає за кодом `err.<code>`).
- Не перекладаються дані: команди, відповіді Claude, деталі інструментів і подій, назви проєктів/файлів, ідентифікатори агентів/моделей.
- Додати нову мову (напр. `de`): 1) скопіювати `locales/en.json` у `locales/de.json` і перекласти значення; 2) додати `de` до списку мов: `LANGS` і `LOCALES` (локаль для `Intl`, напр. `de-DE`) у початковому блоці `<script>` в `index.html`; `LANGS` і маршрут `/locales/(uk|en).json` у `server.js` (також `fs.watchFile` для словників); 3) додати кнопку в сегмент `#langSeg` (`data-lang="de"`) і ключ `lang.de` у словники. Форми множини: `plural()` бере `Intl.PluralRules` (2 форми для en, 3 для uk: `одна|кілька|багато`).
- Перевірка: `node tools/check-i18n.js` (однаковий набір ключів у всіх мовах, немає порожніх значень, усі ключі з `index.html`/`server.js` існують).

### Languages (English summary)
- The UI is bilingual: Ukrainian (default) and English, with a "UA | EN" switch in the header. Switching is instant (no reload, view state is kept). The choice is stored in `localStorage` (`lang`); otherwise the browser language is used (`uk*` → Ukrainian, anything else → English), falling back to Ukrainian. It still works if `localStorage` is unavailable.
- Dictionaries live in `locales/uk.json` and `locales/en.json` (flat `section.name` keys, `{name}` interpolation, plural forms separated by `|`), served by `GET /locales/uk.json|en.json`. UI helpers: `t()`, `tn()`/`plural()`, `nf()`, `fmtTime()` (Intl); static HTML uses `data-i18n`, `data-i18n-html`, `data-i18n-attr`.
- The UI posts the chosen language to `POST /lang` (token required); the server stores it in the `lang` file and uses it for desktop notifications and API error messages. User/agent data is never translated.
- To add a language: copy `locales/en.json` to `locales/xx.json`, translate it, add `xx` to `LANGS`/`LOCALES` in the first `<script>` of `index.html` and to `LANGS` and the `/locales/` route in `server.js`, add a button to `#langSeg` and a `lang.xx` key. Check with `node tools/check-i18n.js`.

## Роль «Універсальний» (general-purpose)
- Агенти типу `general-purpose` (і `subagent`, коли тип невідомий) показуються як роль «Універсальний / General»: 4-й рядок колонки «Підготовка» на сцені, схема, таблиця, таймлайн. Імена агентів у завданнях з `Agent` нормалізуються (`developer` → `frontend-developer`), а завдання в статусі «у черзі» без старту понад 15 хв більше не показуються в стрічці завдань.

Повна документація: `docs/DASHBOARD.md` (docs/en/DASHBOARD.md) у корені репозиторію.
