// View from the seat: a perspective scene generated from the map itself.
// Seat positions come from the map, row heights and the metres scale from its elevationModel,
// the playing surface from the surface_type_* artwork group. Nothing here is hand-modelled, so it
// works for any venue the 2D player can load. It is an impression, not a sightline guarantee:
// rails, pillars and roof structure are not in the data and are not drawn.
import * as THREE from './vendor/three.module.js';

const EYE = 1.3; // eye height above the row floor, metres: a little above a true seated height, so a front row on the ground looks over the boards into the game
const COLORS = { pick: 0x97dd62 };
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

let cached = null; // { map, world }
let open = null;

/* ---------- geometry helpers ---------- */

// Douglas-Peucker on a closed ring of {x,y}; section outlines arrive with a point every few centimetres.
function simplify(ring, eps) {
  let pts = ring;
  const a = pts[0], z = pts[pts.length - 1];
  if (pts.length > 1 && a.x === z.x && a.y === z.y) pts = pts.slice(0, -1);
  const n = pts.length;
  if (n < 8) return pts.slice();
  let far = 0, fd = -1;
  for (let i = 1; i < n; i++) { const d = (pts[i].x - a.x) ** 2 + (pts[i].y - a.y) ** 2; if (d > fd) { fd = d; far = i; } }
  const keep = new Uint8Array(n); keep[0] = keep[far] = 1;
  const run = (from, to) => {
    const stack = [[from, to]];
    while (stack.length) {
      const [i, j] = stack.pop(), A = pts[i % n], B = pts[j % n], dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy) || 1;
      let m = -1, md = eps;
      for (let k = i + 1; k < j; k++) { const P = pts[k % n], d = Math.abs((P.x - A.x) * dy - (P.y - A.y) * dx) / len; if (d > md) { md = d; m = k; } }
      if (m >= 0) { keep[m % n] = 1; stack.push([i, m], [m, j]); }
    }
  };
  run(0, far); run(far, n);
  return pts.filter((_, i) => keep[i]);
}

const bboxOf = (pts) => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const p of pts) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); } return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 }; };

const builder = () => ({ p: [], i: [], u: [] });
// one flat-shaded quad, vertices not shared with neighbours
function quad(g, a, b, c, d, u0 = 0, u1 = 1) { const o = g.p.length / 3; g.p.push(...a, ...b, ...c, ...d); g.u.push(u0, 0, u1, 0, u1, 1, u0, 1); g.i.push(o, o + 1, o + 2, o, o + 2, o + 3); }
// vertical band along a polyline of [x,z] points; y0/y1 may be numbers or per-point arrays; `tile` is the texture repeat in metres
function band(g, pts, y0, y1, closed = true, tile = 0) {
  const at = (y, i) => (Array.isArray(y) ? y[i] : y), n = pts.length; let run = 0;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const j = (i + 1) % n, a = pts[i], b = pts[j], from = run; run += Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (at(y1, i) - at(y0, i) < 0.01 && at(y1, j) - at(y0, j) < 0.01) continue;
    quad(g, [a[0], at(y0, i), a[1]], [b[0], at(y0, j), b[1]], [b[0], at(y1, j), b[1]], [a[0], at(y1, i), a[1]], tile ? from / tile : 0, tile ? run / tile : 1);
  }
}
// triangulated cap over a polygon of [x,z] points with a height per point
function cap(g, pts, y) {
  const o = g.p.length / 3, faces = THREE.ShapeUtils.triangulateShape(pts.map((p) => new THREE.Vector2(p[0], p[1])), []);
  pts.forEach((p, i) => { g.p.push(p[0], Array.isArray(y) ? y[i] : y, p[1]); g.u.push(0, 0); });
  for (const f of faces) g.i.push(o + f[0], o + f[1], o + f[2]);
}
function toGeometry(g) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(g.p, 3));
  if (g.u.length === (g.p.length / 3) * 2) geo.setAttribute('uv', new THREE.Float32BufferAttribute(g.u, 2));
  geo.setIndex(g.i); geo.computeVertexNormals();
  return geo;
}
function mergeBoxes(boxes) {
  const pos = [], nor = [], idx = []; let off = 0;
  for (const b of boxes) { pos.push(...b.attributes.position.array); nor.push(...b.attributes.normal.array); if (b.index) for (const i of b.index.array) idx.push(i + off); else for (let i = 0; i < b.attributes.position.count; i++) idx.push(i + off); off += b.attributes.position.count; b.dispose(); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setIndex(idx);
  return geo;
}
function roundedRect(L, W, r, steps = 10) {
  const pts = [], hx = L / 2 - r, hz = W / 2 - r;
  for (const [cx, cz, start] of [[hx, hz, 0], [-hx, hz, 1], [-hx, -hz, 2], [hx, -hz, 3]])
    for (let s = 0; s <= steps; s++) { const a = (start + s / steps) * Math.PI / 2; pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); }
  return pts;
}

/* ---------- textures ---------- */

function surfaceTexture(kind, L, W, r, logo) {
  const c = document.createElement('canvas'), k = 2048 / L; c.width = 2048; c.height = Math.round(W * k);
  const g = c.getContext('2d'), w = c.width, h = c.height, mx = w / 2, my = h / 2, m = (v) => v * k;
  g.beginPath(); g.roundRect(0, 0, w, h, m(r)); g.clip();
  if (kind === 'hockey') {
    g.fillStyle = '#e6eff7'; g.fillRect(0, 0, w, h); // ice is faintly blue, not paper white
    const line = (x, color, width) => { g.fillStyle = color; g.fillRect(mx + m(x) - m(width) / 2, 0, m(width), h); };
    const ring = (x, y, rad, color) => { g.strokeStyle = color; g.lineWidth = m(0.06); g.beginPath(); g.arc(mx + m(x), my + m(y), m(rad), 0, Math.PI * 2); g.stroke(); };
    const dot = (x, y, color) => { g.fillStyle = color; g.beginPath(); g.arc(mx + m(x), my + m(y), m(0.3), 0, Math.PI * 2); g.fill(); };
    const goal = L / 2 - 3.35, spotX = goal - 6.1, spotY = Math.min(6.7, W / 2 - 5);
    line(-7.62, '#2a5fc4', 0.3); line(7.62, '#2a5fc4', 0.3); line(0, '#cf2b2b', 0.3); line(-goal, '#cf2b2b', 0.06); line(goal, '#cf2b2b', 0.06);
    ring(0, 0, 4.57, '#2a5fc4'); if (logo) { const size = m(6.6); g.fillStyle = '#e6eff7'; g.beginPath(); g.arc(mx, my, m(4.45), 0, Math.PI * 2); g.fill(); g.drawImage(logo, mx - size / 2, my - size / 2, size, size); } // the logo sits whole inside the centre circle, on clean ice: the red line stops at the circle, as painted rinks have it else dot(0, 0, '#2a5fc4');
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) { ring(sx * spotX, sy * spotY, 4.57, '#cf2b2b'); dot(sx * spotX, sy * spotY, '#cf2b2b'); dot(sx * 6.1, sy * spotY, '#cf2b2b'); }
      g.fillStyle = '#9cc4ee'; g.beginPath(); g.arc(mx + sx * m(goal), my, m(1.83), sx > 0 ? Math.PI / 2 : -Math.PI / 2, sx > 0 ? Math.PI * 1.5 : Math.PI / 2); g.fill();
    }
    { let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647; // the same marks every time
      for (let i = 0; i < 26; i++) { const x = rnd() * w, y = rnd() * h, r = m(3 + rnd() * 6), fog = g.createRadialGradient(x, y, 0, x, y, r); fog.addColorStop(0, 'rgba(255,255,255,0.10)'); fog.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = fog; g.fillRect(x - r, y - r, r * 2, r * 2); }
      g.lineCap = 'round';
      for (let i = 0; i < 1500; i++) { const x = rnd() * w, y = rnd() * h, r = m(1.5 + rnd() * 9), a0 = rnd() * Math.PI * 2, sweep = 0.15 + rnd() * 0.5; g.strokeStyle = rnd() < 0.6 ? 'rgba(255,255,255,0.16)' : 'rgba(120,150,185,0.10)'; g.lineWidth = 0.6 + rnd() * 0.9; g.beginPath(); g.arc(x - Math.cos(a0) * r, y - Math.sin(a0) * r, r, a0, a0 + sweep / (r / m(3))); g.stroke(); } }
  } else {
    for (let i = 0; i < 12; i++) { g.fillStyle = i % 2 ? '#2f8f46' : '#2a8440'; g.fillRect((w / 12) * i, 0, w / 12 + 1, h); }
    g.strokeStyle = '#eef6ee'; g.lineWidth = m(0.14); g.strokeRect(m(1), m(1), w - m(2), h - m(2));
    g.beginPath(); g.moveTo(mx, m(1)); g.lineTo(mx, h - m(1)); g.stroke(); g.beginPath(); g.arc(mx, my, m(Math.min(9.15, W / 5)), 0, Math.PI * 2); g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
const fit = (g, img, x, y, w, h) => { if (!img) return false; const k = Math.min(w / img.width, h / img.height), dw = img.width * k, dh = img.height * k; g.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh); return true; };
function clockTexture(logos) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 576; const g = c.getContext('2d');
  g.fillStyle = '#04070c'; g.fillRect(0, 0, 1024, 576); const grad = g.createLinearGradient(0, 0, 0, 576); grad.addColorStop(0, '#12233f'); grad.addColorStop(1, '#070d18'); g.fillStyle = grad; g.fillRect(18, 18, 988, 540);
  fit(g, logos.team, 60, 90, 300, 300); g.fillStyle = '#f4f6f8'; g.font = '600 190px Geist, ui-sans-serif, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('20:00', logos.team ? 660 : 512, 230);
  g.fillStyle = '#97dd62'; g.fillRect(60, 430, 904, 8); fit(g, logos.brandLight, 312, 462, 400, 60);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
// repeating strip textures: `draw` paints one tile; u runs along the wall in metres / tile
function stripTexture(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
// dasher-board adverts: the house logo and the home team's, alternating, over a yellow kick plate
const boardTexture = (logos, kick) => stripTexture(2048, 128, (g, w, h) => {
  g.fillStyle = '#f6f7f8'; g.fillRect(0, 0, w, h); const n = 8, pw = w / n, kinds = ['brand', 'team', 'navy', 'team', 'brand', 'red', 'navy', 'team'];
  kinds.forEach((kind, i) => {
    const x = pw * i + 6, ww = pw - 12, hh = h - 40; g.fillStyle = kind === 'navy' ? '#051b35' : kind === 'red' ? '#bf0c26' : '#ffffff'; g.fillRect(x, 10, ww, hh);
    if (kind === 'team' || kind === 'red') fit(g, logos.team, x + 10, 12, ww - 20, hh - 4); else fit(g, kind === 'navy' ? logos.brandLight : logos.brand, x + 22, 30, ww - 44, hh - 40);
  });
  if (kick) { g.fillStyle = kick; g.fillRect(0, h - 20, w, 20); } // the coloured kick strip along the foot of the boards, where the venue has one
});
const signTexture = (logos) => stripTexture(512, 128, (g, w, h) => {
  g.fillStyle = '#1b1d22'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#f7f8f9'; g.beginPath(); g.roundRect(14, 22, 236, 84, 6); g.fill(); fit(g, logos.brand, 34, 44, 196, 40);
  g.fillStyle = '#f7f8f9'; g.beginPath(); g.roundRect(264, 22, 234, 84, 6); g.fill(); fit(g, logos.team, 274, 26, 214, 76);
});
const ringTexture = (text) => stripTexture(1024, 96, (g, w, h) => {
  g.fillStyle = '#f4f6f8'; g.fillRect(0, 0, w, h); g.fillStyle = '#bf0c26'; g.fillRect(0, 0, w, 10); g.fillRect(0, h - 10, w, 10); g.fillStyle = '#051b35'; g.font = '600 52px Geist, ui-sans-serif, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, w / 4, h / 2 + 2); g.fillText(text, (w * 3) / 4, h / 2 + 2);
});
function scoreClockTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 96; const g = c.getContext('2d');
  g.fillStyle = '#080808'; g.fillRect(0, 0, 512, 96); g.fillStyle = '#ff3b1f'; g.font = '700 70px ui-monospace, Menlo, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('0  20:00  0', 256, 52);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function bannerTexture(logos) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 640; const g = c.getContext('2d');
  g.fillStyle = '#f4f4f1'; g.fillRect(0, 0, 256, 640); g.fillStyle = '#bf0c26'; g.fillRect(0, 0, 256, 70); g.fillStyle = '#051b35'; g.fillRect(0, 560, 256, 80); fit(g, logos.team, 24, 150, 208, 300);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// the concourse behind the bowl: coloured walls and lit concession fronts
const concourseTexture = () => stripTexture(1024, 128, (g, w, h) => {
  ['#e3cf4a', '#2f8f95', '#e3cf4a', '#2c5fa8'].forEach((c, i) => { g.fillStyle = c; g.fillRect((w / 4) * i, 0, w / 4, h); });
  for (let i = 0; i < 4; i++) { g.fillStyle = '#fff3d6'; g.fillRect((w / 4) * i + 36, 40, w / 4 - 72, 70); g.fillStyle = '#2a2c30'; g.fillRect((w / 4) * i + 36, 22, w / 4 - 72, 18); }
});
function accessTexture() { // wheelchair bay marking
  const c = document.createElement('canvas'); c.width = 128; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 256); g.fillStyle = '#1f5fbf'; g.fillRect(6, 6, 116, 244); g.strokeStyle = g.fillStyle = '#ffffff'; g.lineWidth = 9; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.arc(58, 78, 11, 0, Math.PI * 2); g.fill(); g.beginPath(); g.moveTo(58, 96); g.lineTo(60, 136); g.lineTo(90, 136); g.lineTo(100, 168); g.stroke(); g.beginPath(); g.moveTo(60, 114); g.lineTo(84, 114); g.stroke();
  g.beginPath(); g.arc(60, 150, 27, Math.PI * 0.42, Math.PI * 1.55); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,250,235,1)'); r.addColorStop(0.18, 'rgba(255,246,225,.55)'); r.addColorStop(0.5, 'rgba(255,240,215,.12)'); r.addColorStop(1, 'rgba(255,240,215,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

/* ---------- world ---------- */

// What the map file cannot say about a building. Everything else is read from the map.
// Nothing about any one venue lives in this file. This is a toolkit: it knows how to build rows, steps, aisles and chairs from a seat map, and it holds a
// catalogue of optional parts (a rebuilt bowl, boards and nets, raised levels, suite rooms, a glazed lounge, roof fittings, a scoreboard, banners).
// Which of those a building has, and with what measurements and colours, comes from that venue's own recipe: the view3d block of its venue.json.
// A venue with no recipe gets seats on plain steps and nothing else. Section rules arrive as text patterns and are made into tests here.
const venueProfile = (v = {}) => {
  const rule = (s) => (typeof s === 'string' && s ? new RegExp(s, 'i') : undefined), levels = Array.isArray(v.levels) ? v.levels : [], level = (role) => levels.find((l) => l?.role === role) || null;
  const club = level('club'), suite = level('suite'), lounge = level('lounge'), seat = {}; for (const [k, c] of [['bowl', v.seats?.bowl], ['club', club?.seat], ['suite', suite?.seat]]) if (c) seat[k] = c;
  return {
    name: v.name || '',
    rows: { rebuild: false, facets: 4, firstRowLift: 0, ...(v.rows || {}) }, // rebuild: lay the lower bowl out again on shared straight rows; facets: straight runs per corner
    surface: { kick: null, net: 'none', benches: false, ...(v.surface || {}) }, // kick: colour of the strip at the foot of the boards; net: 'none' | 'ends' | 'all'
    suite: rule(suite?.sections), club: rule(club?.sections), top: rule(lounge?.sections), suiteLevel: club?.raised ? rule(club.sections) : undefined,
    rise: Number.isFinite(v.raisedLevelHeight) ? v.raisedLevelHeight : 3.4, // how far the raised levels stand above the walkway
    clubOver: club?.overhang > 0 ? club.overhang : 0, clubCeiling: !!club?.ceiling, suiteOver: suite?.overhang > 0 ? suite.overhang : 0, suiteRooms: suite?.rooms || null, loungeGlazed: !!lounge?.glazed,
    seat, roof: { trusses: undefined, fixtures: null, ducts: false, ...(v.roof || {}) }, scoreboard: v.scoreboard || null, banners: !!v.banners, palette: v.palette || {},
  };
};
const PALETTE = { bg: 0x14161a, tread: 0xb3ada1, riser: 0x9b958a, slab: 0x9e988d, deck: 0x3b3f47, wall: 0x363940, dark: 0x191b1f, column: 0xe6e6e3, concourse: 0xb6b4ae, warm: 0x9a7f52, warmSide: 0x826a43, boards: 0xf4f6f8, cap: 0xc8202b };

function convexHull(points) {
  const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lower = [], upper = [];
  for (const q of p) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop(); lower.push(q); }
  for (const q of p.reverse()) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop(); upper.push(q); }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}
const insidePoly = (x, z, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > z) !== (b[1] > z) && x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
// distance from p along dir to the outline, so a row's step runs to the edge of its section and no further
function reach(p, dir, poly, max = 3, min = 0.3) {
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], ex = b[0] - a[0], ez = b[1] - a[1], den = dir[0] * ez - dir[1] * ex; if (Math.abs(den) < 1e-9) continue;
    const s = ((a[0] - p[0]) * ez - (a[1] - p[1]) * ex) / den, u = ((a[0] - p[0]) * dir[1] - (a[1] - p[1]) * dir[0]) / den;
    if (s > 0 && u >= 0 && u <= 1 && s < best) best = s;
  }
  return best === Infinity ? 0.45 : clamp(best - 0.03, min, max);
}
function rayTo(p, dir, poly) {
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], ex = b[0] - a[0], ez = b[1] - a[1], den = dir[0] * ez - dir[1] * ex; if (Math.abs(den) < 1e-9) continue;
    const s = ((a[0] - p[0]) * ez - (a[1] - p[1]) * ex) / den, u = ((a[0] - p[0]) * dir[1] - (a[1] - p[1]) * dir[0]) / den;
    if (s > 0 && u >= 0 && u <= 1 && s < best) best = s;
  }
  return best;
}
function box(g, x0, x1, y0, y1, z0, z1) {
  quad(g, [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]); quad(g, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]);
  quad(g, [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]); quad(g, [x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]);
  quad(g, [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]); quad(g, [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]);
}
// round tube between two points (rails, posts)
function bar(g, a, b, r, sides = 6) {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], l = Math.hypot(...d) || 1, n = d.map((v) => v / l), ref = Math.abs(n[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
  let u = [n[1] * ref[2] - n[2] * ref[1], n[2] * ref[0] - n[0] * ref[2], n[0] * ref[1] - n[1] * ref[0]]; const ul = Math.hypot(...u) || 1; u = u.map((v) => v / ul);
  const v = [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]];
  const at = (p, k) => { const t = (k / sides) * Math.PI * 2, c = Math.cos(t) * r, s = Math.sin(t) * r; return [p[0] + u[0] * c + v[0] * s, p[1] + u[1] * c + v[1] * s, p[2] + u[2] * c + v[2] * s]; };
  for (let k = 0; k < sides; k++) quad(g, at(a, k), at(a, k + 1), at(b, k + 1), at(b, k));
}
const roundedShape = (w, h, r) => { const s = new THREE.Shape(), x = -w / 2, y = -h / 2; s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; };

// Glow round the lamps and screens, and a lens focus during the flight. The scene is drawn into a buffer that keeps values brighter than white,
// the brightest parts are blurred and laid back over it, and (only while flying) what is far from the focus distance is softened. Desktop only.
// true when there is no graphics card behind the page (a software renderer): the costly extras are then left out
const softwareGL = (renderer) => { const gl = renderer.getContext(), info = gl.getExtension('WEBGL_debug_renderer_info'); return !!info && /swiftshader|llvmpipe|software/i.test(String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL))); };
let noPost = false;
function makePost(renderer, scale = 1) { // scale: the share of the canvas's resolution the scene is drawn at before it is put on screen
  if (!renderer.capabilities.isWebGL2 || matchMedia('(pointer: coarse)').matches) return null;
  if (softwareGL(renderer)) return null; // the extra passes would take seconds a frame
  const target = (opts) => new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: false, ...opts });
  const depth = new THREE.DepthTexture(4, 4); depth.type = THREE.UnsignedIntType;
  const main = target({ depthBuffer: true, depthTexture: depth, samples: 4 }), a = target(), b = target(), c = target(), d = target();
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)), stage = new THREE.Scene(); stage.add(quad); quad.frustumCulled = false;
  const vs = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }', pass = (fs, uniforms) => new THREE.ShaderMaterial({ vertexShader: vs, fragmentShader: fs, uniforms, depthTest: false, depthWrite: false });
  // The bright parts are picked out while shrinking the picture to a quarter. Every one of the sixteen pixels behind each small pixel is counted (four taps, each the
  // mean of four), so a lamp only a pixel or two wide keeps a steady glow as the camera moves, where a single tap would catch it one frame and miss it the next.
  const bright = pass('uniform sampler2D t; uniform vec2 px; varying vec2 vUv; vec3 lit(vec2 o){ vec3 c = min(texture2D(t, vUv + o * px).rgb, vec3(6.0)); return c * smoothstep(2.4, 4.6, max(c.r, max(c.g, c.b))); } void main(){ gl_FragColor = vec4((lit(vec2(-1.0, -1.0)) + lit(vec2(1.0, -1.0)) + lit(vec2(-1.0, 1.0)) + lit(vec2(1.0, 1.0))) * 0.25, 1.0); }', { t: { value: null }, px: { value: new THREE.Vector2() } });
  const blur = pass('uniform sampler2D t; uniform vec2 dir; varying vec2 vUv; void main(){ vec3 c = texture2D(t, vUv).rgb * 0.227; c += (texture2D(t, vUv + dir * 1.385).rgb + texture2D(t, vUv - dir * 1.385).rgb) * 0.316; c += (texture2D(t, vUv + dir * 3.231).rgb + texture2D(t, vUv - dir * 3.231).rgb) * 0.0703; gl_FragColor = vec4(c, 1.0); }', { t: { value: null }, dir: { value: new THREE.Vector2() } });
  const mix = pass(`uniform sampler2D tScene, tDepth, tNear, tWide; uniform vec2 texel; uniform float near, far, focus, soft; varying vec2 vUv;
    float dist(vec2 uv){ float z = texture2D(tDepth, uv).x * 2.0 - 1.0; return 2.0 * near * far / (far + near - z * (far - near)); }
    void main(){ vec2 uv = vUv; vec3 col = texture2D(tScene, vUv).rgb;
      if (soft > 0.001) { float aim = min(dist(vec2(0.5, 0.5)), min(dist(vec2(0.42, 0.44)), dist(vec2(0.58, 0.44)))) + focus * 0.0; float coc = clamp(abs(dist(vUv) - aim) / aim - 0.12, 0.0, 1.0) * soft; vec3 acc = col; for (int i = 0; i < 14; i++) { float fi = float(i), r = sqrt((fi + 0.5) / 14.0) * coc * 8.0; acc += texture2D(tScene, uv + vec2(cos(fi * 2.39996), sin(fi * 2.39996)) * r * texel).rgb; } col = acc / 15.0; }
      col += texture2D(tNear, uv).rgb * 0.6 + texture2D(tWide, uv).rgb * 0.2;
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`, { tScene: { value: main.texture }, tDepth: { value: depth }, tNear: { value: a.texture }, tWide: { value: c.texture }, texel: { value: new THREE.Vector2() }, near: { value: 0.1 }, far: { value: 1600 }, focus: { value: 10 }, soft: { value: 0 } });
  const run = (material, to) => { quad.material = material; renderer.setRenderTarget(to); renderer.render(stage, cam); };
  const size = new THREE.Vector2();
  return {
    render(scene, camera, focus = 10, soft = 0) {
      renderer.getDrawingBufferSize(size); const w = Math.max(4, Math.round(size.x * scale)), h = Math.max(4, Math.round(size.y * scale));
      if (main.width !== w || main.height !== h) { const samples = w * h > 3.2e6 ? 2 : 4; if (main.samples !== samples) { main.samples = samples; main.dispose(); } main.setSize(w, h); for (const t of [a, b]) t.setSize(w >> 2, h >> 2); for (const t of [c, d]) t.setSize(w >> 3, h >> 3); }
      renderer.setRenderTarget(main); renderer.render(scene, camera);
      bright.uniforms.t.value = main.texture; bright.uniforms.px.value.set(1 / w, 1 / h); run(bright, a);
      blur.uniforms.t.value = a.texture; blur.uniforms.dir.value.set(1 / a.width, 0); run(blur, b); blur.uniforms.t.value = b.texture; blur.uniforms.dir.value.set(0, 1 / a.height); run(blur, a);
      blur.uniforms.t.value = a.texture; blur.uniforms.dir.value.set(1 / c.width, 0); run(blur, d); blur.uniforms.t.value = d.texture; blur.uniforms.dir.value.set(0, 1 / c.height); run(blur, c);
      blur.uniforms.t.value = c.texture; blur.uniforms.dir.value.set(2 / c.width, 0); run(blur, d); blur.uniforms.t.value = d.texture; blur.uniforms.dir.value.set(0, 2 / c.height); run(blur, c);
      Object.assign(mix.uniforms.texel.value, { x: 1 / w, y: 1 / h }); mix.uniforms.near.value = camera.near; mix.uniforms.far.value = camera.far; mix.uniforms.focus.value = Math.max(2, focus); mix.uniforms.soft.value = soft;
      run(mix, null);
    },
    dispose() { for (const t of [main, a, b, c, d]) t.dispose(); depth.dispose(); },
  };
}

