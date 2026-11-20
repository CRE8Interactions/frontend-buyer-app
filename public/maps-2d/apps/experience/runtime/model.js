import {attachTableSeats} from './table-seating.js';
// Pure data adapter and inventory rules, shared by the admin and buyer interfaces.
export function normalizeMap(raw){
 if(raw?.version===3)return normalizeV3(raw);
 if(!raw||!raw.sections||!raw.rows||!raw.seats||Array.isArray(raw.seats))throw Error('Use a verbose parser JSON or compact v2 parser export.');
 if(raw.v!==undefined&&raw.v!==2)throw Error('Unsupported parser version. Expected v2 or verbose data.');
 const sections=Object.entries(raw.sections).map(([id,s])=>({...s,id,name:String(s.sectionName||s.sectionNumber||id),number:String(s.sectionNumber??''),ga:s.zoomable===false,gaCapacity:Number.isSafeInteger(s.capacity)?s.capacity:Array.isArray(s.spots)?s.spots.length:null,seats:[],rowIds:[]}));
 const sectionById=new Map(sections.map(s=>[s.id,s]));
 const rows=Object.entries(raw.rows).map(([id,r])=>({...r,id,number:String(r.rowNumber??''),seats:[]}));
 const rowById=new Map(rows.map(r=>[r.id,r]));
 for(const s of sections)if(s.sectionId&&s.sectionId!==s.id)throw Error('Section UUID/key mismatch.');
 for(const r of rows){if((r.rowId&&r.rowId!==r.id)||!sectionById.has(r.sectionId))throw Error('Invalid row reference.');sectionById.get(r.sectionId).rowIds.push(r.id);}
 const seats=Object.entries(raw.seats).map(([id,value])=>{
  if(Array.isArray(value)&&value.length!==10)throw Error('Invalid compact seat tuple.');
  const s=Array.isArray(value)?{cx:value[0],cy:value[1],w:value[2],h:value[3],sectionId:value[4],rowId:value[5],sectionNumber:value[6],rowNumber:value[7],seatNumber:value[8],accessible:value[9]>0}:value;
  if(s.seatId&&s.seatId!==id)throw Error('Seat UUID/key mismatch.');
  if(![s.cx,s.cy,s.w,s.h].every(Number.isFinite)||s.w<=0||s.h<=0)throw Error('Seat coordinates or dimensions are invalid.');
  const section=sectionById.get(s.sectionId),row=rowById.get(s.rowId);
  if(!section||!row||row.sectionId!==s.sectionId)throw Error('A seat references a missing or inconsistent section/row UUID.');
  const seat={...s,id,x:s.cx+s.w/2,y:s.cy+s.h/2,number:String(s.seatNumber),rowNumber:String(s.rowNumber),sectionNumber:String(s.sectionNumber)};
  section.seats.push(id);row.seats.push(id);return seat;
 });
 if(!sections.length)throw Error('The map contains no sections.');
 const seatById=new Map(seats.map(s=>[s.id,s]));
 for(const row of rows){
  const declared=raw.rows[row.id].seats;
  if(declared){if(declared.length!==row.seats.length||new Set(declared).size!==declared.length||declared.some(id=>!row.seats.includes(id)))throw Error('Row seat membership does not match seat UUIDs.');row.seats=[...declared];}
 }
 for(const s of sections){if(s.rows&&(s.rows.length!==s.rowIds.length||new Set(s.rows).size!==s.rows.length||s.rows.some(id=>!s.rowIds.includes(id))))throw Error('Section row membership does not match row UUIDs.');}
 const bounds=seats.length?{x:Math.min(...seats.map(s=>s.cx)),y:Math.min(...seats.map(s=>s.cy)),right:Math.max(...seats.map(s=>s.cx+s.w)),bottom:Math.max(...seats.map(s=>s.cy+s.h))}:{x:0,y:0,right:1000,bottom:700};
 return {raw,sections,rows,seats,sectionById,rowById,seatById,bounds};
}
function normalizeV3(raw){
 const w=Number(raw.rendering?.seatWidth||10),h=Number(raw.rendering?.seatHeight||w),sections=[],rows=[],seats=[],sectionById=new Map(),rowById=new Map(),seatById=new Map();
 for(const [id,value] of Object.entries(raw.sections||{})){
  const section={...value,id,name:String(value.name),number:String(value.name),ga:value.type==='general_admission',gaCapacity:value.gaConfig?.capacity??null,gaCaption:value.gaConfig?.caption||'Non Reserved Seating - Standing Admission',seats:[],rowIds:[],path:value.pathString};sections.push(section);sectionById.set(id,section);
  for(const [rowId,rowValue] of Object.entries(value.rows||{})){
   const row={...rowValue,id:rowId,number:String(rowValue.rowNumber),seats:[]};rows.push(row);rowById.set(rowId,row);section.rowIds.push(rowId);
   for(const value of rowValue.seats||[]){const a=value.attributes||{},seat={...value,id:value.id,cx:value.x-w/2,cy:value.y-h/2,w,h,sectionId:id,rowId,sectionNumber:section.number,rowNumber:row.number,seatNumber:String(value.number),number:String(value.number),accessible:a.accessibility!=null,accessibleType:a.accessibility||null,da:a.accessibility==='DA'||a.accessibility==='DB',obstructedView:a.obstructedView===true,viewNotes:Array.isArray(a.viewNotes)?a.viewNotes:[]};seats.push(seat);seatById.set(seat.id,seat);row.seats.push(seat.id);section.seats.push(seat.id);}
  }
 }
 if(!sections.length)throw Error('The map contains no sections.');
 const bounds=seats.length?{x:Math.min(...seats.map(s=>s.cx)),y:Math.min(...seats.map(s=>s.cy)),right:Math.max(...seats.map(s=>s.cx+s.w)),bottom:Math.max(...seats.map(s=>s.cy+s.h))}:{x:0,y:0,right:1000,bottom:700};
 return attachTableSeats({raw,sections,rows,seats,sectionById,rowById,seatById,bounds});
}
export function emptyInventory(map,currency='CAD'){
 const ga=Object.fromEntries(map.sections.filter(s=>s.ga&&Number.isSafeInteger(s.gaCapacity)&&s.gaCapacity>=0).map(s=>[s.id,{capacity:s.gaCapacity,sold:0,offerId:null,locked:false}]));
 return {version:1,currency,mapSeatIds:map.seats.map(s=>s.id).sort(),mapSectionIds:map.sections.map(s=>s.id).sort(),offers:{},assignments:{},statuses:{},ga,rules:{}};
}
export function validateInventory(map,value){
 if(value?.version!==1||!value.offers||!value.assignments||!value.statuses||!value.ga||!value.rules)throw Error('Expected inventory contract version 1.');
 const same=(a,b)=>Array.isArray(a)&&JSON.stringify([...a].sort())===JSON.stringify(b.sort());
 if(!same(value.mapSeatIds,map.seats.map(s=>s.id))||!same(value.mapSectionIds,map.sections.map(s=>s.id)))throw Error('Inventory UUIDs do not match this map revision. Nothing was imported.');
 if(!/^[A-Z]{3}$/.test(value.currency))throw Error('Use a three-letter currency.');
 for(const [id,o] of Object.entries(value.offers)){
  if(!id||!o.name||!Array.isArray(o.tiers)||!o.tiers.length||new Set(o.tiers.map(t=>t.id)).size!==o.tiers.length||o.tiers.some(t=>!t.id||!Number.isSafeInteger(t.price)||t.price<0))throw Error('Invalid offer price tiers. Prices use integer minor units.');
 }
 for(const [id,offer] of Object.entries(value.assignments))if(!map.seatById.has(id)||!value.offers[offer])throw Error('Unknown seat or offer UUID in assignments.');
 for(const [id,status] of Object.entries(value.statuses))if(!map.seatById.has(id)||!['available','locked','sold','held','killed'].includes(status))throw Error('Invalid seat status.');
 for(const [id,g] of Object.entries(value.ga))if(!map.sectionById.get(id)?.ga||(g.offerId!==null&&!value.offers[g.offerId])||!Number.isSafeInteger(g.capacity)||!Number.isSafeInteger(g.sold)||g.capacity<0||g.sold<0||g.sold>g.capacity)throw Error('Invalid GA pool.');
 for(const [id,r] of Object.entries(value.rules))if(!map.sectionById.has(id)||!Number.isInteger(r.groupSize)||r.groupSize<1||r.groupSize>20||r.units&&(!Array.isArray(r.units)||r.units.some(u=>!Array.isArray(u)||u.length!==r.groupSize||u.some(seatId=>!map.seatById.has(seatId)||map.seatById.get(seatId).sectionId!==id))))throw Error('Invalid section selection rule.');
 return structuredClone(value);
}
export function demoInventory(map,{gaSold=18,sectionAvailability={}}={}){
 const inv=emptyInventory(map);inv.demo=true;
 inv.offers={standard:{name:'Standard admission',tiers:[{id:'adult',name:'Adult',price:2800},{id:'youth',name:'Youth',price:1800}]},premium:{name:'Premium admission',tiers:[{id:'adult',name:'Adult',price:4200},{id:'youth',name:'Youth',price:3200}]}};
 map.sections.forEach((s,i)=>{
  inv.rules[s.id]={groupSize:i%5===1?2:1};
  if(s.ga){const capacity=Number.isSafeInteger(s.gaCapacity)?s.gaCapacity:120,sold=Number.isSafeInteger(gaSold)?Math.max(0,Math.min(gaSold,capacity)):0;inv.ga[s.id]={capacity,sold,offerId:'standard',locked:false};}
  else s.seats.forEach((id,j)=>{if(j%17!==16)inv.assignments[id]=i%4===0?'premium':'standard';if(j%41===40)inv.statuses[id]='sold';else if(j%31===30)inv.statuses[id]='locked';});
 });
 for(const [id,state] of Object.entries(sectionAvailability)){
  const section=map.sectionById.get(id);if(!section||!['nearly-sold-out','sold-out'].includes(state))continue;
  const total=section.ga?inv.ga[id].capacity:section.seats.length,remaining=state==='sold-out'?0:Math.max(1,Math.floor(total*.08));
  if(section.ga)inv.ga[id].sold=total-remaining;
  else section.seats.forEach((seatId,index)=>{inv.assignments[seatId]='standard';inv.statuses[seatId]=index<remaining?'available':'sold';});
 }
 return inv;
}
export class InventoryStore{
 constructor(map,inventory){this.map=map;this.inventory=validateInventory(map,inventory);this.cart=new Map();this.unlocked=new Set();this.authoritativeRevision=-1;}
 applyAuthoritativeSnapshot(inventory,revision){
  if(!Number.isSafeInteger(revision)||revision<0)throw Error('Live inventory needs a nonnegative server revision.');
  if(revision<=this.authoritativeRevision)return {applied:false,removed:0,revision:this.authoritativeRevision};
  const next=validateInventory(this.map,inventory),before=this.cart.size;this.inventory=next;this.authoritativeRevision=revision;this.unlocked.clear();
  try{this.validateCart();}catch{this.cart.clear();}
  return {applied:true,removed:before-this.cart.size,revision};
 }
 status(id){if(this.map.sectionById.get(this.map.seatById.get(id)?.sectionId)?.killed||this.map.sectionById.get(this.map.seatById.get(id)?.sectionId)?.convertedGA)return 'killed';if(!this.inventory.assignments[id])return 'unassigned';const s=this.inventory.statuses[id]||'available';return s==='locked'&&this.unlocked.has(id)?'available':s;}
 unit(id){const s=this.map.seatById.get(id);if(!s)return [];const rule=this.inventory.rules[s.sectionId]||{},explicit=rule.units?.find(u=>u.includes(id));if(explicit)return explicit;if(rule.units)return [id];const row=this.map.rowById.get(s.rowId),n=rule.groupSize||1,index=row.seats.indexOf(id);const unit=row.seats.slice(Math.floor(index/n)*n,Math.floor(index/n)*n+n);return unit.length===n?unit:[];}
 assign(ids,offerId){
  if(!this.inventory.offers[offerId]||!ids.length)throw Error('Choose seats and an offer.');
  if(ids.some(id=>!this.map.seatById.has(id)||this.inventory.assignments[id]||['sold','held','killed'].includes(this.inventory.statuses[id])))throw Error('Selection contains seats already assigned to an offer. No seats were changed.');
  for(const id of ids)this.inventory.assignments[id]=offerId;
 }
 addSeat(id,tierId){
  const unit=this.unit(id),offerId=this.inventory.assignments[id],offer=this.inventory.offers[offerId];
  if(!unit.length)throw Error('This row does not have a complete configured group for this seat.');
  if(unit.some(x=>this.status(x)!=='available'||this.inventory.assignments[x]!==offerId))throw Error('The full configured group must be available under the same offer.');
  const tier=offer?.tiers.find(t=>t.id===tierId);if(!tier)throw Error('Choose an available price tier.');
  const key='seat:'+unit[0];this.cart.set(key,{key,type:'seat',sectionId:this.map.seatById.get(id).sectionId,seatIds:unit,offerId,tierId,quantity:unit.length,price:tier.price});return key;
 }
 addGA(sectionId,quantity,tierId){
  if(this.map.sectionById.get(sectionId)?.killed)throw Error('This section is unavailable.');
  const pool=this.inventory.ga[sectionId],offer=this.inventory.offers[pool?.offerId],tier=offer?.tiers.find(t=>t.id===tierId);
  if(!pool||!tier)throw Error('No available offer for this section.');
  if(pool.locked&&!this.unlocked.has(sectionId))throw Error('Unlock this section first.');
  if(!Number.isInteger(quantity)||quantity<1||quantity>pool.capacity-pool.sold)throw Error('Quantity exceeds the remaining pool.');
  const key='ga:'+sectionId;this.cart.set(key,{key,type:'ga',sectionId,offerId:pool.offerId,tierId,quantity,price:tier.price});
 }
 unlockSeat(id){for(const x of this.unit(id))if(this.inventory.statuses[x]==='locked')this.unlocked.add(x);}
 validateCart(){for(const line of this.cart.values()){
  if(this.map.sectionById.get(line.sectionId)?.killed)throw Error('This section is unavailable.');
  const tier=this.inventory.offers[line.offerId]?.tiers.find(t=>t.id===line.tierId);
  if(!tier||tier.price!==line.price)throw Error('Pricing changed. Review your selection.');
  if(line.type==='seat'){
   if(line.seatIds.some(id=>this.status(id)!=='available'||this.inventory.assignments[id]!==line.offerId)||JSON.stringify(this.unit(line.seatIds[0]))!==JSON.stringify(line.seatIds))throw Error('Seat availability or group rules changed. Review your selection.');
  }else{const pool=this.inventory.ga[line.sectionId];if(!pool||pool.offerId!==line.offerId||line.quantity>pool.capacity-pool.sold||(pool.locked&&!this.unlocked.has(line.sectionId)))throw Error('General admission availability changed.');}
 }return true;}
 get subtotal(){return [...this.cart.values()].reduce((n,l)=>n+l.price*l.quantity,0);}
 get quantity(){return [...this.cart.values()].reduce((n,l)=>n+l.quantity,0);}
 checkoutRequest(){if(!this.cart.size)throw Error('Select tickets first.');this.validateCart();return {version:1,currency:this.inventory.currency,lines:[...this.cart.values()],subtotal:this.subtotal};}
}
