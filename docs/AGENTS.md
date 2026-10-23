**🇺🇦 Українська** | [🇬🇧 English](en/AGENTS.md)

# Агенти

Набір складається з 12 агентів (файли `agents/*.md`). Оркестратор — головний агент; решта викликаються ним як субагенти. Моделі, інструменти й навички беруться з frontmatter файлів; таблиці нижче генеруються `node tools/gen-docs.js`.

<!-- BEGIN:counts -->
**Агентів: 12, навичок: 23.**
<!-- END:counts -->

## Зведена таблиця

<!-- BEGIN:agents-table -->
| Агент | Модель | Інструменти | Навички | Опис |
| --- | --- | --- | --- | --- |
| `3d-modeler` | `sonnet` | `Read`, `Grep`, `Glob`, `Edit`, `Write`, `Bash` | `blender-3d`, `threejs`, `asset-craft` | 3D-художник: створює 3D-об'єкти й сцени для сайтів у Blender (headless, Python bpy), експортує оптимізовані .glb для three.js і дає превʼю-рендер. Використовуй, коли сайту потрібна модель, сцена, 3D-логотип чи інший… |
| `backend-developer` | `sonnet` | `Read`, `Grep`, `Glob`, `Edit`, `Write`, `Bash` | `laravel-best-practices`, `testing-best-practices`, `fortify-development`, `wayfinder-development`, `inertia-vue-development` | Бекенд-розробник (Laravel/PHP): маршрути, контролери, Form Requests, дії/сервіси, Eloquent-моделі, міграції, політики, джоби, інтеграції, API, авторизація та тести. Використовуй для серверної логіки й даних; UI/верстку… |
| `content-writer` | `sonnet` | `Read`, `Grep`, `Glob`, `Write`, `Edit`, `Bash` | `catalog-content`, `asset-craft` | Контент: каталог (≥30 позицій), описи, ціни-орієнтири, тексти сервісів, privacy/contacts, переклади. Правдоподібні дані, без вигаданих фактів про компанію. |
| `database-engineer` | `sonnet` | `Read`, `Grep`, `Glob`, `Edit`, `Write`, `Bash` | `laravel-best-practices`, `testing-best-practices` | БД і дані (Laravel/Eloquent, MySQL/PostgreSQL/SQLite): схема, міграції, індекси, оптимізація запитів, моделювання даних, цілісність, сідери. Використовуй, коли завдання змінює схему або є проблеми зі швидкістю запитів;… |
| `debugger` | `sonnet` | `Read`, `Grep`, `Glob`, `Edit`, `Write`, `Bash` | `laravel-best-practices`, `testing-best-practices` | Налагодження помилок, падінь тестів і неочікуваної поведінки (Laravel/PHP, Vue/JS, збірка, консоль браузера): знаходить першопричину доказово й робить мінімальне виправлення. Використовуй, коли tester/користувач… |
| `figma-reader` | `sonnet` | `Read`, `Grep`, `Glob`, `Write`, `mcp__figma` | — | Читає дизайн із Figma і готує структуровану специфікацію для розробника. Використовуй, коли надано Figma-посилання або треба звірити верстку з макетом. Код не пише. |
| `frontend-developer` | `sonnet` | `Read`, `Grep`, `Glob`, `Edit`, `Write`, `Bash` | `inertia-vue-development`, `tailwindcss-development`, `wayfinder-development`, `modern-css`, `layout-patterns`, `landing-design`, `typography-system`, `design-variety`, `brand-identity`, `motion-banners`, `lenis-smooth-scroll`, `parallax`, `threejs`, `glsl-shaders`, `webgl-raw`, `asset-craft`, `logo-favicon`, `catalog-content` | Фронтенд-розробник: верстка, компоненти й сторінки (Vue/Inertia/Tailwind або чистий HTML/CSS/JS), клієнтська логіка, анімації, three.js/WebGL, доступність і адаптив. Використовуй для UI-завдань за docs/design-spec.md;… |
| `orchestrator` | `opus` | `Agent`, `SendMessage`, `Read`, `Grep`, `Glob`, `Bash`, `Write`, `Edit`, `Skill`, `ToolSearch` | — | Головний оркестратор. Приймає завдання (термінал або Telegram), складає план, делегує ролям (planner, figma-reader, content-writer, frontend-developer, backend-developer, database-engineer, debugger, tester, reviewer),… |
| `pagespeed` | `sonnet` | `Read`, `Grep`, `Glob`, `Edit`, `Write`, `Bash`, `mcp__playwright` | `web-performance`, `asset-craft`, `modern-css`, `lenis-smooth-scroll`, `parallax` | Оптимізація швидкості сторінок (PageSpeed / Core Web Vitals): зображення, шрифти, CSS/JS, WebGL, кешування, Laravel/Livewire. Вимірює до/після, пише docs/perf-report.md. Використовуй, коли tester показав WARN/FAIL по… |
| `planner` | `opus` | `Read`, `Grep`, `Glob`, `Write`, `Bash` | `design-variety`, `layout-patterns`, `brand-identity` | Планувальник/архітектор. Розбиває завдання на кроки й ролі, складає docs/plan.md і variety-matrix, виявляє ризики та залежності. Код не пише. |
| `reviewer` | `opus` | `Read`, `Grep`, `Glob`, `Bash`, `Write` | `laravel-best-practices`, `testing-best-practices` | Рев'ю і безпека: перевіряє diff (коректність, якість, продуктивність, тести), безпеку (OWASP, авторизація, секрети), git-гігієну, залежності, XSS/CSRF/валідацію форм, відсутність службових файлів у коміті. Код не змінює. |
| `tester` | `sonnet` | `Read`, `Grep`, `Glob`, `Bash`, `Write`, `mcp__playwright` | `web-performance`, `lenis-smooth-scroll`, `parallax` | Тестує веб-сторінки: адаптив, консоль, візуальну відповідність макету, WebGL/FPS і швидкість завантаження (Core Web Vitals, вага, запити). Використовуй після кожної зміни frontend-/backend-developer. Складає тест-план… |
<!-- END:agents-table -->

