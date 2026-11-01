// «Офіс»: ізометрична 3D-візуалізація агентів (three.js, процедурна геометрія, без зовнішніх моделей).
// Підключається ліниво з index.html: init(box, bridge) · setActive(on) · onEvent(e). Стан бере з моста (C / agentStatus / statOf / EV).
import * as THREE from '/vendor/three.module.js';

THREE.ColorManagement.enabled = true;
const PAL = ['#3b82f6', '#38bdf8', '#6366f1', '#0ea5e9', '#60a5fa', '#2563eb', '#22d3ee', '#818cf8', '#7c9cff', '#06b6d4'];
const SKIN = ['#f5d0b0', '#e8b48a', '#c68a62', '#8d5a3c', '#f1c9a5', '#6b4430'];
const HAIR = ['#2b1d14', '#5a3a22', '#b0652c', '#d8b54a', '#1b1b1f', '#8a3b2e', '#9aa0a8'];
const SHIRT = ['#ff6b6b', '#4dabf7', '#ffd43b', '#69db7c', '#da77f2', '#ff922b', '#38d9a9', '#f783ac'];
const ST_COL = { run: '#34d399', done: '#4ade80', fail: '#ff5d5d', idle: '#6b7389' };
const Y0 = 0.4, WALL_H = 2.8, HUB_R = 5.2, FOV = 30, AZ0 = Math.PI / 4, EL0 = 0.72;
const hash = s => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const C3 = h => new THREE.Color(h);
const shade = (h, f) => { const c = C3(h); c.r = Math.min(1, c.r * f); c.g = Math.min(1, c.g * f); c.b = Math.min(1, c.b * f); return c; };
const mixc = (a, b, k) => C3(a).lerp(C3(b), k);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const hex = c => '#' + c.getHexString();

let B, TH = {}, box, stage, cv, lbls, ctl, mapEl, mapBox, mapVw, mapHd, toastEl, tipEl, listEl, legEl, ofMsg;
let renderer, scene, camera, sun, hubG, starP;
let ROOMS = [], AG = {}, ROUTES = [], PICK = [], HUBPARTS = {};
let active = false, visible = true, raf = 0, dirty = true, reduced = false, lastT = 0, lastC = null, lastLang = '', lastSig = '', syncT = 0, glOk = false;
let hov = null, selRoom = -1, hovRoom = -1, listHover = null, Rs = 20, SMAX = 8, dFit = 40, W = 800, H = 500, aspect = 1.6;
const cam = { az: AZ0, el: EL0, z: 1, tx: 0, tz: 0, taz: AZ0, tel: EL0, tzm: 1, ttx: 0, ttz: 0 };
const G = {};
const _v = new THREE.Vector3(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _n3 = new THREE.Matrix3();

/* ---------- пакет статичної геометрії: одна меш на кімнату (вершинні кольори) ---------- */
class Batch {
  constructor() { this.p = []; this.n = []; this.c = []; this.i = []; this.o = 0; }
  add(g, col, x, y, z, sx = 1, sy = 1, sz = 1, ry = 0, rx = 0, rz = 0) {
    _e.set(rx, ry, rz); _q.setFromEuler(_e); _m.compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz)); _n3.getNormalMatrix(_m);
    const P = g.attributes.position, N = g.attributes.normal, n = P.count, c = col.isColor ? col : C3(col);
    for (let i = 0; i < n; i++) {
      _v.fromBufferAttribute(P, i).applyMatrix4(_m); this.p.push(_v.x, _v.y, _v.z);
      _v.fromBufferAttribute(N, i).applyMatrix3(_n3).normalize(); this.n.push(_v.x, _v.y, _v.z); this.c.push(c.r, c.g, c.b);
    }
    const I = g.index; if (I) for (let i = 0; i < I.count; i++) this.i.push(I.getX(i) + this.o); else for (let i = 0; i < n; i++) this.i.push(i + this.o);
    this.o += n; return this;
  }
  box(col, x, y, z, w, h, d, ry, rx, rz) { return this.add(G.box, col, x, y, z, w, h, d, ry, rx, rz); }
  cyl(col, x, y, z, r, h) { return this.add(G.cyl, col, x, y, z, r, h, r); }
  sph(col, x, y, z, rx, ry, rz) { return this.add(G.sph, col, x, y, z, rx, ry ?? rx, rz ?? rx); }
  ico(col, x, y, z, r) { return this.add(G.ico, col, x, y, z, r, r, r); }
  mesh() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3)); g.setIndex(this.i);
    const m = new THREE.Mesh(g, TH.vcMat); m.castShadow = m.receiveShadow = true; return m;
  }
}

/* ---------- текстури ---------- */
function glowTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
}
function screenTex() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 256; const x = c.getContext('2d'); x.fillStyle = '#0d2036'; x.fillRect(0, 0, 128, 256);
  const cols = ['#6ee7ff', '#a5f3a0', '#ffd37a', '#ff9bd1', '#c4b5fd']; let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 20; i++) { x.fillStyle = cols[Math.floor(rnd() * cols.length)]; const ind = Math.floor(rnd() * 3) * 10, w = 20 + rnd() * 70; x.fillRect(8 + ind, 6 + i * 12, w, 5); }
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, .5); return t;
}

/* ---------- кабінети: 8 кімнат за ролями (лише для «Офісу»; групи в team.json не змінюються) ---------- */
const CABS = [
  { id: 'cab-analysis', icon: 'analysis', uk: 'Аналіз і планування', en: 'Analysis & Planning', agents: ['business-analyst', 'planner', 'figma-reader'] },
  { id: 'cab-arch', icon: 'analysis', uk: 'Архітектура', en: 'Architecture', agents: ['architect', 'spec-validator'] },
  { id: 'cab-front', icon: 'engineering', uk: 'Фронтенд і 3D', en: 'Frontend & 3D', agents: ['frontend-engineer', 'mobile-engineer', '3d-modeler'] },
  { id: 'cab-back', icon: 'engineering', uk: 'Бекенд і дані', en: 'Backend & Data', agents: ['backend-engineer', 'database-engineer'] },
  { id: 'cab-ops', icon: 'engineering', uk: 'DevOps і AI', en: 'DevOps & AI', agents: ['devops-engineer', 'ai-engineer'] },
  { id: 'cab-content', icon: 'docs', uk: 'Контент і документація', en: 'Content & Docs', agents: ['content-writer', 'technical-writer'] },
  { id: 'cab-test', icon: 'quality', uk: 'Тестування', en: 'Testing', agents: ['test-writer', 'qa-engineer', 'tester', 'pagespeed'] },
  { id: 'cab-review', icon: 'quality', uk: 'Налагодження і безпека', en: 'Debug & Security', agents: ['debugger', 'code-reviewer', 'security-reviewer'] }
];
// агенти, яких немає в плані (нові в team.json), потрапляють у кабінет за своєю групою або в «Інші»
function officeGroups() {
  const all = B.GROUPS.flatMap(g => g.agents), have = new Set(all), used = new Set(), out = [];
  CABS.forEach(c => { const ag = c.agents.filter(k => have.has(k)); ag.forEach(k => used.add(k)); if (ag.length) out.push({ id: c.id, icon: c.icon, label: { uk: c.uk, en: c.en }, agents: ag }); });
  const rest = all.filter(k => !used.has(k));
  if (rest.length) out.push({ id: 'cab-other', icon: 'other', label: { uk: 'Інші', en: 'Other' }, agents: rest });
  return out;
}

