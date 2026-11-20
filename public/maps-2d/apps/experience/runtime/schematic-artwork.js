/* A schematic 2D map drawn from the seat-map data alone: one plain tile per section, the playing surface with its markings, and nothing else.
   No artwork file is needed, so a venue can go live with just its seat map, every venue gets the same clean look, and the whole drawing is a few kilobytes.
   The result is handed to the player exactly where a venue's own SVG artwork would go, so everything downstream (seats, labels, availability colours,
   selection, themes, the 3D view) works unchanged. A venue chooses this with view2d.style = "schematic" in its venue.json. */

// fewer points, same shape: drop every point that sits within eps of the line between its neighbours (Douglas-Peucker on a closed ring)
function simplify(ring, eps) {
  if (ring.length < 5) return ring;
  const keep = new Uint8Array(ring.length), far = (a, b) => { let best = -1, d = eps; const ax = ring[a].x, ay = ring[a].y, bx = ring[b].x - ax, by = ring[b].y - ay, len = Math.hypot(bx, by) || 1; for (let i = a + 1; i < b; i++) { const e = Math.abs((ring[i].x - ax) * by - (ring[i].y - ay) * bx) / len; if (e > d) { d = e; best = i; } } return best; };
  const walk = (a, b) => { const m = far(a, b); if (m > 0) { keep[m] = 1; walk(a, m); walk(m, b); } };
  let split = 0, most = 0; for (let i = 1; i < ring.length; i++) { const d = Math.hypot(ring[i].x - ring[0].x, ring[i].y - ring[0].y); if (d > most) { most = d; split = i; } }
  keep[0] = keep[split] = 1; walk(0, split); const tail = ring.slice(split).concat([ring[0]]), base = split, k2 = new Uint8Array(tail.length);
  { const far2 = (a, b) => { let best = -1, d = eps; const ax = tail[a].x, ay = tail[a].y, bx = tail[b].x - ax, by = tail[b].y - ay, len = Math.hypot(bx, by) || 1; for (let i = a + 1; i < b; i++) { const e = Math.abs((tail[i].x - ax) * by - (tail[i].y - ay) * bx) / len; if (e > d) { d = e; best = i; } } return best; }, walk2 = (a, b) => { const m = far2(a, b); if (m > 0) { k2[m] = 1; walk2(a, m); walk2(m, b); } }; walk2(0, tail.length - 1); for (let i = 1; i < tail.length - 1; i++) if (k2[i]) keep[base + i] = 1; }
  return ring.filter((_, i) => keep[i]);
}
const d = (ring) => 'M' + ring.map((p) => `${+p.x.toFixed(1)} ${+p.y.toFixed(1)}`).join('L') + 'Z';
const boxOf = (ring) => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const p of ring) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); } return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 }; };
const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const STYLE = { tile: '#2563eb', gap: '#f4f4f5', gapWidth: 7, plate: '#ffffff', plateEdge: '#d4d4d8', plateEdgeWidth: 2.4, base: '#f9f9fa', bay: '#dcdce0', dark: '#2f343c', surface: '#ffffff', line: '#2a5fc4', red: '#cf2b2b', pitch: '#2d8a45', simplify: 0.4 }; // simplify: how far (map units) a tile's edge may stray from the section's true outline. Kept tiny, so a tile and the player's own highlight of that section coincide

