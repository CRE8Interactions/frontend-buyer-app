/** Saved structure is independent of section names and occupied row counts. */
const finite=Number.isFinite;
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
export const standHeight=(stand,depthM)=>stand.profile.referenceHeightM+depthM*Math.tan(stand.profile.slopeDegrees*Math.PI/180);
export const polygonArea=p=>Math.abs(p.outer.reduce((n,a,i)=>{const b=p.outer[(i+1)%p.outer.length];return n+a[0]*b[1]-b[0]*a[1];},0))/2-(p.holes||[]).reduce((n,r)=>n+polygonArea({outer:r}),0);
export function validateStands(map){
 if(map.stands===undefined)return map;
 const fail=message=>{throw Error(`Invalid stand: ${message}`);};
 if(!map.stands||Array.isArray(map.stands)||typeof map.stands!=='object')fail('collection');
 const assigned=new Set();
 const polygons=value=>{
  if(!Array.isArray(value)||!value.length)fail('draw a surface footprint');
  for(const p of value){
   if(!p||!Array.isArray(p.outer)||!Array.isArray(p.holes||[]))fail('polygon');
   for(const r of [p.outer,...(p.holes||[])]){
    if(!Array.isArray(r)||r.length<3||!r.every(p=>Array.isArray(p)&&p.length===2&&p.every(finite)))fail('polygon coordinates');
    for(let i=0;i<r.length;i++)for(let j=i+2;j<r.length;j++){if(i===0&&j===r.length-1)continue;const a=r[i],b=r[(i+1)%r.length],c=r[j],d=r[(j+1)%r.length];if(cross(a,b,c)*cross(a,b,d)<-1e-12&&cross(c,d,a)*cross(c,d,b)<-1e-12)fail('crossed surface boundary');}
   }
   if(!(polygonArea(p)>1e-8))fail('empty polygon');
  }
 };
 for(const [id,s] of Object.entries(map.stands)){
  if(!s||s.id!==id||s.version!==1||typeof s.name!=='string'||!s.name.trim()||!map.decks?.[s.deckId])fail('identity or deck');
  if(!finite(s.datumElevationM)||s.datumElevationM<0||s.datumElevationM>120||!s.profile||!finite(s.profile.referenceHeightM)||s.profile.referenceHeightM<0||s.profile.referenceHeightM>120||!finite(s.profile.slopeDegrees)||s.profile.slopeDegrees<0||s.profile.slopeDegrees>60)fail('height or slope');
  if(!Array.isArray(s.bands)||!s.bands.length||!Array.isArray(s.regions)||!s.regions.length||!Array.isArray(s.landings||[]))fail('bands or regions');
  const reference=s.profile.referencePath,unit=s.profile.metersPerUnit;
  const validPath=path=>Array.isArray(path)&&path.length>=2&&path.every(p=>Array.isArray(p)&&p.length===2&&p.every(finite));
  if(!validPath(reference)||!finite(unit)||unit<=0)fail('profile reference guide or physical scale');
  const supports=new Set(),regions=new Set();
  let previousDepth=-Infinity;
  for(const b of s.bands){if(b.depthM<=previousDepth)fail('tread depths must increase from front to rear');previousDepth=b.depthM;if(typeof b.id!=='string'||!b.id||supports.has(b.id)||!finite(b.depthM))fail('tread identity or depth');supports.add(b.id);
   if(!validPath(b.stationPath)||b.stationPath.length!==reference.length)fail('tread station must match the reference guide');
   const distance=b.stationPath.reduce((sum,p,i)=>sum+Math.hypot(p[0]-reference[i][0],p[1]-reference[i][1]),0)/reference.length*unit;
   if(Math.abs(distance-Math.abs(b.depthM))>.001)fail('tread depth must follow its guide distance; edit the guides to change the slope');
   const h=standHeight(s,b.depthM);if(h<-.000001||h>120)fail('tread reaches below ground or above 120 m; adjust the profile or footprint');polygons(b.polygons);}
  for(const l of s.landings||[]){if(!l.id||supports.has(l.id)||!finite(l.elevationM)||l.elevationM<0||l.elevationM>120)fail('landing');supports.add(l.id);polygons(l.polygons);}
  for(const r of s.regions){if(!r.id||regions.has(r.id)||!['normal','extension'].includes(r.kind))fail('region');regions.add(r.id);polygons(r.polygons);}
  if(s.regions.some(r=>r.kind==='extension')&&Math.abs(standHeight(s,s.bands[0].depthM))>.001)fail('the first extended row must meet ground; adjust its guide, reference height or slope');
  if(!s.seatBindings||Array.isArray(s.seatBindings)||typeof s.seatBindings!=='object')fail('seat bindings');
  for(const [seat,b] of Object.entries(s.seatBindings)){if(!b||!regions.has(b.regionId)||!supports.has(b.supportId)||assigned.has(seat))fail(`support binding for ${seat}`);assigned.add(seat);}
 }
 return map;
}