// A stand drawn by hand has rows that wander. This finds the family of rows the drawing was aiming at. The building is not curved: its rows run straight and turn
// the corner in FACETS straight facets (every 22.5 degrees), so the rows are the outlines of a core rectangle pushed outward, each a polygon parallel to the last. (How many facets is the venue's to say.)
// how far out a point is: the distance of the facet it stands on from the core
const facetDist = (x, z, hx, hz, n = 4) => { const qx = Math.abs(x) - hx, qz = Math.abs(z) - hz, step = Math.PI / 2 / n; if (qx <= 0) return Math.max(qz, 0); if (qz <= 0) return qx; let d = 0; for (let i = 0; i <= n; i++) d = Math.max(d, qx * Math.cos(i * step) + qz * Math.sin(i * step)); return d; };
// (a list of steps, like the build itself: the search over core sizes is the single longest piece of arithmetic in it, and pauses after each column of the grid)
function* fitCoreSteps(rows, n = 4) {
  let mx = 0, mz = 0; for (const pts of rows) for (const p of pts) { mx = Math.max(mx, Math.abs(p[0])); mz = Math.max(mz, Math.abs(p[1])); }
  const spread = (hx, hz) => { let t = 0; for (const pts of rows) { let m = 0, q = 0; for (const p of pts) { const d = facetDist(p[0], p[1], hx, hz, n); if (d < 1) return Infinity; m += d; q += d * d; } t += q - (m * m) / pts.length; } return t; };
  let best = [Infinity, 0, 0];
  for (let hx = 0; hx <= mx; hx += 1) { for (let hz = 0; hz <= mz; hz += 1) { const v = spread(hx, hz); if (v < best[0]) best = [v, hx, hz]; } yield; }
  const [, cx, cz] = best; for (let hx = Math.max(0, cx - 1); hx <= cx + 1; hx += 0.25) for (let hz = Math.max(0, cz - 1); hz <= cz + 1; hz += 0.25) { const v = spread(hx, hz); if (v < best[0]) best = [v, hx, hz]; }
  return { hx: best[1], hz: best[2] };
}
// Coordinates round that core: s runs round the building (a corner is measured by the angle turned, times ref), D is the distance out. A line of constant s is square to
// the rows along the straight sides and a ray from the core's corner where the rows turn.
function ringFrame(hx, hz, ref, n = 4) {
  const FACETS = n, FACET = Math.PI / 2 / FACETS, FACET_T = Math.tan(FACET / 2);
  const q = (ref * Math.PI) / 2, bp = [0, hz, hz + q, hz + q + 2 * hx, hz + 2 * q + 2 * hx, 3 * hz + 2 * q + 2 * hx, 3 * hz + 3 * q + 2 * hx, 3 * hz + 3 * q + 4 * hx, 3 * hz + 4 * q + 4 * hx, 4 * hz + 4 * q + 4 * hx], T = bp[9];
  const norm = (s) => ((s % T) + T) % T, seg = (r) => { let i = 0; while (i < 8 && r >= bp[i + 1]) i++; return i; };
  const toS = (x, z) => {
    if (x > hx && Math.abs(z) <= hz) return z >= 0 ? z : T + z;
    if (x > hx && z > hz) return bp[1] + ref * Math.atan2(z - hz, x - hx);
    if (Math.abs(x) <= hx && z > hz) return bp[2] + (hx - x);
    if (x < -hx && z > hz) return bp[3] + ref * Math.atan2(-(x + hx), z - hz);
    if (x < -hx && Math.abs(z) <= hz) return bp[4] + (hz - z);
    if (x < -hx && z < -hz) return bp[5] + ref * Math.atan2(-(z + hz), -(x + hx));
    if (Math.abs(x) <= hx) return bp[6] + (x + hx);
    return bp[7] + ref * Math.atan2(x - hx, -(z + hz));
  };
  const dist = (x, z) => facetDist(x, z, hx, hz, FACETS);
  // in a corner: the angle turned so far picks the facet; the point lies on that facet (further from the corner than D toward the facet's ends), facing square to it
  const turn = (a) => { const i = Math.min(FACETS, Math.max(0, Math.round(a / FACET))), th = i * FACET; return [Math.cos(a) / Math.cos(a - th), Math.sin(a) / Math.cos(a - th), Math.cos(th), Math.sin(th)]; };
  const at = (s, D) => {
    const r = norm(s), i = seg(r), t = r - bp[i];
    if (i % 2 === 0) { const [px, pz, nx, nz] = i === 0 ? [hx, t, 1, 0] : i === 2 ? [hx - t, hz, 0, 1] : i === 4 ? [-hx, hz - t, -1, 0] : i === 6 ? [-hx + t, -hz, 0, -1] : [hx, -hz + t, 1, 0]; return { x: px + nx * D, z: pz + nz * D, nx, nz }; }
    const [c, n, fc, fn] = turn(t / ref), [cx, cz, m] = i === 1 ? [hx, hz, [1, 0, 0, 1]] : i === 3 ? [-hx, hz, [0, -1, 1, 0]] : i === 5 ? [-hx, -hz, [-1, 0, 0, -1]] : [hx, -hz, [0, 1, -1, 0]]; // each corner is the first one turned a quarter
    return { x: cx + (m[0] * c + m[1] * n) * D, z: cz + (m[2] * c + m[3] * n) * D, nx: m[0] * fc + m[1] * fn, nz: m[2] * fc + m[3] * fn };
  };
  // true length along the row at distance D, and back: round a corner it is D times the run along the facets
  const run = (a) => { const i = Math.min(FACETS, Math.max(0, Math.round(a / FACET))); return 2 * i * FACET_T + Math.tan(a - i * FACET); }, back = (g) => { const i = Math.min(FACETS, Math.max(0, Math.round(g / (2 * FACET_T)))); return i * FACET + Math.atan(g - 2 * i * FACET_T); }, whole = 2 * FACETS * FACET_T;
  const U = (s, D) => { const w = Math.floor(s / T), r = s - w * T; let u = 0; for (let i = 0; i < 9; i++) { const end = r >= bp[i + 1], d = (end ? bp[i + 1] : r) - bp[i]; u += i % 2 ? D * run(d / ref) : d; if (!end) break; } return u + w * (T - 4 * q + 4 * D * whole); };
  const S = (u, D) => { const C = T - 4 * q + 4 * D * whole, w = Math.floor(u / C); let r = u - w * C; for (let i = 0; i < 9; i++) { const len = i % 2 ? D * whole : bp[i + 1] - bp[i]; if (r >= len) r -= len; else return w * T + bp[i] + (i % 2 ? ref * back(r / D) : r); } return w * T + T; };
  const corner = (s) => seg(norm(s)) % 2 === 1;
  const kinks = []; for (const i of [1, 3, 5, 7]) for (let k = 0; k < FACETS; k++) kinks.push(bp[i] + ref * (k + 0.5) * FACET); // where a row turns
  return { T, bp: bp.concat(kinks), norm, toS, dist, at, U, S, corner };
}

