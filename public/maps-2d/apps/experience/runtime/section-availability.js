export const sectionStateColors = { 'nearly-sold-out': '#5c8af0', 'sold-out': '#cbd5e1', killed: '#d4dde8' };
export const sectionStateLabels = { 'nearly-sold-out': 'Few left', 'sold-out': 'Sold out', killed: 'Unavailable', locked: 'Locked offers', unavailable: 'Currently unavailable', available: 'Available' };

// Scarcity is based on sold inventory, independent of filters and local selections.
export function sectionAvailability(store, section, threshold = .1) {
  if(section?.killed)return {state:'killed',label:sectionStateLabels.killed,total:0,sold:0,remaining:0,available:0,locked:0};
  let total=0,sold=0,available=0,locked=0;
  if(section?.ga){
    const pool=store.inventory.ga[section.id];
    if(pool){total=pool.capacity;sold=pool.sold;const remaining=total-sold;if(pool.offerId&&store.inventory.offers[pool.offerId]){if(pool.locked&&!store.unlocked.has(section.id))locked=remaining;else available=remaining;}}
  }else for(const id of section?.seats||[]){
    const status=store.status(id);
    if(status==='unassigned'||status==='killed')continue;
    total++;if(status==='sold')sold++;else if(status==='available')available++;else if(status==='locked')locked++;
  }
  const remaining=total-sold,state=total>0&&remaining===0?'sold-out':available>0?(remaining/total<=threshold?'nearly-sold-out':'available'):locked>0?'locked':'unavailable';
  return {state,label:sectionStateLabels[state],total,sold,remaining,available,locked};
}
