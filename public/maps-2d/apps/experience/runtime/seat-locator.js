/* Where a seat is in the building: a small plan of the venue with the seat's section picked out, the seat marked, and a beam showing which way it looks.
   Drawn from the map alone (no 3D needed), so it is there on every device. Colours come from the popover's own tokens, so it follows light and dark themes. */
const plans = new WeakMap();

function planOf(map) {
  let plan = plans.get(map); if (plan) return plan;
  const thin = (ring, max) => { const step = Math.max(1, Math.ceil(ring.length / max)); return ring.filter((_, i) => i % step === 0); };
  const d = (ring, max = 40) => 'M' + thin(ring, max).map((p) => `${Math.round(p.x)} ${Math.round(p.y)}`).join('L') + 'Z';
  const box = (ring) => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const p of ring) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); } return { x0, y0, x1, y1 }; };
  // Each section as the map itself has it: every piece of its outline (a section can be in more than one piece), from the same path the map and the minimap draw. Nothing about the building is written down here.
  const rings = (s) => (s.boundary || []).filter((r) => r?.length > 2), shown = map.sections.filter((s) => !s.killed && (s.path || rings(s).length));
  const sections = shown.map((s) => ({ id: s.id, d: s.path || rings(s).map((r) => d(r)).join('') }));
  const all = box(shown.flatMap((s) => rings(s).flat()));
  const surfaces = Object.values(map.raw?.shapes || {}).filter((s) => s.boundary?.[0]?.length > 2 && s.groupPath?.some((p) => /^surface_type_/i.test(p))).map((s) => ({ s, b: box(s.boundary[0]) })).sort((a, b) => (b.b.x1 - b.b.x0) * (b.b.y1 - b.b.y0) - (a.b.x1 - a.b.x0) * (a.b.y1 - a.b.y0));
  const ice = surfaces[0] ? { d: d(surfaces[0].s.boundary[0], 90), b: surfaces[0].b } : null;
  // a 16:9 frame round the whole building, with a little air
  const h = (all.y1 - all.y0) * 1.12, w = Math.max((all.x1 - all.x0) * 1.08, (h * 16) / 9), cx = (all.x0 + all.x1) / 2, cy = (all.y0 + all.y1) / 2, hh = Math.max(h, (w * 9) / 16);
  plan = { sections, ice, view: [cx - w / 2, cy - hh / 2, w, hh], centre: ice ? [(ice.b.x0 + ice.b.x1) / 2, (ice.b.y0 + ice.b.y1) / 2] : [cx, cy] };
  plans.set(map, plan); return plan;
}

// The playing surface as the map itself draws it (lines, circles, the logo, which way the home side shoots), copied from the map's own artwork on the page.
// It is in the same coordinates as the plan. Taken once the artwork is there; until then, and wherever there is none, the surface is a plain shape.
function rinkArt(plan) {
  if (plan.art === undefined || plan.art === '') {
    const g = typeof document === 'undefined' ? null : document.querySelector('.flat-vector-artwork [class*="surface_type_"]');
    if (g) { const copy = g.cloneNode(true); for (const el of [copy, ...copy.querySelectorAll('*')]) { if (el.dataset.btFill !== undefined) el.setAttribute('fill', el.dataset.btFill); if (el.dataset.btStroke !== undefined) el.setAttribute('stroke', el.dataset.btStroke); delete el.dataset.btFill; delete el.dataset.btStroke; } plan.art = copy.outerHTML.replaceAll('schematic-surface', 'bt-loc-surface'); } else plan.art = ''; // its clip gets a name of its own; anything else it refers to by name is the same drawing either way
  }
  return plan.art;
}

export function locatorSVG(map, seat) {
  if (!map || !seat || !Number.isFinite(seat.x) || !Number.isFinite(seat.y)) return '';
  const plan = planOf(map), [vx, vy, vw, vh] = plan.view, unit = vw / 100;
  // the beam: from the seat toward the middle of the playing surface, widening as it goes and fading out
  const dx = plan.centre[0] - seat.x, dy = plan.centre[1] - seat.y, far = Math.hypot(dx, dy) || 1, len = Math.max(unit * 14, Math.min(far * 1.15, unit * 42)), a = Math.atan2(dy, dx), spread = 0.4;
  const at = (ang, r) => `${(seat.x + Math.cos(ang) * r).toFixed(0)} ${(seat.y + Math.sin(ang) * r).toFixed(0)}`;
  const beam = `M${seat.x.toFixed(0)} ${seat.y.toFixed(0)}L${at(a - spread, len)}A${len.toFixed(0)} ${len.toFixed(0)} 0 0 1 ${at(a + spread, len)}Z`;
  return `<svg class="bt-loc" viewBox="${vx.toFixed(0)} ${vy.toFixed(0)} ${vw.toFixed(0)} ${vh.toFixed(0)}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">` +
    `<defs><linearGradient id="bt-loc-beam" gradientUnits="userSpaceOnUse" x1="${seat.x.toFixed(0)}" y1="${seat.y.toFixed(0)}" x2="${(seat.x + Math.cos(a) * len).toFixed(0)}" y2="${(seat.y + Math.sin(a) * len).toFixed(0)}"><stop class="bt-loc-b0" offset="0"/><stop class="bt-loc-b1" offset="1"/></linearGradient></defs>` +
    plan.sections.map((s) => `<path class="bt-loc-sec" d="${s.d}"${s.id === seat.sectionId ? ' data-current' : ''}/>`).join('') +
    (plan.ice ? (rinkArt(plan) ? `<g class="bt-loc-rink">${plan.art}</g><path class="bt-loc-ice bt-loc-edge" d="${plan.ice.d}"/>` : `<path class="bt-loc-ice" d="${plan.ice.d}"/>`) : '') +
    `<path class="bt-loc-beam" d="${beam}" fill="url(#bt-loc-beam)"/>` +
    `<circle class="bt-loc-halo" cx="${seat.x.toFixed(0)}" cy="${seat.y.toFixed(0)}" r="${(unit * 4.2).toFixed(0)}"/><circle class="bt-loc-halo bt-loc-halo-2" cx="${seat.x.toFixed(0)}" cy="${seat.y.toFixed(0)}" r="${(unit * 4.2).toFixed(0)}"/><circle class="bt-loc-dot" cx="${seat.x.toFixed(0)}" cy="${seat.y.toFixed(0)}" r="${(unit * 1.5).toFixed(0)}" stroke-width="${(unit * 0.7).toFixed(1)}"/></svg>`;
}