// The arena is built as a list of small steps (every `yield` below is a place it can pause). Run straight through, that is the old all-at-once build, which holds
// the page for a second or more. prepareSeatView runs the same steps a few milliseconds at a time between frames, so the page never stops answering.
function buildWorld(...args) { const steps = buildWorldSteps(...args); let step; while (!(step = steps.next()).done); return step.value; }
function* buildWorldSteps(map, renderer, logos = {}, venue = {}) {
  yield;
  const raw = map.raw || {}, em = raw.elevationModel || {}, shapes = Object.values(raw.shapes || {}), profile = venueProfile(venue), facets = Math.max(1, Math.round(profile.rows.facets) || 4), C = { ...PALETTE, ...profile.palette };
  // metres per map unit: the map's calibration, else assume neighbouring seats are 0.55 m apart
  yield;
  let mpu = em.calibration?.metersPerUnit;
  yield;
  if (!(mpu > 0)) {
    const gaps = [];
    for (const row of map.rows) for (let i = 1; i < row.seats.length && gaps.length < 400; i++) { const a = map.seatById.get(row.seats[i - 1]), b = map.seatById.get(row.seats[i]); gaps.push(Math.hypot(a.x - b.x, a.y - b.y)); }
    gaps.sort((a, b) => a - b); mpu = 0.55 / (gaps[gaps.length >> 1] || 14);
  }
  // playing surface: the largest surface_type_* shape, else the elevation line, else the middle of the seats
  yield;
  const surfaces = shapes.filter((s) => s.boundary?.[0]?.length > 2 && s.groupPath?.some((p) => /^surface_type_/i.test(p)))
    .map((s) => ({ s, box: bboxOf(s.boundary[0]) })).sort((a, b) => b.box.w * b.box.h - a.box.w * a.box.h);
  yield;
  const fallback = shapes.find((s) => s.groupPath?.includes('elevation_line') && s.boundary?.[0]?.length > 2);
  yield;
  const kind = surfaces[0] ? surfaces[0].s.groupPath.find((p) => /^surface_type_/i.test(p)).replace(/^surface_type_/i, '').toLowerCase() : 'floor';
  yield;
  const mb = map.bounds, sbox = surfaces[0]?.box || (fallback && bboxOf(fallback.boundary[0])) || { x0: mb.x + (mb.right - mb.x) * 0.3, x1: mb.right - (mb.right - mb.x) * 0.3, y0: mb.y + (mb.bottom - mb.y) * 0.35, y1: mb.bottom - (mb.bottom - mb.y) * 0.35 };
  yield;
  const ox = (sbox.x0 + sbox.x1) / 2, oy = (sbox.y0 + sbox.y1) / 2, P = (p) => [(p.x - ox) * mpu, (p.y - oy) * mpu];
  yield;
  const sw = (sbox.x1 - sbox.x0) * mpu, sh = (sbox.y1 - sbox.y0) * mpu, longX = sw >= sh, L = Math.max(sw, sh), W = Math.min(sw, sh);
  yield;
  const hockey = kind === 'hockey' || kind === 'ice', corner = hockey ? Math.min(8.5, W / 2 - 0.5) : 0.01, goalAt = hockey ? L / 2 - 3.35 : L / 2;
  // the front row's floor stands this far above the ice, so a seated spectator looks through the glass, not at the back of the boards
  // How far a block's first row stands above the ice. In this venue every first row is on the ground, at the walkway (confirmed by the owner):
  // one low step up, so a seated spectator's eyes are just above the boards and look through the glass.
  yield;
  const plinth = Number(profile.rows.firstRowLift) || 0, endPlinth = plinth, lifts = new Map(); // how far the first row stands above the floor beside the playing surface: the venue's to say
  yield;
  for (const s of map.sections) {
    const ring = s.boundary?.[0]; if (!ring?.length) continue; let cx = 0, cz = 0; for (const p of ring) { const q = P(p); cx += q[0]; cz += q[1]; } cx /= ring.length; cz /= ring.length;
    const along = Math.abs(longX ? cx : cz), acrossSide = Math.abs(longX ? cz : cx); lifts.set(s.id, hockey && along > L / 2 && acrossSide < W / 2 + 3 ? endPlinth : plinth);
  }
  yield;
  const liftOf = (id) => lifts.get(id) ?? plinth;

  // heights: rows from the elevation model, on the plinth; suites are lifted to stand over the concourse, which the map's deck height leaves no room for
  yield;
  const rowElev = new Map(), baseOf = new Map(), pitchOf = new Map();
  yield;
  for (const s of Object.values(em.sections || {})) { baseOf.set(s.sectionId, (s.baseElevationM || 0) + liftOf(s.sectionId)); for (const r of s.compiledRows || []) { rowElev.set(r.id, r.elevationM + liftOf(s.sectionId)); if (r.pitchM > 0) pitchOf.set(r.id, r.pitchM); } }
  yield;
  for (const s of map.sections) {
    if (!baseOf.has(s.id)) baseOf.set(s.id, (Number(s.spatial3D?.baseElevation) || 0) + liftOf(s.id));
    s.rowIds.forEach((id, i) => { if (!rowElev.has(id)) rowElev.set(id, baseOf.get(s.id) + (map.rowById.get(id).rowIndex ?? i) * 0.32); });
  }
  yield;
  const kinds = new Map(), low = (s) => baseOf.get(s.id) < liftOf(s.id) + 1;
  yield;
  for (const s of map.sections) kinds.set(s.id, s.ga ? 'ga' : (profile.suite ? profile.suite.test(s.name) : !low(s) && s.rowIds.length <= 3 && s.seats.length <= 24) ? 'suite' : profile.club?.test(s.name) ? 'club' : 'bowl');
  // wheelchair positions, read from the map itself (not from the sample flags the player adds). A row made only of them is a platform:
  // in the bowl it sits flush with the concourse, so it is reached without a step.
  yield;
  const access = new Set(), platformRows = new Set();
  yield;
  for (const s of Object.values(raw.sections || {})) for (const [rowId, r] of Object.entries(s.rows || {})) {
    const marked = (r.seats || []).filter((q) => q.attributes?.accessibility); for (const q of marked) access.add(q.id);
    if (marked.length && marked.length === r.seats.length) platformRows.add(rowId);
  }
  // The lower bowl is rebuilt on shared rows: every block's rows are snapped to one family of concentric rows round the rink, so a row meets
  // the same row of the block beside it, at the same height. The drawing only says which rows a block has and where its seats start and stop.
  yield;
  let RB = null;
  yield;
  { const secs = profile.rows.rebuild ? map.sections.filter((s) => !s.ga && kinds.get(s.id) === 'bowl' && low(s)) : [], rws = [];
    for (const s of secs) for (const id of s.rowIds) { const row = map.rowById.get(id); if (row?.seats?.length) rws.push({ id, sid: s.id, pts: row.seats.map((q) => P(map.seatById.get(q))), platform: platformRows.has(id) }); }
    if (secs.length >= 4 && rws.length > 20) {
      const core = yield* fitCoreSteps(rws.map((r) => r.pts), facets), dOf = (p) => facetDist(p[0], p[1], core.hx, core.hz, facets), median = (a) => a.sort((p, q) => p - q)[a.length >> 1];
      for (const r of rws) r.D = r.pts.reduce((n, p) => n + dOf(p), 0) / r.pts.length;
      const bySec = new Map(); for (const r of rws) if (!r.platform) (bySec.get(r.sid) || bySec.set(r.sid, []).get(r.sid)).push(r);
      const steps = [], rises = []; for (const l of bySec.values()) { l.sort((p, q) => p.D - q.D); for (let i = 1; i < l.length; i++) { const d = l[i].D - l[i - 1].D; if (d > 0.5 && d < 1.5) { steps.push(d); const e = rowElev.get(l[i].id) - rowElev.get(l[i - 1].id); if (e > 0.1 && e < 0.7) rises.push(e); } } }
      const pitch = steps.length ? median(steps) : 0.9, rise = rises.length ? median(rises) : 0.32, d0 = Math.min(...rws.filter((r) => !r.platform).map((r) => r.D));
      let shift = 0, err = Infinity; for (let c = 0; c < 1; c += 0.05) { let e = 0; for (const r of rws) if (!r.platform) { const v = (r.D - d0) / pitch - c; e += (v - Math.round(v)) ** 2; } if (e < err) { err = e; shift = c; } }
      const kOf = new Map(); let sum = 0, count = 0;
      for (const l of bySec.values()) { let prev = -1; for (const r of l) { const k = Math.max(prev + 1, Math.round((r.D - d0) / pitch - shift), 0); kOf.set(r.id, k); prev = k; sum += r.D - k * pitch; count++; } }
      const base = sum / count, fr = 0.42;
      RB = { ...ringFrame(core.hx, core.hz, base + 8 * pitch, facets), core, pitch, rise, base, fr, kOf, rowD: new Map(rws.map((r) => [r.id, r.D])), secs: new Set(secs.map((s) => s.id)), runs: [], yOf: (k) => plinth + k * rise, DOf: (k) => base + k * pitch };
      for (const [id, k] of kOf) rowElev.set(id, RB.yOf(k));
    }
  }
  yield;
  let concourseY = 0;
  yield;
  for (const s of map.sections) if (kinds.get(s.id) === 'bowl' && low(s)) for (const id of s.rowIds) concourseY = Math.max(concourseY, rowElev.get(id));
  yield;
  const walkY = RB ? concourseY : Math.max(0, concourseY - 0.45); // on shared rows the top row stands on the edge of the walkway itself
  yield;
  const raised = map.sections.filter((s) => kinds.get(s.id) === 'suite' || profile.suiteLevel?.test(s.name));
  yield;
  const suiteY = concourseY + profile.rise, lift = concourseY > 0 && raised.length ? Math.max(0, suiteY - Math.min(...raised.map((s) => baseOf.get(s.id)))) : 0, lifted = new Set(lift ? raised.map((s) => s.id) : []);
  yield;
  for (const s of raised) if (lift) { baseOf.set(s.id, baseOf.get(s.id) + lift); for (const id of s.rowIds) rowElev.set(id, rowElev.get(id) + lift); }
  yield;
  for (const s of map.sections) if (kinds.get(s.id) === 'bowl' && low(s) && concourseY > 0) for (const id of s.rowIds) if (platformRows.has(id) && (RB?.secs.has(s.id) || concourseY - rowElev.get(id) < 1.6)) rowElev.set(id, walkY); // wheelchair platforms are part of the walkway floor

  // The club level is rebuilt the same way, on its own family of rows (it curves round the end of the building, not round the rink), standing on the walkway.
  yield;
  let RC = null;
  yield;
  { const secs = RB ? map.sections.filter((s) => !s.ga && kinds.get(s.id) === 'club') : [], rws = [];
    for (const s of secs) for (const id of s.rowIds) { const row = map.rowById.get(id); if (row?.seats?.length) rws.push({ id, sid: s.id, pts: row.seats.map((q) => P(map.seatById.get(q))) }); }
    if (rws.length > 3) {
      const core = yield* fitCoreSteps(rws.filter((r) => r.pts.length > 2).map((r) => r.pts), facets), dOf = (p) => facetDist(p[0], p[1], core.hx, core.hz, facets), mean = (a) => a.reduce((n, v) => n + v, 0) / a.length;
      for (const r of rws) r.D = mean(r.pts.map(dOf));
      const groups = new Map(); { let key = -1, last = null; for (const r of rws.slice().sort((p, q) => p.D - q.D)) { if (last === null || r.D - last > 0.45) key++; last = r.D; (groups.get(key) || groups.set(key, []).get(key)).push(r); } } // rows whose distances sit within half a step of each other are one row
      const Ds = [], ys = [], kOf = new Map(); [...groups.keys()].sort((a, b) => a - b).forEach((key, k) => { const g = groups.get(key); Ds.push(mean(g.map((r) => r.D))); ys.push(mean(g.map((r) => rowElev.get(r.id)))); for (const r of g) kOf.set(r.id, k); });
      // The map draws the club level behind the lower bowl, because a flat map cannot show one level over another. In the building it hangs over the bowl's
      // back rows, so here the whole level is brought forward until its front edge stands as far in over the top of the bowl as the venue says (its overhang); with none given it stays where it is drawn.
      const ref = Ds[Math.min(1, Ds.length - 1)], drawn = ringFrame(core.hx, core.hz, ref, facets), topRow = Math.max(...RB.kOf.values()),
        over = profile.clubOver > 0 ? clamp(core.hx + Ds[0] - (RB.core.hx + RB.DOf(topRow) + RB.pitch - profile.clubOver), 0, core.hx - 1) : 0, placed = ringFrame(core.hx - over, core.hz, ref, facets);
      RC = { ...placed, toS: (x, z) => { const s = drawn.toS(x, z); return s > drawn.T / 2 ? s - 4 * over : s; }, deckDepth: 3 + over, lid: profile.clubCeiling, core, pitch: 0.95, rise: 0.33, fr: 0.42, kOf, rowD: new Map(), secs: new Set(secs.map((s) => s.id)), runs: [], floor: ys[0] - 1.25, // a raised floor: a deep edge beam, open to the walkway underneath
        yOf: (k) => ys[clamp(k, 0, ys.length - 1)], DOf: (k) => (k < Ds.length ? Ds[Math.max(0, k)] : Ds[Ds.length - 1] + (k - Ds.length + 1) * 0.95), depth: (k) => (k + 1 < Ds.length ? Ds[k + 1] - Ds[k] : 1.3) };
      for (const [id, k] of kOf) rowElev.set(id, RC.yOf(k));
    }
  }
  // The suites and the room above them are drawn behind the lower bowl on the flat map, but in the building they stand forward over its top rows, so the walkway
  // runs underneath them. Each side's suites are brought forward together (so neighbours keep their places), until their front edge is 1.5 m in over the top row.
  yield;
  const nudge = new Map();
  yield;
  if (RB && lift && profile.suiteOver > 0) {
    const up = map.sections.filter((s) => s.boundary?.[0]?.length > 2 && (kinds.get(s.id) === 'suite' || profile.top?.test(s.name))), across = (p) => (longX ? p[1] : p[0]);
    const nearest = Math.min(...up.filter((s) => kinds.get(s.id) === 'suite').flatMap((s) => s.boundary[0].map((p) => Math.abs(across(P(p)))))), topRow = Math.max(...RB.kOf.values());
    const over = clamp(nearest - (RB.core.hz + RB.DOf(topRow) + RB.pitch - RB.fr - profile.suiteOver), 0, 8);
    if (over > 0.2) for (const s of up) { const side = Math.sign(s.boundary[0].reduce((n, p) => n + across(P(p)), 0)) || 1; nudge.set(s.id, longX ? [0, -side * over] : [-side * over, 0]); }
  }
  yield;
  const PN = (p, sid) => { const q = P(p), o = nudge.get(sid); return o ? [q[0] + o[0], q[1] + o[1]] : q; };
  // seats: position, height and the way they face (square to their row, toward the surface). Hand-drawn spacing is evened out
  // along each run of seats; gaps of 0.8 m or more are taken as meant (aisles, tunnels) and left alone.
  yield;
  const seats = new Map(), rowLine = new Map(), dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]); let top = 0, evenedRuns = 0;
  yield;
  for (const row of map.rows) { yield;
    if (!row.seats.length) continue;
    const R = RB?.secs.has(row.sectionId) ? RB : RC?.secs.has(row.sectionId) ? RC : null;
    if (R) { // a row of a rebuilt stand: seats spaced evenly along their shared row, each run keeping its drawn ends and its count
      const k = R.kOf.get(row.id), plat = k === undefined, D = plat ? R.rowD.get(row.id) : R.DOf(k), y = plat ? walkY : R.yOf(k), T = R.T; top = Math.max(top, y);
      const list = row.seats.map((id) => { const p = P(map.seatById.get(id)); return { id, s: R.toS(p[0], p[1]) }; }), ref = list[0].s;
      for (const q of list) q.s = ref + ((((q.s - ref + T / 2) % T) + T) % T) - T / 2; list.sort((a, b) => a.s - b.s);
      for (let start = 0, i = 1; i <= list.length; i++) {
        if (i < list.length && R.U(list[i].s, D) - R.U(list[i - 1].s, D) < 0.8) continue;
        const run = list.slice(start, i), ua = R.U(run[0].s, D), ub = R.U(run[run.length - 1].s, D); start = i; evenedRuns++;
        R.runs.push({ k, plat, D, a: run[0].s, b: run[run.length - 1].s, sid: row.sectionId });
        run.forEach((q, j) => { const o = R.at(R.S(run.length > 1 ? ua + ((ub - ua) * j) / (run.length - 1) : ua, D), D); seats.set(q.id, { x: o.x, y, z: o.z, fx: -o.nx, fz: -o.nz, access: access.has(q.id), sid: row.sectionId }); });
      }
      continue;
    }
    const y = rowElev.get(row.id) || 0, first = PN(map.seatById.get(row.seats[0]), row.sectionId); top = Math.max(top, y);
    let all = row.seats.map((id) => ({ id, p: PN(map.seatById.get(id), row.sectionId) })), far = all[0];
    for (const q of all) if (dist(q.p, first) > dist(far.p, first)) far = q;
    const ax = far.p[0] - first[0], az = far.p[1] - first[1]; all = all.sort((a, b) => (a.p[0] * ax + a.p[1] * az) - (b.p[0] * ax + b.p[1] * az));
    for (let start = 0, i = 1; i <= all.length; i++) {
      if (i < all.length && dist(all[i].p, all[i - 1].p) < 0.8) continue;
      const run = all.slice(start, i), src = run.map((q) => q.p.slice()), d = []; start = i; if (run.length < 3) continue;
      for (let k = 1; k < src.length; k++) d.push(dist(src[k], src[k - 1]));
      if (Math.max(...d) - Math.min(...d) < 0.04) continue; evenedRuns++;
      const step = d.reduce((n, v) => n + v, 0) / d.length; let seg = 0, acc = 0;
      for (let k = 1; k < run.length - 1; k++) { const want = step * k; while (seg < d.length - 1 && acc + d[seg] < want) acc += d[seg++]; const t = (want - acc) / d[seg]; run[k].p = [src[seg][0] + (src[seg + 1][0] - src[seg][0]) * t, src[seg][1] + (src[seg + 1][1] - src[seg][1]) * t]; }
    }
    const line = all.map((q, i) => {
      const p = q.p, a = all[Math.max(0, i - 1)].p, c = all[Math.min(all.length - 1, i + 1)].p;
      let fx = -(c[1] - a[1]), fz = c[0] - a[0], len = Math.hypot(fx, fz);
      if (len < 1e-6) { fx = -p[0]; fz = -p[1]; len = Math.hypot(fx, fz) || 1; }
      fx /= len; fz /= len; if (fx * -p[0] + fz * -p[1] < 0) { fx = -fx; fz = -fz; }
      const seat = { x: p[0], y, z: p[1], fx, fz, access: access.has(q.id), sid: row.sectionId }; seats.set(q.id, seat); return seat;
    });
    rowLine.set(row.id, line);
  }
  yield;
  const roomTop = lift ? suiteY + 4.6 : top + 3, H = Math.max(top + 9, roomTop + 6.5); // roof height

  yield;
  const G = Object.fromEntries(['tread', 'riser', 'slab', 'deck', 'wall', 'dark', 'steel', 'column', 'concourse', 'warm', 'warmSide', 'glass', 'sign', 'roof', 'floor', 'stair', 'nosing', 'rail', 'portal', 'bench', 'door', 'art', 'art2', 'shop', 'desk', 'lamp', 'pier', 'soffit', 'parapet', 'ceil', 'fabric', 'wood', 'unit', 'screen', 'jersey', 'leaf', 'carpet', 'bulk'].map((k) => [k, builder()]));
  yield;
  const signs = [];
  yield;
  const outlines = [], lowerRing = [], railSeen = [], accessSpots = [], guards = []; let hullEdge = null;
  // every seated block's outline, known before any is built: a row's step runs on across the aisle to meet its neighbour's halfway
  yield;
  const blocks = new Map(); for (const s of map.sections) { const ring = s.boundary?.[0]; if (ring?.length > 2 && !s.ga) blocks.set(s.id, simplify(ring, 0.18 / mpu).map((p) => PN(p, s.id))); }
  yield;
  const seatArr = [...seats.values()], aisleSeen = [];
  yield;
  const neighbourGap = (sid, p, t) => { let best = 0; for (const q of seatArr) { if (q.sid === sid) continue; const dx = q.x - p.x, dz = q.z - p.z, d = dx * t[0] + dz * t[1]; if (d < 0.5 || d > 4.4 || Math.abs(dx * t[1] - dz * t[0]) > 0.55 || Math.abs(q.y - p.y) > 1.2) continue; if (!best || d < best) best = d; } return best; };
  yield;
  const across = (id, p, dir, e) => { const from = [p[0] + dir[0] * (e + 0.06), p[1] + dir[1] * (e + 0.06)]; let near = Infinity; for (const [other, poly] of blocks) if (other !== id) near = Math.min(near, rayTo(from, dir, poly)); return near < 2.6 ? e + near / 2 + 0.09 : e; }; let aisleRails = 0, tunnels = 0;
  yield;
  const glassRail = (a, b, y0, y1 = y0, h = 1.05) => { const ta = [a[0], y0 + h, a[1]], tb = [b[0], y1 + h, b[1]]; bar(G.rail, ta, tb, 0.024); bar(G.rail, [a[0], y0 + h * 0.5, a[1]], [b[0], y1 + h * 0.5, b[1]], 0.016); bar(G.rail, [a[0], y0, a[1]], ta, 0.02); bar(G.rail, [b[0], y1, b[1]], tb, 0.02); };

  yield;
  const parapet = (a, b, y0, y1 = y0, h = 0.95, w = 0.45) => { quad(G.parapet, [a[0], y0, a[1]], [b[0], y1, b[1]], [b[0], y1 + w, b[1]], [a[0], y0 + w, a[1]]); const ta = [a[0], y0 + h, a[1]], tb = [b[0], y1 + h, b[1]]; bar(G.rail, ta, tb, 0.024); bar(G.rail, [a[0], y0 + w, a[1]], ta, 0.02); bar(G.rail, [b[0], y1 + w, b[1]], tb, 0.02); };
  // The rebuilt bowl. Each shared row is laid right round as pieces: steps under seats, aisles where a row breaks for 1.3 to 2.7 m, and nothing where
  // the break is wider (a tunnel, the benches, the end of the stand). Every piece closes against what is in front, behind and beside it, so no gap can open.
  // floor: the level in front of and under the stand (the event floor for the bowl, the walkway for the club level). Only the bowl carries the walkway behind it.
  yield;
  let ringEdge = null, ringBays = 0;
  yield;
  const ringStand = function* (RB, floor, isBowl) { // steps too: it pauses after each row of the stand
    const { T, U, S, at, pitch, rise, fr, norm, bp } = RB, K = Math.max(...RB.runs.filter((r) => !r.plat).map((r) => r.k)), pieces = [];
    const V = (s, D, y) => { const q = at(s, D); return [q.x, y, q.z]; }, XZ = (s, D) => { const q = at(s, D); return [q.x, q.z]; }, Dfront = (k) => RB.DOf(k) - fr, Dback = (k) => RB.DOf(k) - fr + (RB.depth ? RB.depth(k) : pitch);
    for (let k = 0; k <= K; k++) { yield;
      const D = RB.DOf(k), C = U(T, D), out = []; pieces.push(out);
      const runs = RB.runs.filter((r) => !r.plat && r.k === k).map((r) => { const a = U(norm(r.a), D); return [a, a + U(r.b, D) - U(r.a, D)]; }).sort((p, q) => p[0] - q[0]), merged = [];
      for (const r of runs) { const m = merged[merged.length - 1]; if (m && r[0] - m[1] < 1.3) m[1] = Math.max(m[1], r[1]); else merged.push(r.slice()); }
      if (merged.length > 1 && merged[0][0] + C - merged[merged.length - 1][1] < 1.3) merged[0][0] = merged.pop()[0] - C;
      const n = merged.length, gap = merged.map((r, i) => (i + 1 < n ? merged[i + 1][0] : merged[0][0] + C) - r[1]), aisle = gap.map((g) => n > 1 && g >= 1.3 && g <= 2.7);
      merged.forEach((r, i) => {
        out.push({ a: S(r[0] - 0.3, D), b: S(r[1] + 0.3, D), type: 'tread', openStart: !aisle[(i + n - 1) % n], openEnd: !aisle[i] });
        if (aisle[i]) out.push({ a: S(r[1] + 0.3, D), b: S(r[1] + gap[i] - 0.3, D), type: 'aisle', width: gap[i] - 0.6 });
      });
    }
    const hit = (k, s) => { const list = pieces[k]; if (!list) return null; for (const p of list) for (const o of [0, T, -T]) if (s + o >= p.a - 1e-6 && s + o <= p.b + 1e-6) return p; return null; };
    const topAt = (s) => { for (let k = K; k >= 0; k--) if (hit(k, s)) return k; return -1; };
    // where the walkway behind the stand begins: behind the highest row present at each point round the building; over a gap with no rows at all it bridges across, at the lower neighbour's line
    const marks = [...new Set(pieces.flat().flatMap((p) => [p.a, p.b]).map((s) => Math.round(norm(s) * 1e4) / 1e4))].sort((a, b) => a - b), spans = [];
    marks.forEach((a, i) => { const b = i + 1 < marks.length ? marks[i + 1] : marks[0] + T; if (b - a < 1e-3) return; const kt = topAt((a + b) / 2), last = spans[spans.length - 1]; if (last && last.kt === kt) last.b = b; else spans.push({ a, b, kt, open: kt < 0 }); });
    spans.forEach((sp, i) => { if (sp.kt >= 0) return; let l = i, r = i, n = spans.length; do l = (l + n - 1) % n; while (spans[l].kt < 0 && l !== i); do r = (r + 1) % n; while (spans[r].open && r !== i); sp.kt = Math.max(0, Math.min(spans[l].kt < 0 ? K : spans[l].kt, spans[r].open ? K : spans[r].kt)); });
    const edgeAt = (s) => { const r = norm(s); for (const sp of spans) for (const o of [0, T]) if (r + o >= sp.a && r + o < sp.b) return sp; return spans[0]; };
    const cutsOf = (a, b, extra = []) => {
      const c = [a, b]; for (const e of extra.concat(bp)) for (const o of [-T, 0, T]) if (e + o > a + 1e-4 && e + o < b - 1e-4) c.push(e + o); c.sort((p, q) => p - q);
      const out = [c[0]]; for (let i = 1; i < c.length; i++) { const from = c[i - 1], to = c[i], n = Math.max(1, Math.ceil((to - from) / (RB.corner((from + to) / 2) ? 3 : 1.5))); for (let j = 1; j <= n; j++) out.push(from + ((to - from) * j) / n); } return out;
    };
    const aisleStep = (s1, s2, k, low) => { // two even steps per row, the lower edge of each marked
      const y = RB.yOf(k), half = (low + y) / 2, Df = Dfront(k), Db = Dback(k), Dm = (Df + Db) / 2;
      if (y - low < 0.03) { if (y > 0.02) quad(G.stair, V(s1, Df, y), V(s2, Df, y), V(s2, Db, y), V(s1, Db, y)); return; } // a level floor: just the way through
      quad(G.stair, V(s1, Df, half), V(s2, Df, half), V(s2, Dm, half), V(s1, Dm, half)); quad(G.stair, V(s1, Dm, y), V(s2, Dm, y), V(s2, Db, y), V(s1, Db, y));
      quad(k % 2 ? G.art : G.art2, V(s1, Df, low), V(s2, Df, low), V(s2, Df, half), V(s1, Df, half)); quad(k % 2 ? G.art2 : G.art, V(s1, Dm, half), V(s2, Dm, half), V(s2, Dm, y), V(s1, Dm, y));
      for (const [d, h] of [[Df, half], [Dm, y]]) quad(G.nosing, V(s1, d, h + 0.006), V(s2, d, h + 0.006), V(s2, d + 0.07, h + 0.006), V(s1, d + 0.07, h + 0.006));
    };
    const portal = (sa, sb, D, height) => { const ua = U(sa, D), ub = U(sb, D), w = ub - ua, c = (ua + ub) / 2; if (w < 1.5 || height < 1.6) return; const h = Math.min(w / 2 - 0.2, 1.7), p1 = S(c - h, D), p2 = S(c + h, D), d1 = S(c - 0.55, D), d2 = S(c + 0.55, D), hh = Math.min(2.5, height); tunnels++;
      quad(G.portal, V(p1, D - 0.03, 0), V(p2, D - 0.03, 0), V(p2, D - 0.03, hh), V(p1, D - 0.03, hh)); quad(G.door, V(d1, D - 0.06, 0), V(d2, D - 0.06, 0), V(d2, D - 0.06, Math.min(2.05, hh - 0.2)), V(d1, D - 0.06, Math.min(2.05, hh - 0.2))); };
    for (let k = 0; k <= K; k++) { yield;
      const y = RB.yOf(k), Df = Dfront(k), Db = Dback(k), near = (pieces[k - 1] || []).concat(pieces[k + 1] || []).flatMap((p) => [p.a, p.b]); let mouth = null; const mouths = [];
      for (const p of pieces[k]) {
        const cuts = cutsOf(p.a, p.b, near), mid = (p.a + p.b) / 2, stairDown = isBowl && p.type === 'aisle' && k > 0 && !hit(k - 1, mid);
        for (let i = 0; i < cuts.length - 1; i++) {
          const s1 = cuts[i], s2 = cuts[i + 1], sm = (s1 + s2) / 2, below = k > 0 && !!hit(k - 1, sm), low = below ? RB.yOf(k - 1) : floor;
          if (p.type === 'tread') {
            if (y - floor > 0.02 || !isBowl) { quad(G.tread, V(s1, Db, y), V(s2, Db, y), V(s2, Df, y), V(s1, Df, y)); quad(G.riser, V(s1, Df, low), V(s2, Df, low), V(s2, Df, y), V(s1, Df, y)); } // a row on the floor itself needs no step: its chairs stand on the floor
            if (!below && (k > 0 || !isBowl)) { parapet(XZ(s1, Df + 0.03), XZ(s2, Df + 0.03), y, y, 0.9); if (mouth && Math.abs(mouth[1] - s1) < 1e-6) mouth[1] = s2; else mouths.push(mouth = [s1, s2]); }
          } else if (stairDown) { // an aisle with no row in front of it carries on down to the floor as a stair of its own
            for (let j = k; j >= 0; j--) { aisleStep(s1, s2, j, j ? RB.yOf(j - 1) : 0); if (j < k) for (const s of [i === 0 ? s1 : null, i === cuts.length - 2 ? s2 : null]) if (s !== null) quad(G.slab, V(s, Dfront(j), 0), V(s, Dback(j), 0), V(s, Dback(j), RB.yOf(j)), V(s, Dfront(j), RB.yOf(j))); }
          } else if (!isBowl && !below) { quad(G.stair, V(s1, Df, y), V(s2, Df, y), V(s2, Db, y), V(s1, Db, y)); quad(G.riser, V(s1, Df, floor), V(s2, Df, floor), V(s2, Df, y), V(s1, Df, y)); parapet(XZ(s1, Df + 0.03), XZ(s2, Df + 0.03), y, y, 0.9); // the foot of a raised aisle is a landing behind the front wall
          } else aisleStep(s1, s2, k, isBowl ? (k ? RB.yOf(k - 1) : 0) : RB.yOf(k - 1));
          if (!hit(k + 1, sm) && edgeAt(sm).kt > k) { quad(G.slab, V(s1, Db, floor), V(s2, Db, floor), V(s2, Db, y), V(s1, Db, y)); if (k > 0 || !isBowl) parapet(XZ(s1, Db - 0.03), XZ(s2, Db - 0.03), y); }
        }
        // the open end of a row: a wall down to the floor and, where there is a drop beside it, a rail on that one step
        if (p.type === 'tread') for (const [open, s, dir] of [[p.openStart, p.a, -1], [p.openEnd, p.b, 1]]) { if (!open) continue; quad(G.slab, V(s, Df, floor), V(s, Db, floor), V(s, Db, y), V(s, Df, y)); if ((k > 0 || !isBowl) && edgeAt(s + dir * 0.25).kt >= k && !hit(k, s + dir * 0.25)) parapet(XZ(s - dir * 0.03, Df), XZ(s - dir * 0.03, Db), y); }
        // a short handrail up the middle of the aisle on every second row
        if (p.type === 'aisle' && k % 2 === 1 && p.width >= 1 && y - RB.yOf(k - 1) > 0.05 && hit(k - 1, mid)?.type === 'aisle') { const lo = V(mid, Df - pitch * 0.3, RB.yOf(k - 1)), hi = V(mid, Df + pitch * 0.7, y), a1 = [lo[0], lo[1] + 0.9, lo[2]], b1 = [hi[0], hi[1] + 0.9, hi[2]]; bar(G.rail, lo, a1, 0.02); bar(G.rail, hi, b1, 0.02); bar(G.rail, a1, b1, 0.024); aisleRails++; }
      }
      if (isBowl) for (const m of mouths) portal(m[0], m[1], Df, y - 0.25); // the way out under the stand, wherever a row stands over an opening
    }
    if (!isBowl) { // behind the top row of a raised level: its own floor, running back to the wall
      const deep = RB.deckDepth || 3;
      for (const sp of spans) { if (sp.open) continue; const D = Dback(sp.kt), y = RB.yOf(sp.kt), cuts = cutsOf(sp.a, sp.b);
        for (let j = 1; j < cuts.length; j++) quad(G.deck, V(cuts[j - 1], D, y), V(cuts[j], D, y), V(cuts[j], D + deep, y), V(cuts[j - 1], D + deep, y));
        for (const s of [sp.a, sp.b]) quad(G.slab, V(s, D, floor), V(s, D + deep, floor), V(s, D + deep, y), V(s, D, y));
        if (RB.lid) { const lid = RB.yOf(K) + 2.9, edge = Dfront(0) - 0.25, y0 = RB.yOf(0); // a low ceiling over the level, with a bulkhead and columns: only where the venue has one
        for (let j = 1; j < cuts.length; j++) { const s0 = cuts[j - 1], s1 = cuts[j], sm = (s0 + s1) / 2;
          quad(G.ceil, V(s0, edge, lid), V(s1, edge, lid), V(s1, D + deep, lid), V(s0, D + deep, lid)); quad(G.bulk, V(s0, edge, lid), V(s1, edge, lid), V(s1, edge, lid + 2.4), V(s0, edge, lid + 2.4));
          const p = at(sm, edge + 2.2); quad(G.lamp, [p.x - 0.12, lid - 0.015, p.z - 0.12], [p.x + 0.12, lid - 0.015, p.z - 0.12], [p.x + 0.12, lid - 0.015, p.z + 0.12], [p.x - 0.12, lid - 0.015, p.z + 0.12]); }
        for (let u = U(sp.a, edge) + 1; u < U(sp.b, edge); u += 7) { const s = S(u, edge); bar(G.pier, V(s, edge + 0.35, y0), V(s, edge + 0.35, lid), 0.13, 8); } } }
      return;
    }
    // the walkway's inner edge, its face down to the row in front, and a rail wherever that is a real drop
    const edge = []; let bays = 0;
    spans.forEach((sp, i) => {
      const D = Dback(sp.kt), yk = sp.open ? 0 : RB.yOf(sp.kt), cuts = cutsOf(sp.a, sp.b), nx = spans[(i + 1) % spans.length];
      cuts.forEach((s, j) => { const q = XZ(s, D), last = edge[edge.length - 1]; if (!last || dist(last, q) > 1e-3) edge.push(q); if (!j) return; const s0 = cuts[j - 1];
        if (walkY - yk > 0.01) quad(sp.open ? G.wall : G.slab, V(s0, D, yk), V(s, D, yk), V(s, D, walkY), V(s0, D, walkY)); if (walkY - yk >= 0.7) glassRail(XZ(s0, D), q, walkY); });
      if (sp.open) portal(sp.a, sp.b, D, walkY - 0.5);
      if (nx.kt !== sp.kt) { const lo = Math.min(sp.kt, nx.kt), hi = Math.max(sp.kt, nx.kt), yl = sp.open || nx.open ? 0 : RB.yOf(lo), railTo = Math.min(hi, Math.floor((walkY - 0.7 - plinth) / rise + 1e-6));
        quad(G.slab, V(sp.b, Dback(lo), yl), V(sp.b, Dback(hi), yl), V(sp.b, Dback(hi), walkY), V(sp.b, Dback(lo), walkY));
        for (let j = lo; j < railTo; j++) glassRail(XZ(sp.b, Dback(j)), XZ(sp.b, Dback(j + 1)), walkY); }
    });
    if (edge.length > 2 && dist(edge[0], edge[edge.length - 1]) < 1e-3) edge.pop(); ringEdge = edge;
    for (const q of seats.values()) if (q.access && RB.secs.has(q.sid)) bays++; ringBays = bays;
    for (const s of map.sections) { if (!RB.secs.has(s.id)) continue; const own = RB.runs.filter((r) => r.sid === s.id && !r.plat); if (!own.length) continue; const ref = own[0].a, mid = own.reduce((n, r) => n + ((r.a + r.b) / 2 - ref), 0) / own.length + ref, o = at(mid, Dback(edgeAt(mid).kt) + 1.1); signs.push({ x: o.x, z: o.z, fx: -o.nx, fz: -o.nz, name: s.name }); }
  };
  yield;
  if (RB) yield* ringStand(RB, 0, true);
  yield;
  if (RC) yield* ringStand(RC, RC.floor, false);

  yield;
  for (const s of map.sections) {
    const ring = s.boundary?.[0]; if (!ring || ring.length < 3) continue;
    const pts = simplify(ring, 0.18 / mpu), xz = pts.map((p) => PN(p, s.id)), base = baseOf.get(s.id) || 0, kindOfSection = kinds.get(s.id), up = lifted.has(s.id), bowl = kindOfSection === 'bowl' && low(s);
    outlines.push({ id: s.id, pts }); if (xz.length < 3 || RB?.secs.has(s.id) || RC?.secs.has(s.id)) continue; // the rebuilt bowl is already standing
    if (bowl) lowerRing.push(...xz);
    if (kindOfSection === 'ga') { // standing areas and lounges: a flat deck; above the bowl they are part of the concourse
      if (lift && profile.top?.test(s.name)) { // the floor above the suites: one long closed room with a flat floor and a glass wall, floor to ceiling, on the side that looks at the rink
        if (!profile.loungeGlazed) { const y = roomTop; cap(G.deck, xz, y); band(G.dark, xz, y - 0.7, y); for (let i = 0; i < xz.length; i++) glassRail(xz[i], xz[(i + 1) % xz.length], y); continue; } // not a glazed room in this venue: an open deck with a rail
        const y = roomTop, top = y + 2.8; cap(G.carpet, xz, y); band(G.dark, xz, y - 0.7, y); cap(G.ceil, xz, top - 0.01); band(G.dark, xz, top, top + 0.5); cap(G.dark, xz, top + 0.5);
        const cx = xz.reduce((n, p) => n + p[0], 0) / xz.length, cz = xz.reduce((n, p) => n + p[1], 0) / xz.length;
        for (let i = 0; i < xz.length; i++) {
          const a = xz[i], b = xz[(i + 1) % xz.length], len = dist(a, b); if (len < 0.2) continue;
          let nx = (b[1] - a[1]) / len, nz = -(b[0] - a[0]) / len; const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2; if (nx * (mx - cx) + nz * (mz - cz) < 0) { nx = -nx; nz = -nz; } // outward
          if (nx * -mx + nz * -mz > 0.35 * Math.hypot(mx, mz)) { quad(G.glass, [a[0], y, a[1]], [b[0], y, b[1]], [b[0], top, b[1]], [a[0], top, a[1]]); const n = Math.max(1, Math.round(len / 1.6)); for (let k = 0; k <= n; k++) { const px = a[0] + ((b[0] - a[0]) * k) / n, pz = a[1] + ((b[1] - a[1]) * k) / n; bar(G.rail, [px, y, pz], [px, top, pz], 0.025, 4); if (k < n && k % 2 === 0) { const qx = px + ((b[0] - a[0]) * 0.5) / n - nx * 1.6, qz = pz + ((b[1] - a[1]) * 0.5) / n - nz * 1.6; quad(G.lamp, [qx - 0.14, top - 0.02, qz - 0.14], [qx + 0.14, top - 0.02, qz - 0.14], [qx + 0.14, top - 0.02, qz + 0.14], [qx - 0.14, top - 0.02, qz + 0.14]); } } }
          else quad(G.warm, [a[0], y, a[1]], [b[0], y, b[1]], [b[0], top, b[1]], [a[0], top, a[1]]);
        }
        continue; }
      const onConcourse = !up && !low(s) && concourseY > 0, y = onConcourse ? walkY + 0.02 : base + (low(s) ? 0.1 : 0); cap(G.deck, xz, y);
      if (!up && !onConcourse) { band(G.wall, xz, 0, y); for (let i = 0; i < xz.length; i++) glassRail(xz[i], xz[(i + 1) % xz.length], y); }
      continue;
    }
    const own = s.seats.map((id) => seats.get(id)).filter(Boolean);
    const ys = xz.map((p) => { let best = base, bd = Infinity; for (const q of own) { const d = (q.x - p[0]) ** 2 + (q.z - p[1]) ** 2; if (d < bd) { bd = d; best = q.y; } } return best; });
    // the bowl is hollow under its steps: only the outline wall is drawn, so notches in the outline stay open as tunnels down to the event floor
    guards.push({ xz, ys, kind: kindOfSection, bowl });
    if (bowl) band(G.slab, xz, 0, ys.map((y) => y - 0.6)); else { cap(G.slab, xz, ys.map((y) => y - 0.45)); band(G.slab, xz, up ? ys.map((y) => y - 1.05) : 0, ys.map((y) => y - 0.45)); }
    const rows = s.rowIds.filter((id) => rowLine.has(id)).sort((a, b) => rowElev.get(a) - rowElev.get(b)), notch = [], ends = [[], []];
    rows.forEach((id, ri) => {
      const y = rowElev.get(id), below = ri ? rowElev.get(rows[ri - 1]) : bowl ? 0 : y - 0.5, rise = clamp(y - below, 0.12, 6) + 0.02, fr = 0.42, bk = Math.max(0.3, (pitchOf.get(id) || 0.88) - fr), src = rowLine.get(id), a = src[0], z = src[src.length - 1], platform = platformRows.has(id);
      const tan = (p, q) => { const x = q.x - p.x, zz = q.z - p.z, l = Math.hypot(x, zz); return l < 1e-6 ? [-p.fz, p.fx] : [x / l, zz / l]; };
      const t0 = src.length > 1 ? tan(src[1], a) : [a.fz, -a.fx], t1 = src.length > 1 ? tan(src[src.length - 2], z) : [-a.fz, a.fx];
      const shift = (p, t, e) => ({ ...p, x: p.x + t[0] * e, z: p.z + t[1] * e });
      // a row end either runs out to the section edge, or stops just past its last seat where an aisle begins; the aisle is then built once, as its own stair
      const endOf = (p, t) => { const own = reach([p.x, p.z], t, xz), gap = kindOfSection === 'suite' || platform ? 0 : neighbourGap(s.id, p, t), w = gap ? gap - 0.6 : own - 0.3; return kindOfSection !== 'suite' && !platform && w >= 0.6 ? { ext: 0.3, aisle: { p, t, y, fr, bk, w } } : { ext: own, aisle: null }; };
      const end0 = endOf(a, t0), end1 = endOf(z, t1), e0 = end0.ext, e1 = end1.ext; ends[0][ri] = end0.aisle; ends[1][ri] = end1.aisle;
      // spans of step: a row is cut where the outline is notched (a tunnel or an empty bay), and each side runs to the notch wall
      const spans = [[shift(a, t0, e0)]], zones = [];
      src.forEach((p, i) => {
        const q = src[i + 1], span = spans[spans.length - 1]; span.push(p); if (!q) return;
        const gap = Math.hypot(q.x - p.x, q.z - p.z); if (gap < 0.8) return;
        if (insidePoly((p.x + q.x) / 2, (p.z + q.z) / 2, xz)) { if (gap <= 2.3 && !platform) zones.push([p, q, 0.5]); return; }
        const t = tan(p, q), wp = shift(p, t, reach([p.x, p.z], t, xz, gap)), wq = shift(q, [-t[0], -t[1]], reach([q.x, q.z], [-t[0], -t[1]], xz, gap));
        span.push(wp); spans.push([wq]); notch.push({ ri, y, wp, wq, fr, bk });
      });
      spans[spans.length - 1].push(shift(z, t1, e1));
      const frAt = (p) => (ri === 0 && bowl ? reach([p.x, p.z], [p.fx, p.fz], xz, 2.5, fr) : platform && ri ? 0.75 : fr), bkAt = (p) => (ri === rows.length - 1 ? reach([p.x, p.z], [-p.fx, -p.fz], xz, 3.5, bk) + 0.4 : bk + 0.3); // each step tucks under the riser of the row behind, so no slot opens between rows on a curve
      const F = (p) => { const d = frAt(p); return [p.x + p.fx * d, p.z + p.fz * d]; }, B = (p) => { const d = bkAt(p); return [p.x - p.fx * d, p.z - p.fz * d]; };
      for (const line of spans) {
        for (let i = 0; i < line.length - 1; i++) {
          const pf = F(line[i]), qf = F(line[i + 1]), pb = B(line[i]), qb = B(line[i + 1]);
          quad(G.tread, [pb[0], y, pb[1]], [qb[0], y, qb[1]], [qf[0], y, qf[1]], [pf[0], y, pf[1]]);
          quad(G.riser, [pf[0], y - rise - 0.12, pf[1]], [qf[0], y - rise - 0.12, qf[1]], [qf[0], y, qf[1]], [pf[0], y, pf[1]]);
          if (bowl && ri === rows.length - 1 && y - walkY > 0.05) quad(G.riser, [pb[0], walkY, pb[1]], [qb[0], walkY, qb[1]], [qb[0], y, qb[1]], [pb[0], y, pb[1]]); // the kerb the top row stands on
          if (bowl && ri === rows.length - 1 && i === (line.length >> 1) && !platform) signs.push({ x: (pb[0] + qb[0]) / 2 - line[i].fx * 1.1, z: (pb[1] + qb[1]) / 2 - line[i].fz * 1.1, fx: line[i].fx, fz: line[i].fz, name: s.name });
          if (platform && ri && bowl) glassRail(pf, qf, y, y, 0.8); // guard along the front of a wheelchair platform
        }
        for (const p of [line[0], line[line.length - 1]]) { const f = F(p), b = B(p), drop = Math.max(rise, 0.8); quad(G.riser, [b[0], y - drop, b[1]], [f[0], y - drop, f[1]], [f[0], y, f[1]], [b[0], y, b[1]]); }
      }
      if (platform) { for (const p of src) accessSpots.push(p); return; }
      // aisles: wherever a row stops short of the section edge, or has a seat-free gap, add the half step between rows, a nosing line and a handrail
      if (!ri || kindOfSection === 'suite' || y - below > 0.6) return;
      const half = (fr + bk) / 2, lowY = below, midY = (y + lowY) / 2, off = (p, d) => [p.x + p.fx * d, p.z + p.fz * d];
      for (const [p, q, railAt] of zones) {
        const dx = q.x - p.x, dz = q.z - p.z, len = Math.hypot(dx, dz) || 1, ux = dx / len, uz = dz / len, m = 0.28; if (len - m * (railAt === 1 ? 1 : 2) < 0.4) continue;
        const A = { x: p.x + ux * m, z: p.z + uz * m, fx: p.fx, fz: p.fz }, E = railAt === 1 ? { x: q.x, z: q.z, fx: p.fx, fz: p.fz } : { x: q.x - ux * m, z: q.z - uz * m, fx: q.fx, fz: q.fz };
        const a1 = off(A, fr), b1 = off(E, fr), a2 = off(A, fr + half), b2 = off(E, fr + half);
        quad(G.stair, [a1[0], midY, a1[1]], [b1[0], midY, b1[1]], [b2[0], midY, b2[1]], [a2[0], midY, a2[1]]);
        quad(ri % 2 ? G.art : G.art2, [a2[0], lowY, a2[1]], [b2[0], lowY, b2[1]], [b2[0], midY, b2[1]], [a2[0], midY, a2[1]]); { const a3 = off(A, fr + 0.006), b3 = off(E, fr + 0.006); quad(ri % 2 ? G.art2 : G.art, [a3[0], midY, a3[1]], [b3[0], midY, b3[1]], [b3[0], y, b3[1]], [a3[0], y, a3[1]]); }
        for (const [d, yy] of [[fr, y], [fr + half, midY]]) { const n1 = off(A, d - 0.07), n2 = off(E, d - 0.07), n3 = off(E, d), n4 = off(A, d); quad(G.nosing, [n1[0], yy + 0.006, n1[1]], [n2[0], yy + 0.006, n2[1]], [n3[0], yy + 0.006, n3[1]], [n4[0], yy + 0.006, n4[1]]); }
        if (ri % 2 === 0) continue;
        const R = railAt === 1 ? E : { x: (A.x + E.x) / 2, z: (A.z + E.z) / 2, fx: p.fx, fz: p.fz }; if (railSeen.some((q) => (q[0] - R.x) ** 2 + (q[1] - R.z) ** 2 < 0.36 && Math.abs(q[2] - y) < 0.2 || (q[0] - R.x) ** 2 + (q[1] - R.z) ** 2 < 1.7 && Math.abs(q[2] - y) < 0.2 && q[3] !== s.id)) continue; railSeen.push([R.x, R.z, y, s.id]); aisleRails++;
        const hi = off(R, -0.12), lo = off(R, fr + bk - 0.12), topEnd = [hi[0], y + 0.9, hi[1]], bottomEnd = [lo[0], lowY + 0.9, lo[1]];
        bar(G.rail, [hi[0], y, hi[1]], topEnd, 0.02); bar(G.rail, [lo[0], lowY, lo[1]], bottomEnd, 0.02); bar(G.rail, topEnd, bottomEnd, 0.024);
      }
    });
    // Aisles. Each is one stair, built once from one side: two even steps per row whose edges are shared from step to step, so nothing can open
    // between them on a curve; closed sides; and a short handrail on every second row. The neighbouring block's rows simply meet its side.
    for (const list of ends) {
      const run = list.filter(Boolean); if (run.length < 2) continue;
      const widths = run.map((r) => r.w).sort((p, q) => p - q), w = clamp(widths[widths.length >> 1], 0.7, 2.6), far = 0.3 + w + 0.12;
      const at = (r, along, forward) => [r.p.x + r.t[0] * along + r.p.fx * forward, r.p.z + r.t[1] * along + r.p.fz * forward], mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      const steps = run.map((r, k) => { const nx = run[k + 1], iF = at(r, 0.18, r.fr), oF = at(r, far, r.fr), iN = nx ? at(nx, 0.18, nx.fr) : at(r, 0.18, -(r.bk + 0.7)), oN = nx ? at(nx, far, nx.fr) : at(r, far, -(r.bk + 0.7)), iM = mid(iF, iN), oM = mid(oF, oN); return { r, iF, oF, iN, oN, iM, oM, c: [(iM[0] + oM[0] + iN[0] + oN[0]) / 4, (iM[1] + oM[1] + iN[1] + oN[1]) / 4] }; });
      if (steps.filter((st) => aisleSeen.some((q) => (q[0] - st.c[0]) ** 2 + (q[1] - st.c[1]) ** 2 < 1.3 && Math.abs(q[2] - st.r.y) < 1)).length > steps.length * 0.4) continue; // the neighbour already built this aisle
      for (const st of steps) aisleSeen.push([st.c[0], st.c[1], st.r.y]);
      steps.forEach((st, k) => {
        const y = st.r.y, prev = k ? run[k - 1].y : bowl ? 0 : y - 0.5, half = y - prev > 0.7 || y - prev < 0.05 ? y : (prev + y) / 2, V = (p, h) => [p[0], h, p[1]];
        quad(G.stair, V(st.iF, half), V(st.oF, half), V(st.oM, half), V(st.iM, half)); quad(G.stair, V(st.iM, y), V(st.oM, y), V(st.oN, y), V(st.iN, y));
        quad(k % 2 ? G.art : G.art2, V(st.iF, prev - 0.12), V(st.oF, prev - 0.12), V(st.oF, half), V(st.iF, half)); if (y - half > 0.02) quad(k % 2 ? G.art2 : G.art, V(st.iM, half), V(st.oM, half), V(st.oM, y), V(st.iM, y));
        for (const [p, q, h] of [[st.iF, st.iM, half], [st.iM, st.iN, y], [st.oF, st.oM, half], [st.oM, st.oN, y]]) quad(G.riser, V(p, h - 1), V(q, h - 1), V(q, h), V(p, h));
        if (k % 2 === 1) { const lo = steps[k - 1], a0 = V(lo.c, lo.r.y), b0 = V(st.c, y), a1 = V(lo.c, lo.r.y + 0.9), b1 = V(st.c, y + 0.9); bar(G.rail, a0, a1, 0.02); bar(G.rail, b0, b1, 0.02); bar(G.rail, a1, b1, 0.024); aisleRails++; }
      });
    }
    // tunnels and empty bays: rails along both walls of each notched row, a guard across the top and the dark mouth of the passage under the stand
    notch.sort((a, b) => a.ri - b.ri);
    for (let i = 0; i < notch.length; i++) {
      const n = notch[i], next = notch[i + 1], more = next && next.ri === n.ri + 1 && Math.hypot(next.wp.x - n.wp.x, next.wp.z - n.wp.z) < 2.5;
      if (more) continue; tunnels++;
      const pb = [n.wp.x - n.wp.fx * n.bk, n.wp.z - n.wp.fz * n.bk], qb = [n.wq.x - n.wq.fx * n.bk, n.wq.z - n.wq.fz * n.bk], above = rows[n.ri + 1] ? rowElev.get(rows[n.ri + 1]) : n.y;
      const hgt = Math.min(2.5, above - 0.12), nx = n.wp.fx * 0.05, nz = n.wp.fz * 0.05; if (hgt > 1.2) { quad(G.portal, [pb[0] + nx, 0, pb[1] + nz], [qb[0] + nx, 0, qb[1] + nz], [qb[0] + nx, hgt, qb[1] + nz], [pb[0] + nx, hgt, pb[1] + nz]); { const mxp = (pb[0] + qb[0]) / 2 + nx * 2, mzp = (pb[1] + qb[1]) / 2 + nz * 2, wl = Math.hypot(qb[0] - pb[0], qb[1] - pb[1]) || 1, ux = ((qb[0] - pb[0]) / wl) * 0.55, uz = ((qb[1] - pb[1]) / wl) * 0.55, dh = Math.min(2.05, hgt - 0.2); quad(G.door, [mxp - ux, 0, mzp - uz], [mxp + ux, 0, mzp + uz], [mxp + ux, dh, mzp + uz], [mxp - ux, dh, mzp - uz]); } quad(G.wall, [pb[0], 0, pb[1]], [qb[0], 0, qb[1]], [qb[0], above, qb[1]], [pb[0], above, pb[1]]); }
    }
    if (kindOfSection === 'suite' && own.length) { // a suite: balcony rows in front, a lit room behind, sponsor fascia below, columns between neighbours
      let fx = 0, fz = 0; for (const q of own) { fx += q.fx; fz += q.fz; } const fl = Math.hypot(fx, fz) || 1; fx /= fl; fz /= fl;
      const tx = -fz, tz = fx, cx = xz.reduce((n, p) => n + p[0], 0) / xz.length, cz = xz.reduce((n, p) => n + p[1], 0) / xz.length;
      let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
      for (const p of xz) { const a = (p[0] - cx) * tx + (p[1] - cz) * tz, b = (p[0] - cx) * fx + (p[1] - cz) * fz; a0 = Math.min(a0, a); a1 = Math.max(a1, a); b0 = Math.min(b0, b); b1 = Math.max(b1, b); }
      const y0 = Math.min(...own.map((q) => q.y)), floor = Math.max(...own.map((q) => q.y)) + (Math.max(...own.map((q) => q.y)) - y0 > 0.05 ? 0.34 : 0), ceil = floor + 2.9, back = b0 - 5, front = b1 + 0.5;
      const at = (a, b, y) => [cx + tx * a + fx * b, y, cz + tz * a + fz * b];
      { const lay = floor - y0 > 0.05 ? b0 : front - 0.02, h = floor + (floor - y0 > 0.05 ? 0 : 0.006); quad(G.carpet, at(a0, back, h), at(a1, back, h), at(a1, lay, h), at(a0, lay, h)); } // carpet through the whole room, out to the glass
      quad(G.warm, at(a0, back, floor), at(a1, back, floor), at(a1, back, ceil), at(a0, back, ceil));
      for (const a of [a0, a1]) quad(G.warmSide, at(a, back, floor), at(a, b0, floor), at(a, b0, ceil), at(a, back, ceil));
      quad(G.ceil, at(a0, back, ceil), at(a1, back, ceil), at(a1, front, ceil), at(a0, front, ceil));
      quad(G.soffit, at(a0, back, y0 - 1.25), at(a1, back, y0 - 1.25), at(a1, front, y0 - 1.25), at(a0, front, y0 - 1.25)); // the pale ceiling over the walkway
      quad(G.dark, at(a0, front, ceil), at(a1, front, ceil), at(a1, front, ceil + 0.7), at(a0, front, ceil + 0.7));
      quad(G.sign, at(a1, front, y0 - 1.25), at(a0, front, y0 - 1.25), at(a0, front, y0 + 0.05), at(a1, front, y0 + 0.05));
      quad(G.dark, at(a0, front - 0.04, y0 - 1.25), at(a1, front - 0.04, y0 - 1.25), at(a1, front - 0.04, y0 + 0.05), at(a0, front - 0.04, y0 + 0.05));
      quad(G.glass, at(a0, front, y0 + 0.05), at(a1, front, y0 + 0.05), at(a1, front, y0 + 1), at(a0, front, y0 + 1)); bar(G.rail, at(a0, front, y0 + 1), at(a1, front, y0 + 1), 0.024); // open to the hall: a glass balustrade with a rail
      for (const a of [a0, a1]) quad(G.glass, at(a, b0, y0 + 0.05), at(a, front, y0 + 0.05), at(a, front, y0 + 1), at(a, b0, floor + 1));
      for (const a of [a0, a1]) { const h = 0.26, c = [[-h, -h], [h, -h], [h, h], [-h, h]].map(([da, db]) => at(a + da, b0 - 0.1 + db, 0)); for (let i = 0; i < 4; i++) { const p = c[i], q = c[(i + 1) % 4]; quad(G.pier, [p[0], walkY, p[2]], [q[0], walkY, q[2]], [q[0], ceil, q[2]], [p[0], ceil, p[2]]); } } // grey structural columns up through the walkway
      quad(G.lamp, at(a0 + 0.5, b0 - 3.1, y0 - 1.28), at(a1 - 0.5, b0 - 3.1, y0 - 1.28), at(a1 - 0.5, b0 - 2.3, y0 - 1.28), at(a0 + 0.5, b0 - 2.3, y0 - 1.28)); // a light panel in the ceiling over the walkway
      // The room behind the seats, fitted out as the venue's suites are: a bar counter with stools across the opening, a sofa and low table, a counter unit
      // along one wall with a television over it, a framed jersey on the other, a door at the back and downlights in a pale ceiling.
      if (profile.suiteRooms === 'furnished') { const ob = (g, A0, A1, Y0, Y1, B0, B1) => { const c = [[A0, B0], [A1, B0], [A1, B1], [A0, B1]]; quad(g, at(A0, B0, Y1), at(A1, B0, Y1), at(A1, B1, Y1), at(A0, B1, Y1)); for (let i = 0; i < 4; i++) { const p = c[i], q = c[(i + 1) % 4]; quad(g, at(p[0], p[1], Y0), at(q[0], q[1], Y0), at(q[0], q[1], Y1), at(p[0], p[1], Y1)); } };
        const wide = a1 - a0, bar0 = a0 + 0.35, bar1 = a1 - Math.min(1.1, wide * 0.3), stools = Math.max(2, Math.min(4, Math.floor((bar1 - bar0) / 0.75)));
        ob(G.wood, bar0, bar1, floor + 1.0, floor + 1.06, b0 - 0.6, b0 - 0.12); ob(G.wood, bar0 + 0.05, bar1 - 0.05, floor, floor + 1.0, b0 - 0.3, b0 - 0.22);
        for (let i = 0; i < stools; i++) { const a = bar0 + ((bar1 - bar0) * (i + 0.5)) / stools; ob(G.fabric, a - 0.2, a + 0.2, floor + 0.7, floor + 0.77, b0 - 1.1, b0 - 0.72); ob(G.wood, a - 0.2, a + 0.2, floor + 0.77, floor + 1.12, b0 - 1.12, b0 - 1.08); for (const [da, db] of [[-0.17, -1.07], [0.17, -1.07], [-0.17, -0.75], [0.17, -0.75]]) ob(G.wood, a + da - 0.02, a + da + 0.02, floor, floor + 0.7, b0 + db - 0.02, b0 + db + 0.02); }
        ob(G.fabric, a0 + 0.12, a0 + 0.95, floor + 0.12, floor + 0.44, back + 1.1, back + 2.9); ob(G.fabric, a0 + 0.12, a0 + 0.32, floor + 0.44, floor + 0.86, back + 1.1, back + 2.9); for (const b of [back + 1.1, back + 2.78]) ob(G.wood, a0 + 0.12, a0 + 0.95, floor, floor + 0.6, b, b + 0.12); // sofa against the wall
        if (wide > 3) ob(G.wood, a0 + 1.35, Math.min(a1 - 1.3, a0 + 2.25), floor + 0.38, floor + 0.44, back + 1.5, back + 2.5); // low table
        ob(G.unit, a1 - 0.72, a1 - 0.1, floor, floor + 0.9, back + 0.35, back + 2.5); ob(G.wood, a1 - 0.75, a1 - 0.1, floor + 0.9, floor + 0.94, back + 0.32, back + 2.53);
        quad(G.screen, at(a1 - 0.06, back + 2.9, floor + 1.55), at(a1 - 0.06, back + 4.0, floor + 1.55), at(a1 - 0.06, back + 4.0, floor + 2.2), at(a1 - 0.06, back + 2.9, floor + 2.2));
        quad(G.wood, at(a0 + 0.05, back + 2.0, floor + 1.15), at(a0 + 0.05, back + 2.75, floor + 1.15), at(a0 + 0.05, back + 2.75, floor + 2.25), at(a0 + 0.05, back + 2.0, floor + 2.25)); quad(G.jersey, at(a0 + 0.07, back + 2.08, floor + 1.25), at(a0 + 0.07, back + 2.67, floor + 1.25), at(a0 + 0.07, back + 2.67, floor + 2.15), at(a0 + 0.07, back + 2.08, floor + 2.15));
        quad(G.leaf, at(a0 + 0.3, back + 0.04, floor), at(a0 + 1.2, back + 0.04, floor), at(a0 + 1.2, back + 0.04, floor + 2.05), at(a0 + 0.3, back + 0.04, floor + 2.05));
        for (const fa of [0.3, 0.7]) for (const fb of [1.4, 3.6]) { const a = a0 + wide * fa, b = back + fb; quad(G.lamp, at(a - 0.11, b - 0.11, ceil - 0.012), at(a + 0.11, b - 0.11, ceil - 0.012), at(a + 0.11, b + 0.11, ceil - 0.012), at(a - 0.11, b + 0.11, ceil - 0.012)); }
      }
    }
  }
  // fixed boxes from the artwork (the press box) are fitted out as an office: a sill and full glazing with mullions, a lit back wall, desks with screens, ceiling lights
  yield;
  for (const s of shapes) {
    if (!s.spatial3D?.box || !(s.boundary?.[0]?.length > 2)) continue;
    const xz = simplify(s.boundary[0], 0.18 / mpu).map(P), y = (Number(s.spatial3D.baseElevation) || 0) + plinth + lift; if (xz.length < 3) continue;
    cap(G.deck, xz, y); band(G.wall, xz, y - 1.25, y + 0.85); band(G.glass, xz, y + 0.85, y + 2.7); band(G.dark, xz, y + 2.7, y + 3.2); cap(G.dark, xz, y + 3.2); cap(G.column, xz, y + 2.68);
    for (let i = 0; i < xz.length; i++) { const a = xz[i], b = xz[(i + 1) % xz.length], n = Math.max(1, Math.round(dist(a, b) / 1.8)); for (let k = 0; k < n; k++) { const px = a[0] + ((b[0] - a[0]) * k) / n, pz = a[1] + ((b[1] - a[1]) * k) / n; bar(G.rail, [px, y + 0.85, pz], [px, y + 2.7, pz], 0.035, 4); } }
    const bb = bboxOf(xz.map(([x, z]) => ({ x, y: z }))), alongX = bb.w >= bb.h, cz = (bb.y0 + bb.y1) / 2, cx = (bb.x0 + bb.x1) / 2, backZ = alongX ? (Math.abs(bb.y0) > Math.abs(bb.y1) ? bb.y0 + 0.25 : bb.y1 - 0.25) : cz, backX = alongX ? cx : (Math.abs(bb.x0) > Math.abs(bb.x1) ? bb.x0 + 0.25 : bb.x1 - 0.25), inward = alongX ? Math.sign(-backZ) || 1 : Math.sign(-backX) || 1;
    if (alongX) quad(G.warm, [bb.x0 + 0.3, y, backZ], [bb.x1 - 0.3, y, backZ], [bb.x1 - 0.3, y + 2.6, backZ], [bb.x0 + 0.3, y + 2.6, backZ]); else quad(G.warm, [backX, y, bb.y0 + 0.3], [backX, y, bb.y1 - 0.3], [backX, y + 2.6, bb.y1 - 0.3], [backX, y + 2.6, bb.y0 + 0.3]);
    const span = (alongX ? bb.w : bb.h) - 1.6, desks = Math.max(1, Math.floor(span / 2.6)), depth = (alongX ? bb.h : bb.w);
    for (let k = 0; k < desks; k++) {
      const u = (alongX ? bb.x0 : bb.y0) + 0.8 + (span * (k + 0.5)) / desks, v = (alongX ? backZ : backX) + inward * depth * 0.45, put = (g, u0, u1, y0, y1, v0, v1) => (alongX ? box(g, u0, u1, y0, y1, Math.min(v0, v1), Math.max(v0, v1)) : box(g, Math.min(v0, v1), Math.max(v0, v1), y0, y1, u0, u1));
      put(G.desk, u - 0.8, u + 0.8, y + 0.7, y + 0.76, v - 0.38, v + 0.38); put(G.dark, u - 0.75, u - 0.68, y, y + 0.7, v - 0.34, v + 0.34); put(G.dark, u + 0.68, u + 0.75, y, y + 0.7, v - 0.34, v + 0.34);
      put(G.dark, u - 0.3, u + 0.3, y + 0.86, y + 1.22, v - inward * 0.06, v - inward * 0.02); put(G.bench, u - 0.25, u + 0.25, y + 0.42, y + 0.5, v - inward * 0.85, v - inward * 0.45); put(G.bench, u - 0.25, u + 0.25, y + 0.5, y + 1, v - inward * 0.9, v - inward * 0.84);
      put(G.lamp, u - 0.6, u + 0.6, y + 2.6, y + 2.66, v - 0.1, v + 0.1);
    }
  }
  // the inactive bay beside the ice is the team benches: a rubber floor, two benches, boards and glass behind
  yield;
  for (const s of shapes) {
    if (!hockey || !profile.surface.benches || !s.groupPath?.some((p) => /inactive/i.test(p)) || !(s.boundary?.[0]?.length > 2)) continue;
    const xz = simplify(s.boundary[0], 0.18 / mpu).map(P), bb = bboxOf(xz.map(([x, y]) => ({ x, y }))), alongX = bb.w >= bb.h, outer = alongX ? (Math.abs(bb.y1) > Math.abs(bb.y0) ? bb.y1 : bb.y0) : (Math.abs(bb.x1) > Math.abs(bb.x0) ? bb.x1 : bb.x0), inward = outer > 0 ? -1 : 1;
    const inner = alongX ? (Math.abs(bb.y1) > Math.abs(bb.y0) ? bb.y0 : bb.y1) : (Math.abs(bb.x1) > Math.abs(bb.x0) ? bb.x0 : bb.x1); // the side by the boards. No wall or rail round the bay: the floor beside the ice stays open to walk on
    for (const [u0, u1] of alongX ? [[bb.x0 + 0.6, (bb.x0 + bb.x1) / 2 - 0.9], [(bb.x0 + bb.x1) / 2 + 0.9, bb.x1 - 0.6]] : [[bb.y0 + 0.6, (bb.y0 + bb.y1) / 2 - 0.9], [(bb.y0 + bb.y1) / 2 + 0.9, bb.y1 - 0.6]]) {
      const side = Math.sign(outer) || 1, d0 = side * ((alongX === longX ? W : L) / 2 + 0.3), d1 = d0 + side * 0.45, // against the boards, as team benches are; the walkway passes behind them
        lo = Math.min(d0, d1), hi = Math.max(d0, d1); if (alongX) box(G.bench, u0, u1, 0, 0.45, lo, hi); else box(G.bench, lo, hi, 0, 0.45, u0, u1);
    }
  }

  yield;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(C.bg); scene.fog = new THREE.Fog(0x1c2028, 40, 230); // a little haze in the air, so distance reads
  // image-based light from a stand-in arena (dark hall, bright lamps above, pale ice below) gives metal and glossy surfaces something to reflect
  yield;
  { const env = new THREE.Scene(); env.background = new THREE.Color(0x24262b); const lamp = new THREE.MeshBasicMaterial({ color: new THREE.Color(14, 13.4, 12.4) }), ice = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.6, 1.7) });
    for (let i = -6; i <= 6; i++) for (const j of [-1, 1]) { const m = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.2, 0.9), lamp); m.position.set(i * 2.6, 12, j * 6.5); env.add(m); }
    const floor = new THREE.Mesh(new THREE.BoxGeometry(40, 0.2, 18), ice); floor.position.y = -6; env.add(floor);
    const pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(env, 0.03).texture; pmrem.dispose(); }
  scene.add(new THREE.HemisphereLight(0xfff4e2, 0x9fb6dc, 0.32)); // soft fill: pale from the lit roof, cool from the ice
  yield;
  const key = new THREE.DirectionalLight(0xfff6ea, 1.8); key.position.set(3, 95, 5); // the ceiling rows: light falls almost straight down, so shadows sit under things
  key.castShadow = true;
  yield;
  const big = renderer.capabilities.maxTextureSize >= 4096 && !matchMedia('(pointer: coarse)').matches ? 4096 : 2048; key.shadow.mapSize.set(big, big);
  Object.assign(key.shadow.camera, { left: -75, right: 75, top: 55, bottom: -55, near: 10, far: 160 }); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.04; key.shadow.radius = 2.5; scene.add(key);
  yield;
  for (const x of [-L / 4, L / 4]) { const ice = new THREE.PointLight(0xe4eeff, 4.6, 0, 0.6); ice.position.set(x, 2.5, 0); scene.add(ice); } // the ice throws light back up and outward: faces turned to the rink are brighter than backs
  // the light comes from where the fixtures hang: spots along the two rows, cross-aimed at the ice, so brightness falls off toward the walls and roof as it
  // does in the hall, with pale light bounced back up off the ice. Nothing moves, so this is worked out once per vertex (and per seat) and stored as colour,
  // not run as live lights: thirteen live lights tripled the frame time. Faint cones show the beams in the haze.
  yield;
  const lamps = [], bounces = [];
  yield;
  { const few = matchMedia('(pointer: coarse)').matches, per = few ? 3 : 5, fy = H - 3.8, beam = new THREE.ShaderMaterial({ blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false, // a shaft of light in clear air: barely there, brightest near the lamp, and with no edge (it thins to nothing where the cone turns away from the eye)
      vertexShader: 'varying vec3 vN; varying vec3 vP; varying vec2 vUv; void main(){ vUv = uv; vN = normalMatrix * normal; vec4 mv = modelViewMatrix * vec4(position, 1.0); vP = mv.xyz; gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'varying vec3 vN; varying vec3 vP; varying vec2 vUv; void main(){ float face = pow(abs(dot(normalize(vN), normalize(-vP))), 3.0), t = 1.0 - vUv.y, along = smoothstep(0.0, 0.05, t) * exp(-t * 2.8); gl_FragColor = vec4(vec3(1.0, 0.96, 0.88) * along * face * 0.22, 1.0); }' });
    for (const side of [-1, 1]) for (let i = 0; i < per; i++) {
      const x = -L / 2 + (L * (i + 0.5)) / per, z = side * (W / 2 + 2.2), aim = new THREE.Vector3(0, -fy, -side * W * 0.16 - z).normalize(); lamps.push({ x, y: fy, z, dx: aim.x, dy: aim.y, dz: aim.z, power: (few ? 5 / 3 : 1) * 380 });
      const h = fy - 0.2, cone = new THREE.Mesh(new THREE.ConeGeometry(h * 0.5, h, 20, 1, true).translate(0, -h / 2, 0), beam), dir = new THREE.Vector3(0, -fy, -side * W * 0.16 - z).normalize();
      cone.position.set(x, fy, z); cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir); cone.renderOrder = 5; scene.add(cone);
    }
    for (const x of [-L * 0.3, 0, L * 0.3]) bounces.push({ x, y: 1.6, z: 0, power: 95 });
  }
  yield;
  const coneCos = Math.cos(1.02), softCos = Math.cos(1.02 * 0.15);
  yield;
  const shade = (x, y, z) => {
    let e = 0;
    for (const l of lamps) { const vx = x - l.x, vy = y - l.y, vz = z - l.z, d2 = vx * vx + vy * vy + vz * vz, c = (vx * l.dx + vy * l.dy + vz * l.dz) / Math.sqrt(d2 || 1); if (c <= coneCos) continue; const t = Math.min(1, (c - coneCos) / (softCos - coneCos)); e += (l.power * t * t * (3 - 2 * t)) / Math.max(d2, 4); }
    let eb = 0; for (const l of bounces) eb += l.power / Math.max((x - l.x) ** 2 + (y - l.y) ** 2 + (z - l.z) ** 2, 9);
    if (RB && y < suiteY - 0.5 && RB.dist(x, z) > RB.base + 16 * RB.pitch && Math.abs(longX ? z : x) > RB.core.hz + RB.base + 15.5 * RB.pitch) e *= 0.45; // under the suites the ceiling rows are out of sight
    const lamp = 1.3 * (1 - Math.exp(-e / 2)), ice = 0.5 * (1 - Math.exp(-eb / 1.1)); // lamps are warm, the light thrown back by the ice is cool, and what is left in shadow leans blue
    return [0.17 + lamp + ice * 0.8, 0.185 + lamp * 0.97 + ice * 0.92, 0.215 + lamp * 0.92 + ice * 1.08];
  };
  yield;
  const lambert = (color, extra) => new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide, ...extra });
  yield;
  const standard = (color, roughness, metalness = 0, extra) => new THREE.MeshStandardMaterial({ color, roughness, metalness, side: THREE.DoubleSide, ...extra });
  yield;
  const basic = (color, extra) => new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, ...extra });
  yield;
  const add = (g, material, { cast = true, receive = true, parent = scene, ao = null } = {}) => { // ao: a darkening for each of a quad's four corners, for surfaces built only from quads (the inner corner of a step, the foot of a wall)
    if (!g.i.length) return null; const geo = toGeometry(g), m = new THREE.Mesh(geo, material);
    if ((material.isMeshLambertMaterial || material.isMeshStandardMaterial) && !material.transparent) { const pos = geo.attributes.position, col = new Float32Array(pos.count * 3); for (let i = 0; i < pos.count; i++) { const c = shade(pos.getX(i), pos.getY(i), pos.getZ(i)), k = ao ? ao[i % 4] : 1; col[i * 3] = c[0] * k; col[i * 3 + 1] = c[1] * k; col[i * 3 + 2] = c[2] * k; } geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); material.vertexColors = true; }
    m.castShadow = cast; m.receiveShadow = receive; parent.add(m); return m; };
  // Glass. What makes glass read as glass is its reflection: each pane mirrors the hall (taken once, from the middle of the rink, further down), strongly at a
  // glancing angle and faintly square on, and that reflection stays at full strength even where the pane itself is almost clear.
  yield;
  const glasses = [];
  yield;
  const glassMaterial = () => { const m = standard(0x8fa3ad, 0.03, 0, { transparent: true, opacity: 0.1, depthWrite: false, envMapIntensity: 0.9, premultipliedAlpha: true });
    m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', 'float fres = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 4.0);\ndiffuseColor.a = mix(0.07, 0.4, fres);\nvec3 shine = reflectedLight.directSpecular + reflectedLight.indirectSpecular;\noutgoingLight = (outgoingLight - shine) + min(shine, vec3(1.4)) * mix(1.0, 1.8, fres) / diffuseColor.a;\n#include <opaque_fragment>'); }; glasses.push(m); return m; };
  // poured concrete is never one flat colour: broad blotches and a fine grain, laid in world space so they run on across joints
  yield;
  const lite = softwareGL(renderer);
  yield;
  const grain = (m, amount = 0.2) => { if (lite) return m; m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;\nfloat h3(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }\nfloat n3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(mix(h3(i), h3(i+vec3(1,0,0)), f.x), mix(h3(i+vec3(0,1,0)), h3(i+vec3(1,1,0)), f.x), f.y), mix(mix(h3(i+vec3(0,0,1)), h3(i+vec3(1,0,1)), f.x), mix(h3(i+vec3(0,1,1)), h3(i+vec3(1,1,1)), f.x), f.y), f.z); }')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= 1.0 - ' + amount.toFixed(2) + ' * (0.6 * n3(vWp * 0.8) + 0.4 * n3(vWp * 6.0) - 0.5);'); }; return m; };
  yield;
  const metal = () => standard(0x202225, 0.45, 0.6, { envMapIntensity: 0.9 }); // dark grey to black painted steel, as in the venue

  // concourse: a floor at the top of the lower bowl, between the bowl and the outer wall, with a rail at the bowl edge that opens at the wheelchair platforms
  yield;
  const perimeter = shapes.find((s) => s.name === 'venue_perimeter' || s.name === 'element_wrapper');
  yield;
  const shellPts = perimeter?.boundary?.[0]?.length > 2 ? simplify(perimeter.boundary[0], 0.4 / mpu).map(P)
    : roundedRect((mb.right - mb.x) * mpu + 16, (mb.bottom - mb.y) * mpu + 16, 12).map(([x, z]) => [x + ((mb.x + mb.right) / 2 - ox) * mpu, z + ((mb.y + mb.bottom) / 2 - oy) * mpu]);
  yield;
  let stepFree = 0;
  yield;
  if (ringEdge) {
    const o = G.concourse.p.length / 3, all = shellPts.concat(ringEdge); stepFree = ringBays;
    for (const f of THREE.ShapeUtils.triangulateShape(shellPts.map((p) => new THREE.Vector2(p[0], p[1])), [ringEdge.map((p) => new THREE.Vector2(p[0], p[1]))])) G.concourse.i.push(o + f[0], o + f[1], o + f[2]);
    for (const p of all) { G.concourse.p.push(p[0], walkY, p[1]); G.concourse.u.push(0, 0); }
  } else if (lowerRing.length > 2 && concourseY > 0) {
    const hull = convexHull(lowerRing), hx = hull.reduce((n, p) => n + p[0], 0) / hull.length, hz = hull.reduce((n, p) => n + p[1], 0) / hull.length;
    const edge = hull.map((p) => { const d = Math.hypot(p[0] - hx, p[1] - hz) || 1; return [p[0] + ((p[0] - hx) / d) * 0.35, p[1] + ((p[1] - hz) / d) * 0.35]; });
    const o = G.concourse.p.length / 3, all = shellPts.concat(edge);
    for (const f of THREE.ShapeUtils.triangulateShape(shellPts.map((p) => new THREE.Vector2(p[0], p[1])), [edge.map((p) => new THREE.Vector2(p[0], p[1]))])) G.concourse.i.push(o + f[0], o + f[1], o + f[2]);
    for (const p of all) { G.concourse.p.push(p[0], walkY, p[1]); G.concourse.u.push(0, 0); }
    band(G.wall, edge, 0, walkY); hullEdge = edge;
    const bays = accessSpots.filter((q) => Math.abs(q.y - walkY) < 0.05), tops = [...seats.values()], below = (x, z) => { let best = walkY, bd = 16; for (const q of tops) { const d = (q.x - x) ** 2 + (q.z - z) ** 2; if (d < bd) { bd = d; best = q.y; } } return walkY - best; }; stepFree = bays.length;
    for (let i = 0; i < edge.length; i++) {
      const a = edge[i], b = edge[(i + 1) % edge.length], n = Math.max(1, Math.round(dist(a, b) / 1.5));
      for (let k = 0; k < n; k++) { const p = [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n], q = [a[0] + ((b[0] - a[0]) * (k + 1)) / n, a[1] + ((b[1] - a[1]) * (k + 1)) / n], mx = (p[0] + q[0]) / 2, mz = (p[1] + q[1]) / 2; if (!bays.some((s) => (s.x - mx) ** 2 + (s.z - mz) ** 2 < 9) && below(mx, mz) > 0.9) glassRail(p, q, walkY); } // no rail behind a top row that meets the walkway, only where the walkway stands above a lower block
    }
  }
  yield;
  if (concourseY > 0) { const sc = shellPts.reduce((n, p) => [n[0] + p[0] / shellPts.length, n[1] + p[1] / shellPts.length], [0, 0]); band(G.sign, shellPts.map((p) => { const d = Math.hypot(p[0] - sc[0], p[1] - sc[1]) || 1; return [p[0] - ((p[0] - sc[0]) / d) * 0.25, p[1] - ((p[1] - sc[1]) / d) * 0.25]; }), suiteY - 1.25, suiteY + 0.05, true, -7); }
  yield;
  if (concourseY > 0) { const sc = shellPts.reduce((n, p) => [n[0] + p[0] / shellPts.length, n[1] + p[1] / shellPts.length], [0, 0]); band(G.shop, shellPts.map((p) => { const d = Math.hypot(p[0] - sc[0], p[1] - sc[1]) || 1; return [p[0] - ((p[0] - sc[0]) / d) * 0.3, p[1] - ((p[1] - sc[1]) / d) * 0.3]; }), walkY, walkY + 2.55, true, 16); }
  band(G.wall, shellPts, 0, H); cap(G.roof, shellPts, H); cap(G.floor, shellPts, -0.02);

  // guards: every edge of a seating block with a drop beside it gets a barrier, unless a neighbouring block or the concourse is there.
  // Edges that face the playing surface get frameless glass so the front rows keep their view; the rest get a railed glass panel.
  yield;
  let guardMetres = 0;
  yield;
  { const seated = guards.filter((g) => g.kind !== 'suite');
    for (const g of seated) for (let i = 0; i < g.xz.length; i++) {
      const j = (i + 1) % g.xz.length, a = g.xz[i], b = g.xz[j], ya = g.ys[i], yb = g.ys[j], len = dist(a, b); if (len < 0.3 || Math.max(ya, yb) - (g.bowl ? 0 : concourseY) < 0.6) continue;
      let nx = (b[1] - a[1]) / len, nz = -(b[0] - a[0]) / len; const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2; if (insidePoly(mx + nx * 0.2, mz + nz * 0.2, g.xz)) { nx = -nx; nz = -nz; }
      const px = mx + nx * 0.9, pz = mz + nz * 0.9; if ([0.9, 1.7, 2.5].some((d) => seated.some((o) => o !== g && insidePoly(mx + nx * d, mz + nz * d, o.xz)))) continue;
      if (g.bowl && hullEdge && !insidePoly(px, pz, hullEdge)) continue; // the concourse is behind this edge, and it has its own rail
      const tx = clamp(mx, -(longX ? L : W) / 2, (longX ? L : W) / 2) - mx, tz = clamp(mz, -(longX ? W : L) / 2, (longX ? W : L) / 2) - mz, front = nx * tx + nz * tz > 0.6 * (Math.hypot(tx, tz) || 1), // facing the nearest edge of the playing surface
        parts = Math.max(1, Math.round(len / 1.6)); guardMetres += len;
      for (let k = 0; k < parts; k++) {
        const t0 = k / parts, t1 = (k + 1) / parts, p = [a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0], q = [a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1], y0 = ya + (yb - ya) * t0, y1 = ya + (yb - ya) * t1;
        if (front && Math.max(y0, y1) - (g.bowl ? 0 : walkY) < 0.4) continue; // nothing stands in front of a block that is on the floor
        parapet(p, q, y0, y1, front ? 0.9 : 1.05);
      }
    }
  }
  // roof steel over the bowl: trusses across, purlins along, two ducts and the light clusters
  yield;
  const lights = builder(), glows = [], hb = bboxOf(shellPts.map(([x, y]) => ({ x, y }))), rx0 = hb.x0 + 6, rx1 = hb.x1 - 6, rz0 = hb.y0 + 4, rz1 = hb.y1 - 4, trussCount = profile.roof.trusses || Math.max(2, Math.round((rx1 - rx0) / 8) + 1);
  yield;
  for (let k = 0; k < trussCount; k++) {
    const x = rx0 + ((rx1 - rx0) * k) / (trussCount - 1);
    box(G.steel, x - 0.16, x + 0.16, H - 0.8, H - 0.5, rz0, rz1); box(G.steel, x - 0.16, x + 0.16, H - 3, H - 2.74, rz0, rz1);
    for (let z = rz0, i = 0; z < rz1 - 0.1; z += 3.4, i++) { const za = z, zb = Math.min(rz1, z + 3.4); bar(G.steel, [x, H - 2.87, i % 2 ? zb : za], [x, H - 0.65, i % 2 ? za : zb], 0.07, 4); }
  }
  yield;
  for (let z = rz0; z <= rz1 + 0.1; z += (rz1 - rz0) / 6) box(G.steel, rx0, rx1, H - 0.5, H - 0.32, z - 0.1, z + 0.1);
  yield;
  const house = builder();
  yield;
  for (const side of [-1, 1]) {
    const z = side * (W / 2 + 2.2); box(G.steel, -L / 2 - 4, L / 2 + 4, H - 3.3, H - 3.18, z - 0.55, z + 0.55); // catwalk carrying the row
    for (let x = -L / 2 - 2, i = 0; x <= L / 2 + 2; x += 1.6, i++) { if (i % 5 === 4) continue; box(lights, x - 0.3, x + 0.3, H - 3.75, H - 3.4, z - 0.3, z + 0.3); if (i % 5 === 1) glows.push([x + 0.8, H - 3.8, z]); }
    for (let x = -L / 2; x <= L / 2 - 2; x += 7) box(house, x, x + 2.6, H - 3.5, H - 3.38, side * (W / 2 + 8.5) - 0.12, side * (W / 2 + 8.5) + 0.12);
  }
  yield;
  if (profile.roof.fixtures === 'grid') for (const z of [-(W / 2 + 9.5), -W * 0.2, W * 0.2, W / 2 + 9.5]) for (let x = -L / 2 - 1, i = 0; x <= L / 2 + 1; x += 4.4, i++) { box(lights, x - 0.2, x + 0.2, H - 3.55, H - 3.3, z - 0.2, z + 0.2); if (i % 3 === 1) glows.push([x, H - 3.6, z]); } // the hall is lit by many small fixtures across the whole roof, not two rows
  yield;
  const duct = builder(); if (profile.roof.ducts) for (const z of [rz0 + 7, rz1 - 7]) bar(duct, [rx0 + 4, H - 4, z], [rx1 - 4, H - 4, z], 0.6, 12);

  // rails drawn on the map: posts, a top bar and glass, following the height of the stand under them. Rails that leave the building or cross the playing surface are drawing errors and are skipped.
  yield;
  const seatList = [...seats.values()], groundAt = (x, z) => { let best = null, bd = 9; for (const q of seatList) { const d = (q.x - x) ** 2 + (q.z - z) ** 2; if (d < bd) { bd = d; best = q.y; } } return best ?? concourseY; };
  yield;
  let mapRails = 0, mapRailsSkipped = 0;
  yield;
  for (const r of raw.rails || []) {
    const pts = (r.points || []).map(P); if (pts.length < 2) continue;
    if (RB && pts.some((p) => RB.dist(p[0], p[1]) < RB.DOf(0) + 30)) { mapRailsSkipped++; continue; } // drawn for the hand-laid rows; the rebuilt bowl makes its own, and nothing may stand in the walkway beside the ice
    if (pts.some((p) => p[0] < hb.x0 || p[0] > hb.x1 || p[1] < hb.y0 || p[1] > hb.y1 || (Math.abs(longX ? p[0] : p[1]) < L / 2 - 1 && Math.abs(longX ? p[1] : p[0]) < W / 2 - 1))) { mapRailsSkipped++; continue; }
    if (pts.filter((p) => seatList.some((q) => (q.x - p[0]) ** 2 + (q.z - p[1]) ** 2 < 0.2)).length > pts.length * 0.25) { mapRailsSkipped++; continue; } // a rail drawn through the seats themselves cannot be built as drawn
    const ys = pts.map((p) => groundAt(p[0], p[1])); mapRails++;
    for (let i = 0; i < pts.length - 2; i += 2) glassRail(pts[i], pts[Math.min(pts.length - 1, i + 2)], ys[i], ys[Math.min(pts.length - 1, i + 2)]);
  }

  add(duct, standard(0xb9bec6, 0.35, 0.85), { cast: false, receive: false });
  add(G.tread, grain(standard(C.tread, 0.92)), { ao: [0.55, 0.55, 1, 1] }); add(G.stair, grain(standard(0xbab4a8, 0.9)), { ao: [1, 1, 0.62, 0.62] }); add(G.riser, grain(standard(C.riser, 0.95)), { ao: [0.7, 0.7, 1, 1] }); add(G.slab, grain(lambert(C.slab))); add(G.deck, lambert(C.deck)); add(G.wall, lambert(C.wall));
  add(G.dark, lambert(C.dark)); add(G.column, lambert(C.column)); add(G.concourse, grain(standard(C.concourse, 0.5), 0.16), { cast: false, receive: false }); add(G.floor, grain(lambert(0xb4aea3), 0.26), { cast: false }); // the walkway around the playing surface, at ice level: tunnels and empty bays open onto it
  add(G.bench, lambert(0x25345c));
  yield;
  { const room = (c) => lambert(c, { emissive: new THREE.Color(c).multiplyScalar(0.5) }), opts = { cast: false, receive: false }; // furniture lit by its own room, not by the hall
    add(G.ceil, basic(0x8f8672), opts); add(G.carpet, basic(0x2f2c2a), opts); add(G.fabric, room(0x7a7059), opts); add(G.wood, room(0x33271f), opts); add(G.unit, room(0x60646a), opts); add(G.screen, basic(0x53789c, { fog: false }), opts); add(G.jersey, basic(0xb3222c), opts); add(G.leaf, basic(0x4a1f1c), opts); }
  add(G.bulk, lambert(0x6c7077, { emissive: 0x1c1d20 }), { cast: false }); add(G.parapet, grain(lambert(0xb6b0a5)), { cast: false, ao: [0.72, 0.72, 1, 1] }); add(G.nosing, lambert(0xdad6cc), { cast: false }); add(G.rail, metal(), { receive: false }); add(G.portal, basic(0x8a7c62), { cast: false, receive: false }); add(G.door, basic(0xc8642a), { cast: false, receive: false }); add(G.pier, lambert(0x2b2d31, { emissive: 0x0e0f11 }), { receive: false }); add(G.soffit, basic(0xc4c6c9), { cast: false, receive: false }); // lit by its own ceiling panels, so the key light's shadow is not applied here
   add(G.desk, lambert(0x8a6a45)); add(G.lamp, basic(new THREE.Color(2.3, 1.75, 1.1), { fog: false }), { cast: false, receive: false }); add(G.art, lambert(0x9b958a), { cast: false }); add(G.art2, lambert(0xa49e93), { cast: false }); // aisle risers are plain concrete in the venue, not painted add(G.shop, basic(0xffffff, { map: concourseTexture() }), { cast: false, receive: false });
  add(G.warm, basic(C.warm), { cast: false, receive: false }); add(G.warmSide, basic(C.warmSide), { cast: false, receive: false }); add(G.sign, basic(0xffffff, { map: signTexture(logos) }), { cast: false, receive: false });
  add(G.glass, glassMaterial(), { cast: false, receive: false }); add(G.roof, lambert(0xb4b8be, { emissive: 0x3d4045 }), { cast: false, receive: false }); add(G.steel, lambert(0xb9bdc3, { emissive: 0x34373c }), { cast: false, receive: false }); // the roof is pale steel, bright with spill light, not a black void
  yield;
  const lampMesh = add(lights, basic(new THREE.Color(5, 4.7, 4.1), { fog: false }), { cast: false, receive: false }); add(house, basic(new THREE.Color(2.4, 1.9, 1.3), { fog: false }), { cast: false, receive: false });
  yield;
  const glow = new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true, opacity: 0.62 });
  yield;
  for (const [x, y, z] of glows) { const s = new THREE.Sprite(glow); s.position.set(x, y, z); s.scale.setScalar(3.2); scene.add(s); }

  // chairs: a moulded back and a tip-up seat (folded, as in an empty house) on a dark frame with armrests. Wheelchair positions get a marked bay, not a chair.
  yield;
  const flat = { bevelEnabled: false, curveSegments: 2 };
  // A moulded shell: a rounded panel, dished across its width, with a soft rim (one smooth surface, so it shades like plastic, not like a cut board)
  yield;
  const shell = (w, h, r, th, bend, lit = 1, nx = 4, ny = 6) => { // lit: how much of the overhead light this part gets at its top edge
    const pos = [], idx = [], row = nx + 1, N = row * (ny + 1), half = (y) => { const d = Math.min(y + h / 2, h / 2 - y); return d >= r ? w / 2 : w / 2 - r + Math.sqrt(Math.max(0, r * r - (r - d) ** 2)); };
    for (const side of [0, 1]) for (let j = 0; j <= ny; j++) { const y = -(h / 2) * Math.cos((Math.PI * j) / ny); for (let k = 0; k <= nx; k++) { const u = (k / nx) * 2 - 1; pos.push(u * half(y), y, -bend * u * u + side * th); } }
    for (let j = 0; j < ny; j++) for (let k = 0; k < nx; k++) { const a = j * row + k, b = a + 1, c = b + row, d = a + row; idx.push(a, c, b, a, d, c, N + a, N + b, N + c, N + a, N + c, N + d); }
    const rim = []; for (let k = 0; k < nx; k++) rim.push(k); for (let j = 0; j < ny; j++) rim.push(j * row + nx); for (let k = nx; k > 0; k--) rim.push(ny * row + k); for (let j = ny; j > 0; j--) rim.push(j * row);
    rim.forEach((p, n) => { const q = rim[(n + 1) % rim.length]; idx.push(p, q, q + N, p, q + N, p + N); });
    const g = new THREE.BufferGeometry(), tint = []; for (let n = 0; n < pos.length; n += 3) { const up = (pos[n + 1] + h / 2) / h, v = (0.26 + 0.74 * Math.pow(up, 1.35)) * lit, e = 1 - 0.16 * (pos[n] / (w / 2)) ** 2; tint.push(v * e, v * e, v * e); } // darker toward the foot and the edges, where less light reaches
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(tint, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
  };
  // chairs as in the venue: a dished plastic back, a tip-up seat folded against it, and slim black steel standards with a short armrest, shared between neighbours
  yield;
  const backrest = shell(0.47, 0.54, 0.11, 0.035, 0.04).rotateX(0.16).translate(0, 0.75, 0.17);
  yield;
  const pan = shell(0.45, 0.4, 0.09, 0.05, 0.02, 0.62).rotateX(0.1).translate(0, 0.6, 0.085);
  yield;
  const openPan = shell(0.45, 0.42, 0.09, 0.05, 0.02).rotateX(-Math.PI / 2 + 0.06).translate(0, 0.42, -0.1);
  yield;
  const frame = mergeBoxes([-0.26, 0.26].flatMap((x) => [new THREE.BoxGeometry(0.02, 0.6, 0.085).translate(x, 0.3, 0.16), new THREE.BoxGeometry(0.042, 0.026, 0.25).translate(x, 0.612, 0.06)]));
  yield;
  const chairs = [...seats.values()].filter((q) => !q.access).length, bays = seats.size - chairs, spacing = new Map();
  yield;
  for (const row of map.rows) { const ps = row.seats.map((id) => seats.get(id)); ps.forEach((p, k) => { if (!p) return; let d = Infinity; for (const o of [ps[k - 1], ps[k + 1]]) if (o) d = Math.min(d, Math.hypot(o.x - p.x, o.z - p.z)); spacing.set(row.seats[k], clamp(d === Infinity ? 0.52 : d, 0.46, 0.6)); }); }
  yield;
  const seatMesh = new THREE.InstancedMesh(backrest, standard(0xffffff, 0.72, 0, { envMapIntensity: 0.25, vertexColors: true }), Math.max(1, chairs)), panMesh = new THREE.InstancedMesh(pan, standard(0xffffff, 0.72, 0, { envMapIntensity: 0.25, vertexColors: true }), Math.max(1, chairs)), frameMesh = new THREE.InstancedMesh(frame, standard(0x17191d, 0.6, 0.3), Math.max(1, chairs));
  yield;
  const bayMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.5, 1).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xffffff, map: accessTexture() }), Math.max(1, bays));
  yield;
  const index = new Map(), tone = new Map(), dummy = new THREE.Object3D(), white = new THREE.Color(0xffffff), tones = Object.fromEntries(Object.entries({ bowl: 0x1b3578, club: 0x1b3578, suite: 0x1b3578, ...profile.seat }).map(([k, v]) => [k, new THREE.Color(v)])); let n = 0, m = 0;
  yield;
  for (const s of map.sections) for (const id of s.seats) {
    const q = seats.get(id); if (!q) continue;
    dummy.position.set(q.x, q.y, q.z); dummy.rotation.set(0, Math.atan2(-q.fx, -q.fz), 0); dummy.scale.set(q.access ? 1 : (spacing.get(id) || 0.52) / 0.52, 1, 1); dummy.updateMatrix(); // each chair is as wide as its place in the row, so neighbours share one standard
    if (q.access) { dummy.position.set(q.x + q.fx * 0.1, q.y + 0.012, q.z + q.fz * 0.1); dummy.updateMatrix(); bayMesh.setMatrixAt(m, dummy.matrix); bayMesh.setColorAt(m, white); tone.set(id, white); index.set(id, [bayMesh, m++]); continue; }
    const colour = (tones[kinds.get(s.id)] || tones.bowl).clone().multiply(new THREE.Color(...shade(q.x, q.y + 0.7, q.z))); seatMesh.setMatrixAt(n, dummy.matrix); panMesh.setMatrixAt(n, dummy.matrix); frameMesh.setMatrixAt(n, dummy.matrix); seatMesh.setColorAt(n, colour); panMesh.setColorAt(n, colour); tone.set(id, colour); index.set(id, [seatMesh, n++]);
  }
  seatMesh.count = panMesh.count = frameMesh.count = n; bayMesh.count = m; for (const mesh of [seatMesh, panMesh, frameMesh, bayMesh]) { mesh.frustumCulled = false; mesh.castShadow = mesh !== bayMesh; mesh.receiveShadow = true; scene.add(mesh); }

  // playing surface
  // Reflections in the ice: the bright things overhead and the boards are drawn a second time, upside down below the surface, and each pixel is kept only
  // where the line of sight meets the ice itself (and is given the ice's depth there, so anything standing in front still hides it).
  yield;
  const mirrorU = { proj: { value: new THREE.Matrix4() }, rinkHalf: { value: new THREE.Vector2((longX ? L : W) / 2, (longX ? W : L) / 2) }, rinkRound: { value: corner } };
  yield;
  const mirrors = (parent) => { const g = new THREE.Group(); g.scale.y = -1; g.position.y = 0.04; parent.add(g); return g; };
  yield;
  const reflect = (group, mesh, strength) => {
    if (!mesh || !hockey) return;
    const make = (m) => { const c = m.clone(); Object.assign(c, { transparent: true, opacity: strength, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
      c.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, mirrorU);
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vMw;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvMw = (modelMatrix * vec4(transformed, 1.0)).xyz;');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vMw;\nuniform mat4 proj;\nuniform vec2 rinkHalf;\nuniform float rinkRound;')
          .replace('#include <opaque_fragment>', 'if (vMw.y > -0.02 || cameraPosition.y < 0.3) discard;\nvec3 onIce = cameraPosition + (vMw - cameraPosition) * (cameraPosition.y / (cameraPosition.y - vMw.y));\nvec2 out2 = max(abs(onIce.xz) - (rinkHalf - rinkRound), 0.0);\nif (length(out2) > rinkRound - 0.15) discard;\nvec3 toEye = normalize(cameraPosition - onIce);\ndiffuseColor.a *= mix(0.3, 1.0, pow(1.0 - toEye.y, 2.0));\nvec4 clipIce = proj * viewMatrix * vec4(onIce.x, 0.03, onIce.z, 1.0);\ngl_FragDepth = (clipIce.z / clipIce.w) * 0.5 + 0.5 - 0.00002;\n#include <opaque_fragment>'); };
      return c; };
    const r = new THREE.Mesh(mesh.geometry, Array.isArray(mesh.material) ? mesh.material.map(make) : make(mesh.material)); r.position.copy(mesh.position); r.rotation.copy(mesh.rotation); r.renderOrder = -1; r.frustumCulled = false; r.castShadow = r.receiveShadow = false;
    r.onBeforeRender = (_r, _s, cam) => mirrorU.proj.value.copy(cam.projectionMatrix); group.add(r);
  };
  yield;
  const sceneMirror = mirrors(scene); reflect(sceneMirror, lampMesh, 0.04);
  yield;
  const ice = new THREE.Mesh(new THREE.PlaneGeometry(L, W).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: surfaceTexture(hockey ? 'hockey' : 'pitch', L, W, corner, hockey ? logos.team : null), roughness: hockey ? 0.16 : 0.95, envMapIntensity: hockey ? 0.55 : 0.2, transparent: true, alphaTest: 0.5 }));
  ice.position.y = 0.02; ice.receiveShadow = true; ice.renderOrder = -2;
  // polished ice mirrors the hall, but a lamp's own glint is held down so it reads as a sheen across the sheet and never as a white blot
  yield;
  if (hockey) ice.material.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;', 'vec3 totalSpecular = min(reflectedLight.directSpecular, vec3(0.12)) + min(reflectedLight.indirectSpecular, vec3(0.9));'); }; const field = new THREE.Group(); field.add(ice); if (!longX) field.rotation.y = Math.PI / 2; scene.add(field);
  yield;
  if (hockey) {
    const rr = roundedRect(L, W, corner), ends = rr.length / 4, endArcs = [rr.slice(ends * 3).concat(rr.slice(0, ends)), rr.slice(ends, ends * 3)], sides = [rr.slice(ends - 1, ends + 1), rr.slice(ends * 3 - 1, ends * 3 + 1)];
    const boards = builder(), outer = builder(), rail = builder(), glass = builder(), net = builder(), posts = builder(), ads = boardTexture(logos, profile.surface.kick); // read from inside the rink, which is the only side that shows them
    band(boards, rr, 0, 0.82, true, 14); band(outer, rr.map(([x, z]) => [x * (1 + 0.1 / (L / 2)), z * (1 + 0.1 / (W / 2))]), 0, 0.82); band(rail, rr, 0.82, 0.9);
    for (const arc of endArcs) { band(glass, arc, 0.9, 3.6, false); if (profile.surface.net !== 'none') band(net, arc, 3.6, H - 3.2, false); for (let i = 0; i < arc.length; i += 2) bar(posts, [arc[i][0], 0.9, arc[i][1]], [arc[i][0], 3.6, arc[i][1]], 0.03, 4); }
    for (const side of sides) { band(glass, side, 0.9, 2.7, false); if (profile.surface.net === 'all') band(net, side, 2.7, 6, false); const [a, b] = side, // along the sides the net is lower than behind the goals
      n = Math.round(dist(a, b) / 2.4); for (let i = 0; i <= n; i++) { const x = a[0] + ((b[0] - a[0]) * i) / n, z = a[1] + ((b[1] - a[1]) * i) / n; bar(posts, [x, 0.9, z], [x, 2.7, z], 0.03, 4); } }
    reflect(mirrors(field), add(boards, basic(0xffffff, { map: ads }), { parent: field, receive: false }), 0.42); add(outer, lambert(0xeceef0), { parent: field }); add(rail, lambert(C.cap), { parent: field }); add(posts, standard(0xb4b9bf, 0.7, 0.35, { envMapIntensity: 0.4 }), { parent: field, cast: false });
    add(glass, glassMaterial(), { parent: field, cast: false, receive: false }); { // the safety net above the glass: a fine diamond mesh, which thins to a faint veil with distance instead of shimmering
      const mesh = basic(0x14171b, { transparent: true, opacity: 0.3, depthWrite: false, fog: false }) /* a dark net: it only dims what is behind it a little, as the real one does */;
      mesh.onBeforeCompile = (sh) => {
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vNw;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvNw = (modelMatrix * vec4(transformed, 1.0)).xyz;');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vNw;\nfloat strand(float c){ float d = abs(fract(c) - 0.5), w = fwidth(c); return mix(1.0 - smoothstep(0.035 - w, 0.035 + w, d), 0.08, clamp(w * 2.5 - 0.2, 0.0, 1.0)); }')
          .replace('#include <opaque_fragment>', 'float along = (vNw.x + vNw.z) / 0.05, up = vNw.y / 0.05;\ndiffuseColor.a *= max(strand(along + up), strand(along - up));\n#include <opaque_fragment>'); };
      add(net, mesh, { parent: field, cast: false, receive: false }); }
    const red = lambert(0xd23a3a), mesh = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, depthWrite: false });
    for (const sx of [-1, 1]) {
      const goal = new THREE.Group(); goal.position.x = sx * goalAt;
      for (const z of [-0.915, 0.915]) goal.add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.22, 0.06).translate(0, 0.61, z), red));
      goal.add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.89).translate(0, 1.22, 0), red), new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.2, 1.83).translate(sx * 0.48, 0.6, 0), mesh));
      field.add(goal);
    }
  }

  // centre-hung scoreboard: four screens, a score clock above and a ring below with the venue name
  yield;
  if (profile.scoreboard) { const [sw2, sh2] = profile.scoreboard.screen || [4.1, 2.3], face = new THREE.MeshBasicMaterial({ map: clockTexture(logos), fog: false }), blank = new THREE.MeshBasicMaterial({ color: 0x0a0c10, fog: false });
  yield;
  const clock = new THREE.Mesh(new THREE.BoxGeometry(sw2 + 0.5, sh2 + 0.4, sw2 + 0.5), [face, face, blank, blank, face, face]); clock.position.y = H - 7; clock.castShadow = false; scene.add(clock); face.color.setScalar(1.5); reflect(sceneMirror, clock, 0.08); // lit from all round, the scoreboard throws no hard shadow on centre ice
  yield;
  const led = new THREE.MeshBasicMaterial({ map: scoreClockTexture(), fog: false }), topper = new THREE.Mesh(new THREE.BoxGeometry(sw2 + 0.2, 0.62, sw2 + 0.2), [led, led, blank, blank, led, led]); topper.position.y = H - 7 + sh2 / 2 + 0.62; scene.add(topper);
  yield;
  const hang = builder(); for (const [x, z] of [[-1.6, -1.6], [1.6, -1.6], [1.6, 1.6], [-1.6, 1.6]]) bar(hang, [x, H - 5.4, z], [x, H - 2.8, z], 0.04, 4); add(hang, standard(0x4a4e57, 0.5, 0.7), { cast: false, receive: false });
  yield;
  const ringR = (sw2 + 0.5) * 0.74, ringPts = Array.from({ length: 24 }, (_, i) => [Math.cos((i / 24) * Math.PI * 2) * ringR, Math.sin((i / 24) * Math.PI * 2) * ringR]), ringG = builder(), ringY = H - 7 - sh2 / 2 - 1.05; band(ringG, ringPts, ringY, ringY + 0.8, true, -ringR * 2 * Math.PI / 4);
  yield;
  const liner = builder(); band(liner, ringPts.map(([x, z]) => [x * 0.985, z * 0.985]), ringY, ringY + 0.8); add(liner, basic(0x0a0c10, { fog: false }), { cast: false, receive: false });
  add(ringG, profile.name ? basic(0xffffff, { map: ringTexture(profile.name.toUpperCase()), fog: false }) : basic(0x0d1522, { fog: false }), { cast: false, receive: false }); }

  yield;
  if (profile.banners && logos.team) { const cloth = new THREE.MeshBasicMaterial({ map: bannerTexture(logos), side: THREE.DoubleSide, fog: false }); for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 3.2), cloth); b.rotation.y = Math.PI / 2; b.position.set(-(L / 2 + 5), H - 5.4, (i - 2.5) * 2.1 + (i > 2 ? 3 : -3)); field.add(b); } }
  yield;
  for (const g of signs) {
    const c = document.createElement('canvas'); c.width = 320; c.height = 110; const k = c.getContext('2d');
    k.fillStyle = '#2b2d31'; k.fillRect(0, 0, 320, 110); k.fillStyle = '#6fbf3b'; k.fillRect(176, 0, 144, 110);
    k.fillStyle = '#fff'; k.textBaseline = 'middle'; k.font = '600 62px Geist, ui-sans-serif, system-ui, sans-serif'; k.textAlign = 'center'; k.fillText(String(g.name).slice(0, 4), 88, 58); k.font = '600 30px Geist, ui-sans-serif, system-ui, sans-serif'; k.fillText('section', 248, 58);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; const board = new THREE.MeshBasicMaterial({ map: tex, fog: false });
    for (const turn of [0, Math.PI]) { const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.52), board); sign.position.set(g.x, walkY + 2.75, g.z); sign.rotation.y = Math.atan2(g.fx, g.fz) + turn; scene.add(sign); }
  }
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true; // the scene never moves: bake the shadows once
  const warmEye = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1600); warmEye.position.set(0, 12, 30); warmEye.lookAt(0, 0, 0);
  // A step may hand back a promise: the builder waits for it when it is building in slices. Here it is for the shaders to be compiled without holding the page. They are
  // compiled as they will be used: drawn into a picture (the reflections, and the view's own lens pass), which is a different program from drawing straight to the screen.
  // On a phone the view is drawn straight to the screen with no lens pass, and the reflection picture is left out (see below): there the shaders are needed in that one
  // form only. Compiling them in both forms, and drawing the hall six more times for the reflections, was most of what made the first picture take so long on a phone.
  const handheld = matchMedia('(pointer: coarse)').matches, dot = handheld ? null : new THREE.WebGLRenderTarget(1, 1); renderer.setRenderTarget(dot);
  yield renderer.compileAsync?.(scene, warmEye);
  renderer.setRenderTarget(null);
  // the hall as seen from the middle of the rink, taken once: this is what the glass and the ice reflect
  yield;
  // Sending the arena to the graphics card is the other thing that used to hold the page. It is sent a few meshes at a time (each drawn once into a one-pixel picture,
  // out of sight), and the shadows are baked afterwards with everything in place.
  { const meshes = []; scene.traverse((o) => { if (o.isMesh || o.isLine || o.isPoints || o.isSprite) meshes.push([o, o.visible, o.frustumCulled]); });
    const bake = renderer.shadowMap.needsUpdate; renderer.shadowMap.needsUpdate = false;
    for (const [o] of meshes) { o.visible = false; o.frustumCulled = false; }
    for (let n = 0; n < meshes.length; n += 6) { for (const [o, was] of meshes.slice(n, n + 6)) o.visible = was; renderer.setRenderTarget(dot); renderer.render(scene, warmEye); for (const [o] of meshes.slice(n, n + 6)) o.visible = false; yield; }
    for (const [o, was, culled] of meshes) { o.visible = was; o.frustumCulled = culled; } renderer.setRenderTarget(null); dot?.dispose(); renderer.shadowMap.needsUpdate = bake; }
  yield;
  let shot = null;
  if (!lite && !handheld) { shot = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType }); const eye = new THREE.CubeCamera(0.5, 400, shot); eye.position.set(0, 4.5, 0); scene.add(eye); eye.updateMatrixWorld();
    if (eye.coordinateSystem !== renderer.coordinateSystem) { eye.coordinateSystem = renderer.coordinateSystem; eye.updateCoordinateSystem(); }
    const mips = shot.texture.generateMipmaps; shot.texture.generateMipmaps = false; // one face of the cube at a time (CubeCamera.update draws all six in one go)
    for (let face = 0; face < 6; face++) { if (face === 5) shot.texture.generateMipmaps = mips; renderer.setRenderTarget(shot, face); renderer.render(scene, eye.children[face]); yield; }
    scene.remove(eye); renderer.setRenderTarget(null); shot.texture.needsPMREMUpdate = true; }
  if (shot) {
    for (const m of glasses) { m.envMap = shot.texture; m.needsUpdate = true; } if (hockey) { ice.material.envMap = shot.texture; ice.material.envMapIntensity = 1.15; ice.material.color.set(0xd3deea); /* a slightly darker, bluer sheet, so what it mirrors shows instead of washing out to white */ ice.material.needsUpdate = true; } }
  if (shot) { const again = new THREE.WebGLRenderTarget(1, 1); renderer.setRenderTarget(again); yield renderer.compileAsync?.(scene, warmEye); renderer.setRenderTarget(null); again.dispose(); } // again, now that the glass and the ice have their reflections
  return { scene, seats, seatMesh, panMesh, openPan, index, tone, kinds, details: { rings: RB ? { core: RB.core, pitch: +RB.pitch.toFixed(3), rise: +RB.rise.toFixed(3), base: +RB.base.toFixed(2) } : null, guardMetres: Math.round(guardMetres), mapRails, mapRailsSkipped, aisleRails, evenedRuns, tunnels, wheelchairBays: m, stepFreeBays: stepFree, plinth, endPlinth }, sectionBase: baseOf, outlines, bbox: { ox, oy, mpu, sbox }, surface: { kind: hockey ? 'hockey' : kind, L, W, longX, goalAt, corner }, H, estimated: em.calibration?.source !== 'measured' };
}

