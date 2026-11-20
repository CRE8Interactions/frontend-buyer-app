import {sanitizeSVGArtwork,surfaceArtworkSVG} from './svg-artwork.js';
const NS='http://www.w3.org/2000/svg';
export function findSectionArtworkGroups(root,section,seatElements=[],classIndex=null){
 const hasClass=(el,name)=>(el.getAttribute?.('class')||'').split(/\s+/).includes(name),groups=[];
 // Current-name matching keeps legacy exports working. UUID-matched seats are
 // authoritative for v3 projects because renaming a section intentionally does
 // not rewrite the immutable source SVG's old sec-* classes.
 groups.push(...root.querySelectorAll(`[data-section-id="${CSS.escape(section.id)}"]:not([data-seat-id])`));
 if(classIndex)groups.push(...(classIndex.get(`sec-${section.number}`)||[]));
 else for(const el of root.querySelectorAll('[class]'))if(hasClass(el,`sec-${section.number}`))groups.push(el);
 // Cache the nearest identifier-bearing ancestor for every visited node.
 // Seats in one row share this walk even when the section was renamed.
 const ancestors=new Map();
 for(const seat of seatElements){
  let parent=seat.parentElement,group=null;const visited=[];
  while(parent&&parent!==root){
   if(ancestors.has(parent)){group=ancestors.get(parent);break;}
   visited.push(parent);
   if(parent.localName==='g'&&[...(parent.children||[])].some(child=>child.localName==='g'&&hasClass(child,'identifier'))){group=parent;break;}
   parent=parent.parentElement;
  }
  for(const node of visited)ancestors.set(node,group);
  if(group)groups.push(group);
 }
 return [...new Set(groups)];
}
export function readSVGArtwork(text){
 const doc=new DOMParser().parseFromString(text,'image/svg+xml');if(doc.querySelector('parsererror')||doc.documentElement.localName!=='svg')throw Error('Invalid SVG document.');
 sanitizeSVGArtwork(doc.documentElement);
 return doc.documentElement;
}
export function prepareSVG(text,map,{seatSource='auto'}={}){
 if(!['auto','svg','json'].includes(seatSource))throw Error('svgSeatSource must be auto, svg or json.');
 const root=readSVGArtwork(text),doc=root.ownerDocument,byUUID=new Map(),byClass=new Map(),classIndex=new Map();
 // Read the existing SVG stroke for the same exported section path; do not invent boundaries.
 const sourcePaths=new Map([...root.querySelectorAll('path[d]')].map(el=>[el.getAttribute('d'),el]));
 for(const section of map.sections){const source=sourcePaths.get(section.path),stroke=source?.getAttribute('stroke')||section.stroke,width=Number(source?.getAttribute('stroke-width')||section.strokeWidth);if(stroke&&stroke!=='none'&&width>0)section.boundaryStroke={width};}
 for(const el of root.querySelectorAll('[class], [data-seat-id], [id]')){
  for(const token of (el.getAttribute('class')||'').split(/\s+/)){if(!classIndex.has(token))classIndex.set(token,[]);classIndex.get(token).push(el);}
  const id=el.getAttribute('data-seat-id')||(map.seatById.has(el.id)?el.id:null);
  if(id&&map.seatById.has(id)){if(byUUID.has(id))throw Error('Duplicate SVG seat UUID.');byUUID.set(id,el);}
  for(const token of (el.getAttribute('class')||'').split(/\s+/))if(/-row-.+-seat-/.test(token)){const old=byClass.get(token);if(old?.localName==='rect'&&el.localName==='rect')throw Error('Duplicate SVG seat rectangle.');if(!old||el.localName==='rect')byClass.set(token,el);}
 }
 const matches=map.seats.map(s=>byUUID.get(s.id)||byClass.get(`sec-${s.sectionNumber}-row-${s.rowNumber}-seat-${s.number}`));
 const matched=matches.filter(Boolean).length,hasSeatLayer=byUUID.size>0||byClass.size>0||!!root.querySelector('[data-seat-id]');
 const resolvedSeatSource=seatSource==='json'||seatSource==='auto'&&!hasSeatLayer?'json':'svg';
 if(resolvedSeatSource==='json'){
  // Artwork-only SVGs share JSON coordinates; preserve legacy SVG matching by default.
  for(const el of new Set([...byUUID.values(),...byClass.values(),...root.querySelectorAll('[data-seat-id]')]))el.remove();
  byUUID.clear();byClass.clear();
  const layer=doc.createElementNS(NS,'g');layer.setAttribute('data-layer','json-seat-proxies');root.append(layer);
  for(const seat of map.seats){
   const rect=doc.createElementNS(NS,'rect');
   for(const [key,value]of Object.entries({'data-seat-id':seat.id,x:seat.cx,y:seat.cy,width:seat.w,height:seat.h,rx:Math.min(seat.w,seat.h)/2}))rect.setAttribute(key,String(value));
   if(seat.da)rect.setAttribute('class','DA');layer.append(rect);byUUID.set(seat.id,rect);
  }
 }else if(matched!==map.seats.length){
  throw Error('SVG seat layer is incomplete or does not match the JSON. Use matching files or explicitly select svgSeatSource: json.');
 }
 let uuidMatches=0,classMatches=0;const seatElementsBySection=new Map();
 for(const s of map.seats){const cls=`sec-${s.sectionNumber}-row-${s.rowNumber}-seat-${s.number}`,el=byUUID.get(s.id)||byClass.get(cls);if(!el)throw Error(`SVG has no matching shape for seat ${cls}. Import the SVG paired with this JSON.`);const declared=el.getAttribute('data-seat-id');if(declared&&declared!==s.id)throw Error('SVG seat UUID disagrees with the JSON. Import matching revisions.');if(byUUID.has(s.id))uuidMatches++;else classMatches++;s.da=(el.getAttribute('class')||'').split(/\s+/).includes('DA')||/\bDA\b/.test(s.seatName||'');s.accessible ||= s.da;el.setAttribute('data-seat-id',s.id);el.setAttribute('data-section-id',s.sectionId);el.setAttribute('data-row-id',s.rowId);if(!seatElementsBySection.has(s.sectionId))seatElementsBySection.set(s.sectionId,[]);seatElementsBySection.get(s.sectionId).push(el);}
 // Aggie authors reserved-section identifiers as a coloured cover followed by
 // vector lettering. Resolve their owning section after UUID seat matching so a
 // Studio rename cannot disconnect the immutable SVG artwork from its JSON data.
 for(const section of map.sections)for(const group of findSectionArtworkGroups(root,section,seatElementsBySection.get(section.id)||[],classIndex)){
  group.setAttribute('data-section-id',section.id);
  if(section.ga)continue;
  const identifier=[...group.querySelectorAll('g.identifier')][0];if(!identifier)continue;
  identifier.setAttribute('data-flat-identifier',section.id);
  const paths=[...identifier.querySelectorAll('path')],cover=paths.shift();
  if(cover)cover.setAttribute('data-admin-section-cover',section.id);
  for(const label of paths)label.setAttribute('data-admin-section-label',section.id);
 }
 // Legacy class-matched exports can preserve the same seats while using a different
 // SVG coordinate scale. Align the sanitized display copy to the JSON coordinate
 // space so authored surfaces/decks and authoritative seat positions stay together.
 const pairs=[],coordinateMount=document.createElement('div');
 coordinateMount.style.cssText='position:fixed;left:-10000px;top:0;width:3000px;height:2250px;visibility:hidden';
 coordinateMount.append(root);document.body.append(coordinateMount);
 try{
  const inverse=root.getCTM().inverse();
  for(const s of map.seats){
   const cls=`sec-${s.sectionNumber}-row-${s.rowNumber}-seat-${s.number}`,el=byUUID.get(s.id)||byClass.get(cls);if(el?.localName!=='rect')continue;
   const x=Number(el.getAttribute('x')),y=Number(el.getAttribute('y')),w=Number(el.getAttribute('width')),h=Number(el.getAttribute('height'));
   if(![x,y,w,h,s.x,s.y].every(Number.isFinite)||w<=0||h<=0)continue;
   // Compare centers in root coordinates, including the seat and ancestor transforms.
   const point=root.createSVGPoint();point.x=x+w/2;point.y=y+h/2;
   const center=point.matrixTransform(inverse.multiply(el.getCTM()));
   pairs.push({x:center.x,y:center.y,X:s.x,Y:s.y});
  }
 }finally{coordinateMount.remove();}

 const fit=(a,b)=>{const n=a.length,ma=a.reduce((v,x)=>v+x,0)/n,mb=b.reduce((v,x)=>v+x,0)/n,c=a.reduce((v,x,i)=>v+(x-ma)*(b[i]-mb),0),q=a.reduce((v,x)=>v+(x-ma)**2,0),scale=q?c/q:1;return {scale,offset:mb-scale*ma};};
 if(pairs.length>3){const fx=fit(pairs.map(p=>p.x),pairs.map(p=>p.X)),fy=fit(pairs.map(p=>p.y),pairs.map(p=>p.Y));if([fx.scale,fx.offset,fy.scale,fy.offset].every(Number.isFinite)&&(Math.abs(fx.scale-1)>.002||Math.abs(fy.scale-1)>.002||Math.abs(fx.offset)>.5||Math.abs(fy.offset)>.5)){const wrapper=doc.createElementNS(NS,'g');wrapper.setAttribute('data-layer','studio-coordinate-alignment');wrapper.setAttribute('transform',`matrix(${fx.scale} 0 0 ${fy.scale} ${fx.offset} ${fy.offset})`);for(const child of [...root.children])if(child.localName!=='defs')wrapper.appendChild(child);root.appendChild(wrapper);const vb=(root.getAttribute('viewBox')||'').trim().split(/[ ,]+/).map(Number);if(vb.length===4&&vb.every(Number.isFinite))root.setAttribute('viewBox',`${vb[0]*fx.scale+fx.offset} ${vb[1]*fy.scale+fy.offset} ${vb[2]*fx.scale} ${vb[3]*fy.scale}`);}}
 root.setAttribute('width','100%');root.setAttribute('height','100%');root.setAttribute('preserveAspectRatio','xMidYMid meet');root.classList.add('admin-svg');
 return {root,uuidMatches,classMatches,seatSource:resolvedSeatSource};
}
export function svgFromJSON(map){
 const doc=document.implementation.createDocument(NS,'svg'),root=doc.documentElement,b=map.bounds;root.setAttribute('viewBox',`${b.x-80} ${b.y-80} ${b.right-b.x+160} ${b.bottom-b.y+160}`);
 for(const s of map.sections){const g=doc.createElementNS(NS,'g');g.setAttribute('data-section-id',s.id);root.appendChild(g);if(s.path){const p=doc.createElementNS(NS,'path');p.setAttribute('d',s.path);p.setAttribute('fill',s.fill||'#e7eef6');p.setAttribute('opacity','.15');g.appendChild(p);}}
 for(const s of map.seats){const r=doc.createElementNS(NS,'rect');for(const [k,v] of Object.entries({'data-seat-id':s.id,x:s.cx,y:s.cy,width:s.w,height:s.h}))r.setAttribute(k,v);root.appendChild(r);}
 return new XMLSerializer().serializeToString(root);
}

