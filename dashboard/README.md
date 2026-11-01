# Дашборд агентів
- Запуск: `~/.claude/dashboard/start.sh` → http://127.0.0.1:7777 (лише localhost).
- Оркестратор: `claude --agent orchestrator` (або `"agent": "orchestrator"` у settings).
- Події пишуть хуки (`hook.js`: SubagentStart/Stop, PreToolUse, помилки PostToolUse) у `events.jsonl` (ротація >5 МБ). Секрети редагуються (ключі/токени), команди обрізаються.
- Кроки плану: `log.sh <агент> <queued|running|done|failed> "<опис>"`.
- Вимкнути збір: прибрати блок `hooks` із `~/.claude/settings.json` (бекап: `settings.json.bak-dashboard`).

## Автозапуск і ярлик (Ubuntu)
- Сервіс: `systemctl --user status|restart|stop agents-dashboard` (автозапуск при вході; логи: `journalctl --user -u agents-dashboard`).
- Ярлик «Панель агентів» у меню програм (`~/.local/share/applications/agents-dashboard.desktop`) відкриває окреме вікно Chrome.
- Сповіщення (`notify-send`): завершення агента і збій кроку плану. Вимкнути: `touch ~/.claude/dashboard/mute`; увімкнути: `rm ~/.claude/dashboard/mute`.

## Команди з дашборду
- Поле «Команди» → `POST /command` (лише 127.0.0.1, перевірка Host/Origin, токен у `.token` із правами 600) → `inbox.jsonl`.
- Доставка: хук `deliver.js` (UserPromptSubmit/PreToolUse/Stop) передає команду основній сесії (не субагентам) з позначкою джерела; `acks.jsonl` — підтвердження, TTL 30 хв, до 20 невиконаних.
- Історія: термінал (UserPromptSubmit), Telegram (за `<channel source="plugin:telegram…">`) і дашборд, з бейджами джерела й фільтром. Команда в idle-сесії чекає наступної активності.
- Бекапи налаштувань: `settings.json.bak-dashboard`, `settings.json.bak-dashboard2`.

## Режим tmux (команди в бездіяльну сесію)
- Потрібен tmux (встановлено без sudo в `~/.local/opt/tmux`, обгортка `~/.local/bin/tmux`; або `sudo apt install tmux`) і запуск Claude через `~/.claude/dashboard/claude-tmux [аргументи]` (напр. `claude-tmux --agent orchestrator`).
- Хуки записують у `panes.json`, в якій панелі працює сесія; сервер відстежує стан сесії (idle/busy/waiting) за подіями Stop/SessionStart/PermissionRequest/Notification та інструментів.
- Команда вводиться через `tmux send-keys` лише коли сесія бездіяльна, не очікує дозволу і в терміналі немає діалогу; інакше автоматично йде в чергу (хуки). Текст отримує префікс `[dashboard:<id>]`.
- Бекапи: `hook.js.bak-tmux`, `server.js.bak-tmux`, `index.html.bak-tmux`, `settings.json.bak-dashboard3`.

## Редизайн (Mission control)
- KPI-картки (активні агенти, виклики з міні-графіком, помилки, команди, сесії, остання подія), схема взаємодії, таймлайн активності по ролях (вікно 5/15/60 хв), таблиця агентів зі статистикою й топом інструментів (клік відкриває агента на сцені), права панель із вкладками «Розмова» (чат-стиль, composer), «Події» (фільтри за типом + пошук) і «План» (з прогресом).
- Системні сповіщення вмикаються/вимикаються кнопкою 🔔 (файл `mute`), `/` фокусує поле команд. Бекап попередньої версії: `index.html.bak-redesign`.

