---
name: webgl-raw
description: Чистий WebGL/WebGL2 без three.js та інших бібліотек - контекст, шейдерні програми, буфери, VAO, uniforms, текстури, матриці, цикл рендера, resize/DPR, очищення. Використовуй, коли просять 3D/графіку "на голому WebGL".
---
# WebGL без бібліотек

## Контекст
- Спробуй `canvas.getContext('webgl2', {antialias:true, alpha:false, powerPreference:'high-performance'})`,
  fallback на `webgl` (GLSL ES 1.00: `attribute/varying`, `gl_FragColor`). Якщо обох немає - покажи статичний fallback (CSS/зображення), не кидай помилку.
- Версію шейдера визнач за типом контексту: `#version 300 es` + `in/out` для WebGL2.
- Слухай `webglcontextlost` (preventDefault) і `webglcontextrestored` (перестворити ресурси).

## Структура коду
- Окремий модуль `src/webgl/` без залежностей: `gl-utils.js` (createShader/createProgram з виводом `getShaderInfoLog`, getUniformLocations кешем),
  `mat4.js` (perspective, lookAt, translate, rotate, multiply, normalMatrix), `geometry.js` (куб, сфера, тор, площина: positions/normals/uvs/indices), `scene.js`.
- Шейдери - рядками у `.glsl.js`/template literals (без додаткових плагінів).
- React: компонент з `useRef` для canvas, ініціалізація в `useEffect`, у cleanup - `cancelAnimationFrame`, відписка слухачів, `loseContext()`, видалення програм/буферів/текстур.

## Рендер
- Один `requestAnimationFrame`; час у секундах (`t*0.001`), `dt` обмежуй.
- Resize: `ResizeObserver`; `dpr = Math.min(devicePixelRatio, 2)`; `canvas.width = clientWidth*dpr`; `gl.viewport`.
- `gl.enable(DEPTH_TEST)`, `CULL_FACE` для замкнених мешів; blending лише для прозорого, після непрозорого.
- VAO (`createVertexArray`) на кожен меш; interleaved-буфери; індекси `Uint16Array`/`Uint32Array`.
- Uniforms оновлюй лише змінні за кадр; матриці на CPU (Float32Array, column-major).
- Освітлення: Lambert/Blinn-Phong у фрагментному шейдері; normal matrix = inverse transpose mat3 від model.
- Інтерактив: миша/touch -> орбітальна камера (yaw/pitch, zoom колесом, затухання), `pointer events`, `touch-action:none` на canvas.
- Пауза, коли вкладка прихована або canvas поза viewport (`IntersectionObserver`, `visibilitychange`).
- `prefers-reduced-motion`: зупини автоанімацію.

## Якість
- Перевіряй помилки: `gl.getError()` у dev, лог компіляції шейдерів/лінковки.
- Не створюй об'єкти (масиви, матриці) у циклі рендера - повторно використовуй буфери.
- Тестування: headless Chrome дає SwiftShader (часто лише WebGL1) - код має працювати на обох версіях або показувати fallback.