// Read authoring metadata from the sanitized SVG without changing the source file.
export function presentationFromSVG(root){
 const token=(el,re)=>(el.getAttribute('class')||'').split(/\s+/).find(t=>re.test(t));
 const mount=document.createElement('div');mount.style.cssText='position:fixed;left:-10000px;top:0;width:3000px;height:2250px;visibility:hidden';
 const svg=root.cloneNode(true);for(const seat of svg.querySelectorAll('[data-seat-id]'))seat.remove();mount.append(svg);document.body.append(mount);
 try{
 const elements=[...svg.querySelectorAll('[class]')],f=elements.find(el=>token(el,/^surface_type_/));
 const matrix=el=>svg.getCTM().inverse().multiply(el.getCTM());
 const alignmentNode=svg.querySelector('[data-layer="studio-coordinate-alignment"]'),alignmentMatrix=alignmentNode?matrix(alignmentNode):null;
 const coordinateAlignment=alignmentMatrix?{a:alignmentMatrix.a,b:alignmentMatrix.b,c:alignmentMatrix.c,d:alignmentMatrix.d,e:alignmentMatrix.e,f:alignmentMatrix.f}:{a:1,b:0,c:0,d:1,e:0,f:0};
 const points=el=>{const m=matrix(el),length=el.getTotalLength(),n=Math.max(80,Math.ceil(length/8));return Array.from({length:n+1},(_,i)=>{const p=el.getPointAtLength(length*i/n).matrixTransform(m);return [p.x,p.y];});};
 const pathOf=pts=>'M'+pts.map(p=>p.join(',')).join(' L')+' Z';
 const candidates=[...(f?.querySelectorAll('path,rect,polygon')||[])].filter(e=>e.getTotalLength&&!e.closest('defs,clipPath,mask,pattern')&&e.getAttribute('fill')!=='none');
 candidates.sort((a,b)=>{const x=a.getBBox(),y=b.getBBox();return y.width*y.height-x.width*x.height;});
 if(f&&!candidates.length)throw Error('The surface layer needs a traced shape.');
 const surface={};
 if(f){
  const ring=points(candidates[0]),xs=ring.map(p=>p[0]),ys=ring.map(p=>p[1]),x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;
  const art=surfaceArtworkSVG(svg,f,{x,y,width:w,height:h});
  Object.assign(surface,{focus:{cx:x+w/2,cy:y+h/2,width:w,height:h},rink:{ring,art:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(art))},sport:token(f,/^surface_type_/).slice(13)});
 }
 const lines=elements.map(e=>{const name=token(e,/^elevation_line(?:_\d+)?$/);if(!name)return null;const geometry=e.getTotalLength?e:[...e.querySelectorAll('path,polyline,polygon')].find(child=>child.getTotalLength);return geometry?{id:e.id||name,token:name,points:points(geometry)}:null;}).filter(Boolean);
 const decks={},boxes={},gaHeights={};for(const el of elements){const name=token(el,/^deck_\d+rise[\d.]+_rake[\d.]+$/),box=token(el,/^box_.+_height[\d.]+$/);if(!name&&!box)continue;
 const match=name?.match(/^deck_(\d+)rise([\d.]+)_rake([\d.]+)$/),fixed=box?Number(box.match(/_height([\d.]+)$/)[1]):null;
 let line=null,deckNumber=name?Number(match[1]):null;if(name){const ref=el.getAttribute('data-elevation-line')||'elevation_line';line=lines.find(l=>l.id===ref||l.token===ref);}
 for(const sec of el.querySelectorAll('g[class]')){const key=token(sec,/^sec-/);if(key&&!key.includes('-row-')){decks[key.slice(4)]={number:deckNumber,rise:fixed??Number(match[2]),rake:fixed!==null?0:Number(match[3]),line:line?.points,fixed:fixed!==null};if(box)boxes[key.slice(4)]=true;}}
 }
 for(const sec of elements.filter(e=>e.localName==='g')){const key=token(sec,/^sec-/),lift=token(sec,/^.+_height\d+(?:\.\d+)?$/);if(key&&!key.includes('-row-')&&lift){const value=Number(lift.match(/_height([\d.]+)$/)?.[1]);if(Number.isFinite(value))gaHeights[key.slice(4)]=value;}}
 const base=elements.find(e=>token(e,/^base$/)),outline=base&&[...base.children].find(e=>e.localName==='path'&&token(e,/^(element_wrapper|Wrapper)$/))||base&&[...base.children].find(e=>e.localName==='path');
 const mapped=e=>{const m=matrix(e);return {d:e.getAttribute('d'),transform:`matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.e} ${m.f})`};};
 const venuePerimeterPaths=elements.filter(e=>token(e,/^venue_perimeter$/i)).flatMap(e=>e.localName==='path'?[mapped(e)]:[...e.querySelectorAll('path[d]')].map(mapped));
 const mappedBench=(e,outlined=false)=>{let d=e.getAttribute('d');if(e.localName==='line')d=`M${e.getAttribute('x1')||0},${e.getAttribute('y1')||0}L${e.getAttribute('x2')||0},${e.getAttribute('y2')||0}`;if(e.localName==='polyline'){const points=(e.getAttribute('points')||'').trim().replace(/\s+/g,' ');d=points?`M${points.replace(/ /g,'L')}`:null;}if(!d)return null;const m=matrix(e);return {d,transform:`matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.e} ${m.f})`,outlined};};
 const shellShapes=base?[...base.children].filter(e=>e.localName==='path'&&token(e,/^shape$/)).map(e=>({...mapped(e),shapeId:e.getAttribute('data-shape-id'),fill:e.getAttribute('fill')})):[];
 const structuralBoxes=elements.filter(e=>e.localName==='g'&&(token(e,/^box_/ )||token(e,/^(pressbox|shape_press_box)$/))).map(g=>{const paths=[...g.querySelectorAll('path[d]')];if(!paths.length)return null;const name=token(g,/^box_/)||token(g,/^(pressbox|shape_press_box)$/),floor=g.hasAttribute('data-height')&&Number.isFinite(Number(g.getAttribute('data-height')))?Number(g.getAttribute('data-height')):32,labels=paths.slice(1).filter(e=>e.getAttribute('fill')&&e.getAttribute('fill')!=='none').map(e=>({...mapped(e),fill:e.getAttribute('fill')}));let parent=g.parentElement,deckLayer=null;while(parent&&parent!==svg){deckLayer=token(parent,/^deck_\d+rise[\d.]+_rake[\d.]+$/)||deckLayer;if(deckLayer)break;parent=parent.parentElement;}return {name,path:mapped(paths[0]),height:floor,color:paths[0].getAttribute('fill')||'#373D47',deckLayer,labels};}).filter(Boolean);
 const benchGroups=elements.filter(e=>e.localName==='g'&&token(e,/^NZ_bench$/i)),benchMap=new Map();for(const group of benchGroups){let section=group;while(section&&section!==svg&&!(token(section,/^sec-/)&&!token(section,/^sec-.+-row-/)))section=section.parentElement;const key=section&&section!==svg?token(section,/^sec-/):null;if(!key)continue;const sectionNumber=key.slice(4),candidates=[...group.querySelectorAll('path[d],line,polyline')],numbered=candidates.filter(e=>token(e,/^bench_\d+$/i)),source=numbered.length?numbered:candidates.filter(e=>token(e,/^bench$/i)),paths=source.sort((a,b)=>Number(token(a,/^bench_(\d+)$/i)?.match(/\d+$/)?.[0])-Number(token(b,/^bench_(\d+)$/i)?.match(/\d+$/)?.[0])).map(e=>mappedBench(e,!numbered.length)).filter(Boolean);if(!benchMap.has(sectionNumber))benchMap.set(sectionNumber,[]);benchMap.get(sectionNumber).push(...paths);}const gaBenches=[...benchMap].map(([sectionNumber,paths])=>({sectionNumber,paths,authored:true}));
 return {...surface,outline:outline?pathOf(points(outline)):undefined,wrapperPath:outline?mapped(outline):undefined,wrapperColor:outline?.getAttribute('fill')||'#F5F6F7',venuePerimeterPaths,authoredDecks:decks,gaHeights,elevationLines:lines,boxes,shellShapes,structuralBoxes,gaBenches,coordinateAlignment};
 }finally{mount.remove();}
}

// Version 3 authoring pipeline. Legacy preview exports above remain isolated for compatibility.
export {parseSVG} from './svg-import.js';
