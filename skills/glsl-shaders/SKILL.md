---
name: glsl-shaders
description: Написання GLSL-шейдерів для three.js (ShaderMaterial/onBeforeCompile): uniforms, шум, градієнти, дисторсія, postprocessing. Використовуй, коли потрібні кастомні шейдери.
---
# GLSL у three.js

- Для кастомних ефектів використовуй `ShaderMaterial`; для модифікації PBR — `onBeforeCompile`.
- Uniforms: `uTime`, `uResolution`, `uMouse`, `uProgress` (0..1 від scroll). Оновлюй у loop.
- `precision highp float;` для мобільних перевіряй `mediump` на артефакти.
- Уникай розгалужень у фрагментному шейдері; віддавай перевагу `mix/step/smoothstep`.
- Шум (simplex/perlin) підключай як окремий chunk, не копіюй у кожен шейдер.
- Тримай `.glsl` файли окремо (vite-plugin-glsl), імпортуй як рядки.
- Помилки компіляції дивись у консолі (`renderer.debug.checkShaderErrors = true` у dev).
- Для post-processing: `EffectComposer` + власний `ShaderPass`, роздільність зменшуй на слабких GPU.
- Тестуй на інтегрованій графіці, а не лише на дискретній GPU.