/* ---------- кімната ---------- */
function layoutOf(n) { const cols = n <= 1 ? 1 : n <= 4 ? 2 : 3, rows = Math.max(1, Math.ceil(n / cols)), cw = 2.6, cd = 2.7; return { cols, rows, cw, cd, S: Math.max(6.8, cols * cw + 1.9, rows * cd + 2.4) }; }
function makeAvatar(k) {
  const h = hash(k), skin = SKIN[h % SKIN.length], hair = HAIR[(h >>> 3) % HAIR.length], shirt = SHIRT[(h >>> 6) % SHIRT.length], style = (h >>> 9) % 3;
  const g = new THREE.Group(), cast = m => { m.castShadow = true; return m; };
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: .7 }), skinMat = TH.skin(skin), hairMat = TH.hair(hair), pants = TH.pants;
  const mk = (geo, mat, x, y, z, sx, sy, sz, par = g) => { const m = cast(new THREE.Mesh(geo, mat)); m.position.set(x, y, z); m.scale.set(sx, sy, sz); par.add(m); return m; };
  for (const sx of [-1, 1]) { mk(G.box, pants, sx * .14, .68, -.18, .2, .16, .56); mk(G.box, pants, sx * .14, .34, -.44, .17, .56, .17); mk(G.box, TH.shoe, sx * .14, .06, -.5, .2, .1, .3); }
  const torso = new THREE.Group(); torso.position.set(0, .72, 0); g.add(torso); mk(G.box, shirtMat, 0, .32, 0, .54, .64, .32, torso);
  const head = new THREE.Group(); head.position.set(0, 1.5, 0); g.add(head);
  mk(G.sph, skinMat, 0, 0, 0, .26, .28, .25, head); mk(G.sph, hairMat, 0, .09, .045, .285, .24, .275, head);
  if (style === 1) mk(G.box, hairMat, 0, -.06, .2, .46, .36, .12, head); if (style === 2) mk(G.sph, hairMat, 0, .31, .12, .12, .12, .12, head);
  mk(G.box, TH.dark, -.09, -.01, -.235, .05, .06, .02, head); mk(G.box, TH.dark, .09, -.01, -.235, .05, .06, .02, head);
  const arms = [];
  for (const sx of [-1, 1]) { const p = new THREE.Group(); p.position.set(sx * .34, 1.2, 0); g.add(p); mk(G.box, shirtMat, 0, 0, -.32, .12, .13, .64, p); mk(G.box, skinMat, 0, 0, -.68, .13, .12, .1, p); arms.push(p); }
  const markMat = new THREE.MeshBasicMaterial({ color: ST_COL.run }), marker = new THREE.Mesh(G.oct, markMat); marker.scale.set(.24, .38, .24); marker.position.y = 2.25; marker.visible = false; g.add(marker);
  return { g, torso, head, arms, shirtMat, shirt: C3(shirt), markMat, marker };
}
function buildRoom(grp, gi, hubOnly) {
  const n = grp.agents.length, L = layoutOf(n), { cols, rows, cw, cd, S } = L, col = PAL[gi % PAL.length], floor = C3(col), wall = shade(col, .82), trim = mixc(col, '#ffffff', .35), rug = mixc(col, '#ffffff', .4);
  const R = { gi, grp, S, col, color: floor, x: 0, z: 0, group: new THREE.Group(), L, agents: [], run: 0, lblY: 4.6 };
  const b = new Batch(), ix0 = -S / 2 + .35, iw = S - .35, gW = cols * cw, gD = rows * cd, gx0 = ix0 + (iw - gW) / 2, gz0 = ix0 + (iw - gD) / 2 + .15;
  // килим, стіни, плінтус
  b.box(rug, (gx0 + gW / 2), Y0 + .02, (gz0 + gD / 2), gW + .5, .04, gD + .5);
  b.box(wall, 0, Y0 + WALL_H / 2, -S / 2 + .175, S, WALL_H, .35); b.box(trim, 0, Y0 + WALL_H + .06, -S / 2 + .2, S, .12, .46);
  b.box(wall, -S / 2 + .175, Y0 + WALL_H / 2, .175, .35, WALL_H, S - .35); b.box(trim, -S / 2 + .2, Y0 + WALL_H + .06, .1, .46, .12, S - .15);
  b.box(shade(col, 1.12), 0, Y0 + .09, -S / 2 + .38, S - .4, .18, .06); b.box(shade(col, 1.12), -S / 2 + .38, Y0 + .09, .2, .06, .18, S - .6);
  // дошка з графіком на задній стіні, постер, полиці з книгами на лівій стіні
  const bx = -S * .12; b.box('#161a2a', bx, Y0 + 1.7, -S / 2 + .39, 2.7, 1.3, .06); b.box('#222842', bx, Y0 + 1.7, -S / 2 + .42, 2.5, 1.1, .03);
  for (let i = 0; i < 7; i++) { const hh = .15 + ((hash(grp.id + i) % 100) / 100) * .65; b.box(i % 2 ? '#6ee7ff' : mixc(col, '#ffffff', .4), bx - 1.0 + i * .33, Y0 + 1.2 + hh / 2, -S / 2 + .45, .2, hh, .02); }
  b.box('#ffd166', bx + 2.6, Y0 + 1.75, -S / 2 + .4, .9, .7, .05); b.box(shade(col, 1.3), bx + 2.6, Y0 + 1.75, -S / 2 + .43, .7, .5, .03);
  const shz = S * .12; b.box('#f1f3f9', -S / 2 + .5, Y0 + 1.55, shz, .3, .08, 2.4); b.box('#f1f3f9', -S / 2 + .5, Y0 + 2.1, shz, .3, .08, 2.4);
  const BK = ['#ff6b6b', '#4dabf7', '#ffd43b', '#69db7c', '#da77f2', '#ff922b'];
  for (let i = 0; i < 9; i++) { const hh = .3 + (i * 7 % 4) * .06; b.box(BK[(i + gi) % BK.length], -S / 2 + .5, Y0 + 1.59 + hh / 2, shz - 1.05 + i * .26, .2, hh, .15); }
  for (let i = 0; i < 8; i++) { const hh = .28 + (i * 5 % 4) * .06; b.box(BK[(i + gi + 2) % BK.length], -S / 2 + .5, Y0 + 2.14 + hh / 2, shz - .95 + i * .27, .2, hh, .15); }
  // торшер у куті, рослини, диван (якщо є місце)
  b.cyl('#cfd3de', -S / 2 + .85, Y0 + .85, -S / 2 + .85, .05, 1.7); b.cyl('#cfd3de', -S / 2 + .85, Y0 + .04, -S / 2 + .85, .3, .08);
  const plant = (px, pz, sc = 1) => { b.cyl('#c8654a', px, Y0 + .2 * sc, pz, .3 * sc, .4 * sc); b.ico('#2f9e5a', px, Y0 + .7 * sc, pz, .36 * sc); b.ico('#43c27a', px + .1 * sc, Y0 + 1.02 * sc, pz - .05 * sc, .27 * sc); b.ico('#2f9e5a', px - .12 * sc, Y0 + .9 * sc, pz + .1 * sc, .24 * sc); };
  plant(S / 2 - .55, S / 2 - .55); plant(-S / 2 + .7, S / 2 - .7, .85); if (n > 4) plant(S / 2 - .5, -S / 2 + .9, .8);
  if ((S - cols * cw) / 2 >= 1.5) { const sz = (gz0 + gD / 2); b.box('#eef0f6', -S / 2 + 1.1, Y0 + .3, sz, 1.0, .4, 2.0); b.box('#dfe2ec', -S / 2 + .62, Y0 + .7, sz, .26, .6, 2.0); b.cyl('#ffffff', -S / 2 + 1.1, Y0 + .08, sz + 1.6, .26, .16); }
  // робочі місця
  grp.agents.forEach((k, j) => {
    const r = Math.floor(j / cols), cnt = Math.min(cols, n - r * cols), c = j - r * cols, sx = gx0 + (cols - cnt) * cw / 2 + cw * (c + .5), sz = gz0 + cd * (r + .5);
    b.box('#f4f5f9', sx, Y0 + .78, sz - .35, 1.7, .08, .9); for (const s of [-1, 1]) b.box('#cfd3de', sx + s * .8, Y0 + .38, sz - .35, .07, .76, .8);
    b.cyl('#2a2d3a', sx, Y0 + .96, sz - .58, .09, .25); b.box('#2a2d3a', sx, Y0 + .85, sz - .58, .4, .04, .22); b.box('#1c1f2e', sx, Y0 + 1.38, sz - .58, .98, .6, .06);
    b.box('#dfe2ec', sx, Y0 + .83, sz - .02, .5, .03, .18); b.box('#dfe2ec', sx + .45, Y0 + .83, sz - .02, .1, .03, .14);
    if (hash(k) % 3 === 0) b.cyl(BK[hash(k) % BK.length], sx - .65, Y0 + .88, sz - .3, .07, .12); else if (hash(k) % 3 === 1) b.box(BK[hash(k) % BK.length], sx + .65, Y0 + .86, sz - .35, .22, .04, .3, .3);
    b.box('#343a52', sx, Y0 + .56, sz + .7, .62, .09, .6); b.box('#343a52', sx, Y0 + .95, sz + 1.0, .6, .62, .08); b.cyl('#343a52', sx, Y0 + .3, sz + .7, .05, .5); b.box('#343a52', sx, Y0 + .05, sz + .7, .7, .05, .1); b.box('#343a52', sx, Y0 + .05, sz + .7, .1, .05, .7);
    const A = makeAvatar(k); A.g.position.set(sx, Y0, sz + .7); R.group.add(A.g);
    const sm = new THREE.MeshBasicMaterial({ map: TH.scr.clone(), color: 0x335566 }); sm.map.needsUpdate = true; sm.map.offset.y = (hash(k) % 10) / 10;
    const screen = new THREE.Mesh(G.plane, sm); screen.scale.set(.9, .5, 1); screen.position.set(sx, Y0 + 1.38, sz - .58 + .035); R.group.add(screen);
    const gm = new THREE.MeshBasicMaterial({ map: TH.glow, color: ST_COL.run, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    const glow = new THREE.Mesh(G.plane, gm); glow.rotation.x = -Math.PI / 2; glow.scale.set(3, 3, 1); glow.position.set(sx, Y0 + .06, sz + .1); R.group.add(glow);
    const rm = new THREE.MeshBasicMaterial({ color: ST_COL.run, transparent: true, opacity: 0, depthWrite: false }), ring = new THREE.Mesh(G.torus, rm); ring.rotation.x = Math.PI / 2; ring.position.set(sx, Y0 + .08, sz + .15); R.group.add(ring);
    const hit = new THREE.Mesh(G.box, TH.hitMat); hit.scale.set(1.9, 2.4, 2.4); hit.position.set(sx, Y0 + 1.2, sz + .1); hit.userData = { k, ri: gi }; R.group.add(hit); PICK.push(hit);
    const a = { k, ri: gi, ...A, sm, glow, gm, ring, rm, sx, sz, ph: (hash(k) % 628) / 100, st: 'idle', level: 0, flash: 0, calls: 0, act: '', x: 0, z: 0, wx: sx, wz: sz };
    R.agents.push(a); AG[k] = a;
  });
  const lamp = new THREE.Mesh(G.sph, new THREE.MeshBasicMaterial({ color: '#fff3c4' })); lamp.scale.setScalar(.2); lamp.position.set(-S / 2 + .85, Y0 + 1.8, -S / 2 + .85); R.group.add(lamp);
  const lg = new THREE.Sprite(new THREE.SpriteMaterial({ map: TH.glow, color: '#ffd98a', transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending })); lg.scale.setScalar(2.2); lg.position.copy(lamp.position); R.group.add(lg);
  const st = b.mesh(); R.group.add(st);
  const slab = new THREE.Mesh(G.box, new THREE.MeshStandardMaterial({ color: floor, roughness: .8 })); slab.scale.set(S, .9, S); slab.position.y = Y0 - .45; slab.receiveShadow = true; slab.castShadow = true; slab.userData = { ri: gi, slab: true }; R.group.add(slab); R.slab = slab;
  const vol = new THREE.Mesh(G.box, TH.hitMat); vol.scale.set(S, 3.4, S); vol.position.y = Y0 + 1.5; vol.userData = { ri: gi, room: true }; R.group.add(vol); PICK.push(vol, slab);
  return R;
}

/* ---------- побудова сцени ---------- */
function buildScene() {
  scene = new THREE.Scene(); scene.fog = new THREE.Fog('#0a0c18', 70, 150);
  G.box = new THREE.BoxGeometry(1, 1, 1); G.cyl = new THREE.CylinderGeometry(1, 1, 1, 12); G.sph = new THREE.SphereGeometry(1, 14, 10); G.ico = new THREE.IcosahedronGeometry(1, 0); G.oct = new THREE.OctahedronGeometry(1, 0); G.plane = new THREE.PlaneGeometry(1, 1); G.torus = new THREE.TorusGeometry(1.15, .07, 6, 40);
  TH.vcMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .75, metalness: .03 });
  TH.glow = glowTex(); TH.scr = screenTex(); TH.hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const cache = {}, std = (c, r = .6) => cache[c + r] || (cache[c + r] = new THREE.MeshStandardMaterial({ color: c, roughness: r }));
  TH.skin = c => std(c, .65); TH.hair = c => std(c, .8); TH.pants = std('#2b2f45', .8); TH.shoe = std('#e9ecf3', .6); TH.dark = new THREE.MeshBasicMaterial({ color: '#171a26' });
  scene.add(new THREE.HemisphereLight('#c7d2ff', '#252a48', 1.05));
  sun = new THREE.DirectionalLight('#fff4e0', 1.3); sun.position.set(14, 30, 18); sun.castShadow = true; scene.add(sun, sun.target);
  // зірки
  const sp = [], sc = []; for (let i = 0; i < 1100; i++) { const r = 55 + Math.random() * 90, a = Math.random() * 6.283, y = (Math.random() - .5) * 90 - 6; sp.push(Math.cos(a) * r, y, Math.sin(a) * r); const k = .45 + Math.random() * .55, t = Math.random(); sc.push(k * (.85 + t * .15), k * .9, k * (1 - t * .2)); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); sg.setAttribute('color', new THREE.Float32BufferAttribute(sc, 3));
  starP = new THREE.Points(sg, new THREE.PointsMaterial({ fog: false, size: .5, vertexColors: true, transparent: true, opacity: .85, depthWrite: false })); scene.add(starP);
  // кімнати по колу; радіус добираємо так, щоб кімнати не перетиналися
  ROOMS = officeGroups().map((g, i) => buildRoom(g, i)); const N = ROOMS.length, m = N > 6 ? 5.5 : 1.6;
  SMAX = Math.max(7, ...ROOMS.map(r => r.S));
  let R = 8; const place = () => ROOMS.forEach((r, i) => { const a = Math.PI / 4 + 2 * Math.PI * i / N; r.x = Math.cos(a) * R; r.z = Math.sin(a) * R; r.a = a; });
  for (let it = 0; it < 200; it++) { place(); let ok = ROOMS.every(r => Math.max(Math.abs(r.x), Math.abs(r.z)) - r.S / 2 > HUB_R * .75 && Math.hypot(r.x, r.z) - r.S * .62 > HUB_R + .8);
    for (let i = 0; ok && i < N; i++) for (let j = i + 1; j < N; j++) { const a = ROOMS[i], c = ROOMS[j]; if (Math.abs(a.x - c.x) < (a.S + c.S) / 2 + m && Math.abs(a.z - c.z) < (a.S + c.S) / 2 + m) { ok = false; break; } }
    if (ok) break; R += .3; }
  if (N === 1) { ROOMS[0].x = R; ROOMS[0].z = R * .2; }
  ROOMS.forEach(r => { r.group.position.set(r.x, 0, r.z); scene.add(r.group); r.dist = Math.hypot(r.x, r.z); });
  Rs = Math.max(...ROOMS.map(r => r.dist + r.S * .72), HUB_R + 2); sun.shadow.camera.left = sun.shadow.camera.bottom = -Rs - 2; sun.shadow.camera.right = sun.shadow.camera.top = Rs + 2; sun.shadow.camera.near = 5; sun.shadow.camera.far = 90; sun.shadow.bias = -.0006; sun.shadow.normalBias = .04; sun.shadow.radius = 2.5;
  buildHub(); buildRoutes(); camera = new THREE.PerspectiveCamera(FOV, 1.6, 1, 400);
}
function buildHub() {
  hubG = new THREE.Group(); scene.add(hubG); const add = (m, y = 0) => { m.position.y = y; hubG.add(m); return m; };
  const base = new THREE.Mesh(G.cyl, new THREE.MeshStandardMaterial({ color: '#20243b', roughness: .6 })); base.scale.set(HUB_R, .6, HUB_R); base.receiveShadow = true; add(base, .1);
  const under = new THREE.Mesh(G.cyl, new THREE.MeshStandardMaterial({ color: '#13162a', roughness: .9 })); under.scale.set(HUB_R * .82, 1.2, HUB_R * .82); add(under, -.7);
  const bm = c => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .9, depthWrite: false, blending: THREE.AdditiveBlending });
  const ring = (r, t, c, o) => { const m = new THREE.Mesh(new THREE.TorusGeometry(r, t, 8, 72), bm(c)); m.rotation.x = Math.PI / 2; m.material.opacity = o; return m; };
  HUBPARTS.rings = [add(ring(HUB_R - .15, .07, '#7fd8ff', .95), .42), add(ring(3.5, .05, '#5aa7ff', .7), .43), add(ring(2.6, .06, '#9be7ff', .85), .44), add(ring(1.7, .05, '#7fd8ff', .6), .45)];
  const disc = new THREE.Mesh(G.plane, new THREE.MeshBasicMaterial({ map: TH.glow, color: '#4cc2ff', transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending })); disc.rotation.x = -Math.PI / 2; disc.scale.setScalar(HUB_R * 2.3); add(disc, .46);
  const ped = new THREE.Mesh(G.cyl, new THREE.MeshStandardMaterial({ color: '#2c3354', roughness: .4, metalness: .3 })); ped.scale.set(1.1, .5, 1.1); ped.castShadow = true; add(ped, .65);
  HUBPARTS.core = add(new THREE.Mesh(G.sph, new THREE.MeshBasicMaterial({ color: '#d6f2ff' })), 2.3); HUBPARTS.core.scale.setScalar(.85);
  HUBPARTS.cage = add(new THREE.Mesh(new THREE.IcosahedronGeometry(1.7, 1), new THREE.MeshBasicMaterial({ color: '#7fd8ff', wireframe: true, transparent: true, opacity: .4, depthWrite: false })), 2.3);
  HUBPARTS.cage2 = add(new THREE.Mesh(new THREE.IcosahedronGeometry(1.25, 0), new THREE.MeshBasicMaterial({ color: '#c8b6ff', wireframe: true, transparent: true, opacity: .5, depthWrite: false })), 2.3);
  HUBPARTS.orb = add(new THREE.Mesh(new THREE.TorusGeometry(2.2, .035, 6, 64), bm('#9be7ff')), 2.3); HUBPARTS.orb.rotation.x = 1.2;
  HUBPARTS.orb2 = add(new THREE.Mesh(new THREE.TorusGeometry(2.0, .03, 6, 64), bm('#c8b6ff')), 2.3); HUBPARTS.orb2.rotation.set(.4, 0, 1.0);
  HUBPARTS.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: TH.glow, color: '#6cc8ff', transparent: true, opacity: .8, depthWrite: false, blending: THREE.AdditiveBlending })); HUBPARTS.halo.scale.setScalar(8); add(HUBPARTS.halo, 2.3);
  HUBPARTS.beam = new THREE.Mesh(G.cyl, new THREE.MeshBasicMaterial({ color: '#9be7ff', transparent: true, opacity: .16, depthWrite: false, blending: THREE.AdditiveBlending })); HUBPARTS.beam.scale.set(.22, 13, .22); add(HUBPARTS.beam, 8.5);
  HUBPARTS.pulse = [0, 1].map(() => { const m = ring(1, .04, '#8fe0ff', 0); m.position.y = .5; hubG.add(m); return m; });
}
function buildRoutes() {
  ROUTES = []; const rb = new Batch();
  ROOMS.forEach(r => {
    const d = new THREE.Vector3(r.x, 0, r.z).normalize(), len = r.dist - HUB_R * .8, cx = d.x * (HUB_R * .8 + len / 2), cz = d.z * (HUB_R * .8 + len / 2), ry = -Math.atan2(d.z, d.x);
    rb.box('#2a2e47', cx, .16, cz, len, .1, 1.5, ry); for (let u = 1.4; u < len - .5; u += 1.1) { const px = d.x * (HUB_R * .8 + u), pz = d.z * (HUB_R * .8 + u); rb.box('#6a7396', px, .22, pz, .5, .02, .08, ry); }
    const end = new THREE.Vector3(r.x - d.x * r.S * .18, Y0 + 1.8, r.z - d.z * r.S * .18), curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 2.3, 0), new THREE.Vector3(r.x * .5, 4.4, r.z * .5), end]);
    const mat = new THREE.MeshBasicMaterial({ color: r.col, transparent: true, opacity: .25, depthWrite: false, blending: THREE.AdditiveBlending });
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, .035, 6, false), mat); scene.add(tube);
    const sm = new THREE.SpriteMaterial({ map: TH.glow, color: r.col, transparent: true, opacity: .9, depthWrite: false, blending: THREE.AdditiveBlending });
    const sprites = [0, 1, 2, 3].map(() => { const s = new THREE.Sprite(sm); s.scale.setScalar(.9); scene.add(s); return s; });
    const wm = new THREE.MeshStandardMaterial({ color: r.col, roughness: .6 }), walker = new THREE.Group(), wb = new THREE.Mesh(G.cyl, wm), wh = new THREE.Mesh(G.sph, TH.skin(SKIN[r.gi % SKIN.length]));
    wb.scale.set(.17, .5, .13); wb.position.y = .45; wh.scale.setScalar(.14); wh.position.y = .86; walker.add(wb, wh); walker.traverse(o => { o.castShadow = true; }); walker.visible = false; scene.add(walker);
    ROUTES.push({ r, d, curve, mat, sm, sprites, walker, len, u: Math.random(), wu: Math.random(), dir: 1, int: .1, boost: 0 });
  });
  const rm = rb.mesh(); rm.castShadow = false; scene.add(rm);
}

