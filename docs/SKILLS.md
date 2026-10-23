**🇺🇦 Українська** | [🇬🇧 English](en/SKILLS.md)

# Навички

Навичка — тека `skills/<назва>/` з файлом `SKILL.md` (frontmatter `name` + `description`, далі інструкції) та, за потреби, допоміжними файлами. Claude Code підвантажує навичку, коли її `description` відповідає завданню, а агент може вказати навички у `skills:` свого frontmatter, щоб вони були завжди під рукою.

<!-- BEGIN:counts -->
**Агентів: 12, навичок: 23.**
<!-- END:counts -->

## Усі навички

Таблиця генерується з frontmatter (`node tools/gen-docs.js`). Стовпець «Використовують агенти» — агенти, у яких навичка вказана в `skills:`.

<!-- BEGIN:skills-table -->
| Навичка | Опис | Використовують агенти | Джерело / ліцензія |
| --- | --- | --- | --- |
| `asset-craft` | Створення і підготовка візуальних асетів, що роблять сайт "дорогим" - SVG-ілюстрації та патерни, grain/noise, іконки одного стилю, duotone/маски, градієнтні меші, оптимізація зображень (AVIF/WebP, srcset), узгодження фото в каталозі. Використовуй при… | `3d-modeler`, `content-writer`, `frontend-developer`, `pagespeed` | авторська (MIT, цей репозиторій) |
| `blender-3d` | Створення 3D-об'єктів для вебу в Blender через Python (bpy) у headless-режимі: процедурне моделювання, матеріали PBR, експорт glTF/GLB з оптимізацією, бюджети, превʼю-рендер. Використовуй, коли треба модель чи сцена для three.js. | `3d-modeler` | авторська (MIT, цей репозиторій) |
| `brand-identity` | Створює візуальну айдентику сайту з даних компанії (назва, сфера діяльності, країна): палітра, шрифти, тон, настрій. Використовуй на початку будь-якого нового дизайну. | `frontend-developer`, `planner` | авторська (MIT, цей репозиторій) |
| `catalog-content` | Підготовка реалістичного контенту для сайту компанії: каталог (≥ 30 позицій) з реальними фото, описами та цінами, і сервіси. Використовуй при наповненні каталогу та сторінок сервісів. | `content-writer`, `frontend-developer` | авторська (MIT, цей репозиторій) |
| `design-variety` | Гарантує, що новий сайт візуально й структурно відрізняється від сусідніх гілок/сайтів (композиція, сітка, типографіка, форми, ритм). Використовуй на старті будь-якого редизайну, коли в репозиторії вже є інші дизайни. | `frontend-developer`, `planner` | авторська (MIT, цей репозиторій) |
| `fortify-development` | ACTIVATE when the user works on authentication in Laravel. This includes login, registration, password reset, email verification, two-factor authentication (2FA/TOTP/QR codes/recovery codes), passkeys, profile updates, password confirmation, or any… | `backend-developer` | laravel (MIT), див. THIRD_PARTY_NOTICES.md |
| `glsl-shaders` | Написання GLSL-шейдерів для three.js (ShaderMaterial/onBeforeCompile): uniforms, шум, градієнти, дисторсія, postprocessing. Використовуй, коли потрібні кастомні шейдери. | `frontend-developer` | авторська (MIT, цей репозиторій) |
| `inertia-vue-development` | Develops Inertia.js v3 Vue client-side applications. Activates when creating Vue pages, forms, or navigation; using &lt;Link>, &lt;Form>, useForm, useHttp, setLayoutProps, or router; working with deferred props, prefetching, optimistic updates, instant visits, or… | `backend-developer`, `frontend-developer` | laravel (MIT), див. THIRD_PARTY_NOTICES.md |
| `landing-design` | Принципи дизайну сторінок корпоративного сайту/лендінгу: структура секцій, сітка, ієрархія, адаптив, доступність. Використовуй, коли треба спроєктувати або зверстати сторінку за брендом. | `frontend-developer` | авторська (MIT, цей репозиторій) |
| `laravel-best-practices` | Apply this skill whenever writing, reviewing, or refactoring Laravel PHP code. This includes creating or modifying controllers, models, migrations, form requests, policies, jobs, scheduled commands, service classes, and Eloquent queries. Triggers for N+1 and… | `backend-developer`, `database-engineer`, `debugger`, `reviewer` | laravel (MIT), див. THIRD_PARTY_NOTICES.md |
| `layout-patterns` | Каталог сучасних композицій сторінок і секцій (hero, навігація, сітки, картки, футери, CTA) з описом, коли застосовувати, і скелетами HTML/CSS. Використовуй при проєктуванні структури сайту, щоб вибирати нетипові, але зручні композиції й не повторювати… | `frontend-developer`, `planner` | авторська (MIT, цей репозиторій) |
| `lenis-smooth-scroll` | Плавний скрол із Lenis (lenis.dev, пакет `lenis`): встановлення, ініціалізація, опції, інтеграція з GSAP ScrollTrigger, якорі, вкладені скрол-контейнери, модальні вікна, React/Vue, доступність і підводні камені. Використовуй, коли сайту потрібен плавний… | `frontend-developer`, `pagespeed`, `tester` | авторська (MIT, цей репозиторій) |
| `logo-favicon` | Генерація логотипа (SVG) і фавіконки (ICO/PNG) за назвою компанії та брендом. Використовуй, коли потрібен новий лого й іконки сайту. | `frontend-developer` | авторська (MIT, цей репозиторій) |
| `modern-css` | Сучасні можливості CSS (container queries, :has(), subgrid, @layer, oklch/color-mix, clamp, scroll-driven animations, View Transitions, @property, linear() easing, anchor positioning) з готовими шматками коду та правилами fallback. Використовуй при верстці… | `frontend-developer`, `pagespeed` | авторська (MIT, цей репозиторій) |
| `motion-banners` | Каталог банерів, анімацій і WebGL-ефектів для яскравих неоднотипних сайтів (promo-банери, marquee, scroll-reveal, шейдерні фони, hover-ефекти). Використовуй разом із webgl-raw та design-variety. | `frontend-developer` | авторська (MIT, цей репозиторій) |
| `parallax` | Паралакс-ефекти для лендінгів: шари на transform, scroll-driven animations (animation-timeline), IntersectionObserver/GSAP ScrollTrigger/Lenis, mouse/gyro-паралакс, 3D-глибина, продуктивність, мобільні й reduced-motion. Використовуй для hero, секцій з… | `frontend-developer`, `pagespeed`, `tester` | авторська (MIT, цей репозиторій) |
| `tailwindcss-development` | Always invoke when the user's message includes 'tailwind' in any form. Also invoke for: building responsive grid layouts (multi-column card grids, product grids), flex/grid page structures (dashboards with sidebars, fixed topbars, mobile-toggle navs),… | `frontend-developer` | laravel (MIT), див. THIRD_PARTY_NOTICES.md |
| `testing-best-practices` | Laravel test design and review. Use when selecting coverage, naming or structuring tests, choosing assertions or test data, isolating dependencies, testing HTTP or security boundaries, improving suite performance, or reviewing test value. Use framework… | `backend-developer`, `database-engineer`, `debugger`, `reviewer` | laravel (MIT), див. THIRD_PARTY_NOTICES.md |
| `threejs` | Практики three.js для лендінгів: структура сцени, рендер-луп, завантаження моделей, очищення пам'яті, продуктивність, інтеграція зі scroll-анімаціями. Використовуй при будь-якій роботі з three.js / WebGL. | `3d-modeler`, `frontend-developer` | авторська (MIT, цей репозиторій) |
| `typography-system` | Типографічна система для сайтів - fluid-шкали, каталог перевірених шрифтових пар (display+text+mono) із різних стилів, правила для variable fonts, чисел, довжини рядка, завантаження шрифтів. Використовуй при виборі шрифтів і побудові типографіки, щоб… | `frontend-developer` | авторська (MIT, цей репозиторій) |
| `wayfinder-development` | Use this skill for Laravel Wayfinder which auto-generates typed functions for Laravel controllers and routes. ALWAYS use this skill when frontend code needs to call backend routes or controller actions. Trigger when: connecting any React/Vue/Svelte/Inertia… | `backend-developer`, `frontend-developer` | laravel (MIT), див. THIRD_PARTY_NOTICES.md |
| `web-performance` | Вимірювання і оптимізація швидкості сторінок (Core Web Vitals, PageSpeed): бюджети, скрипт замірів через Playwright/evaluate, каталог виправлень для зображень, шрифтів, CSS/JS, кешу, WebGL і Laravel/Livewire. Використовуй для перевірки швидкодії (tester) і… | `pagespeed`, `tester` | авторська (MIT, цей репозиторій) |
| `webgl-raw` | Чистий WebGL/WebGL2 без three.js та інших бібліотек - контекст, шейдерні програми, буфери, VAO, uniforms, текстури, матриці, цикл рендера, resize/DPR, очищення. Використовуй, коли просять 3D/графіку "на голому WebGL". | `frontend-developer` | авторська (MIT, цей репозиторій) |
<!-- END:skills-table -->