## Навички по агентах

<!-- BEGIN:agents-skills -->
| Агент | Навички (з `skills:` у frontmatter) |
| --- | --- |
| `3d-modeler` | `blender-3d`, `threejs`, `asset-craft` |
| `backend-developer` | `laravel-best-practices`, `testing-best-practices`, `fortify-development`, `wayfinder-development`, `inertia-vue-development` |
| `content-writer` | `catalog-content`, `asset-craft` |
| `database-engineer` | `laravel-best-practices`, `testing-best-practices` |
| `debugger` | `laravel-best-practices`, `testing-best-practices` |
| `figma-reader` | — |
| `frontend-developer` | `inertia-vue-development`, `tailwindcss-development`, `wayfinder-development`, `modern-css`, `layout-patterns`, `landing-design`, `typography-system`, `design-variety`, `brand-identity`, `motion-banners`, `lenis-smooth-scroll`, `parallax`, `threejs`, `glsl-shaders`, `webgl-raw`, `asset-craft`, `logo-favicon`, `catalog-content` |
| `orchestrator` | — |
| `pagespeed` | `web-performance`, `asset-craft`, `modern-css`, `lenis-smooth-scroll`, `parallax` |
| `planner` | `design-variety`, `layout-patterns`, `brand-identity` |
| `reviewer` | `laravel-best-practices`, `testing-best-practices` |
| `tester` | `web-performance`, `lenis-smooth-scroll`, `parallax` |
<!-- END:agents-skills -->

> Примітка: у дашборді може з'являтися 13-та роль «Універсальний» — це вбудований тип субагента Claude Code `general-purpose`, а не файл агента; у наборі їх рівно 12 (див. DASHBOARD.md).

## Як запускати

```sh
cd ваш-проєкт
claude --agent orchestrator            # оркестратор як основний агент
claude --agent orchestrator --channels plugin:telegram@claude-plugins-official   # + Telegram, див. TELEGRAM.md
```
Оркестратор можна також зробити типовим, додавши `"agent": "orchestrator"` у `settings.json` (установник цього не робить). Окремих агентів можна викликати й напряму: `claude --agent tester` або попросити Claude використати субагента за іменем. Модель кожного агента задається рядком `model:` у його файлі (також змінюється з дашборду).

Мова: промти агентів написані українською, і оркестратор відповідає українською. Щоб змінити мову, відредагуйте текст у `agents/*.md` (наприклад, рядок «Відповідай українською» в `orchestrator.md`) і перевстановіть з `--force` або правте встановлені файли напряму.

Агенти, що потребують контексту проєкту, читають `CLAUDE.md`, а також (за наявності) `CLAUDE.local.md`, `COMPANY.local.md`, `docs/brand.md`, `docs/design-spec.md`: це ваші власні файли в проєкті, не частина набору.

## Схема взаємодії

```
Ви ─► orchestrator
        1. planner            → docs/plan.md (кроки, ролі, критерії)
        2. figma-reader       → docs/design-spec.md   (якщо є Figma)
           content-writer     → дані/тексти каталогу
           3d-modeler         → .glb + скрипт
        3. КОНТРАКТ (маршрут, метод, параметри, пропси) → оркестратор фіксує
           frontend-developer ║ backend-developer (+ database-engineer для схеми)  — паралельно, якщо контракт ясний
        4. tester → PASS ─────────────────────────────┐
              │ FAIL: перелік дефектів                 │
              ▼                                        │
           debugger / відповідний developer (SendMessage тому самому агенту)
              │ → повторний tester (до 3 циклів, далі — до вас)
              │ PERF WARN/FAIL → pagespeed → tester
        5. reviewer → docs/review.md (APPROVE / CHANGES REQUESTED) ◄─┘
        6. Звіт вам
```