export function schematicSVG(raw, options = {}, decor = '') {
  const s = { ...STYLE, ...options }, shapes = Object.values(raw.shapes || {}), sections = Object.values(raw.sections || {}), ring = (o) => o.boundary?.[0]?.length > 2 ? o.boundary[0] : null,
    // a section or shape can be made of several separate pieces (Suite Overflow sits at both ends of the building): draw every piece, not just the first
    pieces = (o, tolerance) => (o.boundary || []).filter((r) => r?.length > 2).map((r) => d(simplify(r, tolerance))).join('');
  const all = boxOf(sections.flatMap((x) => (x.boundary || []).filter((r) => r?.length > 2).flat()).concat(shapes.filter((x) => /venue_perimeter|element_wrapper/.test(x.name || '')).flatMap((x) => ring(x) || [])));
  const view = raw.coordinates?.viewBox || raw.rendering?.viewBox, vb = Array.isArray(view) && view.length === 4 ? view : [0, 0, Math.ceil((all.x1 + all.x0) / 10) * 10, Math.ceil((all.y1 + all.y0) / 10) * 10];
  const mpu = raw.elevationModel?.calibration?.metersPerUnit || 0.04, m = (metres) => metres / mpu;
  let out = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" class="schematic" viewBox="${vb.join(' ')}"><g class="base">`;
  // the building's footprint, as a quiet ground for the tiles
  const perimeter = shapes.find((x) => x.name === 'venue_perimeter' && ring(x)); if (perimeter) out += `<path class="schematic-ground" fill="${s.base}" d="${d(simplify(ring(perimeter), 3))}"/>`;
  // bays that are not for sale, and fixed rooms (a press box), as plain blocks
  for (const x of shapes) { const r = ring(x); if (!r) continue; if (x.groupPath?.some((p) => /inactive/i.test(p)) || /^inactive$/i.test(x.name || '')) out += `<path class="schematic-bay" fill="${s.bay}" d="${pieces(x, s.simplify)}"/>`; else if (x.spatial3D?.box) out += `<path class="schematic-room" fill="${s.dark}" d="${d(simplify(r, s.simplify))}"/>`; }
  // one tile per section: its own outline reduced to its corners, with a gap to its neighbours
  // Each tile is written the way the player expects a section's cover to be written (a section group holding an "identifier" group whose first path is
  // the cover), so the player treats it as that section's cover: it hides the seats at overview, takes the availability colour, and fades as you zoom in.
  let tiles = ''; for (const x of sections) { const r = ring(x); if (r) tiles += `<g class="sec-${esc(String(x.name).replace(/\s+/g, '-'))}" data-section-id="${esc(x.id)}"><g class="identifier"><path class="schematic-tile" fill="${s.tile}" stroke="${s.gap}" stroke-width="${s.gapWidth}" stroke-linejoin="round" d="${pieces(x, s.simplify)}"/></g></g>`; }
  // under every tile, a pale plate with its own edge: when you zoom in and the tile fades to show the seats, the section keeps a clear outline
  for (const x of sections) { const r = ring(x); if (r) out += `<path class="schematic-plate" fill="${s.plate}" stroke="${s.plateEdge}" stroke-width="${s.plateEdgeWidth}" stroke-linejoin="round" d="${pieces(x, s.simplify)}"/>`; }
  // the playing surface, with markings drawn from its size
  const surfaces = shapes.filter((x) => ring(x) && x.groupPath?.some((p) => /^surface_type_/i.test(p))).map((x) => ({ x, b: boxOf(ring(x)) })).sort((a, b) => b.b.w * b.b.h - a.b.w * a.b.h), top = surfaces[0];
  if (top) {
    const kind = top.x.groupPath.find((p) => /^surface_type_/i.test(p)), b = top.b, long = b.w >= b.h, L = Math.max(b.w, b.h), W = Math.min(b.w, b.h), cx = b.cx, cy = b.cy;
    const P = (along, across) => (long ? [cx + along, cy + across] : [cx + across, cy + along]), line = (a0, c0, a1, c1, col, w) => { const p = P(a0, c0), q = P(a1, c1); return `<path stroke="${col}" stroke-width="${w}" d="M${p[0].toFixed(1)} ${p[1].toFixed(1)}L${q[0].toFixed(1)} ${q[1].toFixed(1)}"/>`; }, circle = (a, c, r, col, w, fill = 'none') => { const p = P(a, c); return `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${r.toFixed(1)}" stroke="${col}" stroke-width="${w}" fill="${fill}"/>`; };
    const edge = d(simplify(ring(top.x), 0.25));
    out += `<g class="${esc(kind)}"><defs><clipPath id="schematic-surface"><path d="${edge}"/></clipPath></defs><g class="comps"><g class="outline"><path fill="${/hockey|ice/i.test(kind) ? s.surface : s.pitch}" stroke="${s.line}" stroke-width="${m(0.12).toFixed(1)}" d="${edge}"/></g><g clip-path="url(#schematic-surface)">`;
    if (/hockey|ice/i.test(kind)) {
      const goal = L / 2 - m(3.35), spot = goal - m(6.1), side = Math.min(m(6.7), W / 2 - m(5)), thin = m(0.07), wide = m(0.3);
      out += line(0, -W / 2, 0, W / 2, s.red, wide) + line(-m(7.62), -W / 2, -m(7.62), W / 2, s.line, wide) + line(m(7.62), -W / 2, m(7.62), W / 2, s.line, wide) + circle(0, 0, m(4.57), s.line, thin);
      for (const e of [-1, 1]) { const inset = Math.sqrt(Math.max(0, 1 - Math.min(1, (m(3.35) / m(8.5))) ** 0)) * 0; out += line(e * goal, -W / 2 + m(1.2) + inset, e * goal, W / 2 - m(1.2) - inset, s.red, thin); for (const f of [-1, 1]) out += circle(e * spot, f * side, m(4.57), s.red, thin) + circle(e * spot, f * side, m(0.3), s.red, 0, s.red) + circle(e * m(6.1), f * side, m(0.3), s.red, 0, s.red); }
    } else out += line(0, -W / 2, 0, W / 2, '#ffffff', m(0.12)) + circle(0, 0, Math.min(m(9.15), W / 5), '#ffffff', m(0.12));
    out += '</g></g>';
    // parts kept from the venue's own artwork (a logo, bench labels, an arrow), in the same coordinates
    if (decor) out += `<g class="schematic-decor">${decor.replace(/^[\s\S]*?<svg\b[^>]*>/, '').replace(/<\/svg>\s*$/, '')}</g>`;
    out += '</g>';
  } else if (decor) { out += `<g class="schematic-decor">${decor.replace(/^[\s\S]*?<svg\b[^>]*>/, '').replace(/<\/svg>\s*$/, '')}</g>`;
  }
  return out + '</g><g class="schematic-sections">' + tiles + '</g></svg>';
}
