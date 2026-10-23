---
name: typography-system
description: Типографічна система для сайтів - fluid-шкали, каталог перевірених шрифтових пар (display+text+mono) із різних стилів, правила для variable fonts, чисел, довжини рядка, завантаження шрифтів. Використовуй при виборі шрифтів і побудові типографіки, щоб гілки/сайти не повторювали ті самі шрифти.
---
# Типографіка

Шрифти — головний носій «характеру». Не повторюй пару, яку вже використано в сусідніх гілках/сайтах: переглянь `docs/brand.md` попередників (`git log`, інші гілки лише для читання) і візьми іншу пару/іншу категорію.

## Вже використані (уникати без потреби)
Space Grotesk + Hanken Grotesk, Syne + Figtree, Instrument Serif + Instrument Sans + JetBrains Mono, Fraunces + Figtree.

## Каталог пар (self-host, OFL/Google Fonts; завантаж woff2 у public/assets/.../fonts)
Кожен рядок: display · text · mono(опц.) — настрій, для чого.
1. **Editorial serif**: Newsreader · Inter Tight · IBM Plex Mono — преміум, журнал, нерухомість/право.
2. **Swiss/grotesk**: Schibsted Grotesk · Inter · Geist Mono — чисто, продукти/SaaS.
3. **Geometric**: Outfit · Plus Jakarta Sans — дружній сучасний retail.
4. **Humanist warm**: Bricolage Grotesque · Public Sans — характер, лайфстайл.
5. **Brutalist/mono-first**: Space Mono / DM Mono · Archivo — техно, інженерія, дані.
6. **Condensed impact**: Anton / Bebas Neue / Big Shoulders Display · Barlow — промо, спорт, будівництво (display тільки великий).
7. **High-contrast serif**: Playfair Display / Bodoni Moda · Lato — мода, косметика, люкс.
8. **Soft rounded**: Quicksand / Nunito · Rubik — діти, food, wellness.
9. **Tech-industrial**: Chakra Petch / Saira · Roboto Flex — енергетика, залізо.
10. **Slab**: Roboto Slab / Zilla Slab · Source Sans 3 — ремесло, фермерське.
11. **Neo-grotesk variable**: Onest · Manrope — універсал для магазинів.
12. **Display quirky**: Unbounded / Syne / Gloock — лише для заголовків; текст — нейтральний.
13. **Transitional serif text**: Source Serif 4 · Work Sans — довгі тексти/блог.
14. **Arabic/Cyrillic-safe**: Golos Text, Onest, Manrope, Inter Tight — якщо потрібна кирилиця.
Правило: перевір наявність потрібних гліфів (€, ₴, діакритика, кирилиця) і variable-осей (wght, opsz, wdth).

## Шкала й ритм
- Modular scale: ×1.125 (щільні UI), ×1.2, ×1.25, ×1.333, ×1.5, ×1.618 (editorial). Обери одну на сайт.
- Fluid: `--step-0: clamp(1rem, .95rem + .25vw, 1.125rem)` … `--step-6: clamp(2.5rem, 1.5rem + 5vw, 6rem)`; генеруй через utopia-логіку (min/max viewport 320–1440).
- Інтерліньяж: заголовки 0.95–1.1, текст 1.5–1.65; tracking: великі заголовки −0.02…−0.04em, caps-лейбли +0.08…+0.14em.
- Довжина рядка 45–75 символів (`max-width: 62ch`); абзац `text-wrap: pretty`, заголовок `text-wrap: balance`.
- Вертикальний ритм кратний 4/8 px; відступ між секціями від 6rem на десктопі, 3.5–4rem на мобільному.

## Variable fonts
- Одна variable-файл на сімейство замість 4–6 статичних; підключай діапазони: `font-weight: 100 900; font-stretch: 75% 125%`.
- `font-optical-sizing: auto` (якщо є opsz) — заголовки різкіші, текст читабельніший.
- Анімація ваги/ширини на hover (`transition: font-variation-settings .3s`) — лише для акцентів.
- Для цін/таблиць: `font-variant-numeric: tabular-nums lining-nums;`

## Прийоми
- Великі outline-цифри (`-webkit-text-stroke: 1.5px; color: transparent`), лічильники з mono-шрифтом, розмір 8–14vw для editorial-hero (але з clamp і перевіркою overflow).
- Eyebrow-лейбли (caps, малі, широкий tracking), pull-quotes, drop caps `initial-letter`.
- Контраст розмірів: заголовок ≥ 3× від тексту; не більше 2 сімейств + 1 mono; не більше 3 ваг у тексті.
- Лого-вордмарк — конвертуй у контури (SVG), не залежи від веб-шрифту.

## Завантаження
- `@font-face { font-display: swap; src: url(...woff2) format("woff2"); unicode-range }`, subset (latin, latin-ext, cyrillic за потреби).
- `<link rel="preload" as="font" type="font/woff2" crossorigin>` для 1–2 критичних файлів; fallback-стек зі `size-adjust`/`ascent-override`, щоб не було стрибка.
- Без Google Fonts CDN (self-host): швидше і без зовнішніх запитів.

## Перевірка
- Контраст тексту ≥ 4.5:1 (великого ≥ 3:1); мінімальний розмір тексту на мобільному 16px, кнопок/лейблів ≥ 12px.
- Перегляд на 320px: заголовки не обрізаються (`overflow-wrap: anywhere` для довгих слів, clamp розумний).