/* ---------- інтерфейс: підписи-бейджі, список, мінімапа, тости ---------- */
const svgI = k => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + (B.ICON_D[k] || B.ICON_D.other) + '"/></svg>';
const gname = g => B.gLbl(g);
function buildUI() {
  const t = B.t, tn = B.tn, esc = B.esc; lastLang = B.I.lang; lastSig = sigOf();
  lbls.innerHTML = ''; lbls.classList.toggle('cmp', ROOMS.length > 6); ROOMS.forEach(r => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'ofb'; b.tabIndex = -1; b.style.setProperty('--oc', r.col); r.badge = b; b.dataset.ri = r.gi;
    b.innerHTML = '<span class="oi">' + svgI(r.grp.icon || r.grp.id) + '</span><span class="ot"><b></b><span><i></i><em></em></span></span><span class="pills"></span>'; r.bT = b.querySelector('b'); r.bS = b.querySelector('em'); r.bP = b.querySelector('.pills'); lbls.appendChild(b);
  });
  const hb = document.createElement('div'); hb.className = 'ofb hub'; hb.innerHTML = '<b></b><span></span>'; hb.querySelector('b').textContent = t('office.hub'); lbls.appendChild(hb); TH.hubL = hb; TH.hubS = hb.querySelector('span');
  // доступний текстовий список
  listEl.innerHTML = ''; listEl.setAttribute('aria-label', t('office.list.aria'));
  ROOMS.forEach(r => {
    const li = document.createElement('li'); li.style.setProperty('--oc', r.col);
    li.innerHTML = '<button type="button" class="rb" data-ri="' + r.gi + '"><span></span><small></small></button><ul></ul>'; r.lb = li.querySelector('.rb'); r.lbN = li.querySelector('span'); r.lbS = li.querySelector('small');
    const ul = li.querySelector('ul'); r.agents.forEach(a => { const l = document.createElement('li'); l.innerHTML = '<button type="button" class="ab2" data-k="' + esc(a.k) + '"><span class="dot"></span><span class="n"></span><em></em></button>'; a.lbtn = l.firstChild; a.lN = l.querySelector('.n'); a.lS = l.querySelector('em'); a.lD = l.querySelector('.dot'); ul.appendChild(l); });
    listEl.appendChild(li);
  });
  legEl.textContent = t('office.legend'); mapHd.firstChild.textContent = t('office.map'); mapEl.setAttribute('aria-label', t('office.map.aria')); toastEl.setAttribute('aria-label', t('office.toasts.aria'));
  cv.setAttribute('aria-label', t('office.canvas.aria')); box.setAttribute('aria-label', t('office.aria'));
  ctl.querySelectorAll('[data-a]').forEach(b => { const k = { in: 'zoom.in', out: 'zoom.out', reset: 'office.reset', fs: 'fs.enter' }[b.dataset.a]; b.title = t(k); b.setAttribute('aria-label', t(k)); });
  // мінімапа
  mapBox.querySelectorAll('i').forEach(e => e.remove()); ROOMS.forEach(r => { const i = document.createElement('i'); i.style.setProperty('--oc', r.col); i.dataset.ri = r.gi; i.title = gname(r.grp); mapBox.insertBefore(i, mapVw); r.mapI = i; }); const hi = document.createElement('i'); hi.className = 'hub'; mapBox.insertBefore(hi, mapVw); TH.mapHub = hi;
  mapUpdate(); lastTxt = ''; refreshText(true);
}
const sigOf = () => B.I.lang + '|' + ROOMS.map(r => r.grp.id + ':' + r.agents.map(a => a.k).join(',')).join(';');
let lastTxt = '';
function pill(a) { return '<u class="' + (a.st === 'run' ? 'on' : a.st === 'fail' ? 'fail' : a.st === 'idle' ? 'idle' : '') + '" style="--pc:' + hex(a.shirt) + ';--sk:' + SKIN[hash(a.k) % SKIN.length] + '"></u>'; }
const BG = { run: 0, fail: 1, done: 2, idle: 3 };
function refreshText(force) {
  const t = B.t, tn = B.tn, nf = B.I.nf; let tx = [];
  ROOMS.forEach(r => {
    const n = r.agents.length, m = r.agents.filter(a => a.st === 'run').length, f = r.agents.some(a => a.st === 'fail'), s1 = tn('office.agents', n), s2 = tn('office.running', m);
    r.run = m; tx.push(r.gi, m, f ? 1 : 0, r.agents.map(a => a.st).join(''));
    const name = gname(r.grp); if (force || r.bT.textContent !== name) { r.bT.textContent = name; r.lbN.textContent = name; }
    const sub = s1 + ' · ' + s2; if (force || r.bS.textContent !== sub) { r.bS.textContent = sub; r.lbS.textContent = sub; r.badge.setAttribute('aria-label', t('office.room.aria', { name, a: s1, r: s2 })); r.lb.setAttribute('aria-label', t('office.room.aria', { name, a: s1, r: s2 })); }
    r.badge.classList.toggle('on', m > 0); r.badge.classList.toggle('bad', f);
    const top = [...r.agents].sort((a, b) => BG[a.st] - BG[b.st]).slice(0, 3); r.bP.innerHTML = top.map(pill).join('') + (n > 3 ? '<u style="--pc:#3a4160;--sk:#3a4160" title="+' + (n - 3) + '"></u>' : '');
    r.agents.forEach(a => { const nm = B.lbl(a.k); if (force || a.lN.textContent !== nm) a.lN.textContent = nm; const st = B.SL[a.st] || a.st; if (a.lS.textContent !== st) a.lS.textContent = st;
      a.lbtn.className = 'ab2 st-' + a.st + (listHover === a.k ? ' hv' : ''); a.lD.className = 'dot' + (a.st === 'run' ? ' run' : a.st === 'done' ? ' done' : a.st === 'fail' ? ' fail' : ''); a.lbtn.setAttribute('aria-label', nm + ' (' + a.k + '): ' + st + (a.act ? ', ' + a.act : '')); });
    if (r.mapI) r.mapI.classList.toggle('on', m > 0);
  });
  const C = B.C, calls = ROOMS.reduce((s, r) => s + r.agents.reduce((x, a) => x + a.calls, 0), 0) + (C ? B.statOf('orchestrator').calls : 0), ev = B.EV.length;
  const hs = tn('office.calls', calls, { n: nf(calls) }) + ' · ' + tn('office.events', ev, { n: nf(ev) }); if (TH.hubS.textContent !== hs) TH.hubS.textContent = hs;
  TH.hubL.firstChild.textContent = t('office.hub');
}