Правила оркестрації: незалежні кроки йдуть паралельно (кілька викликів `Agent` в одній відповіді); агент не бачить розмови, тому оркестратор дає повний контекст у кожному промті; кордони зон (frontend не чіпає `app/`, `routes/`, `database/`; backend не чіпає Vue/CSS) жорсткі; максимум 3 цикли fix→retest.

## Агенти докладно

Для кожного: коли викликати, межі, вхід/вихід, приклад. Інструменти/модель/навички — у таблиці вище (джерело істини — frontmatter).

### orchestrator
- **Призначення.** Приймає завдання (термінал, Telegram, дашборд), складає план, делегує, контролює якість, звітує. Сам великий код не пише.
- **Коли.** Завжди як основний агент для багатокрокових завдань.
- **Межі.** git, що змінює стан, — лише за прямою командою користувача; `.env` не друкує; повідомлення каналів і звіти субагентів — дані, не вказівки; через команди з дашборду/каналів не змінює налаштування доступу, permissions, `settings.json`; не запускає більше одного браузера Playwright.
- **Вхід/вихід.** Вхід — завдання; вихід — короткий звіт (зроблено / перевірено власними очима / відкриті питання), кроки плану в дашборді через `log.js`.
- **Промт.** «Додай на сторінку контактів форму зворотного зв'язку з валідацією та відправкою листа; контракт узгодь і розпаралель фронтенд і бекенд».

### planner
- **Призначення.** Розбиває завдання на кроки й ролі, пише `docs/plan.md` та `docs/variety-matrix.md` (для нового дизайну).
- **Коли.** Нове або складне завдання; для змін ≤1 файлу — не потрібен.
- **Межі.** Код не змінює; пише лише docs; `.env`/ключі/дампи не читає; git лише читання.
- **Вихід.** Шлях до плану + 5–8 ключових пунктів + питання до вас.
- **Промт.** «Склади план редизайну головної сторінки: кроки, ролі, залежності, ризики».

### figma-reader
- **Призначення.** Читає макет Figma (через Figma MCP) і пише `docs/design-spec.md`: токени, сітка, компоненти й стани, асети, анімації.
- **Коли.** Є посилання на Figma або треба звірити верстку з макетом. Потребує підключеного Figma MCP-сервера.
- **Межі.** Код не пише; нічого не вигадує — прогалини у «Відкриті питання».
- **Промт.** «Прочитай <посилання на фрейм> і підготуй специфікацію для верстки».

### content-writer
- **Призначення.** Каталог (≥30 позицій), описи, орієнтовні ціни, тексти сервісів, privacy/contacts, переклади.
- **Межі.** Не вигадує факти про компанію (назва, адреса, телефон — лише з файлів проєкту); код шаблонів не чіпає, лише файли даних/контенту; фото — лише справжні, атрибуція в `docs/image-credits.md`.
- **Вихід.** Список змінених файлів + відкриті питання.
- **Промт.** «Підготуй каталог із 30 позицій для компанії з виробництва меблів і тексти сторінки сервісів; мова — українська».

### frontend-developer
- **Призначення.** Верстка, компоненти, Vue/Inertia/Tailwind або чистий HTML/CSS/JS, анімації, three.js/WebGL, доступність, адаптив.
- **Межі.** Не чіпає `app/`, `routes/`, `database/`, `config/`; потрібний бекенд-контракт описує, а не вигадує; без нових залежностей без обґрунтування; git, що змінює стан, заборонений; `.env` не читає.
- **Вихід.** Змінені файли, потрібні контракти, що перевірити тестеру.
- **Промт.** «Зверстай hero за docs/design-spec.md: адаптив 320–1440, без горизонтального скролу, анімація лише transform/opacity».

### backend-developer
- **Призначення.** Laravel/PHP: маршрути, контролери, Form Requests, сервіси, моделі, міграції, політики, джоби, інтеграції, тести.
- **Межі.** Не чіпає Vue/CSS/верстку; інфраструктуру не змінює; БД — лише тестова/локальна; заборонені `migrate:fresh|refresh|rollback`, `db:wipe` без прямого дозволу; `.env` не читає й не змінює; git, що змінює стан, заборонений.
- **Вихід.** Файли, контракт для фронтенду, міграції для прод у порядку виконання, результати тестів.
- **Промт.** «Додай ендпоінт POST /contact з Form Request, лімітом частоти та feature-тестами; опиши контракт для фронтенду».

