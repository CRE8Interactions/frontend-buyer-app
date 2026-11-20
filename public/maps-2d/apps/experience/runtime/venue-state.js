import {validateStands} from './stand-model.js';
import {validateTables} from './table-seating.js';
// @ts-check
/** @typedef {import('./model').VenueMap} VenueMap */
/** @typedef {import('./model').Seat} Seat */
export const isUUID = (/** @type {string} */ value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export const newId = () => crypto.randomUUID();
/** @returns {VenueMap} */
export function createVenueMap(name = 'Untitled venue') {
  return { version: 3, id: newId(), name, activeVariant: newId(), focalPoint: {x: 0, y: 0},
    coordinates: {unit: 'svg_user_unit', millimetersPerUnit: null}, landmarks: [], sections: {} };
}
/** @param {VenueMap} map @returns {Seat[]} */
export function allSeats(map) { return Object.values(map.sections).flatMap(s => Object.values(s.rows).flatMap(r => r.seats)); }
/** Runtime validation also protects persisted data from malformed imports. @param {VenueMap} map */
export function validateVenueMap(map) {
  const fail = (/** @type {string} */ s) => { throw Error(`Invalid venue map: ${s}`); };
  const ids = new Set();
  const id = (/** @type {string} */ value) => { if (!isUUID(value) || ids.has(value)) fail('missing, invalid or duplicate UUID'); ids.add(value); };
  const finite = (/** @type {number} */ n) => typeof n === 'number' && Number.isFinite(n);
  const point = (/** @type {import('./model').Point} */ p) => p && finite(p.x) && finite(p.y);
  const polygon = (/** @type {import('./model').Point[]} */ p) => Array.isArray(p) && p.length >= 3 && p.every(point) && Math.abs(p.reduce((a,v,i)=>{const w=p[(i+1)%p.length];return a+v.x*w.y-w.x*v.y;},0)) > 1e-10;
  if (!map || map.version !== 3 || typeof map.name !== 'string' || !point(map.focalPoint)) fail('header');
  id(map.id); id(map.activeVariant);
  if (!map.coordinates || map.coordinates.unit !== 'svg_user_unit' || !(map.coordinates.millimetersPerUnit === null || (finite(map.coordinates.millimetersPerUnit) && map.coordinates.millimetersPerUnit > 0))) fail('coordinate calibration');
  if(map.stairAisles!==undefined){if(!Array.isArray(map.stairAisles))fail('stair aisles');const seen=new Set();for(const aisle of map.stairAisles){const a=aisle?.sectionA,b=aisle?.sectionB,key=[a,b].sort().join(':');if(typeof a!=='string'||typeof b!=='string'||a===b||!map.sections?.[a]||!map.sections?.[b]||seen.has(key)||aisle.enabled!==undefined&&typeof aisle.enabled!=='boolean'||aisle.width!==undefined&&(!finite(aisle.width)||aisle.width<=0)||aisle.color!==undefined&&!/^#[0-9a-f]{6}$/i.test(aisle.color))fail('stair aisle');seen.add(key);}}
  if (!map.sections || Array.isArray(map.sections) || !Array.isArray(map.landmarks)) fail('collections');
  if(map.bowlProfiles!==undefined){
    if(!Array.isArray(map.bowlProfiles))fail('bowl profiles');
    const groups=new Set();
    for(const b of map.bowlProfiles){
      if(!b||typeof b.id!=='string'||!b.id||!map.decks?.[b.deckId]||b.physicalGroupId!=null&&typeof b.physicalGroupId!=='string'||!Array.isArray(b.reference)||b.reference.length<2||!b.reference.every(point)||!b.reference.some(p=>p.x!==b.reference[0].x||p.y!==b.reference[0].y)||!finite(b.height)||b.height<0||b.height>120||!finite(b.slope)||b.slope<0||b.slope>60||b.lowerSlope!==undefined&&(!finite(b.lowerSlope)||b.lowerSlope<0||b.lowerSlope>60)||!finite(b.floorElevation)||b.floorElevation<0||b.floorElevation>b.height)fail('bowl profile: check reference points, height, slope and floor');
      const key=JSON.stringify([b.deckId,b.physicalGroupId||null]);if(groups.has(key))fail('duplicate bowl reference for a deck/group');groups.add(key);
    }
  }
  if(map.rails!==undefined){if(!Array.isArray(map.rails))fail('rails');const sources=new Set();for(const rail of map.rails){id(rail.id);if(typeof rail.sourceKey!=='string'||!rail.sourceKey||sources.has(rail.sourceKey)||typeof rail.name!=='string'||!Array.isArray(rail.points)||rail.points.length<2||!rail.points.every(point)||rail.deckId!=null&&!map.decks?.[rail.deckId]||rail.height!==undefined&&(!finite(rail.height)||rail.height<=0||rail.height>3)||rail.color!==undefined&&!/^#[0-9a-f]{6}$/i.test(rail.color)||rail.opacity!==undefined&&(!finite(rail.opacity)||rail.opacity<0||rail.opacity>1)||rail.enabled!==undefined&&typeof rail.enabled!=='boolean')fail('rail');sources.add(rail.sourceKey);}}
  for (const [key,s] of Object.entries(map.sections)) {
    id(s.id);
    if (key !== s.id || typeof s.name !== 'string' || !['reserved','general_admission'].includes(s.type) || !(Array.isArray(s.boundary) && s.boundary.length > 0 && s.boundary.every(polygon)) || typeof s.pathString !== 'string') fail('section');
    if (!s.identifier || typeof s.identifier.text !== 'string' || typeof s.identifier.path !== 'string' || !point(s.identifier.center)) fail('identifier');
    const p=s.spatial3D;
    if (!p || !['tierIndex','baseElevation','seatingSlope','rowPitch','rowRiser','skirtingBase'].every(k=>finite(p[/** @type {keyof typeof p} */(k)])) || !Number.isSafeInteger(p.tierIndex) || p.tierIndex<0 || p.rowPitch<0 || p.rowRiser<0 || p.seatingSlope<=-90 || p.seatingSlope>=90) fail('spatial parameters');
    if (s.type==='general_admission' && (!s.gaConfig || !Number.isSafeInteger(s.gaConfig.capacity) || s.gaConfig.capacity<0 || !['flat_slab','stepped_terraces'].includes(s.gaConfig.renderStyle))) fail('GA configuration');
    if (s.type==='reserved' && (!s.reservedConfig || !finite(s.reservedConfig.seatSpacing) || s.reservedConfig.seatSpacing<=0 || !['radial_arc','linear_grid'].includes(s.reservedConfig.layoutType) || !['ltr','rtl','serpentine','split_odd_even'].includes(s.reservedConfig.numberingRule) || typeof s.reservedConfig.rowStagger!=='boolean')) fail('reserved configuration');
    if (!s.rows || Array.isArray(s.rows)) fail('rows');
    for (const [key,r] of Object.entries(s.rows)) {
      id(r.id);
      if (key!==r.id || r.sectionId!==s.id || typeof r.rowNumber!=='string' || !Number.isInteger(r.rowIndex) || r.rowIndex<0 || !Array.isArray(r.seats)) fail('row');
      const keys=new Set();
      for (const seat of r.seats) {
        id(seat.id);
        if (seat.row!==r.id || !point(seat) || !finite(seat.z) || !Number.isSafeInteger(seat.number) || seat.number<0 || typeof seat.key!=='string' || !seat.key || keys.has(seat.key) || typeof seat.category!=='string' || typeof seat.isPinned!=='boolean' || !['available','reserved','held','killed','orphaned'].includes(seat.status)) fail('seat');
        keys.add(seat.key);
      }
    }
  }
  for (const l of map.landmarks) { id(l.id); if (typeof l.name!=='string' || !polygon(l.boundary) || !point(l.center) || typeof l.pathString!=='string') fail('landmark'); }
  validateStands(map);
  validateTables(map);
  for(const table of Object.values(map.tables||{}))id(table.id);
  return map;
}
/** Pinned inventory can be re-parented or marked orphaned, but not lost, replaced, moved or unpinned by layout updates.
 * @param {VenueMap} before @param {VenueMap} after */
export function assertPinnedInventory(before, after) {
  const next = new Map(allSeats(after).map(s=>[s.id,s]));
  for (const old of allSeats(before).filter(s=>s.isPinned)) {
    const seat=next.get(old.id);
    if (!seat || !seat.isPinned || ['key','number','x','y','z','category'].some(k=>seat[/** @type {keyof Seat} */(k)]!==old[/** @type {keyof Seat} */(k)])) throw Error(`Pinned seat ${old.id} cannot be removed or overwritten.`);
  }
}
/** Pure guarded update; never exposes the original state to the mutator. @param {VenueMap} map @param {(draft:VenueMap)=>void} mutate */
export function updateVenueMap(map, mutate) { const next=structuredClone(map); mutate(next); validateVenueMap(next); assertPinnedInventory(map,next); return next; }

/** Normalize Phase 1 flat boundaries without mutating the stored record or inventory.
 * Migration is idempotent; malformed data still fails validation.
 * @param {unknown} raw @returns {VenueMap} */
export function normalizeStoredVenueMap(raw) {
  const map = /** @type {VenueMap} */ (structuredClone(raw));
  if (map?.version === 3 && map.sections) {
    for (const section of Object.values(map.sections)) {
      const boundary = /** @type {unknown} */ (section.boundary);
      if (Array.isArray(boundary) && boundary.length && boundary.every(p => p && !Array.isArray(p) && typeof p.x === 'number' && typeof p.y === 'number')) {
        section.boundary = [boundary];
      }
    }
  }
  return validateVenueMap(map);
}