/* ---------- seat facts ---------- */

function describe(world, seat, sectionId) {
  const { L, W, longX, goalAt, kind } = world.surface, hockey = kind === 'hockey';
  const along = longX ? seat.x : seat.z, across = longX ? seat.z : seat.x, a = Math.abs(along) / (L / 2), c = Math.abs(across) / (W / 2);
  const label = a >= 1 && c < 0.75 ? (hockey ? 'Behind the net' : 'Behind the goal') : c >= 1 && a < 0.25 ? (hockey ? 'Centre ice' : 'Halfway line') : c >= 1 && a < 0.8 ? (hockey ? 'Along the boards' : 'Sideline') : 'Corner';
  const eye = seat.y + EYE, toCentre = Math.hypot(seat.x, eye, seat.z), toGoal = Math.hypot(Math.abs(along) - goalAt, across, eye);
  const word = hockey ? 'ice' : 'pitch';
  return {
    label, level: { suite: 'Suite level', club: 'Club level' }[world.kinds.get(sectionId)] || ((world.sectionBase.get(sectionId) || 0) >= 3 ? 'Upper level' : 'Lower bowl'),
    stats: [[Math.round(toCentre), hockey ? 'to centre ice' : 'to the centre spot'], [Math.round(toGoal), hockey ? 'to nearest net' : 'to nearest goal'], [Math.round(seat.y), `above the ${word}`]],
  };
}