## Групи

- **Дизайн і верстка:** `brand-identity`, `design-variety`, `landing-design`, `layout-patterns`, `typography-system`, `modern-css`, `asset-craft`, `logo-favicon`, `motion-banners`.
- **Анімація і графіка:** `parallax`, `lenis-smooth-scroll`, `threejs`, `webgl-raw`, `glsl-shaders`, `blender-3d`.
- **Контент і швидкодія:** `catalog-content`, `web-performance`.
- **Laravel / фронтенд-стек (від Laravel, MIT):** `laravel-best-practices`, `testing-best-practices`, `fortify-development`, `wayfinder-development`, `inertia-vue-development`, `tailwindcss-development`.


## Джерела та ліцензії

- Українські навички — авторські, MIT цього репозиторію.
- Шість навичок Laravel — MIT, автор `laravel` (вказано у їхньому frontmatter); атрибуція — у `THIRD_PARTY_NOTICES.md`.

## Як додати власну навичку

1. Створіть `skills/<назва>/SKILL.md`:
   ```markdown
   ---
   name: <назва, збігається з текою>
   description: Що робить і КОЛИ використовувати (за цим текстом навичка підбирається автоматично)
   ---
   # Заголовок
   Інструкції, чекліст, приклади коду. Великі довідники виносьте в окремі файли поруч.
   ```
2. За потреби додайте її в `skills:` потрібного агента.
3. `node tools/gen-docs.js` і `node tests/smoke.js` (перевіряє наявність `name` і `description`, збіг `name` з текою).
4. Не додавайте до навичок персональні дані, ключі чи шляхи вашої машини.
