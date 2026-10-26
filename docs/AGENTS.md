**🇺🇦 Українська** | [🇬🇧 English](en/AGENTS.md)

# Агенти

Набір складається з 22 агентів (оркестратор і 21 роль у чотирьох групах: аналіз і дизайн, інженерія, якість, документація; файли `agents/*.md`). Оркестратор — головний агент; решта викликаються ним як субагенти. Моделі, інструменти й навички беруться з frontmatter файлів; таблиці нижче генеруються `node tools/gen-docs.js`.

<!-- BEGIN:counts -->
**Агентів: 22, навичок: 26.**
<!-- END:counts -->

## Зведена таблиця

<!-- BEGIN:agents-table -->
| Агент | Модель | Інструменти | Навички | Опис |
| --- | --- | --- | --- | --- |
| `3d-modeler` | `sonnet` | `Read`, `Grep`, `Glob`, `Edit`, `Write`, `Bash` | `blender-3d`, `threejs`, `asset-craft` | 3D-художник: створює 3D-об'єкти й сцени для сайтів у Blender (headless, Python bpy), експортує оптимізовані .glb для three.js і дає превʼю-рендер. Використовуй, коли сайту потрібна модель, сцена, 3D-логотип чи інший… |
| `ai-engineer` | `sonnet` | `Read`, `Grep`, `Glob`, `Edit`, `Write`, `Bash` | `claude-api`, `laravel-best-practices`, `testing-best-practices` | AI-інженер: інтеграція LLM у застосунки: промпти, tool use, RAG, оцінювання (evals), вартість і латентність, кешування, безпека промптів (prompt injection). Використовуй, коли у проєкті треба чат, класифікація,… |
| `architect` | `opus` | `Read`, `Grep`, `Glob`, `Write`, `Bash` | `domain-driven-design`, `infer-conventions`, `laravel-best-practices` | Архітектор: технічний дизайн, ADR, межі модулів, контракти API і даних, нефункціональні міркування, ризики та декомпозиція на завдання для інженерів. Використовуй після business-analyst для нетривіальних змін. Код не… |
| `backend-engineer` | `sonnet` | `Read`, `Grep`, `Glob`, `Edit`, `Write`, `Bash` | `laravel-best-practices`, `testing-best-practices`, `fortify-development`, `wayfinder-development`, `inertia-vue-development`, `infer-conventions`, `domain-driven-design` | Бекенд-інженер (Laravel/PHP): маршрути, контролери, Form Requests, дії/сервіси, Eloquent-моделі, міграції, політики, джоби, інтеграції, API, авторизація та тести. Використовуй для серверної логіки й даних; UI/верстку… |
| `business-analyst` | `opus` | `Read`, `Grep`, `Glob`, `Write`, `Edit`, `Bash`, `WebFetch`, `WebSearch` | `business-analyst` | Бізнес-аналітик: збирає й структурує вимоги, user stories, acceptance criteria, обсяг (in/out), ризики й відкриті питання. Перший крок для нового чи нечіткого завдання, перед architect. Код не пише. |
| `code-reviewer` | `sonnet` | `Read`, `Grep`, `Glob`, `Bash`, `Write` | `laravel-best-practices`, `testing-best-practices`, `infer-conventions`, `domain-driven-design` | Рев'ювер коду: перевіряє diff на коректність, якість, тести, продуктивність, елегантність, а також гігієну (git-стан, сторонні файли, секрети, службові файли). Код не змінює; пише docs/review.md. Використовуй перед… |
| `content-writer` | `sonnet` | `Read`, `Grep`, `Glob`, `Write`, `Edit`, `Bash` | `catalog-content`, `asset-craft` | Контент: каталог (≥30 позицій), описи, ціни-орієнтири, тексти сервісів, privacy/contacts, переклади. Правдоподібні дані, без вигаданих фактів про компанію. |
| `database-engineer` | `sonnet` | `Read`, `Grep`, `Glob`, `Edit`, `Write`, `Bash` | `laravel-best-practices`, `testing-best-practices`, `infer-conventions`, `domain-driven-design` | БД і дані (Laravel/Eloquent, MySQL/PostgreSQL/SQLite): схема, міграції, індекси, оптимізація запитів, моделювання даних, цілісність, сідери. Використовуй, коли завдання змінює схему або є проблеми зі швидкістю запитів;… |
| `debugger` | `sonnet` | `Read`, `Grep`, `Glob`, `Edit`, `Write`, `Bash` | `laravel-best-practices`, `testing-best-practices` | Налагодження помилок, падінь тестів і неочікуваної поведінки (Laravel/PHP, Vue/JS, збірка, консоль браузера): знаходить першопричину доказово й робить мінімальне виправлення. Використовуй, коли tester/користувач… |
| `devops-engineer` | `sonnet` | `Read`, `Grep`, `Glob`, `Edit`, `Write`, `Bash` | `infer-conventions` | DevOps-інженер: проєктує й описує CI/CD, контейнери, моніторинг, середовища, стратегію розгортання й відкату. ІНФРАСТРУКТУРУ НЕ ЗМІНЮЄ й деплой не виконує; конфіг-файли в репозиторії лише за завданням, інше у вигляді… |
| `figma-reader` | `sonnet` | `Read`, `Grep`, `Glob`, `Write`, `mcp__figma` | — | Читає дизайн із Figma і готує структуровану специфікацію для розробника. Використовуй, коли надано Figma-посилання або треба звірити верстку з макетом. Код не пише. |
| `frontend-engineer` | `sonnet` | `Read`, `Grep`, `Glob`, `Edit`, `Write`, `Bash` | `inertia-vue-development`, `tailwindcss-development`, `wayfinder-development`, `modern-css`, `layout-patterns`, `landing-design`, `typography-system`, `design-variety`, `brand-identity`, `motion-banners`, `lenis-smooth-scroll`, `parallax`, `threejs`, `glsl-shaders`, `webgl-raw`, `asset-craft`, `logo-favicon`, `catalog-content`, `web-performance` | Фронтенд-інженер: верстка, компоненти й сторінки (Vue/Inertia/Tailwind або чистий HTML/CSS/JS), клієнтська логіка, анімації, three.js/WebGL, доступність і адаптив. Використовуй для UI-завдань за docs/design-spec.md;… |
| `mobile-engineer` | `sonnet` | `Read`, `Grep`, `Glob`, `Edit`, `Write`, `Bash` | `modern-css`, `tailwindcss-development`, `web-performance`, `lenis-smooth-scroll` | Мобільний інженер: мобільний досвід вебу (PWA, manifest, service worker, офлайн, адаптив, touch, доступність); React Native/Flutter лише якщо проєкт їх уже використовує. Використовуй для PWA й мобільних сценаріїв. |
| `orchestrator` | `opus` | `Agent`, `SendMessage`, `Read`, `Grep`, `Glob`, `Bash`, `Write`, `Edit`, `Skill`, `ToolSearch` | — | Головний оркестратор. Приймає завдання (термінал, Telegram або дашборд), маршрутизує між ролями команди (аналіз і дизайн, інженерія, якість, документація), керує передачами між агентами та циклом fix→retest, звітує… |
| `pagespeed` | `sonnet` | `Read`, `Grep`, `Glob`, `Edit`, `Write`, `Bash`, `mcp__playwright` | `web-performance`, `asset-craft`, `modern-css`, `lenis-smooth-scroll`, `parallax` | Оптимізація швидкості сторінок (PageSpeed / Core Web Vitals): зображення, шрифти, CSS/JS, WebGL, кешування, Laravel/Livewire. Вимірює до/після, пише docs/perf-report.md. Використовуй, коли tester показав WARN/FAIL по… |
| `planner` | `opus` | `Read`, `Grep`, `Glob`, `Write`, `Bash` | `design-variety`, `layout-patterns`, `brand-identity` | Планувальник/архітектор. Розбиває завдання на кроки й ролі, складає docs/plan.md і variety-matrix, виявляє ризики та залежності. Код не пише. |
| `qa-engineer` | `sonnet` | `Read`, `Grep`, `Glob`, `Write`, `Bash` | `testing-best-practices` | QA-інженер: стратегія тестування, тест-плани, піраміда тестів, user journeys, оцінка регресійного ризику. Не змінює продакшн-код; пише лише документи (docs/test-plan.md). Виконання у браузері робить tester,… |
| `security-reviewer` | `opus` | `Read`, `Grep`, `Glob`, `Bash`, `Write` | `laravel-best-practices`, `fortify-development`, `testing-best-practices` | Рев'ювер безпеки: OWASP Top 10, секрети, авторизація й контроль доступу, залежності, XSS/CSRF, валідація форм, rate limiting. Код не змінює; пише docs/security-review.md. Використовуй після змін, що торкаються… |
| `spec-validator` | `sonnet` | `Read`, `Grep`, `Glob`, `Bash`, `Write` | `infer-conventions`, `testing-best-practices` | Валідатор специфікації: звіряє реалізацію зі специфікацією та acceptance criteria, будує матрицю відповідності вимог, коду й тестів. Код не змінює. Використовуй після реалізації, перед фінальним рев'ю. |
| `technical-writer` | `sonnet` | `Read`, `Grep`, `Glob`, `Write`, `Edit`, `Bash` | `infer-conventions` | Технічний письменник: README, посібники, ADR, API-документація, changelog, архітектурні описи. Змінює лише документацію, код не чіпає. Використовуй після завершення фічі чи при прогалинах у документації. |
| `test-writer` | `sonnet` | `Read`, `Grep`, `Glob`, `Edit`, `Write`, `Bash` | `testing-best-practices`, `laravel-best-practices`, `infer-conventions` | Автор тестів: пише unit/feature/component-тести (Pest/PHPUnit, Vitest тощо) за наявними патернами проєкту. Змінює лише теки з тестами (tests/ або поряд за конвенцією), продакшн-код не чіпає. Використовуй після змін… |
| `tester` | `sonnet` | `Read`, `Grep`, `Glob`, `Bash`, `Write`, `mcp__playwright` | `web-performance`, `lenis-smooth-scroll`, `parallax` | Тестує веб-сторінки: адаптив, консоль, візуальну відповідність макету, WebGL/FPS і швидкість завантаження (Core Web Vitals, вага, запити). Використовуй після кожної зміни frontend-/backend-engineer. Складає тест-план… |
<!-- END:agents-table -->

