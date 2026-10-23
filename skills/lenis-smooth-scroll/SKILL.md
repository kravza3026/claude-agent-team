---
name: lenis-smooth-scroll
description: Плавний скрол із Lenis (lenis.dev, пакет `lenis`): встановлення, ініціалізація, опції, інтеграція з GSAP ScrollTrigger, якорі, вкладені скрол-контейнери, модальні вікна, React/Vue, доступність і підводні камені. Використовуй, коли сайту потрібен плавний скрол або скрол-синхронізовані анімації.
---
# Lenis (smooth scroll)

Пакет `lenis` (не старий `@studio-freight/lenis`), актуальна гілка 1.3.x, менше 5 КБ. Нативний скрол не підміняється трансформаціями: працюють `position: sticky`, пошук по сторінці, a11y. Перевір актуальну версію: `npm view lenis version`; для CDN фіксуй версію (`https://unpkg.com/lenis@1.3.27/dist/lenis.min.js`).

## Встановлення й старт
```bash
npm i lenis
```
```js
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'   // рекомендований CSS (обов'язковий для autoToggle)

const lenis = new Lenis({ autoRaf: true })
lenis.on('scroll', (e) => { /* e.scroll, e.velocity, e.direction, e.progress */ })
```
Власний RAF (коли є three.js/GSAP-цикл — ТІЛЬКИ один цикл на сторінку):
```js
const lenis = new Lenis()
function raf(t){ lenis.raf(t); requestAnimationFrame(raf) }
requestAnimationFrame(raf)
```

## GSAP ScrollTrigger (стандартна зв'язка)
```js
const lenis = new Lenis()
lenis.on('scroll', ScrollTrigger.update)
gsap.ticker.add((time) => lenis.raf(time * 1000))  // GSAP секунди → Lenis мс
gsap.ticker.lagSmoothing(0)
```
Не вмикай `autoRaf` разом із цим. `ScrollTrigger.refresh()` після зміни висоти контенту (зображення, шрифти, акордеони); `lenis.resize()`, якщо `autoResize:false`.

## Опції (дефолти)
- Швидкість/характер: `lerp: 0.1` (0–1, більше = різкіше; ігнорує duration/easing), `duration: 1.2` (с), `easing`, `wheelMultiplier: 1`, `touchMultiplier: 1`, `smoothWheel: true`.
- Напрям: `orientation: 'vertical'|'horizontal'`, `gestureOrientation: 'vertical'|'horizontal'|'both'`.
- Контейнер: `wrapper: window`, `content: document.documentElement`, `eventsTarget: wrapper`.
- Сенс-скрол: `syncTouch: false` (на iOS < 16 нестабільно), `syncTouchLerp: 0.075`, `touchInertiaExponent: 1.7`.
- `anchors: false|true|ScrollToOptions` — плавні якорі `#id`; `stopInertiaOnNavigate: false`.
- `infinite: false` (на touch разом із `syncTouch:true`), `overscroll: true`, `autoResize: true`, `autoToggle: false`, `allowNestedScroll: false`, `naiveDimensions: false`.
- `prevent: (node)=>bool`, `virtualScroll: (e)=>bool|void` — фільтри подій.
- `respectReducedMotion: true` — при `prefers-reduced-motion` згладжування вимикається (залиш увімкненим).

## API
- `lenis.scrollTo(target, {offset, duration, lerp, easing, immediate, lock, force, onComplete})` — target: число, селектор, `'top'|'bottom'|'start'|'end'`, Element.
- `lenis.stop()` / `lenis.start()` — пауза (модалки, прелоадер, відкрите меню); `lenis.destroy()` при розмонтуванні (SPA!).
- `lenis.on('scroll'|'virtual-scroll', fn)`; властивості: `scroll`, `targetScroll`, `animatedScroll`, `progress`, `limit`, `velocity`, `direction`, `isScrolling`, `isStopped`.

## Вкладені скроли й модалки
- Атрибути на внутрішніх контейнерах: `data-lenis-prevent` (все), `-wheel`, `-touch`, `-vertical`, `-horizontal`. Для модалок, випадних списків, карт (Mapbox/Google), textarea, `overflow:auto` блоків — обов'язково.
- Відкрив модалку → `lenis.stop()` + `overflow:hidden`, закрив → `lenis.start()`.

## Фреймворки
- React: `import { ReactLenis, useLenis } from 'lenis/react'` (`<ReactLenis root options={{...}} />`); Vue/Nuxt: `lenis/vue`. У Vue/Inertia/Livewire створюй один екземпляр, знищуй у `onUnmounted`/на навігації; не дублюй при кожному `mounted`.
- Livewire/Turbo/Inertia: після навігації `lenis.scrollTo(0,{immediate:true})` і `ScrollTrigger.refresh()`.
- Scroll-snap: CSS `scroll-snap` не працює; використовуй `lenis/snap`.

## Підводні камені
- Safari: кадри обмежені 60 fps (30 у low power); `position: fixed` може підлягати на старих Safari; iframe не пробивають wheel (над ними згладжування зникає).
- Не поєднуй зі скрол-слухачами на `top/left` — анімуй `transform`/`opacity`. Для `sticky` та `fixed` перевір відсутність «тремтіння».
- Не ставити `html{scroll-behavior:smooth}` разом із Lenis (CSS з lenis.css це вимикає).
- Тестуй: колесо миші, трекпад, touch, клавіатура (Space/PgDn/Tab-фокус), `prefers-reduced-motion`, якорі, кнопка «назад», висота 320 px, продуктивність (без довгих задач у `scroll`-колбеку).
- Вага: не вантаж на сторінках, де скрол-ефектів нема; ініціалізуй після `load`/на idle, якщо впливає на LCP.
