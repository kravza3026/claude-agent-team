---
name: logo-favicon
description: Генерація логотипа (SVG) і фавіконки (ICO/PNG) за назвою компанії та брендом. Використовуй, коли потрібен новий лого й іконки сайту.
---
# Логотип і favicon

## Логотип (SVG)
- Вордмарк (назва компанії) + простий знак із геометрії, що асоціюється зі сферою (щит/замок/вузол для безпеки, графік для консалтингу тощо).
- Чистий SVG: `viewBox`, без растрових вставок, текст перетвори на контури або використай системний шрифт з fallback; 2–3 кольори з `docs/brand.md`.
- Файли: `logo.svg` (повний), `logo-mark.svg` (лише знак), `logo-light.svg` (для темного тла).
- Перевір у розмірах 32 px і 200 px — читабельність.

## Favicon
Із `logo-mark.svg` (ImageMagick, `convert` вже встановлений):
```bash
convert -background none logo-mark.svg -define icon:auto-resize=64,48,32,16 public/favicon.ico
convert -background none logo-mark.svg -resize 180x180 public/apple-touch-icon.png
cp logo-mark.svg public/favicon.svg
```
Підключи в `<head>`: `favicon.ico`, `favicon.svg`, `apple-touch-icon.png`.

## Правила
- Не копіюй чужі логотипи й відомі знаки; не використовуй брендові назви.
- Після генерації відкрий результат у браузері та перевір на світлому й темному тлі.
