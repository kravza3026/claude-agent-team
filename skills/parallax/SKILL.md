---
name: parallax
description: Паралакс-ефекти для лендінгів: шари на transform, scroll-driven animations (animation-timeline), IntersectionObserver/GSAP ScrollTrigger/Lenis, mouse/gyro-паралакс, 3D-глибина, продуктивність, мобільні й reduced-motion. Використовуй для hero, секцій з глибиною, фонових шарів.
---
# Parallax

## Обери техніку (від простої до складної)
1. **CSS scroll-driven (без JS)** — найлегше, на compositor-потоці:
```css
@supports (animation-timeline: view()) {
  .layer { animation: drift linear both; animation-timeline: view(); animation-range: entry 0% exit 100%; }
  @keyframes drift { from { transform: translateY(-8%) } to { transform: translateY(8%) } }
}
```
Для hero: `animation-timeline: scroll(root)` і `animation-range: 0 100vh`. Fallback — статичний шар (прогресивне покращення); Safari <26 / Firefox (за прапором) можуть не підтримувати.
2. **GSAP ScrollTrigger** — складні сцени, pin, scrub:
```js
gsap.to('.bg', { yPercent: 20, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
```
Разом із Lenis: див. навичку `lenis-smooth-scroll` (один ticker!).
3. **Власний rAF** — `transform: translate3d(0, scroll*speed, 0)`; читай `scrollY` у одному rAF, пиши в `transform` (без читання layout у циклі); `IntersectionObserver` вмикає/вимикає лише видимі шари.
4. **Mouse / gyroscope** — `pointermove` → lerp → `translate3d`/`rotate`; на touch — `DeviceOrientationEvent` (потрібен дозвіл на iOS) або вимкни.
5. **CSS 3D-глибина** — `perspective` на контейнері + `translateZ` шарам (масштабуй, щоб розмір не змінювався: `scale = 1 + z/perspective`).

## Правила
- Лише `transform` та `opacity`; ніколи `top/left/background-position` у скролі. `will-change: transform` точково, знімай після анімації.
- Швидкість шарів: фон 0.1–0.3, середній 0.4–0.6, передній 1.0 (рух відносно скролу); амплітуда ≤ 10–20 % висоти, щоб не відкрити краї — шар має бути більшим за контейнер (`inset:-10% 0`, `overflow:hidden` на секції).
- Зображення шарів: AVIF/WebP, `srcset`, розміри `width/height`, `loading=lazy` крім LCP; не робити паралакс на LCP-зображенні, якщо воно гальмує рендер.
- **Мобільні:** зменши амплітуду або вимкни (`@media (hover:none)` / `(max-width: 768px)`), iOS Safari має ривки при `fixed`/`background-attachment: fixed` — не використовуй його.
- **Доступність:** `@media (prefers-reduced-motion: reduce)` → без паралаксу (статичні шари); контент не залежить від ефекту; текст не рухається відносно фону так, щоб ставав нечитабельним.
- Без горизонтального overflow на 320 px (перевір `scrollWidth`); не ламай `position: sticky`.
- Продуктивність: ≤ 3–5 анімованих шарів у viewport, CLS = 0, жодних довгих задач у скрол-хендлері; перевір в Performance (FPS, repaint без зелених блимань).

## Типові патерни
- **Hero depth:** небо/фон (0.2) → середній план (0.5) → передній (0.9) + текст нерухомо або з легким зсувом.
- **Sticky-розповідь:** `position: sticky` + scroll-прогрес змінює шар/clip-path (див. `motion-banners`).
- **Reveal-паралакс зображень:** внутрішнє зображення 120 % у вікні-контейнері, `translateY` від −10 % до 10 %.
- **3D (three.js):** камера зсувається за прогресом скролу (`lenis.on('scroll', e => progress = e.progress)`), див. `threejs`.

## Чекліст перед здачею
Працює без JS/без підтримки `animation-timeline` (fallback); reduced-motion; мобільна версія; Lighthouse/Perf без регресії; немає стрибків при завантаженні шрифтів/зображень (резервуй місце); кросбраузерність (Chrome, Safari, Firefox).