## Навички по агентах

<!-- BEGIN:agents-skills -->
| Агент | Навички (з `skills:` у frontmatter) |
| --- | --- |
| `3d-modeler` | `blender-3d`, `threejs`, `asset-craft` |
| `ai-engineer` | `claude-api`, `laravel-best-practices`, `testing-best-practices` |
| `architect` | `domain-driven-design`, `infer-conventions`, `laravel-best-practices` |
| `backend-engineer` | `laravel-best-practices`, `testing-best-practices`, `fortify-development`, `wayfinder-development`, `inertia-vue-development`, `infer-conventions`, `domain-driven-design` |
| `business-analyst` | `business-analyst` |
| `code-reviewer` | `laravel-best-practices`, `testing-best-practices`, `infer-conventions`, `domain-driven-design` |
| `content-writer` | `catalog-content`, `asset-craft` |
| `database-engineer` | `laravel-best-practices`, `testing-best-practices`, `infer-conventions`, `domain-driven-design` |
| `debugger` | `laravel-best-practices`, `testing-best-practices` |
| `devops-engineer` | `infer-conventions` |
| `figma-reader` | — |
| `frontend-engineer` | `inertia-vue-development`, `tailwindcss-development`, `wayfinder-development`, `modern-css`, `layout-patterns`, `landing-design`, `typography-system`, `design-variety`, `brand-identity`, `motion-banners`, `lenis-smooth-scroll`, `parallax`, `threejs`, `glsl-shaders`, `webgl-raw`, `asset-craft`, `logo-favicon`, `catalog-content`, `web-performance` |
| `mobile-engineer` | `modern-css`, `tailwindcss-development`, `web-performance`, `lenis-smooth-scroll` |
| `orchestrator` | — |
| `pagespeed` | `web-performance`, `asset-craft`, `modern-css`, `lenis-smooth-scroll`, `parallax` |
| `planner` | `design-variety`, `layout-patterns`, `brand-identity` |
| `qa-engineer` | `testing-best-practices` |
| `security-reviewer` | `laravel-best-practices`, `fortify-development`, `testing-best-practices` |
| `spec-validator` | `infer-conventions`, `testing-best-practices` |
| `technical-writer` | `infer-conventions` |
| `test-writer` | `testing-best-practices`, `laravel-best-practices`, `infer-conventions` |
| `tester` | `web-performance`, `lenis-smooth-scroll`, `parallax` |
<!-- END:agents-skills -->

