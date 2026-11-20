// Geometry is authored in SVG coordinates; the affine transform maps it into map space.
const transform=(g,x,y)=>{const [a,b,c,d,e,f]=g.transform;return {x:a*x+c*y+e,y:b*x+d*y+f};};
const area=points=>points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p.x*q.y-q.x*p.y;},0)/2;
export function tableOutline(g){
 if(g.kind==='circle')return Array.from({length:96},(_,i)=>{const t=i*Math.PI*2/96;return transform(g,g.cx+g.r*Math.cos(t),g.cy+g.r*Math.sin(t));});
 const points=g.kind==='rectangle'?[{x:g.x,y:g.y},{x:g.x+g.width,y:g.y},{x:g.x+g.width,y:g.y+g.height},{x:g.x,y:g.y+g.height}]:g.points;
 return points.map(p=>transform(g,p.x,p.y));
}
export function tableSeatPose(g,seat){
 let point,normal,distance=Infinity;
 if(g.kind==='circle'){
  const at=t=>transform(g,g.cx+g.r*Math.cos(t),g.cy+g.r*Math.sin(t)),cost=t=>{const p=at(t);return (p.x-seat.x)**2+(p.y-seat.y)**2;};
  // Bracket the closest point globally, then refine on the transformed curve.
  let best=0;for(let i=0;i<96;i++){const t=i*Math.PI*2/96,d=cost(t);if(d<distance){distance=d;best=t;}}
  let lo=best-Math.PI*2/96,hi=best+Math.PI*2/96;
  for(let i=0;i<70;i++){const a=lo+(hi-lo)/3,b=hi-(hi-lo)/3;if(cost(a)<cost(b))hi=b;else lo=a;}
  const t=(lo+hi)/2;point=at(t);
  const [a,b,c,d]=g.transform,det=a*d-b*c,nx=Math.cos(t),ny=Math.sin(t);
  normal={x:-(d*nx-b*ny)/det,y:-(-c*nx+a*ny)/det};distance=Math.hypot(point.x-seat.x,point.y-seat.y);
 }else{
  const points=tableOutline(g),sign=Math.sign(area(points));let alignment=-Infinity;
  for(let i=0;i<points.length;i++){
   const a=points[i],b=points[(i+1)%points.length],dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);if(length<1e-10)continue;
   const t=Math.max(0,Math.min(1,((seat.x-a.x)*dx+(seat.y-a.y)*dy)/(length*length))),p={x:a.x+t*dx,y:a.y+t*dy},n={x:-dy/length*sign,y:dx/length*sign},dist=Math.hypot(p.x-seat.x,p.y-seat.y),aligned=n.x*(p.x-seat.x)+n.y*(p.y-seat.y);
   if(dist<distance-1e-8||Math.abs(dist-distance)<1e-8&&aligned>alignment+1e-8){distance=dist;point=p;normal=n;alignment=aligned;}
  }
 }
 const length=Math.hypot(normal.x,normal.y);normal={x:normal.x/length,y:normal.y/length};
 return {point,normal,distance,angle:Math.atan2(-normal.x,-normal.y),inside:(seat.x-point.x)*normal.x+(seat.y-point.y)*normal.y>1e-7};
}
export function validateTables(map){
 if(map.tables===undefined)return;
 const fail=what=>{throw Error(`Invalid table ${what}.`);};
 if(!map.tables||Array.isArray(map.tables)||typeof map.tables!=='object')fail('collection');
 const seats=new Map(Object.values(map.sections||{}).flatMap(s=>Object.values(s.rows||{}).flatMap(r=>(r.seats||[]).map(seat=>[seat.id,s])))),used=new Set();
 for(const [id,t] of Object.entries(map.tables)){
  if(!t||t.id!==id||typeof t.name!=='string'||!t.name.trim())fail('identity');
  if(!['regular','premium'].includes(t.seatStyle))fail('seat style');
  if(t.deckId!=null&&!map.decks?.[t.deckId])fail('deck');
  const g=t.geometry,point=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
  if(!g||!['circle','rectangle','polygon'].includes(g.kind)||!Array.isArray(g.transform)||g.transform.length!==6||!g.transform.every(Number.isFinite)||Math.abs(g.transform[0]*g.transform[3]-g.transform[1]*g.transform[2])<1e-12)fail('geometry');
  if(g.kind==='circle'&&(![g.cx,g.cy,g.r].every(Number.isFinite)||g.r<=0)||g.kind==='rectangle'&&(![g.x,g.y,g.width,g.height].every(Number.isFinite)||g.width<=0||g.height<=0)||g.kind==='polygon'&&(!Array.isArray(g.points)||g.points.length<3||!g.points.every(point)))fail('geometry');
  const outline=tableOutline(g);if(Math.abs(area(outline))<1e-10)fail('geometry');
  if(!Array.isArray(t.seatIds))fail('seat references');
  for(const seatId of t.seatIds){const section=seats.get(seatId);if(!section||used.has(seatId))fail('seat references or duplicate seat ownership');if((section.deckId??null)!==(t.deckId??null))fail('seat deck');used.add(seatId);}
 }
}
export function attachTableSeats(map){
 validateTables(map.raw);map.tables=Object.values(map.raw.tables||{});map.tableById=new Map(map.tables.map(t=>[t.id,t]));
 for(const table of map.tables)for(const id of table.seatIds){const seat=map.seatById.get(id);seat.tableId=table.id;seat.tableStyle=table.seatStyle;seat.tableAngle=tableSeatPose(table.geometry,seat).angle;}
 for(const section of map.sections)section.tableSeating=section.seats.length>0&&section.seats.every(id=>map.seatById.get(id)?.tableId);
 return map;
}
export function setTableSeatStyle(map,id,style){
 if(!map.tables?.[id])throw Error('Choose a valid table.');
 if(!['regular','premium'].includes(style))throw Error('Unknown table seat style.');
 map.tables[id].seatStyle=style;
}

export function syncTableDecks(map){
 const owners=new Map(Object.values(map.sections||{}).flatMap(s=>Object.values(s.rows||{}).flatMap(r=>r.seats.map(seat=>[seat.id,s.deckId??null]))));
 const updates=Object.values(map.tables||{}).map(table=>{const decks=new Set(table.seatIds.filter(id=>owners.has(id)).map(id=>owners.get(id)));if(decks.size>1)throw Error('Keep all seats of a table on the same deck.');return [table,decks.values().next().value??null];});
 for(const [table,deckId] of updates)table.deckId=deckId;
}