## Ліміти та витрати Claude
- Картка «Ліміти та витрати Claude» і KPI «Ліміт 5 год». Відсотки лімітів (5 год, 7 днів; Opus/Sonnet за наявності) і час скидання беруться зі статус-рядка Claude Code: у `~/.claude/settings.json` додано `statusLine` → `statusline.js`, який зберігає JSON сесії (`rate_limits`, `context_window`, `cost`) у `status.json` і друкує в терміналі «модель · ctx % · 5h % · 7d %». Бекап налаштувань: `settings.json.bak-statusline`. Прибрати: видалити ключ `statusLine`.
- Токени (вихід/вхід/кеш) рахує сервер інкрементально з транскриптів `~/.claude/projects/**/*.jsonl` (включно із субагентами): вікна 5 год/24 год/7 днів, за моделями, за проєктами, погодинна діаграма; кеш підрахунку `usage-cache.json`. Ендпоінт `GET /usage`. Бекапи: `server.js.bak-usage`, `index.html.bak-usage`.

## Вибір моделі Claude
- Картка «Модель Claude»: (1) **поточна сесія**: вибір сесії й моделі, кнопка «Застосувати» вводить `/model <alias>` у термінал через tmux (лише коли сесія в tmux, бездіяльна й без діалогу); (2) **типова модель** для нових сесій: ключ `model` у `~/.claude/settings.json`; (3) **моделі агентів**: рядок `model:` у frontmatter `~/.claude/agents/<агент>.md` (inherit/fable/opus/sonnet/haiku).
- Безпека: `POST /model` лише з токеном і того ж origin; значення тільки з білого списку (`fable|opus|sonnet|haiku`, `inherit`, `default`); ім'я агента `[A-Za-z0-9_-]+` і лише існуючий файл; перед записом копія в `~/.claude/dashboard/backups/` (10 останніх). Інші ключі `settings.json` і тіло агентів не змінюються. Бекапи коду: `server.js.bak-models`, `index.html.bak-models`.

## Мови / Languages
- Інтерфейс двомовний: українська (типово) і англійська. Перемикач «UA | EN» у шапці (поруч із 🔔 і темою); перемикання миттєве, без перезавантаження, стан (проєкт, вкладка, режим сцени/схеми, масштаб) зберігається. Вибір пишеться в `localStorage` (ключ `lang`); без збереженого значення береться мова браузера (`uk*` → українська, інакше англійська), далі українська. Якщо `localStorage` недоступний, інтерфейс усе одно працює (мова лише не запам'ятовується).
- Архітектура: словники `locales/uk.json` і `locales/en.json` (плоскі ключі `розділ.назва`; множина через `|`, напр. `"{n} agent|{n} agents"`; підстановка `{name}`). Сервер віддає їх як `GET /locales/uk.json|en.json` (білий список, `Cache-Control: no-store`); сторінка завантажує обидва до першого рендера, українська — запасна. У `index.html`: `t(key, params)`, `tn(key, n, params)` / `plural(n, forms)`, `nf()` (числа через `Intl`), `fmtTime()` (дати через `Intl`); статичний HTML — атрибути `data-i18n`, `data-i18n-html`, `data-i18n-attr="aria-label:key;title:key;placeholder:key"`.
- Сервер: при перемиканні UI надсилає `POST /lang {lang}` (Host/Origin + `X-Token`, білий список `uk|en`); мова пишеться у файл `lang` у теці дашборду й використовується для сповіщень `notify-send` (імена ролей, заголовки) та текстів помилок API (поле `why` + код `code`; UI перекладає за кодом `err.<code>`).
- Не перекладаються дані: команди, відповіді Claude, деталі інструментів і подій, назви проєктів/файлів, ідентифікатори агентів/моделей.
- Додати нову мову (напр. `de`): 1) скопіювати `locales/en.json` у `locales/de.json` і перекласти значення; 2) додати `de` до списку мов: `LANGS` і `LOCALES` (локаль для `Intl`, напр. `de-DE`) у початковому блоці `<script>` в `index.html`; `LANGS` і маршрут `/locales/(uk|en).json` у `server.js` (також `fs.watchFile` для словників); 3) додати кнопку в сегмент `#langSeg` (`data-lang="de"`) і ключ `lang.de` у словники. Форми множини: `plural()` бере `Intl.PluralRules` (2 форми для en, 3 для uk: `одна|кілька|багато`).
- Перевірка: `node tools/check-i18n.js` (однаковий набір ключів у всіх мовах, немає порожніх значень, усі ключі з `index.html`/`server.js` існують). Бекапи перед i18n: `index.html.bak-i18n`, `server.js.bak-i18n`.