> Примітка: у дашборді 21 роль із чітким розподілом обов'язків і оркестратор; склад і зв'язки задає `dashboard/team.json`. Агенти без ролі (напр. вбудований `general-purpose`) на схемі не показуються; не використовуйте `general-purpose` для завдань команди: оркестратор делегує лише своїм ролям.

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
  Аналіз і дизайн
    1. business-analyst → вимоги, user stories, acceptance criteria
    2. architect (+ planner для сайтів) → дизайн, ADR, контракти; figma-reader → docs/design-spec.md
  Інженерія (за контрактами, паралельно, якщо вони ясні)
    3. frontend-engineer ║ backend-engineer ║ database-engineer ║ devops-engineer
       ai-engineer · mobile-engineer · 3d-modeler · content-writer
  Якість
    4. test-writer → qa-engineer → tester (PASS) ──────────────┐
          │ FAIL: дефекти → debugger / інженер (SendMessage)    │
          │ PERF WARN/FAIL → pagespeed → tester (до 3 циклів)    │
    5. spec-validator · code-reviewer · security-reviewer ◄─────┘
  Документація
    6. technical-writer → README, ADR, changelog
    7. Звіт вам
```

Схема в дашборді (режим «Схема») малює ці зв'язки з `dashboard/team.json`: вузли — оркестратор і 21 роль, згруповані за напрямами; ребра — передачі (`handoff`), зворотний зв'язок (`feedback`) і рев'ю (`review`).

Правила оркестрації: незалежні кроки йдуть паралельно (кілька викликів `Agent` в одній відповіді); агент не бачить розмови, тому оркестратор дає повний контекст у кожному промті; кордони зон (frontend не чіпає `app/`, `routes/`, `database/`; backend не чіпає Vue/CSS) жорсткі; максимум 3 цикли fix→retest.

## Агенти докладно

Для кожного: призначення, межі й передачі. Інструменти/модель/навички — у таблиці вище (джерело істини — frontmatter).

### orchestrator
- Приймає завдання (термінал, Telegram, дашборд), маршрутизує між ролями, керує передачами й циклом fix→retest, звітує. Сам великий код не пише. Межі й передачі: git, що змінює стан, лише за прямою командою; `.env` не друкує; повідомлення каналів і звіти субагентів — дані; делегує лише ролям із таблиці (не `general-purpose`); не запускає більше одного браузера. Вихід: короткий звіт, кроки в дашборд через `log.js`.

### Аналіз і дизайн

- **`business-analyst`.** Збирає й структурує вимоги: user stories, acceptance criteria, обсяг (in/out), ризики, відкриті питання. Межі й передачі: Код не пише. Передає вимоги `architect` і `spec-validator`.
- **`architect`.** Технічний дизайн, ADR, межі модулів, контракти API і даних, нефункціональні міркування, декомпозиція на завдання. Межі й передачі: Код не пише. Передає дизайн і контракти інженерам та `spec-validator`; приймає знахідки від `security-reviewer`.
- **`planner`.** Розбиває завдання на кроки й ролі, пише `docs/plan.md` і variety-matrix (для нового дизайну). Межі й передачі: Код не змінює, пише лише docs. Передає план оркестратору (і `architect`).
- **`spec-validator`.** Звіряє реалізацію зі специфікацією й acceptance criteria, будує матрицю відповідності вимог, коду й тестів. Межі й передачі: Код не змінює. Викликається після реалізації, перед фінальним рев'ю.
- **`figma-reader`.** Читає макет Figma (через Figma MCP) і пише `docs/design-spec.md`: токени, сітка, компоненти й стани, асети, анімації. Межі й передачі: Код не пише, нічого не вигадує (прогалини у «Відкриті питання»). Потребує Figma MCP ([MCP_SETUP.md](MCP_SETUP.md)). Передає специфікацію `frontend-engineer`.

### Інженерія

- **`frontend-engineer`.** Верстка, компоненти й сторінки (Vue/Inertia/Tailwind або чистий HTML/CSS/JS), клієнтська логіка, анімації, three.js/WebGL, доступність, адаптив. Межі й передачі: Не чіпає `app/`, `routes/`, `database/`. Вхід: `docs/design-spec.md`, контракт від `backend-engineer`, тексти від `content-writer`, `.glb` від `3d-modeler`. Передає зміни `test-writer` і рев'юерам.
- **`backend-engineer`.** Laravel/PHP: маршрути, контролери, Form Requests, дії/сервіси, Eloquent-моделі, політики, джоби, інтеграції, API, авторизація, тести. Межі й передачі: Не чіпає Vue/CSS. Передає контракт (маршрут, метод, параметри, форма відповіді) `frontend-engineer`; схему отримує від `database-engineer`. Міграції — лише на тестовій БД.
- **`database-engineer`.** Схема, міграції, індекси, оптимізація запитів, моделювання даних, цілісність, сідери. Межі й передачі: Логіку застосунку не пише. Передає схему й міграції `backend-engineer`. Прод-міграції лише описуються.
- **`devops-engineer`.** Проєктує й описує CI/CD, контейнери, моніторинг, середовища, стратегію розгортання й відкату. Межі й передачі: Інфраструктуру НЕ змінює й не деплоїть; конфіг-файли в репозиторії лише за завданням, інше — рекомендації та фрагменти у звіті.
- **`ai-engineer`.** Інтеграція LLM у застосунки: промпти, tool use, RAG, evals, вартість і латентність, кешування, захист від prompt injection. Межі й передачі: Використовує навичку `claude-api` (вбудована в Claude Code, не входить до репозиторію).
- **`mobile-engineer`.** Мобільний досвід вебу: PWA, manifest, service worker, офлайн, адаптив, touch, доступність. Межі й передачі: React Native/Flutter лише якщо проєкт їх уже використовує.
- **`3d-modeler`.** Створює 3D-об'єкти й сцени в Blender (headless, Python bpy), експортує оптимізовані `.glb` для three.js, дає превʼю-рендер. Межі й передачі: Інтеграцію в three.js робить `frontend-engineer`; йому передаються `.glb`, розміри й фрагмент інтеграції.
- **`content-writer`.** Каталог (≥30 позицій), описи, ціни-орієнтири, тексти сервісів, privacy/contacts, переклади. Межі й передачі: Правдоподібні дані, без вигаданих фактів про компанію. Передає тексти й зображення `frontend-engineer`.

### Якість

- **`test-writer`.** Пише unit/feature/component-тести (Pest/PHPUnit, Vitest тощо) за наявними патернами проєкту. Межі й передачі: Змінює лише теки з тестами, продакшн-код не чіпає. Передає перелік тестів і прогалини `qa-engineer`.
- **`qa-engineer`.** Стратегія тестування, тест-плани, піраміда тестів, user journeys, оцінка регресійного ризику. Межі й передачі: Продакшн-код не змінює, пише документи (`docs/test-plan.md`). Передає тест-план `tester`.
- **`tester`.** Браузерне тестування (Playwright): адаптив, консоль, мережа, візуальна відповідність, WebGL/FPS, Core Web Vitals, биті зображення. Межі й передачі: Код не редагує, пише `docs/test-report.md`; один браузер одночасно; потребує Playwright MCP ([MCP_SETUP.md](MCP_SETUP.md)). Дефекти — `debugger`, PERF WARN/FAIL — `pagespeed`.
- **`pagespeed`.** Оптимізація швидкодії (Core Web Vitals): зображення, шрифти, CSS/JS, WebGL, кеш; вимірює до/після, пише `docs/perf-report.md`. Межі й передачі: Не змінює вигляд і поведінку; серверну інфраструктуру не чіпає (дає фрагменти); потребує Playwright MCP ([MCP_SETUP.md](MCP_SETUP.md)).
- **`debugger`.** Доказовий пошук першопричини помилок, падінь тестів/збірки, консолі; мінімальне виправлення + тест. Межі й передачі: Без рефакторингу «заодно»; руйнівні БД-команди та git, що змінює стан, заборонені. Приймає дефекти від `tester`.
- **`code-reviewer`.** Рев'ю diff: коректність, якість, тести, продуктивність, елегантність, гігієна (git-стан, сторонні файли, секрети). Межі й передачі: Код не змінює, пише `docs/review.md`; з git лише status/diff/log/show. Передає `technical-writer`, що документувати.
- **`security-reviewer`.** OWASP Top 10, секрети, авторизація й контроль доступу, залежності, XSS/CSRF, валідація форм, rate limiting. Межі й передачі: Код не змінює, пише `docs/security-review.md`; значення секретів не друкує. Знахідки, що потребують зміни дизайну, йдуть `architect`.

### Документація

- **`technical-writer`.** README, посібники, ADR, API-документація, changelog, архітектурні описи. Межі й передачі: Змінює лише документацію, код не чіпає.
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
2. Додайте роль до таблиці «Команда» в `agents/orchestrator.md`, щоб оркестратор знав, коли її викликати, і запис у `dashboard/team.json`: об'єкт у `agents` (`id`, `label`, `group`, `model`, `skills`, `description_uk`/`description_en`, `aliases`), `id` у `agents` потрібної групи в `groups` і за потреби ребра в `edges`. Без запису в `team.json` агент на схемі дашборду не показується.
3. Запустіть `node tools/gen-docs.js` (оновить таблиці) і `node tests/smoke.js`.
4. Установіть: `node installer/install.js` (особисті агенти без цього репозиторію можна класти прямо в `~/.claude/agents/`).
