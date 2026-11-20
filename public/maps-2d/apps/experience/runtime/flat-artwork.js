import {sectionStateColors} from './section-availability.js';
import {rewriteSVGReferences} from './svg-references.js';
import {generateBenchRuns} from './ga-bench-runs.js';
import {cameraEase} from './camera-motion.js';
import * as THREE from 'three';
import {SVGLoader} from './vendor/SVGLoader.js';

const NS='http://www.w3.org/2000/svg';

// Immutable authored artwork stays vector while seats remain one WebGL
// instanced layer. Removing every seat node keeps this overlay inexpensive.
export async function createFlatArtwork({root,map,presentation,scene,scale,cx,cy,seatWidth,invalidate,cacheRevision='map'}){
 if(!root)return null;
 const source=root.cloneNode(true),loader=new SVGLoader(),seatShapes=new Map();
 // Limit decorative filters on mobile, but retain authored inner shadows and
 // playing-surface filters: these define the field and seating artwork.
 // The dark theme's filter on the artwork is invert(1) hue-rotate(180deg) saturate(1.15): each colour c becomes M(1-c), M being the hue turn followed by the saturation.
 // beforeDarkFilter gives the colour that comes out as c: 1 - inverse(M) c, kept within range.
 const beforeDarkFilter=(()=>{const H=[[-.574,1.43,.144],[.426,.43,.144],[.426,1.43,-.856]],k=1.15,S=[[.213+.787*k,.715-.715*k,.072-.072*k],[.213-.213*k,.715+.285*k,.072-.072*k],[.213-.213*k,.715-.715*k,.072+.928*k]],
   M=S.map(r=>[0,1,2].map(c=>r[0]*H[0][c]+r[1]*H[1][c]+r[2]*H[2][c])),[a,b,c]=M[0],[d,e,f]=M[1],[g,h,i]=M[2],det=a*(e*i-f*h)-b*(d*i-f*g)+c*(d*h-e*g),
   inv=[[(e*i-f*h)/det,(c*h-b*i)/det,(b*f-c*e)/det],[(f*g-d*i)/det,(a*i-c*g)/det,(c*d-a*f)/det],[(d*h-e*g)/det,(b*g-a*h)/det,(a*e-b*d)/det]];
  return hex=>{const v=hex.length===4?[1,2,3].map(n=>parseInt(hex[n]+hex[n],16)/255):[1,3,5].map(n=>parseInt(hex.slice(n,n+2),16)/255);return '#'+inv.map(r=>Math.round(Math.max(0,Math.min(1,1-(r[0]*v[0]+r[1]*v[1]+r[2]*v[2])))*255).toString(16).padStart(2,'0')).join('');};})();
 const mobileFilterFallback=matchMedia('(max-width: 760px), (pointer: coarse)').matches;
 if(mobileFilterFallback){
  const retained=new Set(),innerShadows=new Set([...source.querySelectorAll('filter')].filter(filter=>[...filter.querySelectorAll('feComposite')].some(node=>node.getAttribute('operator')==='arithmetic'&&Number(node.getAttribute('k2'))===-1&&Number(node.getAttribute('k3'))===1)).map(filter=>filter.id));
  for(const el of source.querySelectorAll('[filter]')){
   let field=false;for(let parent=el;parent&&parent!==source;parent=parent.parentElement)if((parent.getAttribute('class')||'').split(/\s+/).some(name=>name.startsWith('surface_type_')||name==='surface_player')||parent.id==='surface_player'){field=true;break;}
   const id=el.getAttribute('filter').match(/^url\(\s*['"]?#([^\s)'" ]+)['"]?\s*\)$/)?.[1];
   if(id&&(field||innerShadows.has(id)))retained.add(id);else el.removeAttribute('filter');
  }
  for(const el of source.querySelectorAll('filter'))if(!retained.has(el.id))el.remove();
 }
 const alignment=presentation.coordinateAlignment||{a:1,b:0,c:0,d:1,e:0,f:0},alignmentTransform=`matrix(${alignment.a} ${alignment.b} ${alignment.c} ${alignment.d} ${alignment.e} ${alignment.f})`;
 for(const el of source.querySelectorAll('[data-seat-id]')){
  const w=Number(el.getAttribute('width')),h=Number(el.getAttribute('height')),rx=Number(el.getAttribute('rx')||el.getAttribute('ry')||0),ry=Number(el.getAttribute('ry')||el.getAttribute('rx')||0);
  seatShapes.set(el.dataset.seatId,w&&h?[Math.min(.5,rx/w),Math.min(.5,ry/h)]:[.5,.5]);el.remove();
 }
 const identifiers=source.cloneNode(true);
 for(const el of [...identifiers.querySelectorAll('*')].reverse())if(el.localName!=='defs'&&!el.closest('defs')&&!el.closest('[data-flat-identifier]')&&!el.querySelector('[data-flat-identifier]'))el.remove();
 for(const el of source.querySelectorAll('[data-flat-identifier]'))el.remove();
 let defs=source.querySelector(':scope>defs');if(!defs){defs=document.createElementNS(NS,'defs');source.prepend(defs);}
 let benchCount=0;
 const benchGroups=map.raw?.version===3?map.sections.filter(s=>s.ga&&s.gaConfig?.benches).map(s=>({...(presentation.gaBenches||[]).find(g=>g.sectionNumber===s.number),sectionNumber:s.number})):presentation.gaBenches||[];
 for(const entry of benchGroups){
  const section=map.sections.find(s=>s.ga&&s.number===entry.sectionNumber);if(!section?.path||section.killed)continue;
  const parsed=loader.parse(`<svg xmlns="${NS}"><path d="${section.path}" transform="${alignmentTransform}"/></svg>`).paths,points=parsed.flatMap(p=>p.subPaths.flatMap(s=>s.getPoints(40)));if(!points.length)continue;
  const box=new THREE.Box2().setFromPoints(points),center=box.getCenter(new THREE.Vector2()),clip=document.createElementNS(NS,'clipPath');clip.id='flat-ga-bench-'+benchCount;const boundary=document.createElementNS(NS,'path');boundary.setAttribute('d',section.path);boundary.setAttribute('transform',alignmentTransform);clip.append(boundary);defs.append(clip);
  const g=document.createElementNS(NS,'g');g.setAttribute('clip-path',`url(#${clip.id})`);
  if(entry.authored&&section.gaConfig?.benchSource==='svg'){for(const item of entry.paths||[]){const p=document.createElementNS(NS,'path');p.setAttribute('d',item.d);if(item.transform)p.setAttribute('transform',item.transform);p.setAttribute('fill','none');p.setAttribute('stroke','#fff');p.setAttribute('stroke-opacity','.24');p.setAttribute('stroke-width','2');g.append(p);}}
  else{const polygons=parsed.flatMap(p=>SVGLoader.createShapes(p).map(shape=>{const e=shape.extractPoints(40);return {outer:e.shape.map(p=>[p.x,p.y]),holes:e.holes.map(h=>h.map(p=>[p.x,p.y]))};})),fallback=box.max.x-box.min.x>=box.max.y-box.min.y?[[box.min.x,box.min.y],[box.max.x,box.min.y]]:[[box.min.x,box.min.y],[box.min.x,box.max.y]],reference=presentation.authoredDecks?.[section.number]?.line||presentation.rink?.ring||fallback;for(const run of (section.gaConfig?.benchRows?.map(row=>row.points.map(p=>[p.x,p.y]))||generateBenchRuns(polygons,reference,seatWidth,[center.x,center.y],{...section.gaConfig,rowShape:section.gaConfig?.rowShape||'blend'}))){const p=document.createElementNS(NS,'path');p.setAttribute('d','M'+run.map(p=>p.join(',')).join('L'));p.setAttribute('fill','none');p.setAttribute('stroke','#fff');p.setAttribute('stroke-opacity','.24');p.setAttribute('stroke-width',String(seatWidth*.45));g.append(p);}}
  source.append(g);
  const original=[...root.querySelectorAll('[data-section-id]')].find(e=>e.dataset.sectionId===section.id&&!e.hasAttribute('data-seat-id'))?.querySelector('g.identifier');
  if(original){let copy=original.cloneNode(true);copy.querySelector('path')?.remove();let parent=original.parentElement;while(parent&&parent!==root){const wrapper=parent.cloneNode(false);wrapper.removeAttribute('id');wrapper.append(copy);copy=wrapper;parent=parent.parentElement;}source.append(copy);}
  benchCount++;
 }

 // Legacy SVGs can leave row lettering outside their section groups.
 // Blank the exact section footprint after all static artwork is assembled.
 for(const section of map.sections){
  if((!section.killed&&!section.convertedGA)||!section.path)continue;
  const blank=document.createElementNS(NS,'path');blank.setAttribute('d',section.path);blank.setAttribute('transform',alignmentTransform);blank.setAttribute('fill',section.killed?'#e2e8f0':'#2563eb');blank.setAttribute('stroke','none');blank.dataset.killedSection=section.id;source.append(blank);
 }

 // Namespace definitions so the hidden SVG fallback cannot capture references.
 const prefix='flat-vector-'+String(cacheRevision).replace(/[^a-z0-9_-]/gi,'')+'-',ids=new Map();
 for(const el of source.querySelectorAll('[id]')){const old=el.id,next=prefix+old;ids.set(old,next);el.id=next;}
 for(const el of source.querySelectorAll('*'))for(const attr of [...el.attributes]){const value=rewriteSVGReferences(attr.value,ids,{href:attr.name==='href'||attr.name==='xlink:href'});if(value!==attr.value)el.setAttribute(attr.name,value);}
 for(const style of source.querySelectorAll('style'))style.textContent=rewriteSVGReferences(style.textContent,ids,{selectors:true});
 source.classList.remove('admin-svg');source.classList.add('flat-vector-artwork');source.removeAttribute('width');source.removeAttribute('height');source.setAttribute('preserveAspectRatio','none');source.setAttribute('aria-hidden','true');source.style.display='none';

 // Section identifiers stay batched WebGL geometry so their overview fade and
 // selected-section treatment remain unchanged.
 // Availability tints fill vertices only; authored strokes retain their original colors.
 const positions=[],colors=[],coverRanges=new Map(),coveredSectionIds=new Set();let z=0;
 function append(geometry,fill,sectionId){const start=colors.length,g=geometry.index?geometry.toNonIndexed():geometry,attr=g.getAttribute('position'),c=new THREE.Color(fill);for(let i=0;i<attr.count;i++){positions.push((attr.getX(i)-cx)*scale,.05+z,(attr.getY(i)-cy)*scale);colors.push(c.r,c.g,c.b);}if(sectionId){if(!coverRanges.has(sectionId))coverRanges.set(sectionId,[]);coverRanges.get(sectionId).push([start,colors.length]);}if(g!==geometry)g.dispose();geometry.dispose();}
 for(const path of loader.parse(new XMLSerializer().serializeToString(identifiers)).paths){const s=path.userData.style;if(s.visibility==='hidden'||s.display==='none')continue;const coveredId=path.userData.node?.getAttribute('data-admin-section-cover');if(coveredId&&s.fill&&s.fill!=='none'&&(s.opacity??1)>=1&&s.fillOpacity>=1)coveredSectionIds.add(coveredId);z+=.000001;if(s.fill&&s.fill!=='none')for(const shape of SVGLoader.createShapes(path))append(new THREE.ShapeGeometry(shape,12),s.fill,coveredId);if(s.stroke&&s.stroke!=='none')for(const sub of path.subPaths){const geometry=SVGLoader.pointsToStroke(sub.getPoints(24),s);if(geometry)append(geometry,s.stroke);}}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 const covers=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,side:THREE.DoubleSide,forceSinglePass:true,depthTest:false,depthWrite:false,toneMapped:false}));covers.renderOrder=5;scene.add(covers);
 let authored=null,lastStates=null,stateTints=null,sectionTints={};
 let identifierOpacity=1,identifierTarget=1,identifierFrom=1,identifierStarted=performance.now();
 return {
  seatShapes,benchCount,element:source,coveredSectionIds,
  // Theme hook: remap the authored cover colours (linear r,g,b in, [r,g,b] out) and re-apply availability tints on top.
  recolor(remap,tints=null){stateTints=tints;authored||=colors.slice();for(let i=0;i<authored.length;i+=3){const c=remap?remap(authored[i],authored[i+1],authored[i+2]):[authored[i],authored[i+1],authored[i+2]];colors[i]=c[0];colors[i+1]=c[1];colors[i+2]=c[2];}const attr=geometry.getAttribute('color');attr.array.set(colors);attr.needsUpdate=true;for(const ranges of coverRanges.values())ranges.state=undefined;if(lastStates)this.setAvailability(lastStates);invalidate();},
  setSectionTints(tints,dark=false){sectionTints=tints||{};
   // standing areas are drawn in the artwork itself, not as covers: their tile takes the shade directly (in dark, the colour the dark filter turns into that shade)
   for(const tile of source.querySelectorAll('[data-section-id] .schematic-tile')){const id=tile.closest('[data-section-id]').dataset.sectionId;if(coverRanges.has(id))continue;const own=sectionTints[id];if(own)tile.style.fill=dark?beforeDarkFilter(own):own;else tile.style.removeProperty('fill');}
   for(const ranges of coverRanges.values())ranges.state=undefined;if(lastStates)this.setAvailability(lastStates);else this.setAvailability({});},
  setAvailability(states){lastStates=states;
   const attr=geometry.getAttribute('color');let changed=false;
   for(const [id,ranges] of coverRanges){const state=states[id]?.state||'available',own=state==='available'||state==='nearly-sold-out'?sectionTints[id]||'':'',mark=state+own;if(ranges.state===mark)continue;ranges.state=mark;const tintColor=stateTints?.[state]||sectionStateColors[state]||own,tint=tintColor?new THREE.Color(tintColor):null,base=own?new THREE.Color(own):null; /* own: this section's price shade, used while it has seats to sell */
    for(const [start,end] of ranges){
     // Mix the authored fill with 25% white in display color space, preserving its hue.
     const fill=state==='nearly-sold-out'?(base?base.clone():new THREE.Color(colors[start],colors[start+1],colors[start+2])).convertLinearToSRGB().lerp(new THREE.Color(1,1,1),.25).convertSRGBToLinear():tint;
     for(let i=start;i<end;i+=3){attr.array[i]=fill?fill.r:colors[i];attr.array[i+1]=fill?fill.g:colors[i+1];attr.array[i+2]=fill?fill.b:colors[i+2];}
    }changed=true;
   }if(changed){attr.needsUpdate=true;invalidate();}
  },
  // Dark theme. The whole artwork layer is colour-inverted by one CSS filter (map-dark.css). The playing surface must come out as it was drawn (white ice, true logo
  // colours), so in dark its fills and strokes are replaced by the colours that filter turns back into the originals. Light puts the originals back.
  themeSurface(dark){for(const g of source.querySelectorAll('[class*="surface_type_"]'))for(const el of [g,...g.querySelectorAll('*')]){if(el.closest('mask,clipPath'))continue;for(const a of ['fill','stroke']){const key=a==='fill'?'btFill':'btStroke';if(el.dataset[key]===undefined){const now=el.getAttribute(a);if(!now||!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(now))continue;el.dataset[key]=now;}el.setAttribute(a,dark?beforeDarkFilter(el.dataset[key]):el.dataset[key]);}}},
  seatsExposed:()=>identifierOpacity<.01,
  coversSeats:()=>covers.visible&&identifierOpacity>=.999,
  setVisible(value){source.style.display=value?'':'none';},
  update(box,width,height,detailed,now=performance.now()){const viewBox=box.join(' ');if(source.getAttribute('viewBox')!==viewBox)source.setAttribute('viewBox',viewBox);const desired=detailed?0:1;if(desired!==identifierTarget){identifierTarget=desired;identifierFrom=identifierOpacity;identifierStarted=now;}const progress=Math.min(1,Math.max(0,(now-identifierStarted)/320));identifierOpacity=identifierFrom+(identifierTarget-identifierFrom)*cameraEase(progress);covers.material.opacity=identifierOpacity;covers.visible=identifierOpacity>.001;return progress<1;},
  state:()=>({artwork:true,artworkRenderMode:'svg-vector',artworkTileReady:true,artworkCacheRevision:cacheRevision,artworkCacheHits:0,artworkCacheMisses:0,artworkTexturePixels:0,mobileSvgFiltersDisabled:mobileFilterFallback,gaBenchSections:benchCount,authoredIdentifierVertices:positions.length/3,authoredIdentifiersVisible:covers.visible,authoredIdentifierOpacity:identifierOpacity}),
  destroy(){source.remove();scene.remove(covers);covers.geometry.dispose();covers.material.dispose();}
 };
}
