---
name: modern-css
description: Сучасні можливості CSS (container queries, :has(), subgrid, @layer, oklch/color-mix, clamp, scroll-driven animations, View Transitions, @property, linear() easing, anchor positioning) з готовими шматками коду та правилами fallback. Використовуй при верстці будь-якого сайту, щоб замість костилів і JS брати нативні рішення.
---
# Modern CSS (2024–2026)

Правило: спершу нативний CSS, JS — лише якщо CSS не вміє. Кожна сучасна фіча — з `@supports` або безпечним fallback (сайт має працювати й без неї, просто простіше).

## Архітектура
- `@layer reset, tokens, base, layout, components, utilities;` — порядок каскаду без війни специфічностей.
- Змінні (tokens) у `:root`: кольори, шкала відступів `--s-1..--s-9`, радіуси, тіні, тривалості, easing.
- Логічні властивості: `margin-inline`, `padding-block`, `inset`, `gap` замість left/right/top/bottom де можливо.
- `box-sizing: border-box; min-width: 0` для дітей grid/flex (джерело більшості overflow на мобільних).

## Компонування
- **Container queries**: `.card-wrap{container-type:inline-size}` + `@container (min-width: 420px){...}` — компонент адаптується до свого місця, а не до viewport.
- **Subgrid**: `grid-template-rows: subgrid; grid-row: span 3` — вирівняні заголовки/ціни/кнопки в картках різної висоти.
- `:has()`: `.field:has(input:invalid)`, `body:has(.modal[open]){overflow:hidden}`, `.card:has(img)`.
- `aspect-ratio`, `object-fit`, `inset: 0`, `place-items: center`, `min()/max()/clamp()`.
- `grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr))` — адаптивна сітка без media queries (і без overflow завдяки `min(100%, …)`).
- `dvh/svh/lvh` замість `vh` для мобільних hero; `100svh` для безпечної висоти.
- `position: sticky` + `top` для стеків; `scroll-snap-type: x mandatory; scroll-padding` для rail.
- Anchor positioning (`anchor-name`, `position-anchor`, `position-area`) для dropdown/tooltip із fallback на absolute.
- Popover API (`popover`, `popovertarget`) і `<dialog>` для меню/модалок: Esc, top-layer, focus — безкоштовно.

## Типографіка
- Fluid: `font-size: clamp(2.25rem, 1.2rem + 4.5vw, 5.5rem)`; `text-wrap: balance` для заголовків, `pretty` для абзаців.
- `font-variation-settings`/`font-optical-sizing: auto`, `font-feature-settings: "tnum"` для цін, `font-display: swap`.
- `hanging-punctuation`, `hyphens: auto` з `lang`, `max-width: 62ch`.

## Колір
- `oklch(L C H)` для палітр: змінюй L при сталому H для шкал; `color-mix(in oklch, var(--brand) 20%, white)` для tint/shade; `light-dark()` + `color-scheme: light dark` для тем.
- Відносні кольори: `oklch(from var(--brand) calc(l + .1) c h)`.
- Градієнти: `linear-gradient(in oklch, …)` (плавніші переходи), `conic-gradient`, mesh через кілька radial-gradient + `filter: blur`.
- `@property --angle { syntax:'<angle>'; inherits:false; initial-value:0deg }` — анімований градієнт/бордер.

## Анімація (без JS)
- **Scroll-driven**: `animation-timeline: view(); animation-range: entry 0% cover 40%;` для reveal і parallax; `animation-timeline: scroll(root)` для прогрес-бару. Fallback: за `@supports not (animation-timeline: view())` показати елемент одразу або IntersectionObserver.
- **View Transitions**: `@view-transition { navigation: auto }` для MPA, `document.startViewTransition()` для SPA-станів, `view-transition-name` на спільних елементах (картка → деталь).
- Spring-подібний easing: `--spring: linear(0, .5 9%, .95 22%, 1.08 34%, 1.02 50%, 1)`; `--ease-out: cubic-bezier(.22,1,.36,1)`.
- `@starting-style` + `transition-behavior: allow-discrete` для появи/зникнення `display` (popover/dialog).
- Анімуй лише `transform`, `opacity`, `clip-path`, `filter`; `will-change` точково; `content-visibility: auto; contain-intrinsic-size` для довгих секцій.
- `@media (prefers-reduced-motion: reduce)` — вимикає всі рухи (обов'язково). `@media (hover: hover)` для hover-ефектів, `(pointer: coarse)` для великих цілей.

## Форми й стани
- `accent-color`, `field-sizing: content` для textarea, `:user-invalid` замість `:invalid`, `:focus-visible` із кастомним outline (не прибирай), `::selection`, `scrollbar-gutter: stable`, `caret-color`.
- `color-scheme`, `forced-colors`, `@media (prefers-contrast: more)` — базова доступність.

## Антипатерни
- `!important`, глибокі селектори, `vh` для hero, `overflow-x:hidden` як «лікування» overflow, фіксовані ширини в px для контенту, hover-only взаємодії, анімація `width/height/top/left`.
- Перевіряй: `document.documentElement.scrollWidth === innerWidth` і getBoundingClientRect().right ≤ innerWidth на 320/375/768/1280/1440.