function minimapSVG(world, sectionId, seat) {
  const { ox, oy, mpu, sbox } = world.bbox, all = world.outlines.flatMap((o) => o.pts), box = bboxOf(all), pad = box.w * 0.03;
  const path = (pts) => 'M' + pts.map((p) => `${p.x.toFixed(0)} ${p.y.toFixed(0)}`).join('L') + 'Z';
  const x = seat.x / mpu + ox, y = seat.z / mpu + oy, r = box.w / 28, reach = box.w * 0.22;
  return `<svg class="bt-sv-mini" viewBox="${box.x0 - pad} ${box.y0 - pad} ${box.w + pad * 2} ${box.h + pad * 2}" aria-hidden="true">${world.outlines.map((o) => `<path d="${path(o.pts)}"${o.id === sectionId ? ' data-current' : ''}/>`).join('')}<rect class="bt-sv-mini-surface" x="${sbox.x0}" y="${sbox.y0}" width="${sbox.x1 - sbox.x0}" height="${sbox.y1 - sbox.y0}" rx="${world.surface.corner / mpu}"/><defs><linearGradient id="bt-sv-beam" x1="0" x2="1" y1="0" y2="0"><stop class="bt-sv-beam0" offset="0"/><stop class="bt-sv-beam1" offset="1"/></linearGradient></defs><g transform="translate(${x.toFixed(0)} ${y.toFixed(0)})"><path class="bt-sv-mini-cone" fill="url(#bt-sv-beam)" d="M0 0L${(reach * 1.35).toFixed(0)} ${(-reach * 0.52).toFixed(0)}A${(reach * 1.45).toFixed(0)} ${(reach * 1.45).toFixed(0)} 0 0 1 ${(reach * 1.35).toFixed(0)} ${(reach * 0.52).toFixed(0)}Z"/><circle class="bt-sv-mini-halo" r="${(r * 1.9).toFixed(0)}"/><circle r="${r}"/></g></svg>`;
}