### Languages (English summary)
- The UI is bilingual: Ukrainian (default) and English, with a "UA | EN" switch in the header. Switching is instant (no reload, view state is kept). The choice is stored in `localStorage` (`lang`); otherwise the browser language is used (`uk*` → Ukrainian, anything else → English), falling back to Ukrainian. It still works if `localStorage` is unavailable.
- Dictionaries live in `locales/uk.json` and `locales/en.json` (flat `section.name` keys, `{name}` interpolation, plural forms separated by `|`), served by `GET /locales/uk.json|en.json`. UI helpers: `t()`, `tn()`/`plural()`, `nf()`, `fmtTime()` (Intl); static HTML uses `data-i18n`, `data-i18n-html`, `data-i18n-attr`.
- The UI posts the chosen language to `POST /lang` (token required); the server stores it in the `lang` file and uses it for desktop notifications and API error messages. User/agent data is never translated.
- To add a language: copy `locales/en.json` to `locales/xx.json`, translate it, add `xx` to `LANGS`/`LOCALES` in the first `<script>` of `index.html` and to `LANGS` and the `/locales/` route in `server.js`, add a button to `#langSeg` and a `lang.xx` key. Check with `node tools/check-i18n.js`.

## Склад команди: team.json
- Машинне джерело складу — `team.json` (21 агент + оркестратор). Формат: `orchestrator {id,label{uk,en}}`; `groups[] {id,label{uk,en},agents[ids]}` (порядок груп і агентів = порядок у UI); `agents[] {id,label{uk,en},group,model,skills[],description_uk,description_en,aliases[]}`; `edges[] {from,to,kind: handoff|review|feedback,label_uk,label_en}`.
- Сервер віддає файл як `GET /team.json` (перевірка Host, як в інших GET), стежить за змінами (відкриті вкладки перезавантажуються) і бере з нього імена для сповіщень. UI підвантажує його при старті; якщо файла нема, використовується запасний список зі старих 12 ролей.
- `aliases` мапить історичні імена в події (`frontend-developer`, `developer` → `frontend-engineer`, `reviewer` → `code-reviewer`...). Усе, чого нема в `team.json`, показується в групі «Інші агенти» лише коли має активність (наприклад `general-purpose`).
- **Додати агента:** файл `~/.claude/agents/<id>.md` + запис у `agents[]` і в `groups[].agents`. **Додати ребро:** запис у `edges[]` (обидва кінці мають існувати). Перезапуск не потрібен для UI; для серверних сповіщень/агрегації передач сервер перечитує файл сам.

