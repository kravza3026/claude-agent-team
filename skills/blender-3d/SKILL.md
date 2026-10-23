---
name: blender-3d
description: Створення 3D-об'єктів для вебу в Blender через Python (bpy) у headless-режимі: процедурне моделювання, матеріали PBR, експорт glTF/GLB з оптимізацією, бюджети, превʼю-рендер. Використовуй, коли треба модель чи сцена для three.js.
---
# Blender для вебу (headless)

## Запуск
- `blender -b --factory-startup -P script.py -- --out public/models/x.glb` (аргументи після `--`: `sys.argv[sys.argv.index('--')+1:]`).
- Версія 3.0.x: використовуй `bpy.ops.export_scene.gltf(filepath=..., export_format='GLB', export_apply=True, export_yup=True)`; використовуй лише параметри, що є в 3.0 (перевір `help(bpy.ops.export_scene.gltf)`). Draco: `export_draco_mesh_compression_enable=True`.
- Починай скрипт з очищення сцени: `bpy.ops.wm.read_factory_settings(use_empty=True)`.

## Моделювання без вікна
- Примітиви `bpy.ops.mesh.primitive_*_add`, потім модифікатори (Bevel, Array, Mirror, Solidify, Subdivision) і `bpy.ops.object.convert(target='MESH')` або `export_apply=True`.
- Для складніших форм — `bmesh` (extrude, inset, bevel) і криві (`bpy.data.curves`) з перетворенням у меш.
- Текст: `bpy.data.curves.new(type='FONT')`, шрифт з теки проєкту; конвертуй у меш, зведи вершини (`remove_doubles`).
- Параметризуй: розміри, кольори, кількість елементів — змінні на початку скрипта, щоб скрипт можна було перезапустити з іншими значеннями.
- Одиниці: 1 одиниця = 1 м, початок координат у центрі основи об'єкта, Y-up на виході, застосовані масштаб і поворот (`transform_apply`).

## Матеріали
- Principled BSDF: base color, metallic, roughness (мінімум вузлів, без процедурних текстур, яких glTF не переносить). Складні вузли запікай у текстури (Cycles bake) або спрощуй до кольору.
- Палітра — з `docs/brand.md`. Кольори в sRGB, вказуй як linear коректно (`color_srgb_to_linear` при потребі).
- Один матеріал на частину; кількість матеріалів мінімальна (draw calls).

## Бюджети (landing)
- Трикутників: 5–50 тис. на об'єкт, сцена ≤ 100 тис.; вага `.glb` ≤ 500 КБ типово, ≤ 1–2 МБ максимум; текстури ≤ 1024–2048 px, WebP/JPEG у glb, мінімум текстур.
- Без прихованих граней, без невидимих деталей, без дублікатів вершин; нормалі назовні (`normals_make_consistent`).
- Для запеченого освітлення — AO у vertex colors або текстуру; динамічне світло в three.js.

## Превʼю й перевірка
- Рендер Eevee/Workbench 800×600: `bpy.context.scene.render.filepath`, камера й 3-точкове світло в скрипті; PNG у scratchpad або `assets/3d/preview/`. Подивись зображення (Read) і відкоригуй.
- Чекліст: форма відповідає специфікації; немає артефактів нормалей; масштаб/початок координат; кількість трикутників і вага в бюджеті; відкривається без помилок (імпорт назад у Blender або перевірка в three.js); немає нескінченних/NaN вершин.
- Опційно: `npx gltf-transform optimize in.glb out.glb` (meshopt/Draco, WebP), якщо доступно без глобальної установки (`npx` у проєкті).

## Інтеграція (для frontend-developer)
- `GLTFLoader` + `DRACOLoader` (декодер локально) або `MeshoptDecoder`; `renderer.outputColorSpace = SRGBColorSpace`; `dispose()` геометрій/матеріалів/текстур при розмонтуванні.
- Лінива ініціалізація (IntersectionObserver), `prefers-reduced-motion`, fallback-постер `<img>` для слабких пристроїв.