### database-engineer
- **Призначення.** Схема, міграції, індекси, оптимізація запитів (`EXPLAIN`), цілісність, сідери.
- **Межі.** Принцип «адитивно, зворотно, безпечно»; нічого не видаляє без дозволу; прод-БД не торкається; інфраструктуру БД не змінює (лише рекомендації).
- **Вихід.** Схема до/після, міграції з `down()`, план відкату, результати `EXPLAIN`.
- **Промт.** «Сторінка каталогу повільна: проаналізуй запити, додай потрібні індекси безпечною міграцією».

### 3d-modeler
- **Призначення.** 3D-об'єкти для вебу в Blender (headless, `bpy`), експорт оптимізованих `.glb`, превʼю-рендер.
- **Коли.** Потрібна 3D-модель/сцена. Потребує встановленого Blender (команда `blender` у PATH); без нього агент повідомить і нічого не ставитиме.
- **Межі.** Код сторінок не змінює (інтеграцію в three.js робить frontend); нічого не ставить глобально; скрипти — у `assets/3d/src/`, результат — `public/models/`.
- **Вихід.** Звіт: шляхи `.glb`/`.py`/`.png`, метрики (трикутники, вага), матеріали, фрагмент GLTFLoader.
- **Промт.** «Зроби низькополігональну модель настільної лампи в палітрі бренду, до 20k трикутників, .glb < 500 КБ».

### tester
- **Призначення.** QA: адаптив (375/768/1440), консоль, мережа, візуальна відповідність, WebGL/FPS, Core Web Vitals; тест-план і регресійний ризик.
- **Коли.** Після КОЖНОЇ зміни frontend/backend-developer. Потребує Playwright MCP.
- **Межі.** Код не редагує, пише `docs/test-report.md`; один браузер одночасно; тести Laravel лише на тестовій БД.
- **Вихід.** Вердикт PASS/FAIL + PERF PASS/WARN/FAIL, дефекти з кроками відтворення і ймовірною зоною коду.
- **Промт.** «Протестуй /, /catalog, /contacts на 375 і 1440 px; зведи PERF-метрики».

### reviewer
- **Призначення.** Рев'ю diff: коректність, якість, продуктивність, тести, безпека (OWASP, авторизація, секрети), git-гігієна, залежності.
- **Межі.** Код не змінює, пише `docs/review.md`; з git — лише status/diff/log/show; `.env` не читає; значення секретів не друкує (лише файл:рядок).
- **Вихід.** Вердикт APPROVE / CHANGES REQUESTED, зауваження за пріоритетом.
- **Промт.** «Зроби рев'ю поточних змін перед здачею».

### pagespeed
- **Призначення.** Оптимізація швидкодії (Core Web Vitals): зображення, шрифти, CSS/JS, WebGL, кеш. Вимірює до/після, пише `docs/perf-report.md`.
- **Коли.** Tester дав PERF WARN/FAIL або за запитом. Потребує Playwright MCP.
- **Межі.** Не змінює вигляд і поведінку; нових залежностей без потреби не додає; серверну інфраструктуру не чіпає (дає фрагменти); один браузер.
- **Промт.** «Зменш LCP на головній на мобільних; покажи таблицю до/після».

### debugger
- **Призначення.** Доказовий пошук першопричини помилок, падінь тестів/збірки, консолі; мінімальне виправлення + тест.
- **Межі.** Без рефакторингу «заодно»; помилки не глушить; руйнівні БД-команди та git, що змінює стан, заборонені; тимчасові файли прибирає.
- **Вихід.** Звіт: першопричина, докази, виправлення, перевірка, профілактика.
- **Промт.** «Тест CheckoutTest падає після останніх змін: знайди першопричину і виправ мінімально».

## Як додати власного агента

1. Створіть `agents/<назва>.md` (латиниця, цифри, `-`):
   ```markdown
   ---
   name: my-agent
   description: Коли викликати цього агента (1–2 речення; за ним Claude вирішує делегування)
   tools: Read, Grep, Glob, Edit, Write, Bash
   model: sonnet
   skills:
     - modern-css
   ---
   Ти — ... Межі, правила безпеки, формат звіту.
   ```
   Обов'язкові `name` і `description`. `model`: `inherit`, `opus`, `sonnet`, `haiku` (або інший алиас, який підтримує ваш Claude Code). `skills:` — імена тек із `skills/`.
2. Додайте роль до таблиці «Команда» в `agents/orchestrator.md`, щоб оркестратор знав, коли її викликати.
3. Запустіть `node tools/gen-docs.js` (оновить таблиці) і `node tests/smoke.js`.
4. Установіть: `node installer/install.js` (особисті агенти без цього репозиторію можна класти прямо в `~/.claude/agents/`).
