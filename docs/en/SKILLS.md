[🇺🇦 Українська](../SKILLS.md) | **🇬🇧 English**

# Skills

A skill is a directory `skills/<name>/` with a `SKILL.md` file (frontmatter `name` + `description`, then instructions) and, if needed, supporting files. Claude Code loads a skill when its `description` matches the task, and an agent can list skills in the `skills:` line of its frontmatter so they are always at hand.

<!-- BEGIN:counts -->
**Agents: 12, skills: 23.**
<!-- END:counts -->

## All skills

The table is generated from frontmatter (`node tools/gen-docs.js`); English descriptions come from `docs/i18n/descriptions.en.json`. The "Used by agents" column lists agents that include the skill in `skills:`.

<!-- BEGIN:skills-table -->
| Skill | Description | Used by agents | Source / license |
| --- | --- | --- | --- |
| `asset-craft` | Creating and preparing visual assets that make a site look premium: SVG illustrations and patterns, grain/noise, consistent icons, duotone/masks, gradient meshes, image optimization (AVIF/WebP, srcset). | `3d-modeler`, `content-writer`, `frontend-developer`, `pagespeed` | original (MIT, this repository) |
| `blender-3d` | Creating 3D objects for the web in Blender via Python (bpy), headless: procedural modeling, PBR materials, glTF/GLB export with optimization, budgets, preview render. | `3d-modeler` | original (MIT, this repository) |
| `brand-identity` | Builds a site's visual identity from company data (name, industry, country): palette, fonts, tone, mood. Use at the start of any new design. | `frontend-developer`, `planner` | original (MIT, this repository) |
| `catalog-content` | Preparing realistic content for a company site: a catalog (30+ items) with real photos, descriptions and prices, plus services. | `content-writer`, `frontend-developer` | original (MIT, this repository) |
| `design-variety` | Makes sure a new site differs visually and structurally from neighboring branches/sites (composition, grid, typography, shapes, rhythm). | `frontend-developer`, `planner` | original (MIT, this repository) |
| `fortify-development` | Laravel Fortify authentication: login, registration, password reset, email verification, two-factor authentication, passkeys, profile updates (from Laravel). | `backend-developer` | laravel (MIT), see THIRD_PARTY_NOTICES.md |
| `glsl-shaders` | Writing GLSL shaders for three.js (ShaderMaterial/onBeforeCompile): uniforms, noise, gradients, distortion, postprocessing. | `frontend-developer` | original (MIT, this repository) |
| `inertia-vue-development` | Inertia.js v3 Vue client-side development: pages, forms, navigation, deferred props, prefetching, polling (from Laravel). | `backend-developer`, `frontend-developer` | laravel (MIT), see THIRD_PARTY_NOTICES.md |
| `landing-design` | Principles for designing corporate site/landing pages: section structure, grid, hierarchy, responsiveness, accessibility. | `frontend-developer` | original (MIT, this repository) |
| `laravel-best-practices` | Best practices for writing, reviewing and refactoring Laravel PHP code: controllers, models, migrations, queries, caching, security, queues (from Laravel). | `backend-developer`, `database-engineer`, `debugger`, `reviewer` | laravel (MIT), see THIRD_PARTY_NOTICES.md |
| `layout-patterns` | Catalog of modern page and section compositions (hero, navigation, grids, cards, footers, CTA) with when-to-use notes and HTML/CSS skeletons. | `frontend-developer`, `planner` | original (MIT, this repository) |
| `lenis-smooth-scroll` | Smooth scrolling with Lenis: setup, options, GSAP ScrollTrigger integration, anchors, nested scroll containers, accessibility and pitfalls. | `frontend-developer`, `pagespeed`, `tester` | original (MIT, this repository) |
| `logo-favicon` | Generating a logo (SVG) and favicon (ICO/PNG) from a company name and brand. | `frontend-developer` | original (MIT, this repository) |
| `modern-css` | Modern CSS features (container queries, :has(), subgrid, @layer, oklch/color-mix, scroll-driven animations, View Transitions, anchor positioning) with ready snippets and fallbacks. | `frontend-developer`, `pagespeed` | original (MIT, this repository) |
| `motion-banners` | Catalog of banners, animations and WebGL effects for vivid, non-repetitive sites (promo banners, marquee, scroll-reveal, shader backgrounds, hover effects). | `frontend-developer` | original (MIT, this repository) |
| `parallax` | Parallax effects for landing pages: transform layers, scroll-driven animations, IntersectionObserver/GSAP ScrollTrigger/Lenis, mouse/gyro parallax, performance, reduced motion. | `frontend-developer`, `pagespeed`, `tester` | original (MIT, this repository) |
| `tailwindcss-development` | Tailwind CSS v3/v4 work: responsive layouts, UI components, dark mode, spacing and typography (from Laravel). | `frontend-developer` | laravel (MIT), see THIRD_PARTY_NOTICES.md |
| `testing-best-practices` | Laravel test design and review: coverage, naming, assertions, test data, isolation, HTTP and security boundaries (from Laravel). | `backend-developer`, `database-engineer`, `debugger`, `reviewer` | laravel (MIT), see THIRD_PARTY_NOTICES.md |
| `threejs` | three.js practices for landing pages: scene structure, render loop, model loading, memory cleanup, performance, integration with scroll animations. | `3d-modeler`, `frontend-developer` | original (MIT, this repository) |
| `typography-system` | Typography system for sites: fluid scales, a catalog of proven font pairs, variable fonts, numerals, line length, font loading. | `frontend-developer` | original (MIT, this repository) |
| `wayfinder-development` | Laravel Wayfinder: typed functions for controllers and routes so frontend code never hardcodes URLs (from Laravel). | `backend-developer`, `frontend-developer` | laravel (MIT), see THIRD_PARTY_NOTICES.md |
| `web-performance` | Measuring and optimizing page speed (Core Web Vitals, PageSpeed): budgets, measurement script, fixes for images, fonts, CSS/JS, cache, WebGL and Laravel/Livewire. | `pagespeed`, `tester` | original (MIT, this repository) |
| `webgl-raw` | Plain WebGL/WebGL2 without three.js or other libraries: context, shader programs, buffers, VAO, uniforms, textures, matrices, render loop, resize/DPR, cleanup. | `frontend-developer` | original (MIT, this repository) |
<!-- END:skills-table -->