/* ---------- the view ---------- */

const icon = {
  check: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  back: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
  drag: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4"/></svg>',
};
const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/**
 * Opens the view from one seat over `host`.
 * @param {{host:HTMLElement,map:object,seatId:string,unit?:string[],priceLabel?:string,onChoose?:()=>void,onClose?:()=>void}} options
 */
// the renderer and the built arena, made once per map and kept for every later view and still
let noStill = false; // set once it is known there is no graphics card, so later stills are not even attempted
let preparing = null; // an arena being built in slices: { map, renderer, steps, promise }
let timings = null; // how the last sliced build went: when it began and was ready, how many steps, the longest one, and what stopped it if anything did
/** How the last build of the arena went, for finding out why a picture is slow or missing: seconds taken, steps, the longest single step, and any error. */
export const seatViewTimings = () => (timings ? { seconds: timings.ready ? +((timings.ready - timings.began) / 1000).toFixed(2) : null, running: !timings.ready && !timings.error ? +((performance.now() - timings.began) / 1000).toFixed(1) : null, steps: timings.steps, workMs: Math.round(timings.work), longestStepMs: Math.round(timings.longest), error: timings.error, graphics: noStill ? 'none' : 'ok' } : { seconds: null, running: null, steps: 0, workMs: 0, longestStepMs: 0, error: null, graphics: noStill ? 'none' : 'ok' });
function newRenderer(lightOnly) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  if (lightOnly && softwareGL(renderer)) { renderer.dispose(); noStill = true; return null; } // no graphics card: building the arena would freeze the page for a still nobody asked for
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
  return renderer;
}
function keepWorld(map, renderer, world) {
  cached = { map, renderer, world, post: noPost ? null : makePost(renderer) };
  renderer.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); noPost = true; if (cached?.renderer === renderer) cached = null; open?.close(true); }, { once: true }); // the card ran out of room: close the view and build it lighter next time
}
function ensureWorld(map, logos, lightOnly = false, venue = {}) {
  if (lightOnly && noStill && cached?.map !== map) return false;
  if (cached?.map !== map) { cached?.post?.dispose(); cached?.postFly?.dispose(); cached?.renderer.dispose(); cached = null; }
  if (!cached) {
    if (preparing?.map === map) { // it is part-built in slices and is wanted now: finish it here, in one go
      const { renderer, steps } = preparing; preparing.taken = true; preparing = null; let step; while (!(step = steps.next()).done); keepWorld(map, renderer, step.value);
    } else { const renderer = newRenderer(lightOnly); if (!renderer) return false; keepWorld(map, renderer, buildWorld(map, renderer, logos, venue)); }
  }
  return true;
}

