---
name: web-performance
description: Вимірювання і оптимізація швидкості сторінок (Core Web Vitals, PageSpeed): бюджети, скрипт замірів через Playwright/evaluate, каталог виправлень для зображень, шрифтів, CSS/JS, кешу, WebGL і Laravel/Livewire. Використовуй для перевірки швидкодії (tester) і для оптимізації (pagespeed).
---
# Швидкодія веб-сторінок

## Бюджети (мобільний профіль, зелена зона Google)
| Метрика | Добре | Погано |
|---|---|---|
| LCP | ≤ 2.5 с | > 4 с |
| CLS | ≤ 0.1 | > 0.25 |
| INP / TBT (довгі задачі) | ≤ 200 мс / сума довгих задач ≤ 200 мс | > 500 мс |
| FCP | ≤ 1.8 с | > 3 с |
| TTFB (сервер) | ≤ 0.8 с | > 1.8 с |
Ваги: сторінка ≤ 1.5 МБ (без відео), запитів ≤ 50, hero-зображення ≤ 250 КБ, каталожне ≤ 120 КБ, JS ≤ 300 КБ (gzip), CSS ≤ 100 КБ, шрифтів ≤ 4 файли woff2.
PageSpeed Insights score: ≥ 90 добре, 50–89 помітні проблеми, < 50 критично. Оцінюй і Performance, і Accessibility/Best Practices/SEO, якщо вимірюєш Lighthouse.

## Як міряти
1. **Lighthouse, якщо є** (`lighthouse` у PATH або `npx --yes lighthouse <url> --only-categories=performance --form-factor=mobile --chrome-flags="--headless=new --no-sandbox" --output=json --quiet`). Якщо мережа/інсталяція недоступні, використай пункт 2.
2. **Playwright (evaluate)** — відкрий сторінку на 375×812 (мобільний) і 1440 (десктоп), після `load` почекай 3 с і виконай:
```js
() => new Promise(res => {
  const out = { lcp: 0, cls: 0, longTasks: 0, longTaskMs: 0 };
  new PerformanceObserver(l => { for (const e of l.getEntries()) out.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) out.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
  new PerformanceObserver(l => { for (const e of l.getEntries()) { out.longTasks++; out.longTaskMs += Math.max(0, e.duration - 50); } }).observe({ type: 'longtask', buffered: true });
  setTimeout(() => {
    const n = performance.getEntriesByType('navigation')[0], r = performance.getEntriesByType('resource'), by = {};
    for (const x of r) { const t = x.initiatorType || 'other'; by[t] = by[t] || { n: 0, kb: 0 }; by[t].n++; by[t].kb += (x.encodedBodySize || x.transferSize || 0) / 1024; }
    const fcp = performance.getEntriesByName('first-contentful-paint')[0];
    const imgs = [...document.images].map(i => ({ src: i.currentSrc.split('/').pop(), nat: i.naturalWidth + 'x' + i.naturalHeight, shown: i.clientWidth + 'x' + i.clientHeight, lazy: i.loading, dims: !!(i.getAttribute('width') && i.getAttribute('height')) })).filter(i => i.nat.split('x')[0] > 2 * (parseInt(i.shown) || 1) || i.lazy !== 'lazy');
    res({ ...out, fcp: fcp && fcp.startTime, ttfb: n.responseStart, dcl: n.domContentLoadedEventEnd, load: n.loadEventEnd, requests: r.length, totalKB: Math.round(r.reduce((a, x) => a + (x.encodedBodySize || 0), 0) / 1024), byType: by, domNodes: document.getElementsByTagName('*').length, imagesToCheck: imgs.slice(0, 15) });
  }, 3000);
})
```
   Заміри роби 3 рази на сторінку й бери медіану. Кеш браузера чистий (новий контекст).
3. Перелік запитів і розмірів: `browser_network_requests` (якщо є) — найважчі файли, 404, зовнішні домени.
4. Контекст: dev-сервер на localhost дає майже нульовий TTFB і ідеальну мережу; оцінюй **вагу, кількість запитів, блокуючі ресурси, зсуви й довгі задачі**, а не абсолютну мережу. Headless Chromium малює WebGL програмно (SwiftShader), тому довгі задачі й FPS на сторінках зі сценою завищені: познач це в звіті, оцінюй час ініціалізації сцени окремо.

