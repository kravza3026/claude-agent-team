---
name: motion-banners
description: Каталог банерів, анімацій і WebGL-ефектів для яскравих неоднотипних сайтів (promo-банери, marquee, scroll-reveal, шейдерні фони, hover-ефекти). Використовуй разом із webgl-raw та design-variety.
---
# Банери, анімації, WebGL-ефекти

## Банери (мінімум 4 різні типи на сайті)
- **Hero-банер** з власною сценою; **промо-стрічка** (marquee) над хедером або між секціями; **bento-промо** (3-4 плитки різного розміру: акція, комплект, free shipping, гарантія); **діагональний CTA-банер** з шейдерним фоном; **sticky-банер** у каталозі («підбери систему», фільтр-промо); **банер-лічильник** (числа з count-up); **банер категорії** на сторінці каталогу. Кожен — інша форма, фон і анімація.

## WebGL (чистий, скіл webgl-raw) — ідеї, обери НЕ ті, що вже в інших гілках
- fragment-шейдери: хвилі/інтерференція, домен-варпінг fbm, аврора, plasma, voronoi-клітини, лінії-ізоконтури, ripple від курсора, chromatic-відхилення, grain, метаболи, «рідкий метал».
- частинки (gl.POINTS): потік, роїння навколо курсора, повільний дрейф.
- hover-ефекти на зображеннях: displacement/ripple/RGB-split на canvas поверх `<img>` (початкове зображення лишається в DOM для SEO і fallback).
- Шейдерний перехід між секціями (wipe/dissolve) через scroll-прогрес uniform.
- **Ліміт контекстів**: ≤ 1-2 одночасно. Один спільний фіксований canvas з scissor/viewport по секціях АБО створення контексту лише для видимого блоку (IntersectionObserver) і `WEBGL_lose_context` / видалення при виході. Пауза поза екраном і на прихованій вкладці, DPR ≤ 2 (1.25 на вузьких), ~30-60 fps, обробка `webglcontextlost`.
- Fallback без WebGL: CSS-градієнт/SVG; `prefers-reduced-motion`: статичний кадр.

## CSS/JS-анімації
- scroll-reveal різних типів: clip-path wipe, split-text по буквах/словах, mask-reveal, stagger-сітка, parallax (transform, не top).
- count-up числа, marquee нескінченна, magnetic-кнопки, анімований підкреслений лінк, flip/hover-розкриття картки, анімація кошика (fly-to-cart, бейдж bounce), скелетон-лоадери, анімований SVG-лого (stroke-dashoffset), page-transitions (View Transitions API з fallback).
- Лише `transform`/`opacity`/`clip-path`, `will-change` точково, `IntersectionObserver` замість scroll-слухачів.

## Обмеження (обов'язково)
- `prefers-reduced-motion: reduce` вимикає всі рухи; декоративні canvas — `pointer-events:none`, `aria-hidden`.
- Жодного горизонтального overflow (особливо marquee та parallax) на 320px; перевір scrollWidth.
- Текст/кнопки залишаються читабельними (контраст ≥ 4.5:1) поверх шейдерів.
- Без зайвих бібліотек; все власним кодом у `public/assets/mockup/js/` модулями.
- Не перевантажуй: анімація має підкреслювати бренд, а не заважати купівлі.