## «Фокус на активних» (схема взаємодії)
- Єдина схема в картці «Схема взаємодії»; 3D-сцена, three.js, `vendor/` і кнопка орієнтації прибрані. Перемикач «Фокус | Усі агенти» (збережений вибір: `localStorage.mode5`).
- **Активні** (мали запуски/виклики/токени у вибраному вікні 5 хв…«Увесь час» з урахуванням фільтра проєкту або працюють зараз) — великі картки потоком зліва направо: колонка «Старт» — оркестратор; далі «Етап N» за глибиною (longest path) по ребрах `handoff`/`review` з `team.json` між активними агентами; агенти без зв'язків — у колонці за групою. Картка: назва, id, статус (працює — синя рамка зі світінням, завершив — зелена, помилка — червона, очікує), запуски, виклики, токени (за вікном; без даних — «токени н/д»), тривалість поточного/останнього запуску, остання дія, міні-стовпчики активності.
- **Конектори** лише між активними картками: плавні криві (довгі проходять коридорами між картками), товщина ∝ кількості передач (сервер: `/usage` → `edges`; для зв'язків через неактивного посередника — клієнтська оцінка: запуск B у тій самій сесії ≤30 хв після завершення A, пунктир-крапки), підпис «×N» біля стрілки, синій анімований пунктир — найновіша передача до агента, що працює (`prefers-reduced-motion` — статично), `feedback` — бурштиновий пунктир дугою над картками (лише коли спостерігався). Лінії від оркестратора — до кореневих агентів.
- **Неактивні** — чипи внизу за групами; наведення/фокус — підказка (опис, модель, навички), клік — панель. «Усі агенти» — сітка великих карток по групах (21); наведення/вибір агента підсвічує тільки його вхідні (←) і вихідні (→) зв'язки.
- **Панель агента** (клік по картці/чипу/рядку таблиці; Esc або × закриває): опис, модель (з `/models`), навички (`skills` у `team.json`), метрики за вікном (запуски, виклики, помилки, токени з розбивкою), останні 8 дій, «Отримує від…» / «Передає до…» з лічильниками спостережених передач (клік переходить до сусіда).
- Дані: `/usage?w=…&proj=…` (`byAgent`, `edges`), `/team.json`, `/models`, потік подій. Структура (картки/лінії) перебудовується лише при зміні складу активних або зв'язків; числа, статуси, тривалість і міні-графіки оновлюються точково. Шрифти схеми ≥13 px; на вузьких екранах (<700 px) колонки стають вертикальним списком; масштаб ＋/◎/－ (`localStorage.zoom5`), ⛶ — повний екран.

## Як додати агента
1. Додайте файл `~/.claude/agents/<id>.md`.
2. У `team.json` додайте об'єкт у `agents[]`: `{id, label{uk,en}, group, model, skills[], description_uk, description_en, aliases[]}` і `id` у `groups[].agents`; зв'язки — у `edges[]`: `{from, to, kind: handoff|review|feedback, label_uk, label_en}`.
3. Сервер сам підхопить зміну (відкриті вкладки перезавантажаться); `node tools/check-i18n.js` для перевірки перекладів.

## Метрики агентів і токени
- Вікна: 5 хв, 15 хв, 1 год, 24 год, 7 днів, «Увесь час»; фільтр проєкту діє на всі метрики. Запуски (`SubagentStart`), виклики інструментів (`PreToolUse`), помилки (`PostToolUse` з `ok:false`) рахує сервер інкрементально з `events.jsonl` (у пам'яті, перебудова при скороченні/ротації файла); «передача» A→B = запуск B у тій самій сесії протягом 30 хв після завершення A (оцінка за ребрами `team.json`).
- Токени по агентах: транскрипти субагентів `~/.claude/projects/<проєкт>/<сесія>/subagents/agent-<id>.jsonl` мають usage на кожну відповідь, а тип агента лежить у сусідньому `.meta.json` (`agentType`). Сервер додає ці дані в `usage-cache.json` (версія кешу 2, кошики по 5 хв, вимір «агент»; сканування інкрементальне за зсувом у файлі). Оркестратор = токени основних сесій. Сума токенів = вхід + вихід + запис кешу + читання кешу (розбивка в підказці). `GET /usage?w=<5|15|60|1440|10080|all>&proj=<проєкт>` повертає `byAgent` (запуски, виклики, помилки, токени) і `edges` (передачі). Токени зберігаються лише за останні 8 днів, тому «Увесь час» для токенів обмежене цим періодом (UI це підписує). Якщо даних по субагентах нема, UI пише «токени по агентах недоступні» й показує виклики.
- KPI «Активні агенти / N», таблиця «Агенти» (колонка «Токени», перемикач «Показати всіх») і таймлайн показують усіх агентів із `team.json`; неактивні за замовчуванням сховані.