## Що шукати (діагностика)
- **LCP-елемент**: яке зображення/текст, чи є `fetchpriority="high"`, чи не `loading="lazy"` на ньому, чи не CSS-background, чи не чекає шрифт.
- **Блокуючі ресурси**: `<link rel=stylesheet>` і `<script>` без `defer/async` у `<head>`, `@import` у CSS.
- **Зображення**: формат (JPEG/PNG замість WebP/AVIF), розмір більший за відображений ≥ 2×, немає `width/height`, немає `srcset/sizes`, немає `lazy` під фолдом.
- **Шрифти**: не woff2, не підмножина, відсутній `font-display: swap`, немає preload для 1–2 критичних, великі variable-файли без потреби.
- **JS**: великі бандли, невикористаний код, сторонні скрипти, довгі синхронні ініціалізації (WebGL/3D, слайдери), скрипти без `defer`.
- **CSS**: розмір, невикористані правила, важкі селектори, анімації `width/height/top/left`, `filter: blur` на великих площах.
- **Layout shift**: зображення/iframe/банери без розмірів, шрифти без fallback-метрик, вставка контенту зверху, cookie-банери.
- **Кеш/стиснення**: `Cache-Control` для `/assets`, gzip/brotli, HTTP/2, версіювання файлів.

## Виправлення (каталог для оптимізатора)
**Зображення**: конвертуй у WebP/AVIF (`cwebp -q 78`, `avifenc`, або `convert … -strip -quality 80`), `<picture>` з fallback, `srcset`+`sizes`, `width/height` або `aspect-ratio`, `loading="lazy" decoding="async"` під фолдом, `fetchpriority="high"` + preload на LCP-зображення, ресайз до реального макс. розміру (×2 для retina), прибрати метадані.
**Шрифти**: self-host woff2, subset (latin/cyrillic), `font-display: swap`, `<link rel=preload as=font crossorigin>` для 1–2 файлів, `size-adjust/ascent-override` для fallback, прибрати невикористані ваги.
**CSS**: інлайн критичного CSS (≤ 14 КБ) + відкладене завантаження решти (`media="print" onload`), мініфікація, видалення невикористаного, без `@import`, `content-visibility: auto` для довгих секцій, `contain` для важких блоків.
**JS**: `defer` для всього, `type=module`, динамічний `import()` для рідкісних частин, `requestIdleCallback`/IntersectionObserver для ініціалізації WebGL і слайдерів (не блокувати перший рендер), debounce resize/scroll, passive listeners, прибрати зайві бібліотеки.
**WebGL**: ліниве створення контексту (коли hero у в'юпорті), `powerPreference`, DPR ≤ 2, зупинка рендера поза екраном/у фоновій вкладці, менші текстури, простіші шейдери на мобільних, `prefers-reduced-motion`.
**Ресурси**: `preconnect` лише до реально потрібних доменів, `dns-prefetch`, `modulepreload`, прибрати непотрібні сторонні скрипти/мапи (карта в iframe — `loading="lazy"`).
**Laravel/Livewire**: `php artisan config:cache route:cache view:cache` (для прод), `composer install --optimize-autoloader --no-dev`, `npm run build` (мініфікація, hash), Livewire `wire:lazy`/`@persist`, не рендерити зайві компоненти, eager loading у запитах, кеш для статичних блоків.
**Сервер (рекомендації, не змінюй чужу інфраструктуру без прохання)**: gzip/brotli, `Cache-Control: public, max-age=31536000, immutable` для хешованих `/assets`, HTTP/2, `Vary: Accept-Encoding`. Покажи готовий фрагмент nginx/.htaccess у звіті.

## Правила оптимізації
- Спершу найбільший виграш на найпростішій правці (зазвичай зображення → шрифти → блокуючі скрипти → JS-ініціалізація).
- Візуально нічого не ламай: порівняй скріншоти до/після (однакова верстка, кольори, анімації).
- Кожну зміну перевіряй заміром; фіксуй «до/після» у таблиці.
- Не видаляй функціонал заради балів; не додавай нових залежностей без потреби.
- Оригінали зображень, які замінюєш, не видаляй без потреби (або тримай у `docs`/поза `public`).