/* ---------- синхронізація стану з мостом ---------- */
function sync() {
  const C = B.C; if (!C) return; lastC = C; const now = Date.now();
  for (const r of ROOMS) for (const a of r.agents) {
    const st = B.agentStatus(a.k), s = C.S[a.k]; if (a.st === 'run' && st === 'done') a.flash = now + 2600;
    a.st = st; a.calls = B.statOf(a.k).calls; a.act = (s && s.action) || '';
  }
  for (const rt of ROUTES) { const m = rt.r.agents.filter(a => a.st === 'run').length; rt.int = m ? Math.min(1, .55 + .2 * m) : (rt.boost > now ? .7 : .08); }
  refreshText(false); dirty = true;
}
export function onEvent(e) {
  if (!ROOMS.length) return; const k = B.norm(e.agent), a = AG[k], now = Date.now(); if (!a) return;
  const R = ROOMS[a.ri], rt = ROUTES[a.ri];
  if (e.event === 'SubagentStart') { rt.dir = 1; rt.boost = now + 4000; a.start = now; if (e.t > now - 20000 && active) toast(k, 'run', 'office.toast.start'); }
  else if (e.event === 'SubagentStop') { rt.dir = -1; rt.boost = now + 4000; a.flash = now + 2600; if (e.t > now - 20000 && active) toast(k, 'done', 'office.toast.stop'); }
  else if (e.event === 'PostToolUse' && e.ok === false && now - (a.lastFail || 0) > 8000) { a.lastFail = now; if (e.t > now - 20000 && active) toast(k, 'fail', 'office.toast.fail'); }
  else return; dirty = true; if (active) request();
}
function toast(k, kind, key) {
  const r = ROOMS[AG[k].ri], d = document.createElement('div'); d.className = 'oft ' + kind; d.style.setProperty('--oc', r.col);
  d.innerHTML = '<span class="oi">' + svgI(r.grp.icon || r.grp.id) + '</span><div><b></b><span></span></div>'; d.querySelector('b').textContent = B.t(key, { name: B.lbl(k) }); d.querySelector(':scope > div > span').textContent = gname(r.grp);
  toastEl.appendChild(d); while (toastEl.children.length > 3) toastEl.firstChild.remove();
  setTimeout(() => { d.classList.add('out'); setTimeout(() => d.remove(), 400); }, 4500);
}

