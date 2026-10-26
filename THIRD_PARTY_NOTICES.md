# Сторонні компоненти та ліцензії

Основний код репозиторію ліцензовано за MIT (див. `LICENSE`). Нижче: матеріали, що походять від інших авторів.

## three.js (dashboard/vendor/)

Файли `three.module.js` і `CSS2DRenderer.js` розповсюджуються локально (без CDN). Ліцензія — MIT, повний текст нижче й у `dashboard/vendor/THREE-LICENSE`.

```
The MIT License

Copyright © 2010-2023 three.js authors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

## Навички Laravel (skills/)

Сім навичок походять від проєкту Laravel (у frontmatter кожного `SKILL.md`: `license: MIT`, `metadata.author: laravel`):

`fortify-development`, `infer-conventions`, `inertia-vue-development`, `laravel-best-practices`, `tailwindcss-development`, `testing-best-practices`, `wayfinder-development`.

Вони включені без змін і розповсюджуються на умовах ліцензії MIT. Права на ці матеріали належать їхнім авторам (Laravel та контриб'юторам відповідних пакетів). Стандартний текст MIT:

```
MIT License

Copyright (c) Laravel and the respective skill authors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

Якщо ви є правовласником цих навичок і хочете уточнити атрибуцію — створіть issue.

## Інші сторонні навички

- `domain-driven-design`: у frontmatter `license: MIT`, `metadata.author: wondelai`, `metadata.version: 1.1.0`. Включена без змін (разом з `references/`); права належать автору (wondelai). Текст ліцензії MIT — стандартний, як вище для Laravel.
- `business-analyst`: у файлах навички (`SKILL.md`, `resources/implementation-playbook.md`) автор і ліцензія не вказані (license not stated in source). Походження не встановлено; включена без змін. Перед публічним розповсюдженням з'ясуйте джерело й умови або видаліть її; за потреби створіть issue.

## Інші навички та агенти

Решта навичок (`skills/`) і всі агенти (`agents/`) — авторські, ліцензія MIT цього репозиторію. Навички можуть посилатися на сторонні бібліотеки (Lenis, GSAP, three.js тощо) лише як на теми для використання у ваших проєктах; самі бібліотеки в репозиторій не входять (окрім three.js у дашборді).

## Плагін Telegram

Плагін `telegram@claude-plugins-official` НЕ входить до репозиторію й не встановлюється автоматично; див. `docs/TELEGRAM.md`.
