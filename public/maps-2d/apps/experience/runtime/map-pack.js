/* The packed map: a venue's seat map in the smallest form the player can run. Venue data only, nothing about the interface.

   A full seat map (venue-map.json) says every outline twice, with hundreds of points, and repeats the same dozen fields on every seat. The pack keeps one copy
   of each outline, reduced to the points that matter, and stores a seat as [id, number, x, y] plus only what differs from the venue's usual seat.
   unpackMap() rebuilds the full structure the player works with, so nothing else in the player knows the pack exists.
   Everything except outline detail comes back exactly: ids, names, positions, flags and every other field are identical to the source. */

const round = (v) => Math.round(v * 100) / 100;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// drop points that sit within eps of the line between their neighbours
function simplify(pts, eps) {
  const n = pts.length; if (n < 5) return pts.slice();
  const keep = new Uint8Array(n), stack = []; let far = 0, most = -1;
  for (let i = 1; i < n; i++) { const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]); if (d > most) { most = d; far = i; } }
  const ring = pts.concat([pts[0]]); keep[0] = keep[far] = 1; stack.push([0, far], [far, n]);
  while (stack.length) { const [a, b] = stack.pop(), ax = ring[a][0], ay = ring[a][1], dx = ring[b][0] - ax, dy = ring[b][1] - ay, len = Math.hypot(dx, dy) || 1; let best = -1, worst = eps;
    for (let i = a + 1; i < b; i++) { const e = Math.abs((ring[i][0] - ax) * dy - (ring[i][1] - ay) * dx) / len; if (e > worst) { worst = e; best = i; } }
    if (best > 0) { keep[best] = 1; stack.push([a, best], [best, b]); } }
  const out = []; for (let i = 0; i < n; i++) if (keep[i]) out.push(pts[i]); return out;
}
const packRings = (boundary, eps) => (boundary || []).map((ring) => simplify(ring.map((p) => [p.x, p.y]), eps).flatMap((p) => [round(p[0]), round(p[1])]));
const pathOf = (rings) => rings.map((r) => { let s = ''; for (let i = 0; i < r.length; i += 2) s += (i ? ' L' : 'M') + r[i].toFixed(2) + ',' + r[i + 1].toFixed(2); return s + ' Z'; }).join(' ');
const boundaryOf = (rings) => rings.map((r) => { const out = []; for (let i = 0; i < r.length; i += 2) out.push({ x: r[i], y: r[i + 1] }); return out; });
const seatKey = (section, row, seat) => `sec-${section.name}-row-${row.rowNumber}-seat-${seat.number}`;
const SEAT_OWN = ['id', 'number', 'x', 'y', 'key', 'row'];

export function packMap(raw, { sectionDetail = 0.4, shapeDetail = 0.3, letterDetail = 0.08 } = {}) {
  const top = {}; for (const [k, v] of Object.entries(raw)) if (k !== 'sections' && k !== 'shapes') top[k] = v;
  // the venue's usual seat: whatever value each field most often has
  const tally = new Map();
  for (const s of Object.values(raw.sections || {})) for (const r of Object.values(s.rows || {})) for (const q of r.seats || []) for (const [k, v] of Object.entries(q)) { if (SEAT_OWN.includes(k)) continue; const key = JSON.stringify(v); if (!tally.has(k)) tally.set(k, new Map()); tally.get(k).set(key, (tally.get(k).get(key) || 0) + 1); }
  const usual = {}; for (const [k, counts] of tally) usual[k] = JSON.parse([...counts].sort((a, b) => b[1] - a[1])[0][0]);
  const sections = Object.values(raw.sections || {}).map((s) => {
    const out = {}; for (const [k, v] of Object.entries(s)) if (!['boundary', 'pathString', 'rows'].includes(k)) out[k] = v;
    out.b = packRings(s.boundary, sectionDetail); if (s.pathString === undefined) out.noPath = 1;
    if (s.rows) out.rows = Object.values(s.rows).map((r) => {
      const row = {}; for (const [k, v] of Object.entries(r)) if (k !== 'seats' && !(k === 'sectionId' && v === s.id)) row[k] = v;
      row.s = (r.seats || []).map((q) => { const o = {}; for (const [k, v] of Object.entries(q)) if (!SEAT_OWN.includes(k) && !same(v, usual[k])) o[k] = v; for (const k of Object.keys(usual)) if (!(k in q)) o['-' + k] = 1; if (q.key !== seatKey(s, r, q)) o.key = q.key; if (q.row !== r.id) o.row = q.row; return Object.keys(o).length ? [q.id, q.number, q.x, q.y, o] : [q.id, q.number, q.x, q.y]; });
      return row; });
    return out; });
  const shapes = Object.values(raw.shapes || {}).map((s) => { const out = {}; for (const [k, v] of Object.entries(s)) if (k !== 'boundary' && k !== 'pathString') out[k] = v; out.b = packRings(s.boundary, (s.groupPath || []).includes('row-lettering') ? letterDetail : shapeDetail); if (s.pathString === undefined) out.noPath = 1; return out; });
  return { format: 'seatmap-pack', version: 1, id: raw.id, top, usual, sections, shapes };
}

export function unpackMap(pack) {
  if (pack?.format !== 'seatmap-pack' || pack.version !== 1) throw Error('Not a packed seat map this player can read');
  const raw = { ...pack.top, sections: {}, shapes: {} }, usual = JSON.stringify(pack.usual || {});
  // keep the source's key order: sections and shapes sit where they were among the top-level fields
  for (const s of pack.sections) {
    const out = {}; for (const [k, v] of Object.entries(s)) if (!['b', 'rows', 'noPath'].includes(k)) out[k] = v;
    out.boundary = boundaryOf(s.b); if (!s.noPath) out.pathString = pathOf(s.b);
    if (s.rows) { out.rows = {}; for (const r of s.rows) { const row = { id: r.id, sectionId: s.id }; for (const [k, v] of Object.entries(r)) if (k !== 's') row[k] = v; // the row's own section is implied; fields come back in the source's order
      row.seats = r.s.map(([id, number, x, y, o]) => { const q = { id, key: '', row: r.id, number, x, y, ...JSON.parse(usual) }; if (o) for (const [k, v] of Object.entries(o)) { if (k[0] === '-') delete q[k.slice(1)]; else q[k] = v; } if (!o?.key) q.key = seatKey(s, r, q); return q; });
      out.rows[r.id] = row; } }
    raw.sections[s.id] = out; }
  for (const s of pack.shapes) { const out = {}; for (const [k, v] of Object.entries(s)) if (k !== 'b' && k !== 'noPath') out[k] = v; out.boundary = boundaryOf(s.b); if (!s.noPath) out.pathString = pathOf(s.b); raw.shapes[s.id] = out; }
  return raw;
}