/* ---------- камера ---------- */
function fit() {
  // дистанція, при якій усі кімнати (кути підлоги й верхів стін, з запасом під бейджі) вміщаються в кадр при типовому ракурсі
  aspect = W / H; camera.aspect = aspect; camera.updateProjectionMatrix(); const pts = [];
  for (const r of ROOMS) for (const sx of [-1, 1]) for (const sz of [-1, 1]) { pts.push([r.x + sx * r.S / 2, -.5, r.z + sz * r.S / 2], [r.x + sx * r.S / 2, 3.6, r.z + sz * r.S / 2]); pts.push([r.x, 6.3, r.z]); }
  for (let k = 0; k < 8; k++) pts.push([Math.cos(k * .785) * HUB_R, 0, Math.sin(k * .785) * HUB_R]); pts.push([0, 8, 0]);
  let d = 80; const ce = Math.cos(EL0);
  for (let it = 0; it < 6; it++) {
    camera.position.set(d * ce * Math.cos(AZ0), 1 + d * Math.sin(EL0), d * ce * Math.sin(AZ0)); camera.lookAt(0, 1, 0); camera.updateMatrixWorld(); let mx = 0, my = 0;
    for (const p of pts) { _v.set(p[0], p[1], p[2]).project(camera); mx = Math.max(mx, Math.abs(_v.x)); my = Math.max(my, Math.abs(_v.y)); }
    d *= Math.max(mx, my) / .94;
  }
  dFit = d;
}
function placeCam() {
  const d = dFit / cam.z, ce = Math.cos(cam.el); camera.position.set(cam.tx + d * ce * Math.cos(cam.az), 1 + d * Math.sin(cam.el), cam.tz + d * ce * Math.sin(cam.az)); camera.lookAt(cam.tx, 1, cam.tz);
  sun.position.set(cam.tx + 14, 30, cam.tz + 18); sun.target.position.set(cam.tx, 0, cam.tz); sun.target.updateMatrixWorld();
}
function setView(o, snap) { if (o.az != null) cam.taz = clamp(o.az, AZ0 - .55, AZ0 + .55); if (o.el != null) cam.tel = clamp(o.el, .42, 1.2); if (o.zoom != null) cam.tzm = clamp(o.zoom, .55, 4); if (o.x != null) { const L = Rs * .95, h = Math.hypot(o.x, o.z); const k = h > L ? L / h : 1; cam.ttx = o.x * k; cam.ttz = o.z * k; } if (snap || reduced) { cam.az = cam.taz; cam.el = cam.tel; cam.z = cam.tzm; cam.tx = cam.ttx; cam.tz = cam.ttz; } request(); }
function focusRoom(i) {
  if (i < 0 || i >= ROOMS.length) { selRoom = -1; setView({ x: 0, z: 0, zoom: 1, az: AZ0, el: EL0 }); applyRoomSel(); return; }
  const r = ROOMS[i], tg = Math.tan(FOV * Math.PI / 360), d = Math.max(r.S * 1.4 / (2 * tg * aspect), (r.S * .85 + 3.5) / (2 * tg));
  selRoom = i; setView({ x: r.x, z: r.z, zoom: dFit / d }); applyRoomSel();
}
function applyRoomSel() { ROOMS.forEach((r, i) => { r.badge.classList.toggle('sel', i === selRoom); r.lb.classList.toggle('sel', i === selRoom); r.lb.setAttribute('aria-pressed', i === selRoom); }); }
function stepCam(dt) {
  const k = reduced ? 1 : 1 - Math.pow(.0008, dt); let mv = false; const f = (a, b) => { const d = b - a; if (Math.abs(d) < 1e-4) return b; mv = true; return a + d * k; };
  cam.az = f(cam.az, cam.taz); cam.el = f(cam.el, cam.tel); cam.z = f(cam.z, cam.tzm); cam.tx = f(cam.tx, cam.ttx); cam.tz = f(cam.tz, cam.ttz); return mv;
}