## Groups

- **Design and markup:** `brand-identity`, `design-variety`, `landing-design`, `layout-patterns`, `typography-system`, `modern-css`, `asset-craft`, `logo-favicon`, `motion-banners`.
- **Animation and graphics:** `parallax`, `lenis-smooth-scroll`, `threejs`, `webgl-raw`, `glsl-shaders`, `blender-3d`.
- **Content and performance:** `catalog-content`, `web-performance`.
- **Laravel / frontend stack (from Laravel, MIT):** `laravel-best-practices`, `testing-best-practices`, `fortify-development`, `wayfinder-development`, `inertia-vue-development`, `tailwindcss-development`.

## Sources and licenses

- The Ukrainian-language skills are original work, under the MIT license of this repository.
- The six Laravel skills are MIT, author `laravel` (stated in their frontmatter); attribution is in `THIRD_PARTY_NOTICES.md`.

## How to add your own skill

1. Create `skills/<name>/SKILL.md`:
   ```markdown
   ---
   name: <name, same as the directory>
   description: What it does and WHEN to use it (this text is used to pick the skill automatically)
   ---
   # Title
   Instructions, checklist, code examples. Put large references into separate files next to it.
   ```
2. If needed, add it to the `skills:` list of the relevant agent.
3. Add an English description to `docs/i18n/descriptions.en.json` (`skills.<name>`), then run `node tools/gen-docs.js` and `node tests/smoke.js` (checks that `name` and `description` exist and `name` matches the directory).
4. Do not put personal data, keys or paths from your machine into skills.
