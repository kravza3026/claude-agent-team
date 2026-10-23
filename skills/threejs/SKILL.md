---
name: threejs
description: Практики three.js для лендінгів: структура сцени, рендер-луп, завантаження моделей, очищення пам'яті, продуктивність, інтеграція зі scroll-анімаціями. Використовуй при будь-якій роботі з three.js / WebGL.
---
# three.js для лендінгів

## Структура
- Один модуль `scene` з `init()`, `resize()`, `render()`, `dispose()`.
- Один `WebGLRenderer`; `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`.
- Resize через `ResizeObserver` на контейнері, а не `window.resize`.
- Керований цикл: `renderer.setAnimationLoop(fn)`; став на паузу, коли canvas поза viewport
  (`IntersectionObserver`) або вкладка прихована.

## Ресурси
- Моделі: GLTF + DRACO (геометрія) + KTX2/Basis (текстури). Розмір моделі лендінга < 2–3 МБ.
- Один `GLTFLoader`/`LoadingManager` на сайт; показуй прогрес.
- Колірний простір: `texture.colorSpace = THREE.SRGBColorSpace`, `renderer.outputColorSpace` за замовчуванням.

## Пам'ять (найчастіша проблема)
- При знищенні сцени: `geometry.dispose()`, `material.dispose()`, `texture.dispose()`,
  `renderTarget.dispose()`, `renderer.dispose()`, зняти слухачі, зупинити loop.
- Не створюй геометрії/матеріали в циклі; перевикористовуй.

## Продуктивність
- `InstancedMesh` для багатьох однакових об'єктів; об'єднуй статичну геометрію.
- Мінімум realtime-світла/тіней; для статики запікай lightmap/environment.
- Post-processing лише за потреби, знижуй роздільність ефектів на мобільних.
- Перевіряй `renderer.info` (calls, triangles, textures).

## Інтеграція з анімацією
- GSAP + ScrollTrigger: анімуй властивості об'єктів (position/rotation/uniforms),
  а не викликай render із ScrollTrigger; render робить окремий loop.
- Поважай `prefers-reduced-motion`.

## Надійність
- Перевір `WebGL` доступність; май статичний fallback-зображення.
- Обробляй `webglcontextlost`/`webglcontextrestored`.
- Мобільні: нижча якість, `powerPreference: 'high-performance'` лише за потреби.