/** Builds the arena ahead of time without holding the page: a few milliseconds of work at a time, with the browser free in between. Resolves true once it is ready
 *  (at once if it already is), false where there is no graphics card. Asking for a view or a still while this is under way finishes the build on the spot. */
export function prepareSeatView({ map, logos = {}, venue = {}, slice = 6, report = null, urgent = false }) {
  if (cached?.map === map) return Promise.resolve(true);
  if (preparing?.map === map) { if (urgent) preparing.urgent = true; return preparing.promise; } // someone is now waiting for it: it is given longer turns, sooner
  if (noStill || open) return Promise.resolve(false);
  const renderer = newRenderer(true); if (!renderer) return Promise.resolve(false);
  const job = { map, renderer, steps: buildWorldSteps(map, renderer, logos, venue), taken: false, promise: null, urgent };
  timings = { began: performance.now(), ready: null, steps: 0, work: 0, longest: 0, error: null };
  // Unhurried while nobody is waiting (background turns of a few milliseconds); once a seat card or the 3D button is waiting on it, longer turns at normal priority.
  const later = (fn) => (globalThis.scheduler?.postTask ? globalThis.scheduler.postTask(fn, { priority: job.urgent ? 'user-visible' : 'background' }).catch(() => {}) : setTimeout(fn, 0));
  const within = (promise, ms) => new Promise((done) => { const t = setTimeout(done, ms); promise.then(() => { clearTimeout(t); done(); }, () => { clearTimeout(t); done(); }); }); // a step that waits (for shaders) is never waited on for long
  job.promise = new Promise((resolve) => {
    const run = () => {
      if (job.taken) return resolve(cached?.map === map); // someone needed it at once and finished it
      if (preparing !== job) { renderer.dispose(); return resolve(false); } // overtaken by another map
      const began = performance.now(); let step;
      try { do { const t = performance.now(); step = job.steps.next(); const took = performance.now() - t; report?.(took); timings.steps++; timings.work += took; if (took > timings.longest) timings.longest = took; } while (!step.done && !step.value?.then && performance.now() - began < (job.urgent ? Math.max(slice, 12) : slice)); }
      catch (error) { timings.error = String(error?.message || error); console.warn('[seat view] the arena could not be built:', error); if (preparing === job) preparing = null; renderer.dispose(); return resolve(false); }
      if (step.done) { preparing = null; keepWorld(map, renderer, step.value); timings.ready = performance.now(); return resolve(true); }
      if (step.value?.then) within(step.value, 2500).then(() => later(run)); else later(run);
    };
    later(run);
  });
  preparing = job; return job.promise;
}

/** A still of the view from a seat, as a JPEG data URL, for the 2D seat popup. Null when a view is open, the seat is unknown, or there is no graphics card. */
export function snapshotSeatView({ map, seatId, logos = {}, venue = {}, width = 512, height = 288 }) {
  if (open || !map.seatById.get(seatId) || !ensureWorld(map, logos, true, venue)) return null;
  const { renderer, world, post } = cached, seat = world.seats.get(seatId); if (!seat) return null;
  const lowBoost = world.surface.kind === 'hockey' ? clamp(0.45 - Math.max(0, seat.y) * 0.45, 0, 0.45) : 0, eyeY = seat.y + EYE + lowBoost, dx = -seat.x, dz = -seat.z;
  const camera = new THREE.PerspectiveCamera(80, width / height, 0.1, 1600); camera.rotation.order = 'YXZ';
  camera.position.set(seat.x, eyeY, seat.z); camera.rotation.set(Math.atan2(Math.min(0.4, eyeY - 1.1) - eyeY, Math.hypot(dx, dz)), Math.atan2(-dx, -dz), 0);
  renderer.setPixelRatio(1); renderer.setSize(width, height, false); renderer.localClippingEnabled = false; if (world.fog) { world.scene.fog.near = world.fog[0]; world.scene.fog.far = world.fog[1]; }
  if (post) post.render(world.scene, camera, 10, 0); else renderer.render(world.scene, camera);
  const url = renderer.domElement.toDataURL('image/jpeg', 0.84); renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); return url;
}