/* ---------- мінімапа ---------- */
function mapUpdate() {
  const w = mapBox.clientWidth || 116, h = mapBox.clientHeight || 84, s = Math.min(w, h * 1.45) / 2 / (Rs * 1.1), ca = Math.cos(cam.az), sa = Math.sin(cam.az);
  // екранні осі: праворуч = (sin az, -cos az), «вгору» (далі) = (-cos az, -sin az)
  const P = (x, z) => [w / 2 + (x * sa - z * ca) * s, h / 2 + (x * ca + z * sa) * s * .62];
  ROOMS.forEach(r => { const [x, y] = P(r.x, r.z); r.mapI.style.left = x + 'px'; r.mapI.style.top = y + 'px'; }); const [hx, hy] = P(0, 0); TH.mapHub.style.left = hx + 'px'; TH.mapHub.style.top = hy + 'px';
  const d = dFit / cam.z, tg = Math.tan(FOV * Math.PI / 360), vw = d * tg * aspect * .95, vh = d * tg / Math.max(.4, Math.sin(cam.el)) * .95, [cx, cy] = P(cam.tx, cam.tz);
  const x0 = clamp(cx - vw * s, 0, w), x1 = clamp(cx + vw * s, 0, w), y0 = clamp(cy - vh * s * .62, 0, h), y1 = clamp(cy + vh * s * .62, 0, h);
  Object.assign(mapVw.style, { left: x0 + 'px', top: y0 + 'px', width: Math.max(0, x1 - x0) + 'px', height: Math.max(0, y1 - y0) + 'px' });
  mapHd.lastChild.textContent = Math.round(cam.z * 100) + '%';
}

/* ---------- підказка й вибір об'єктів ---------- */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function pickAt(cx, cy) {
  const rc = cv.getBoundingClientRect(); ndc.set((cx - rc.left) / rc.width * 2 - 1, -((cy - rc.top) / rc.height) * 2 + 1); ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(PICK, false); let room = null; for (const h of hits) { const u = h.object.userData; if (u.k) return { k: u.k }; if (!room) room = { ri: u.ri }; } return room;
}
function showTip(p, x, y) {
  if (!p || !B.C) { tipEl.hidden = true; return; } const t = B.t, esc = B.esc; let h = '';
  if (p.k) { const a = AG[p.k], cv2 = B.cardVals(p.k), st = a.st; h = '<b>' + esc(B.lbl(p.k)) + ' <span class="mono">' + esc(p.k) + '</span></b><div>' + esc(B.descOf(p.k)) + '</div><span><i class="dot ' + st + '" style="display:inline-block;margin-right:6px"></i>' + esc(B.SL[st]) + (cv2.dur ? ' · ' + esc(cv2.dur) : '') + '</span><span>' + esc(t('office.tip.last')) + ': ' + esc(a.act || t('office.tip.none')) + '</span><span>' + esc(t('sx.m.calls')) + ': ' + a.calls + ' · ' + esc(t('sx.m.runs')) + ': ' + cv2.runs + '</span><span>' + esc(t('office.tip.open')) + '</span>'; }
  else { const r = ROOMS[p.ri], run = r.agents.filter(a => a.st === 'run'); h = '<b>' + esc(gname(r.grp)) + '</b><span>' + esc(B.tn('office.agents', r.agents.length) + ' · ' + B.tn('office.running', run.length)) + '</span>' + (run.length ? '<div>' + esc(run.map(a => B.lbl(a.k)).join(', ')) + '</div>' : '') + '<span>' + esc(t('office.tip.room')) + '</span>'; }
  tipEl.innerHTML = h; tipEl.hidden = false; const tw = tipEl.offsetWidth, th = tipEl.offsetHeight; tipEl.style.left = Math.min(innerWidth - tw - 8, Math.max(8, x + 14)) + 'px'; tipEl.style.top = Math.min(innerHeight - th - 8, y + 16) + 'px';
}

/* ---------- анімація й рендер ---------- */
function update(t, dt) {
  const now = Date.now(), an = !reduced;
  for (const r of ROOMS) {
    const rh = hovRoom === r.gi || selRoom === r.gi; r.slab.material.emissive.setRGB(rh ? .05 : 0, rh ? .05 : 0, rh ? .05 : 0);
    for (const a of r.agents) {
      const fl = a.flash > now, sel = B.panelOpen && B.sel === a.k, hv = hov === a.k || listHover === a.k, run = a.st === 'run', fail = a.st === 'fail', tgt = run ? 1 : fl ? .8 : fail ? .9 : 0;
      a.level += (tgt - a.level) * (an ? Math.min(1, dt * 5) : 1); const lv = a.level, col = fail ? ST_COL.fail : (fl && !run) ? ST_COL.done : ST_COL.run;
      // приглушення неактивних: колір сорочки і екран
      const dim = run || fl || fail ? 1 : a.st === 'done' ? .78 : .5; a.shirtMat.color.copy(a.shirt).lerp(_gray, 1 - dim).multiplyScalar(.55 + .45 * dim);
      a.shirtMat.emissive.set(col).multiplyScalar(lv * .32 + (hv || sel ? .12 : 0));
      a.sm.color.set(fail ? '#ff6b6b' : run ? '#ffffff' : fl ? '#9dffc0' : a.st === 'done' ? '#4a7a78' : '#2a3a4a').multiplyScalar(.75 + lv * .5 + (an && run ? Math.sin(t * 7 + a.ph) * .08 : 0));
      if (an && run) a.sm.map.offset.y = (a.sm.map.offset.y - dt * .35) % 1;
      a.gm.color.set(col); a.gm.opacity = lv * (.55 + (an ? Math.sin(t * 3 + a.ph) * .12 : 0)) + (hv || sel ? .28 : 0) * (1 - lv * .3) + (fl && !run ? .3 * Math.max(0, (a.flash - now) / 2600) : 0);
      a.rm.color.set(col); a.rm.opacity = clamp(lv * .95 + (hv || sel ? .5 : 0), 0, 1); a.ring.visible = a.rm.opacity > .02; if (an && run) a.ring.scale.setScalar(1 + Math.sin(t * 4 + a.ph) * .06);
      a.marker.visible = lv > .05 || sel; a.markMat.color.set(sel && lv < .05 ? '#ffffff' : col); a.marker.position.y = 2.25 + (an ? Math.sin(t * 3 + a.ph) * .08 : 0); a.marker.rotation.y = an ? t * 2.2 : 0;
      if (an) {
        const ty = run ? Math.sin(t * 15 + a.ph) : 0; a.arms[0].rotation.x = -.5 + (run ? ty * .09 : Math.sin(t * 1.2 + a.ph) * .01); a.arms[1].rotation.x = -.5 + (run ? Math.cos(t * 15 + a.ph) * .09 : Math.sin(t * 1.2 + a.ph) * .01);
        a.head.rotation.y = Math.sin(t * (run ? .9 : .4) + a.ph) * (run ? .16 : .1); a.head.rotation.x = run ? Math.sin(t * 2.1 + a.ph) * .05 : 0; a.head.rotation.z = fail ? Math.sin(t * 25) * .06 : 0;
        a.torso.position.y = .72 + (run ? Math.abs(Math.sin(t * 7.5 + a.ph)) * .012 : Math.sin(t * 1.5 + a.ph) * .004); a.g.position.y = Y0 + (fl && !run ? Math.max(0, Math.sin(t * 14)) * .06 : 0);
      } else { a.arms[0].rotation.x = a.arms[1].rotation.x = -.5; }
    }
  }
  // хаб і маршрути
  const act = ROUTES.reduce((s, x) => s + x.int, 0) / Math.max(1, ROUTES.length), ob = B.C && B.C.S.orchestrator && B.C.S.orchestrator.status === 'run';
  const pw = clamp(.35 + act * 1.2 + (ob ? .5 : 0), .35, 1.6); HUBPARTS.core.scale.setScalar(.85 + (an ? Math.sin(t * 2.2) * .05 * pw : 0)); HUBPARTS.halo.material.opacity = .45 + pw * .3;
  HUBPARTS.beam.material.opacity = .08 + pw * .1;
  if (an) { HUBPARTS.cage.rotation.y = t * .25; HUBPARTS.cage.rotation.x = t * .12; HUBPARTS.cage2.rotation.y = -t * .4; HUBPARTS.orb.rotation.z = t * .6; HUBPARTS.orb2.rotation.y = t * .5; HUBPARTS.rings[1].rotation.z = t * .1; HUBPARTS.rings[3].rotation.z = -t * .2;
    HUBPARTS.pulse.forEach((m, i) => { const u = ((t * (.3 + act * .5) + i * .5) % 1); m.scale.setScalar(1 + u * (HUB_R - 1)); m.material.opacity = (1 - u) * .5 * pw; });
    if (starP) starP.rotation.y = t * .004; }
  for (const rt of ROUTES) {
    const act2 = rt.int > .3, sp = (.18 + rt.int * .4); rt.mat.opacity = .14 + rt.int * .5 + (hovRoom === rt.r.gi || selRoom === rt.r.gi ? .15 : 0); rt.sm.opacity = clamp(.15 + rt.int, 0, 1);
    rt.sprites.forEach((s, i) => { const k = an ? ((t * sp + i / 4) % 1) : (i + .5) / 4, u = rt.dir > 0 ? k : 1 - k; rt.curve.getPoint(u, _v); s.position.copy(_v); s.visible = act2 || i === 0 || rt.int > .2; s.scale.setScalar(.5 + rt.int * .6); });
    rt.walker.visible = act2 && an; if (rt.walker.visible) { const u = (t * (.06 + rt.int * .05) + rt.wu) % 1, uu = rt.dir > 0 ? u : 1 - u, d = HUB_R * .85 + uu * (rt.len - 1.2); rt.walker.position.set(rt.d.x * d - rt.d.z * .35, .21 + Math.abs(Math.sin(t * 9)) * .05, rt.d.z * d + rt.d.x * .35); rt.walker.rotation.y = -Math.atan2(rt.d.z, rt.d.x) + (rt.dir > 0 ? -Math.PI / 2 : Math.PI / 2); }
  }
}
const _gray = new THREE.Color('#8a8f9c');
function labels() {
  const w = W, h = H, put = (el, x, y, z, dy = 0) => { _v.set(x, y, z).project(camera); const sx = (_v.x * .5 + .5) * w, sy = (-_v.y * .5 + .5) * h; el.style.transform = 'translate(' + Math.round(sx) + 'px,' + Math.round(sy + dy) + 'px) translate(-50%,-100%)'; el.style.zIndex = 1000 - Math.floor((_v.z + 1) * 500); };
  ROOMS.forEach(r => put(r.badge, r.x - r.S * .5, Y0 + WALL_H + .9, r.z - r.S * .5, 0)); put(TH.hubL, 0, 3.2, 0);
}
function resize() {
  if (!glOk) return; const r = stage.getBoundingClientRect(); W = Math.max(200, Math.round(r.width)); H = Math.max(200, Math.round(r.height));
  const dpr = Math.min(window.devicePixelRatio || 1, 2, W < 520 ? 1.5 : 2); renderer.setPixelRatio(dpr); renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix(); fit(); dirty = true; request();
}
function frame(ts) {
  raf = 0; if (!glOk || !active || !visible || document.hidden) return; const t = ts / 1000, dt = Math.min(.1, lastT ? t - lastT : .016); lastT = t;
  if (B.C && B.C !== lastC) sync();
  const mv = stepCam(dt); if (mv || dirty) mapUpdate(); placeCam(); update(t, dt); labels(); renderer.render(scene, camera); dirty = false;
  if (!reduced) raf = requestAnimationFrame(frame); else if (mv) raf = requestAnimationFrame(frame);
}
function request() { if (!raf && active && glOk) raf = requestAnimationFrame(frame); }
export function setActive(on) { active = !!on; if (!inited || !glOk) return; if (active) { lastT = 0; if (B.C) sync(); resize(); request(); startTimer(); } else { cancelAnimationFrame(raf); raf = 0; tipEl.hidden = true; } }
let inited = false;
function startTimer() { if (syncT) return; syncT = setInterval(() => { if (!active) return; if (B.C && B.C !== lastC) { sync(); request(); } if (lastLang !== B.I.lang) { buildUI(); request(); } }, 1000); }

/* ---------- введення: орбіта, зсув, масштаб, вибір ---------- */
function bindInput() {
  const ptrs = new Map(); let down = null, drag = false, pinch = 0, hoverRaf = 0, hx = 0, hy = 0;
  cv.addEventListener('pointerdown', e => { try { cv.setPointerCapture(e.pointerId); } catch {} ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); down = { x: e.clientX, y: e.clientY, t: performance.now(), btn: e.button, shift: e.shiftKey, moved: false }; drag = false; if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); } });
  cv.addEventListener('pointermove', e => {
    const p = ptrs.get(e.pointerId);
    if (!p) { hx = e.clientX; hy = e.clientY; if (e.pointerType !== 'touch' && !hoverRaf) hoverRaf = requestAnimationFrame(() => { hoverRaf = 0; hoverAt(hx, hy); }); return; }
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) { down.moved = true; if (!drag) { drag = true; cv.classList.add('drag'); tipEl.hidden = true; } }
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch) setView({ zoom: cam.tzm * d / pinch }); pinch = d; pan(dx / 2, dy / 2); }
    else if (drag) { if (down.btn === 2 || down.btn === 1 || down.shift) pan(dx, dy); else setView({ az: cam.taz - dx * .006, el: cam.tel + dy * .005 }); }
  });
  const end = e => { const had = ptrs.delete(e.pointerId); if (!had) return; pinch = 0; cv.classList.remove('drag'); if (down && !down.moved && performance.now() - down.t < 600 && e.type === 'pointerup' && ptrs.size === 0 && down.btn === 0) click(e.clientX, e.clientY); if (!ptrs.size) down = null; };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  cv.addEventListener('pointerleave', () => { hov = null; hovRoom = -1; tipEl.hidden = true; cv.classList.remove('pick'); dirty = true; request(); });
  cv.addEventListener('wheel', e => { e.preventDefault(); setView({ zoom: cam.tzm * Math.exp(-e.deltaY * (e.ctrlKey ? .01 : .0014)) }); }, { passive: false });
  cv.addEventListener('contextmenu', e => e.preventDefault()); cv.addEventListener('dblclick', () => focusRoom(-1));
  cv.addEventListener('keydown', e => {
    const k = e.key, st = .08; let h = true;
    if (k === 'ArrowLeft') setView({ az: cam.taz - st }); else if (k === 'ArrowRight') setView({ az: cam.taz + st }); else if (k === 'ArrowUp') setView({ el: cam.tel + st }); else if (k === 'ArrowDown') setView({ el: cam.tel - st });
    else if (k === '+' || k === '=') setView({ zoom: cam.tzm * 1.2 }); else if (k === '-' || k === '_') setView({ zoom: cam.tzm / 1.2 }); else if (k === '0') focusRoom(-1); else h = false; if (h) e.preventDefault();
  });
  function pan(dx, dy) { const d = dFit / cam.z, wpp = 2 * d * Math.tan(FOV * Math.PI / 360) / H, ca = Math.cos(cam.az), sa = Math.sin(cam.az), sn = Math.max(.4, Math.sin(cam.el)); setView({ x: cam.ttx - sa * dx * wpp - ca * dy * wpp / sn, z: cam.ttz + ca * dx * wpp - sa * dy * wpp / sn }); }
  function hoverAt(x, y) { if (!active || drag) return; const p = pickAt(x, y), nk = p && p.k || null, nr = p ? (p.k ? AG[p.k].ri : p.ri) : -1; if (nk !== hov || nr !== hovRoom) { hov = nk; hovRoom = nr; dirty = true; request(); } cv.classList.toggle('pick', !!p); showTip(p, x, y); }
  function click(x, y) { const p = pickAt(x, y); if (!p) { return; } if (p.k) { B.openAgent(p.k, cv); } else focusRoom(selRoom === p.ri ? -1 : p.ri); }
}