export function openSeatView3D({ host, map, seatId, unit = [seatId], priceLabel = '', offers = [], chosen = null, onPick, logos = {}, venue = {}, anchor = null, under = null, onChoose, onClose }) {
  open?.close(true);
  const info = map.seatById.get(seatId); if (!info) throw Error('Unknown seat.');
  ensureWorld(map, logos, false, venue);
  const { renderer, world, post } = cached, seat = world.seats.get(seatId), facts = describe(world, seat, info.sectionId);
  const section = map.sectionById.get(info.sectionId), seatWord = unit.length > 1 ? `Seats ${unit.map((id) => map.seatById.get(id)?.number).join(', ')}` : `Seat ${info.number}`;
  const where = `${section.name} · Row ${info.rowNumber} · ${seatWord}`;

  // mark the chosen seats
  const picked = new THREE.Color(COLORS.pick), marked = unit.filter((id) => world.index.has(id));
  const paint = (colourOf) => { for (const id of marked) { const [mesh, i] = world.index.get(id); mesh.setColorAt(i, colourOf(id)); mesh.instanceColor.needsUpdate = true; } };
  paint(() => picked);
  const opened = [], gone = new THREE.Matrix4().makeScale(0, 0, 0);
  for (const id of marked) {
    const [mesh, i] = world.index.get(id); if (mesh !== world.seatMesh) continue;
    const at = new THREE.Matrix4(); world.panMesh.getMatrixAt(i, at); world.panMesh.setMatrixAt(i, gone);
    const open = new THREE.Mesh(world.openPan, new THREE.MeshStandardMaterial({ color: COLORS.pick, roughness: 0.5, side: THREE.DoubleSide })); open.applyMatrix4(at); world.scene.add(open); opened.push([i, at, open]);
  }
  world.panMesh.instanceMatrix.needsUpdate = true;

  const el = document.createElement('div'); el.className = 'bt-seatview'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', `View from ${where}`);
  el.innerHTML = `<div class="bt-sv-stage"></div>
<div class="bt-sv-top"><button type="button" class="bt-sv-back" aria-label="Back to the seat map">${icon.back}</button><div class="bt-sv-where"><i aria-hidden="true"></i>View from ${esc(where)}</div></div>
<div class="bt-sv-hint">${icon.drag}Drag to look around</div>
<section class="bt-sv-sheet">
 <div class="bt-sv-head"><div><span class="bt-sv-eyebrow">${esc(facts.label)}</span><h2>${/^\d/.test(section.name) ? 'Section ' : ''}${esc(section.name)}</h2><p>Row ${esc(info.rowNumber)} · ${esc(seatWord)} · ${facts.level}</p></div>${minimapSVG(world, info.sectionId, seat)}</div>
 <div class="bt-sv-offers" role="group" aria-label="Choose an offer" hidden>${offers.map((o) => `<button type="button" class="bt-sv-offer" data-tier="${esc(o.id)}" aria-pressed="false"><i aria-hidden="true">${icon.check}</i><span class="bt-sv-offer-name">${esc(o.name)}</span><span class="bt-sv-offer-price">${esc(o.label)}</span></button>`).join('')}${offers.length ? '<p class="bt-sv-offers-note">Prices include taxes and fees</p>' : ''}</div>
 <div class="bt-sv-actions"><button type="button" class="bt-sv-secondary">Change seat</button><button type="button" class="bt-sv-primary">${priceLabel ? esc(priceLabel) : 'Choose ticket'}</button></div>
</section>`;
  const stage = el.querySelector('.bt-sv-stage'), cone = el.querySelector('.bt-sv-mini-cone'), hint = el.querySelector('.bt-sv-hint'), canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true'); stage.append(canvas); host.append(el);

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1600); camera.rotation.order = 'YXZ';
  // The flight starts on a long lens from high up, which is nearly the map's own flat projection, and opens out to a normal lens as it comes down.
  const LENS = 12; let seatFov = 82, // The seat's own lens is a wide one, like a phone's 0.5x camera: it takes in the stands to either side as well as the game.
      shown = -1, followed = -1;
  const lowBoost = world.surface.kind === 'hockey' ? clamp(0.45 - Math.max(0, seat.y) * 0.45, 0, 0.45) : 0, // rows on the ground get a taller viewpoint, fading out over the first metre of height, so the boards do not hide the play
    eyeY = seat.y + EYE + lowBoost, dx = -seat.x, dz = -seat.z, yaw0 = Math.atan2(-dx, -dz), pitch0 = Math.atan2(Math.min(0.4, eyeY - 1.1) - eyeY, Math.hypot(dx, dz)); // low seats look across the ice, not down at the boards
  let yaw = yaw0, pitch = pitch0, vy = 0, vp = 0, fly = reducedMotion() ? 1 : 0, flyDir = 1, flyStart = 0, flyMs = 2700, frame = 0, closed = false, dragging = null, ready = false, primed = false, afterFly = null, lastMove = 0;

  // Whatever lies between the cut height and the camera is hidden while the camera is above it: from the sky the bowl reads like the map,
  // and the suites' roofs, the scoreboard and the roof steel each come back as the camera drops past them.
  if (!world.clips) { world.clips = [new THREE.Plane(new THREE.Vector3(0, -1, 0), world.H - 10.4), new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)]; world.scene.traverse((o) => { for (const m of [].concat(o.material || [])) { m.clippingPlanes = world.clips; m.clipIntersection = true; } }); world.fog = [world.scene.fog.near, world.scene.fog.far]; }
  // A suite's seats are higher than the usual cut, which would leave a band of its own walls and glass missing until the flight ended: for this flight the cut sits just over the buyer's head.
  world.cutBase ??= world.clips[0].constant; world.clips[0].constant = Math.max(world.cutBase, eyeY + 1);
  let smeared = 0, soft = 0;
  const above = () => {
    const half = Math.tan((LENS * Math.PI) / 360), box = stage.getBoundingClientRect(), other = anchor && world.seats.get(anchor.otherId);
    if (other) {
      const vx = anchor.other.x - anchor.seat.x, vy = anchor.other.y - anchor.seat.y, mx = other.x - seat.x, mz = other.z - seat.z, px = Math.hypot(vx, vy), m = Math.hypot(mx, mz);
      if (px > 12 && m > 0.8 && box.height > 0) {
        const scale = px / m, turn = Math.atan2(vy, vx) - Math.atan2(mz, mx), sx = (anchor.seat.x - box.left - box.width / 2) / scale, sy = (anchor.seat.y - box.top - box.height / 2) / scale, c = Math.cos(-turn), n = Math.sin(-turn);
        return { x: seat.x - (sx * c - sy * n), z: seat.z - (sx * n + sy * c), y: Math.max(1.5, box.height / scale / (2 * half)), yaw: turn, matched: true }; // y: how far above the seat's floor the map's own framing puts the camera
      }
    }
    return { x: seat.x, z: seat.z, y: 28 / half, yaw: yaw0 };
  };
  // While the two pictures trade places the camera is still looking straight down, so the map only has to grow and slide to stay under it. That is done by scaling the picture
  // of the map that is already on screen (a CSS transform), not by redrawing the map every frame, which is what used to make the first and last moments of the flight stutter.
  const sheet = under?.isConnected ? { el: under, was: [under.style.transform, under.style.transformOrigin, under.style.willChange], a: null, b: null, off: null, on: '' } : null, marks = [new THREE.Vector3(seat.x, seat.y, seat.z), new THREE.Vector3(seat.x + 8, seat.y, seat.z + 8)], spot = new THREE.Vector3();
  const onScreen = (v) => { spot.copy(v).project(camera); return [(spot.x + 1) * 0.5 * (stage.clientWidth || 1) + sheet.off[0], (1 - spot.y) * 0.5 * (stage.clientHeight || 1) + sheet.off[1]]; };
  // The two pictures trade places at one set distance, whatever the map was showing when the view was asked for: the one at which a seat is drawn about 4.5 px across its half-width (R0).
  // At that size a seat on the map and a seat in the arena are both little more than a dot, so one can stand in for the other without it showing. From closer in, the map first
  // pulls back to that distance; from further out, it zooms in to it; then the arena comes up through it and the camera goes down to the seat.
  const R0 = 4.5, rel = Number.isFinite(anchor?.radius) && anchor.radius > 0 ? anchor.radius / R0 : 0, pull = rel > 1.15, backMs = pull ? clamp((520 * Math.log(rel)) / Math.log(1.8), 300, 1300) : 0, /* further to pull back from a close-up, so longer to do it */ longer = rel && rel < 1 / 1.15 ? Math.min(1500, 650 * Math.log(1 / rel)) : 0;
  flyMs += backMs + longer; const backShare = backMs / flyMs;
  const apply = () => {
    const from = above(), k = fly, turn0 = yaw + Math.round((from.yaw - yaw) / (Math.PI * 2)) * Math.PI * 2, sm = (x) => x * x * (3 - 2 * x), sms = (x) => x * x * x * (x * (x * 6 - 15) + 10), guided = rel > 0 && from.matched;
    let t, tilt, show, lift, sheetOn, redraw, height = null;
    if (!guided) {
      // With nothing to line the flight up against (no map position for the seat), it is the plain one: straight down from a set height, the 3D fading in, then the gaze lifts.
      t = Math.sin((Math.PI / 2) * Math.pow(k, 0.8)) ** 2; lift = clamp((k - 0.38) / 0.62, 0, 1); tilt = ease(lift); show = sm(clamp((k - 0.1) / 0.24, 0, 1));
      sheetOn = k <= 0.38; redraw = false;
    } else {
      // heights here are above the eye. The map's framing gives the camera's distance from the seat's floor (from.y), so a close-up of a seat high in the building starts close to that seat, not close to the ground.
      const SOFT = 6, lift0 = eyeY - seat.y, startUp = Math.max(0.2, from.y - lift0), topUp = pull ? Math.max(startUp, from.y * rel - lift0) : startUp, hs = pull ? topUp : Math.max(10, Math.min(startUp, from.y * rel - lift0));
      let up;
      if (k < backShare) { // the pull back: the map itself, redrawn as it goes
        const x = k / backShare, e = Math.sin((Math.PI / 2) * x * x * (3 - 2 * x)); up = startUp * Math.pow(topUp / startUp, e); /* like something thrown up: away gently, slowing to the top */ t = 0; lift = 0; tilt = 0; show = 0; sheetOn = false; redraw = true;
      } else { // the way down: one unbroken zoom, height coming off by a steady ratio. Above the set distance the map is still the picture; at it the two trade places; below it the gaze lifts.
        const kd = (k - backShare) / (1 - backShare), s = pull ? 0.5 * (sm(kd) + sms(kd)) : sms(kd); up = // after a pull back it falls away from the top at once, without hanging there
          Math.max(0, (topUp + SOFT) * Math.pow(SOFT / (topUp + SOFT), s) - SOFT);
        const along = (a, b) => clamp(Math.log(a / Math.max(up, 1e-3)) / Math.log(a / b), 0, 1), s6 = Math.log((0.5 * hs + SOFT) / (topUp + SOFT)) / Math.log(SOFT / (topUp + SOFT));
        t = clamp(1 - up / topUp, 0, 1); lift = clamp((s - s6) / (1 - s6), 0, 1); tilt = ease(lift); show = sm(along(hs, 0.56 * hs));
        sheetOn = up <= hs && lift <= 0; redraw = up > hs;
      }
      height = eyeY + up;
    }
    if (k >= 1) { tilt = 1; show = 1; }
    camera.position.set(from.x + (seat.x - from.x) * t, height ?? from.y + (eyeY - from.y) * t, from.z + (seat.z - from.z) * t);
    camera.rotation.set(-Math.PI / 2 + (pitch + Math.PI / 2) * tilt, from.yaw - turn0 + yaw + (turn0 - from.yaw) * tilt, 0);
    const high = camera.position.y, cut = world.clips[0].constant, fov = LENS + (seatFov - LENS) * tilt;
    const near = Math.max(0.1, (high - 25) * 0.3); if (Math.abs(fov - camera.fov) > 0.01 || Math.abs(near - camera.near) > 0.01) { camera.fov = fov; camera.near = near; camera.updateProjectionMatrix(); } // a far-off camera keeps its depth range tight, so distant surfaces do not shimmer; it eases back rather than switching
    world.scene.fog.near = world.fog[0] + high; world.scene.fog.far = world.fog[1] + high * 2;
    renderer.localClippingEnabled = fly < 1 && high > cut; world.clips[1].constant = -(high + 0.1); // up to just over the camera: a roof or a ceiling is never seen from above on the way through it
    // keeping the map under the camera: either by redrawing it (measured from the seat's own place on the map, since a suite stands a little further out in the model than it is drawn) …
    const follow = () => { if (!anchor?.follow || followed === fly) return; followed = fly; const span = 2 * (guided ? high - seat.y : high) * Math.tan((camera.fov * Math.PI) / 360) * camera.aspect, b = world.bbox; anchor.follow(info.x + (camera.position.x - seat.x) / b.mpu, info.y + (camera.position.z - seat.z) / b.mpu, span / b.mpu); };
    if (sheet && from.matched && stage.clientWidth) {
      if (redraw) { if (sheet.on) { sheet.on = ''; sheet.el.style.transform = sheet.was[0]; } sheet.a = null; follow(); }
      else if (sheetOn) { // … or, while the two pictures trade places, by scaling the picture of it that is already on screen, which costs nothing
        camera.updateMatrixWorld(); if (!sheet.off) { const p = stage.getBoundingClientRect(), q = sheet.el.getBoundingClientRect(); sheet.off = [p.left - q.left, p.top - q.top]; }
        const a = onScreen(marks[0]), b = onScreen(marks[1]);
        if (!sheet.a) {
          if (guided) { follow(); sheet.a = a; sheet.b = b; } // the map is drawn for exactly this camera, and scaled from here
          else if (k > 0) { const keep = [camera.position.clone(), camera.rotation.clone(), camera.fov]; camera.position.set(from.x, from.y, from.z); camera.rotation.set(-Math.PI / 2, from.yaw, 0); camera.fov = LENS; camera.updateProjectionMatrix(); camera.updateMatrixWorld(); sheet.a = onScreen(marks[0]); sheet.b = onScreen(marks[1]); camera.position.copy(keep[0]); camera.rotation.copy(keep[1]); camera.fov = keep[2]; camera.updateProjectionMatrix(); camera.updateMatrixWorld(); }
          else { sheet.a = a; sheet.b = b; }
          sheet.el.style.transformOrigin = '0 0'; sheet.el.style.willChange = 'transform';
        }
        const grow = Math.hypot(b[0] - a[0], b[1] - a[1]) / (Math.hypot(sheet.b[0] - sheet.a[0], sheet.b[1] - sheet.a[1]) || 1), css = `translate(${(a[0] - grow * sheet.a[0]).toFixed(2)}px, ${(a[1] - grow * sheet.a[1]).toFixed(2)}px) scale(${grow.toFixed(5)})`;
        if (Number.isFinite(grow) && css !== sheet.on) { sheet.on = css; sheet.el.style.transform = css; }
      }
    } else if (from.matched && (redraw || sheetOn)) follow();
    // The arena does not fade in over the whole map at once: it opens outward from the chosen seat, a soft-edged circle growing until it fills the screen. Any one spot changes over
    // quickly, and the change has a direction, so it reads as the map turning into the place, not as two pictures laid over each other.
    if (!el.dataset.fading && show !== shown) {
      shown = show; host.classList.toggle('bt-covered', show >= 1);
      if (sheet?.off && show > 0 && show < 1) {
        camera.updateMatrixWorld(); const c = onScreen(marks[0]), cx = c[0] - sheet.off[0], cy = c[1] - sheet.off[1], w = stage.clientWidth || 1, h = stage.clientHeight || 1,
          reach = Math.max(Math.hypot(cx, cy), Math.hypot(w - cx, cy), Math.hypot(cx, h - cy), Math.hypot(w - cx, h - cy)), r = 24 + (reach / 0.55) * show, iris = `radial-gradient(circle at ${cx.toFixed(1)}px ${cy.toFixed(1)}px, #000 ${(r * 0.55).toFixed(1)}px, transparent ${r.toFixed(1)}px)`;
        el.style.opacity = '1'; el.style.webkitMaskImage = iris; el.style.maskImage = iris;
      } else { el.style.opacity = String(show); if (el.style.maskImage || el.style.webkitMaskImage) { el.style.webkitMaskImage = ''; el.style.maskImage = ''; } }
    } // once the 3D picture has fully taken over, the map under it is taken out of the page's drawing, so the browser has one picture to put on screen, not two
    const smear = lift > 0 && k < 1 ? 2.2 * Math.sin(Math.PI * lift) ** 2 : 0, css = post ? 0 : smear; if (Math.abs(css - smeared) > 0.3 || (!css && smeared)) { smeared = css; canvas.style.filter = css > 0.3 ? `blur(${css.toFixed(1)}px)` : ''; } soft = smear / 2.2; // with the lens pass, only what is off the focus distance softens; without it, a touch of motion blur on the way down
    const dirX = -Math.sin(yaw), dirZ = -Math.cos(yaw); cone?.setAttribute('transform', `rotate(${(Math.atan2(dirZ, dirX) * 180) / Math.PI})`);
  };
  // While the camera is moving the scene is drawn through a lighter copy of the lens pass, at 60% of the resolution, where the detail would not be seen: that is what lets every frame of the
  // flight arrive on time. Both copies are made ready on the first frame, behind the map, so nothing has to be set up at the moment it lands and turns sharp.
  const fast = post ? (cached.postFly ||= makePost(renderer, 0.6)) : null; let warmed = false;
  const draw = () => {
    if (!post) return renderer.render(world.scene, camera);
    const focus = Math.hypot(camera.position.x - seat.x, camera.position.y - eyeY, camera.position.z - seat.z);
    if (!warmed) { warmed = true; post.render(world.scene, camera, focus, 0); }
    (fly < 1 ? fast : post).render(world.scene, camera, focus, soft);
  };
  const tick = (now) => {
    frame = 0; if (closed) return; let more = false;
    if ((flyDir > 0 && fly < 1) || (flyDir < 0 && fly > 0)) {
      if (!primed) { primed = true; apply(); draw(); return invalidate(); } // the first frame carries the setting up; the clock starts on the one after, so none of the flight is skipped
      if (!flyStart) flyStart = now; const k = clamp((now - flyStart) / flyMs, 0, 1); fly = flyDir > 0 ? k : 1 - k; more = k < 1;
      if (!more) { flyStart = 0; if (flyDir > 0) { ready = true; el.dataset.ready = 'true'; } const done = afterFly; afterFly = null; done?.(); }
    }
    if (!dragging && (Math.abs(vy) > 1e-4 || Math.abs(vp) > 1e-4)) { turn(vy, vp); vy *= 0.9; vp *= 0.9; more = true; }
    apply(); draw(); if (more) invalidate();
  };
  const invalidate = () => { if (!frame && !closed) frame = requestAnimationFrame(tick); };
  const turn = (dy, dp) => { yaw = clamp(yaw + dy, yaw0 - 1.6, yaw0 + 1.6); pitch = clamp(pitch + dp, -1.05, 0.5); };
  const resize = () => {
    const w = stage.clientWidth || 1, h = stage.clientHeight || 1; renderer.setSize(w, h, false); canvas.style.width = canvas.style.height = '100%';
    camera.aspect = w / h; seatFov = w / h < 0.8 ? 98 : 82; camera.updateProjectionMatrix(); invalidate();
  };
  const observer = new ResizeObserver(resize); observer.observe(stage);

  const firstMove = () => { hint.dataset.gone = 'true'; };
  stage.addEventListener('pointerdown', (e) => { if (!ready) return; dragging = { x: e.clientX, y: e.clientY }; vy = vp = 0; stage.setPointerCapture(e.pointerId); stage.dataset.dragging = 'true'; });
  stage.addEventListener('pointermove', (e) => {
    if (!dragging) return; const k = (camera.fov * Math.PI / 180) / stage.clientHeight, ax = (e.clientX - dragging.x) * k, ay = (e.clientY - dragging.y) * k;
    dragging = { x: e.clientX, y: e.clientY }; turn(ax, ay); vy = clamp(ax, -0.03, 0.03); vp = clamp(ay, -0.03, 0.03); lastMove = performance.now(); firstMove(); invalidate();
  });
  const drop = () => { if (performance.now() - lastMove > 80) vy = vp = 0; dragging = null; delete stage.dataset.dragging; invalidate(); };
  stage.addEventListener('pointerup', drop); stage.addEventListener('pointercancel', drop);
  stage.addEventListener('wheel', (e) => { e.preventDefault(); seatFov = clamp(seatFov + e.deltaY * 0.03, 30, 100); invalidate(); }, { passive: false });

  const focusables = () => [...el.querySelectorAll('button')];
  el.addEventListener('keydown', (e) => {
    e.stopPropagation(); // the map's own arrow-key seat navigation must not run underneath
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    const step = { ArrowLeft: [0.12, 0], ArrowRight: [-0.12, 0], ArrowUp: [0, 0.08], ArrowDown: [0, -0.08] }[e.key];
    if (step && ready) { e.preventDefault(); turn(...step); firstMove(); invalidate(); return; }
    if (e.key === 'Tab') { const f = focusables(), i = f.indexOf(document.activeElement), next = f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length]; e.preventDefault(); next.focus(); }
  });

  const previousFocus = document.activeElement;
  function close(immediate = false, chose = false) {
    if (closed || el.dataset.closing) return;
    const finish = () => {
      closed = true; cancelAnimationFrame(frame); observer.disconnect(); clearTimeout(hintTimer); if (sheet) { [sheet.el.style.transform, sheet.el.style.transformOrigin, sheet.el.style.willChange] = sheet.was; } { const from = above(); if (from.matched && anchor?.follow) { const b = world.bbox; anchor.follow(info.x + (from.x - seat.x) / b.mpu, info.y + (from.z - seat.z) / b.mpu, (2 * from.y * Math.tan((LENS * Math.PI) / 360) * camera.aspect) / b.mpu); } } // leave the 2D map exactly as it was found, however the view was closed
      renderer.localClippingEnabled = false; world.clips[0].constant = world.cutBase; world.scene.fog.near = world.fog[0]; world.scene.fog.far = world.fog[1]; canvas.style.filter = ''; host.classList.remove('bt-flying', 'bt-covered'); host.classList.add('bt-back'); setTimeout(() => host.classList.remove('bt-back'), 320);
      paint((id) => world.tone.get(id)); for (const [i, at, open] of opened) { world.panMesh.setMatrixAt(i, at); world.scene.remove(open); open.material.dispose(); } world.panMesh.instanceMatrix.needsUpdate = true;
      canvas.remove(); el.remove(); if (open === api) open = null;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
      onClose?.(); if (chose) onChoose?.();
    };
    if (immediate) return finish();
    el.dataset.closing = 'true';
    const fade = () => { el.dataset.fading = 'true'; el.style.opacity = ''; el.style.webkitMaskImage = ''; el.style.maskImage = ''; host.classList.remove('bt-flying', 'bt-covered'); setTimeout(finish, 320); }; // plain fade, when there is no flight to reverse
    if (reducedMotion() || !ready) return fade();
    ready = false; flyDir = -1; flyStart = 0; flyMs = 2000 + (backMs + longer) * 0.7; afterFly = finish; invalidate(); // the same flight in reverse: up, gaze down, lens long, then dissolving into the map as it zooms back out in step
  }
  el.querySelector('.bt-sv-back').onclick = () => close();
  el.querySelector('.bt-sv-secondary').onclick = () => close();
  // Offers are chosen here, without going back to the map: the main button opens the list, a row puts the seat in the cart at that offer (or takes it out again), and then the button reads Continue.
  { const primary = el.querySelector('.bt-sv-primary'), list = el.querySelector('.bt-sv-offers'), rows = [...el.querySelectorAll('.bt-sv-offer')]; let picked = chosen;
    const paint = () => { for (const r of rows) { const on = r.dataset.tier === picked; r.classList.toggle('is-chosen', on); r.setAttribute('aria-pressed', String(on)); } primary.textContent = list.hidden ? (picked ? 'Change offer' : priceLabel || 'Choose ticket') : picked ? 'Continue' : 'Choose an offer'; primary.disabled = !picked && !list.hidden; };
    if (rows.length && onPick) {
      for (const r of rows) r.onclick = () => { picked = onPick(r.dataset.tier) ?? null; paint(); };
      primary.onclick = () => { if (list.hidden) { list.hidden = false; paint(); rows[0].focus(); } else if (picked) close(); };
      paint();
    } else primary.onclick = () => close(false, true); }
  const hintTimer = setTimeout(firstMove, 6000);

  if (fly === 1) { ready = true; el.dataset.ready = 'true'; }
  resize(); el.querySelector('.bt-sv-back').focus({ preventScroll: true });
  host.classList.add('bt-flying'); requestAnimationFrame(() => { el.dataset.open = 'true'; });

  // average milliseconds per frame over n turning frames, GPU work included (used to keep the scene within budget)
  const bench = (n = 40) => { const gl = renderer.getContext(), t = performance.now(); for (let i = 0; i < n; i++) { yaw += i < n / 2 ? 0.01 : -0.01; apply(); draw(); } gl.finish(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)); return (performance.now() - t) / n; };
  // inspection camera for checking the model from anywhere (not used by the product)
  const look = (x, y, z, tx, ty, tz, fov = 60, lens = 0) => { camera.position.set(x, y, z); camera.up.set(0, 1, 0); camera.lookAt(tx, ty, tz); camera.fov = fov; camera.near = 0.1; camera.updateProjectionMatrix(); renderer.localClippingEnabled = false; soft = lens; draw(); soft = 0; };
  const scrub = (f) => { flyDir = 0; fly = clamp(f, 0, 1); apply(); draw(); return { y: +camera.position.y.toFixed(2), pitch: +((camera.rotation.x * 180) / Math.PI).toFixed(1), fov: +camera.fov.toFixed(1), cut: world.clips[0].constant, clipped: renderer.localClippingEnabled }; }; // holds the flight at one moment, for checking it frame by frame (not used by the product)
  const api = { close, bench, look, scrub, world, state: () => ({ seatId, ready, closing: !!el.dataset.closing, yaw, pitch, yaw0, label: facts.label, level: facts.level, stats: facts.stats, seats: world.seats.size, details: world.details, eye: [seat.x, eyeY, seat.z] }) };
  open = api; return api;
}