/* ---------- ініціалізація ---------- */
export async function init(b, bridge) {
  B = bridge; box = b; reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  box.innerHTML = '<p class="ofmsg" id="ofMsg" aria-live="polite"></p><div class="ofstage"><canvas tabindex="0" role="group"></canvas><div class="oflbls" aria-hidden="true"></div><div class="ofctl"></div><div class="oftoasts" role="status" aria-live="polite"></div><div class="ofmap"><div class="mh"><span></span><span>100%</span></div><div class="mb"><div class="vw"></div></div></div><div class="fxtip" role="tooltip" hidden></div></div><ul class="oflist"></ul><p class="ofleg"></p>';
  stage = box.querySelector('.ofstage'); cv = stage.querySelector('canvas'); lbls = stage.querySelector('.oflbls'); ctl = stage.querySelector('.ofctl'); toastEl = stage.querySelector('.oftoasts'); mapEl = stage.querySelector('.ofmap'); mapBox = mapEl.querySelector('.mb'); mapVw = mapBox.querySelector('.vw'); mapHd = mapEl.querySelector('.mh'); tipEl = stage.querySelector('.fxtip'); listEl = box.querySelector('.oflist'); legEl = box.querySelector('.ofleg'); ofMsg = box.querySelector('#ofMsg');
  ctl.innerHTML = '<button type="button" class="btn" data-a="in">＋</button><button type="button" class="btn" data-a="out">－</button><button type="button" class="btn" data-a="reset">◎</button><button type="button" class="btn" data-a="fs"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 5V1h4M9 1h4v4M13 9v4H9M5 13H1V9"/></svg></button>';
  ctl.onclick = e => { const a = e.target.closest('[data-a]'); if (!a) return; const k = a.dataset.a; if (k === 'in') setView({ zoom: cam.tzm * 1.25 }); else if (k === 'out') setView({ zoom: cam.tzm / 1.25 }); else if (k === 'reset') focusRoom(-1); else document.getElementById('fsBtn').click(); };
  try {
    renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: 'high-performance' }); glOk = true;
  } catch (err) { glOk = false; }
  if (!glOk) { stage.hidden = true; mapEl.hidden = true; ofMsg.textContent = B.t('office.nogl'); buildFallbackList(); inited = true; return; }
  renderer.outputEncoding = THREE.sRGBEncoding; renderer.setClearColor(0x000000, 0); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  buildScene(); sun.shadow.mapSize.set(innerWidth < 700 ? 1024 : 2048, innerWidth < 700 ? 1024 : 2048);
  buildUI(); bindInput(); inited = true;
  listEl.addEventListener('click', e => { const r = e.target.closest('.rb'), a = e.target.closest('.ab2'); if (r) { const i = +r.dataset.ri; focusRoom(selRoom === i ? -1 : i); } else if (a) B.openAgent(a.dataset.k, a); });
  listEl.addEventListener('focusin', e => { const r = e.target.closest('.rb'), a = e.target.closest('.ab2'); if (r && r.matches(':focus-visible')) { const i = +r.dataset.ri; if (selRoom !== i) focusRoom(i); } if (a) { listHover = a.dataset.k; dirty = true; request(); } });
  listEl.addEventListener('focusout', () => { listHover = null; dirty = true; request(); });
  listEl.addEventListener('keydown', e => {
    const r = e.target.closest('.rb'), a = e.target.closest('.ab2'), rbs = [...listEl.querySelectorAll('.rb')]; let nx = null;
    if (r) { const i = rbs.indexOf(r); if (e.key === 'ArrowRight' || e.key === 'ArrowDown' && e.altKey) nx = rbs[(i + 1) % rbs.length]; else if (e.key === 'ArrowLeft') nx = rbs[(i - 1 + rbs.length) % rbs.length]; else if (e.key === 'ArrowDown') nx = r.parentElement.querySelector('.ab2'); else if (e.key === 'Home') nx = rbs[0]; else if (e.key === 'End') nx = rbs[rbs.length - 1]; }
    else if (a) { const all = [...a.closest('ul').querySelectorAll('.ab2')], i = all.indexOf(a); if (e.key === 'ArrowDown') nx = all[i + 1] || null; else if (e.key === 'ArrowUp') nx = all[i - 1] || a.closest('ul').previousElementSibling; else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const ri = rbs.indexOf(a.closest('ul').previousElementSibling), o = rbs[(ri + (e.key === 'ArrowRight' ? 1 : -1) + rbs.length) % rbs.length]; nx = e.key === 'ArrowRight' || true ? o : null; } }
    if (nx) { e.preventDefault(); nx.focus(); }
  });
  mapBox.addEventListener('click', e => { const i = e.target.closest('i[data-ri]'); if (i) focusRoom(+i.dataset.ri); });
  new ResizeObserver(() => { if (active) resize(); }).observe(stage);
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) request(); else { cancelAnimationFrame(raf); raf = 0; } }).observe(stage);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { lastT = 0; request(); } });
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', e => { reduced = e.matches; if (reduced) setView({}, true); dirty = true; request(); });
  fit(); setView({}, true); placeCam();
}
function buildFallbackList() {
  // без WebGL: лише доступний список агентів за групами (без 3D)
  ROOMS = officeGroups().map((g, i) => ({ gi: i, grp: g, col: PAL[i % PAL.length], agents: g.agents.map(k => ({ k, st: 'idle', calls: 0, act: '' })) }));
  TH.hubS = document.createElement('span'); TH.hubL = document.createElement('div'); TH.hubL.appendChild(document.createElement('b')); mapHd = { firstChild: {}, lastChild: {} }; legEl.textContent = '';
  listEl.innerHTML = ''; ROOMS.forEach(r => { const li = document.createElement('li'); li.style.setProperty('--oc', r.col); li.innerHTML = '<div class="rb" style="cursor:default"><span></span></div><ul></ul>'; li.querySelector('span').textContent = gname(r.grp); const ul = li.querySelector('ul');
    r.agents.forEach(a => { const l = document.createElement('li'); l.innerHTML = '<button type="button" class="ab2"><span class="dot"></span><span class="n"></span><em></em></button>'; l.querySelector('.n').textContent = B.lbl(a.k); l.firstChild.onclick = () => B.openAgent(a.k, l.firstChild); ul.appendChild(l); }); listEl.appendChild(li); });
}
export const getBridge = () => B;
