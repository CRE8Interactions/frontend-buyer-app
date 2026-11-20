import {sectionBadgeLabel} from './section-badge-label.js';
import {sectionStateLabels} from './section-availability.js';
import {fitSectionLabel,labelRectangleFits} from './section-label-placement.js';
import * as THREE from 'three';
import {SVGLoader} from './vendor/SVGLoader.js';
import {pinchView} from './flat-navigation.js';
import {createFlatArtwork} from './flat-artwork.js';
import {cameraEase} from './camera-motion.js';
import {createAttributeWriter} from './flat-buffer-updates.js';

// Flat and perspective views share one WebGL renderer and the same inventory UUIDs.
// This scene contains only planar display geometry; it never changes venue elevations.
export async function createFlatWebGL({renderer,map,presentation,artwork,artworkCacheKey,viewport,scale,cx,cy,textures,invalidate,onPick,onHover,canInteractSeat,getSeatUnit,onCameraChange,diagnosticsEnabled=false}){
 const scene=new THREE.Scene();scene.background=null;
 const camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,1000);camera.up.set(0,0,-1);
 const canvas=renderer.domElement,loader=new SVGLoader(),color=new THREE.Color(),attributeWriter=createAttributeWriter(),matrixValues=new Float32Array(16),colorValues=new Float32Array(3);matrixValues[5]=matrixValues[15]=1;
 const seats=map.seats.filter(s=>!map.sectionById.get(s.sectionId)?.killed&&!map.sectionById.get(s.sectionId)?.convertedGA),index=new Map(seats.map((s,i)=>[s.id,i])),isGA=seat=>!!map.sectionById.get(seat.sectionId)?.ga,sections=new Map(),labels=[],ownedTextures=new Set(),labelTextures=new Map(),seatCells=new Map();
 const pops=new Map(),POP_MS=300;
 let active=false,disposed=false,view='overview',sectionId=null,hoveredSeat=null,hoveredSection=null,hoverEnabled=true;
 let context={workspace:'buyer',scope:'section',selected:new Set(),focused:new Set(),locked:new Set(),disabled:new Set()},groups=[],linkKey='',linkBadges=[],paint=()=> '#2563eb',sectionPaint=()=> '#fff';
 // `theta` turns the view about the map centre. `current` is the visible box in the turned frame (frame = map rotated by -theta), so panning, zooming
// and pinching need no change; only conversions to and from map space use the angle.
let theta=0,homeTheta=0,iconTurn=0,rinkBounds;const spin=(x,z,a)=>{const c=Math.cos(a),n=Math.sin(a);return [x*c-z*n,x*n+z*c];};
let current,home,tween=null,width=1,height=1,frames=0,lastKey='',pendingHover=null,lastFrameAt=0,diagnosticFrameIndex=0,lastDiagnosticContextEvent=null;
 const diagnosticSamples=diagnosticsEnabled?new Array(600):null,diagnosticContext=diagnosticSamples?renderer.getContext():null;
 const onContextLost=()=>{lastDiagnosticContextEvent={type:'lost',at:new Date().toISOString()};},onContextRestored=()=>{lastDiagnosticContextEvent={type:'restored',at:new Date().toISOString()};};
 if(diagnosticSamples){canvas.addEventListener('webglcontextlost',onContextLost);canvas.addEventListener('webglcontextrestored',onContextRestored);}
 let minimapTarget=null,minimapFrame=0;
 // Seat planes stay in world space. GPU clipping handles the viewport without
 // rebuilding and uploading every instance matrix on each camera frame.
 const seatRenderable=Uint8Array.from(seats,s=>isGA(s)?0:1);
 const bounds=new THREE.Box3(),world=(x,y)=>new THREE.Vector3((x-cx)*scale,0,(y-cy)*scale);
 const alignment=presentation.coordinateAlignment||{a:1,b:0,c:0,d:1,e:0,f:0},alignmentTransform=`matrix(${alignment.a} ${alignment.b} ${alignment.c} ${alignment.d} ${alignment.e} ${alignment.f})`;
 const seatSize=Math.max(.01,seats.length?[...seats].sort((a,b)=>a.w-b.w)[Math.floor(seats.length/2)].w*scale:.3),cellSize=seatSize*4;
 let maxHalf=seatSize;
 for(const s of seats){const p=world(s.x,s.y);bounds.expandByPoint(p);if(isGA(s))continue;const key=Math.floor(p.x/cellSize)+','+Math.floor(p.z/cellSize);if(!seatCells.has(key))seatCells.set(key,[]);seatCells.get(key).push(s);maxHalf=Math.max(maxHalf,s.w*scale/2,s.h*scale/2);}
 // Flat transparent planes need one double-sided draw, not separate back/front passes.
 function basic(parameters={}){return new THREE.MeshBasicMaterial({side:THREE.DoubleSide,forceSinglePass:true,toneMapped:false,...parameters});}
 function shapeMesh(path,fill,y=0){
  const group=new THREE.Group();group.userData.labelPolygons=[];for(const parsed of loader.parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${(typeof path==='string'?path:path.d).replaceAll('"','')}" transform="${typeof path==='string'?alignmentTransform:path.transform||''}"/></svg>`).paths)for(const shape of SVGLoader.createShapes(parsed)){
   const contour=shape.extractPoints(8),toPlan=p=>[(p.x-cx)*scale,(p.y-cy)*scale];group.userData.labelPolygons.push({outer:contour.shape.map(toPlan),holes:contour.holes.map(hole=>hole.map(toPlan))});
   const geometry=new THREE.ShapeGeometry(shape,8);geometry.rotateX(Math.PI/2);geometry.scale(scale,1,scale);geometry.translate(-cx*scale,y,-cy*scale);geometry.computeBoundingBox();bounds.union(geometry.boundingBox);group.add(new THREE.Mesh(geometry,basic({color:fill})));
   const points=shape.getPoints(32).map(p=>new THREE.Vector3((p.x-cx)*scale,y+.005,(p.y-cy)*scale));if(points.length)points.push(points[0].clone());
   group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:'#b5c2d0',toneMapped:false})));
  }scene.add(group);return group;
 }
 if(presentation.wrapperPath)shapeMesh(presentation.wrapperPath,presentation.wrapperColor||'#ffffff',-.03);
 for(const s of map.sections){
  if(s.killed)continue;
  let group=s.path?shapeMesh(s.path,s.ga?'#397ade':'#ffffff'):new THREE.Group();if(!s.path){const box=new THREE.Box3();for(const id of s.seats){const seat=map.seatById.get(id);box.expandByPoint(world(seat.x,seat.y));}if(!box.isEmpty()){box.expandByScalar(seatSize);const size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),mesh=new THREE.Mesh(new THREE.PlaneGeometry(size.x,size.z).rotateX(-Math.PI/2),basic({color:'#ffffff'}));mesh.position.copy(center);group.add(mesh);}scene.add(group);}
  const box=new THREE.Box3().setFromObject(group);if(box.isEmpty())continue;sections.set(s.id,{group,box,section:s});group.traverse(o=>{o.userData.sectionId=s.id;});
 }
 const focus=presentation.focus;if(focus&&!artwork){
  const p=world(focus.cx,focus.cy),field=new THREE.Mesh(new THREE.PlaneGeometry(focus.width*scale,focus.height*scale).rotateX(-Math.PI/2),basic({color:textures.field?'#ffffff':presentation.sport==='hockey'?'#f8fcff':'#b9d6b3',map:textures.field||null,transparent:!!textures.field}));field.position.set(p.x,.015,p.z);scene.add(field);
 }
 const art=await createFlatArtwork({root:artwork,map,presentation,scene,scale,cx,cy,seatWidth:seatSize/scale,invalidate,cacheRevision:artworkCacheKey,viewport});
 // Section blocks. The artwork carries them in one authored blue, which only marks "this is a section": no theme shows it. Both themes remap it
 // to the library's zinc greys, each the mirror of the other. Dark: sections #3f3f46, sold out #33333a, unavailable #2d2d32.
 // Light: sections in the brand navy #051b35 on a near-white building, sold out #dcdce0 and unavailable #e6e6ea in grey.
 // Each theme has its own map palette. (MAP_ALWAYS_DARK=true would draw the dark map in both; the stylesheets would need the same switch.)
 const MAP_ALWAYS_DARK=false,mapIsDark=()=>MAP_ALWAYS_DARK||document.body.classList.contains('bt-map-dark');
 // Team colours. A venue can give the map its own colour family in venue.json (view2d.theme); without one it is the Blocktickets navy. "strong" is the colour of a
 // section and of an open seat (in dark, of an open seat only), "soft" the lighter end used for the cheapest price, "line" the lines between sections;
 // in dark, "cover" is a section with a single price and coverStrong / coverSoft the two ends when prices differ. Each is a six-digit hex colour.
 const TEAM=(()=>{const t=window.maps2d?.venue?.view2d?.theme||{},pick=(v,d)=>/^#[0-9a-f]{6}$/i.test(v||'')?v.toLowerCase():d;return {light:{strong:pick(t.light?.strong,'#051b35'),soft:pick(t.light?.soft,'#4a6fa5'),line:pick(t.light?.line,'#4a6690')},dark:{strong:pick(t.dark?.strong,'#fafafa'),soft:pick(t.dark?.soft,'#8ab0e6'),cover:pick(t.dark?.cover,'#3f3f46'),coverStrong:pick(t.dark?.coverStrong,'#6d82a8'),coverSoft:pick(t.dark?.coverSoft,'#35486a')}};})();
 const slates={dark:new THREE.Color(TEAM.dark.cover),light:new THREE.Color(TEAM.light.strong)},gapInk=new THREE.Color('#141416'),gapNavy=new THREE.Color(TEAM.light.line),themeCovers=dark=>{art?.themeSurface?.(dark);const slate=dark?slates.dark:slates.light;art?.recolor((r,g,b)=>b>.45&&b>r*2&&b>g*1.5?[slate.r,slate.g,slate.b]:r>.8&&g>.8&&b>.8?(dark?[gapInk.r,gapInk.g,gapInk.b]:[gapNavy.r,gapNavy.g,gapNavy.b]):[r,g,b],dark?{'sold-out':'#33333a','killed':'#2d2d32'}:{'sold-out':'#dcdce0','killed':'#e6e6ea'});}; // sold-out blocks sit a step back from the rest, in the same grey
 themeCovers(mapIsDark());
 // the vector artwork and the outline overlay are SVG, drawn in the turned frame: their content turns inside a group about the map centre
 const turnGroups=[];let turnedAs='';
 if(art?.element){const g=document.createElementNS('http://www.w3.org/2000/svg','g');for(const node of [...art.element.childNodes])if(!(node.nodeType===1&&(node.localName==='defs'||node.localName==='style')))g.append(node);art.element.append(g);turnGroups.push(g);canvas.parentElement.prepend(art.element);}
 if(art)for(const object of scene.children)if(object.isGroup)object.visible=false;
 const overlay=document.createElementNS('http://www.w3.org/2000/svg','svg');overlay.classList.add('flat-section-outline');overlay.setAttribute('preserveAspectRatio','none');
 const outline=document.createElementNS(overlay.namespaceURI,'path');outline.classList.add('flat-selected-section');outline.setAttribute('fill','rgba(151,221,98,.14)');outline.setAttribute('stroke','#97dd62');outline.setAttribute('stroke-width','3');outline.setAttribute('vector-effect','non-scaling-stroke');outline.style.opacity='0';const hoverOutlines=[outline.cloneNode(),outline.cloneNode()];for(const hoverOutline of hoverOutlines){hoverOutline.classList.remove('flat-selected-section');hoverOutline.classList.add('flat-section-hover');hoverOutline.setAttribute('stroke','#97dd62');hoverOutline.setAttribute('stroke-width','2');hoverOutline.setAttribute('fill','rgba(151,221,98,.16)');hoverOutline.style.opacity='0';hoverOutline.setAttribute('transform',alignmentTransform);}const selectedIdentifier=document.createElementNS(overlay.namespaceURI,'g');selectedIdentifier.classList.add('flat-selected-identifier');selectedIdentifier.style.opacity='0';const overlayTurn=document.createElementNS(overlay.namespaceURI,'g'),veil=document.createElementNS(overlay.namespaceURI,'path');veil.classList.add('flat-section-veil');// The veil over everything but the section in focus. It is at full strength except close to that section, where it thins: a mask of bands hugging
 // the section's own outline makes the fade follow the section's shape and finish a set distance out (about four to five seats), whatever the shape.
 const veilMask=document.createElementNS(overlay.namespaceURI,'mask'),veilBands=[],veilSeat=map.seatById.values().next().value?.w||10,veilReach=veilSeat*18,veilBox=[cx-6000,cy-6000,12000,12000];veilMask.id='flat-veil-mask';veilMask.setAttribute('maskUnits','userSpaceOnUse');for(const [k,v] of [['x',veilBox[0]],['y',veilBox[1]],['width',veilBox[2]],['height',veilBox[3]]])veilMask.setAttribute(k,String(v));
 {const all=document.createElementNS(overlay.namespaceURI,'rect');for(const [k,v] of [['x',veilBox[0]],['y',veilBox[1]],['width',veilBox[2]],['height',veilBox[3]],['fill','#fff']])all.setAttribute(k,String(v));veilMask.append(all);const steps=40;for(let n=0;n<steps;n++){const band=document.createElementNS(overlay.namespaceURI,'path'),near=n/(steps-1),ease=near*near*near*(near*(near*6-15)+10),level=Math.round(255*(1-.3*ease)); // many thin bands on an eased curve: no visible steps, and no hard start or end to the fade
   band.setAttribute('fill',n===steps-1?`rgb(${level},${level},${level})`:'none');band.setAttribute('stroke',`rgb(${level},${level},${level})`);band.setAttribute('stroke-width',String(veilReach*2*(1-near)+1));band.setAttribute('stroke-linejoin','round');veilMask.append(band);veilBands.push(band);}}
 overlay.append(veilMask);veil.setAttribute('fill','#f4f4f5');veil.setAttribute('fill-opacity','.9');veil.setAttribute('mask','url(#flat-veil-mask)');veil.setAttribute('fill-rule','evenodd');veil.setAttribute('transform',alignmentTransform);veil.style.opacity='0';veil.style.transition='opacity 520ms cubic-bezier(.23,1,.32,1)';let veiledFor=null;const outlineGhost=outline.cloneNode();outlineGhost.classList.remove('flat-selected-section');outlineGhost.style.opacity='0';outlineGhost.setAttribute('transform',alignmentTransform);let outlinedId=null;overlayTurn.append(veil,...hoverOutlines,outlineGhost,outline,selectedIdentifier);overlay.append(overlayTurn);turnGroups.push(overlayTurn);
 // Row letters are drawn on the map canvas itself (small sprites in the WebGL scene), not as SVG text on top of it, so they move, turn and zoom
 // in the same frame as the seats. They are generated from the seat data: each row's name at both ends of the row. Only the section in focus has them.
 const authoredLetters=art?.element?.querySelector('.row-lettering')||null,rowGroup=new THREE.Group(),rowSprites=[],rowTextures=new Map();rowGroup.visible=false;scene.add(rowGroup);
 let rowLetterEnds=null,lettersFocus=null;
 // Focus style. Default 'free': one continuous map, the section in the middle of the screen is the one in focus, others keep their colours and stay pickable.
 // ?focus=dim brings back the earlier behaviour: other sections fade out and a click on them switches section first.
 const dimFocus=new URLSearchParams(location.search).get('focus')==='dim',noWash=!dimFocus&&matchMedia('(pointer: coarse), (max-width: 760px)').matches; /* noWash: on phones the faint wash round the section in focus is left out. It is a large masked shape that has to be drawn again on every frame the map moves, which is what made the map crawl after a section was tapped. */if(noWash)veil.style.display='none';let followWant=null,followSince=0;
 function rowTexture(text){/* letters in the muted text grey */let hit=rowTextures.get(text);if(!hit){const font='500 64px Geist, Inter, system-ui, sans-serif',c=document.createElement('canvas'),measure=c.getContext('2d');measure.font=font;c.width=Math.max(48,Math.ceil(measure.measureText(text).width)+16);c.height=88;const ctx=c.getContext('2d');ctx.font=font;ctx.fillStyle='#8b8b93';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,c.width/2,46);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;ownedTextures.add(tex);hit={tex,aspect:c.width/c.height};rowTextures.set(text,hit);}return hit;}
 function showRowLetters(focus){
  if(!rowLetterEnds){rowLetterEnds=[];for(const row of map.rows){const list=row.seats.map(id=>map.seatById.get(id)).filter(Boolean);if(!list.length||!row.number)continue;let a=list[0],b=a;for(const q of list)if(Math.hypot(q.x-a.x,q.y-a.y)>Math.hypot(b.x-a.x,b.y-a.y))b=q;for(const q of list)if(Math.hypot(q.x-b.x,q.y-b.y)>Math.hypot(a.x-b.x,a.y-b.y))a=q;const len=Math.hypot(b.x-a.x,b.y-a.y),gap=a.w*1.7,ux=len?(b.x-a.x)/len:1,uy=len?(b.y-a.y)/len:0;for(const [x,y] of len?[[a.x-ux*gap,a.y-uy*gap],[b.x+ux*gap,b.y+uy*gap]]:[[a.x-gap,a.y]])rowLetterEnds.push([String(row.number),x,y,row.sectionId,a.h]);}}
  for(const sprite of rowSprites){rowGroup.remove(sprite);sprite.material.dispose();}rowSprites.length=0;lettersFocus=focus;
  if(focus)for(const [text,x,y,sid,h] of rowLetterEnds){if(sid!==focus)continue;const {tex,aspect}=rowTexture(text),sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false,depthWrite:false})),p=world(x,y),tall=h*scale*.78*88/64;sprite.position.set(p.x,.3,p.z);sprite.scale.set(tall*aspect,tall,1);sprite.renderOrder=7;rowGroup.add(sprite);rowSprites.push(sprite);}
  invalidate();
 }
 // the letters use the site font: if it arrives after the first letters were drawn, draw them again
 document.fonts?.load('500 64px Geist').then(()=>{if(!rowTextures.size)return;for(const {tex} of rowTextures.values()){ownedTextures.delete(tex);tex.dispose();}rowTextures.clear();showRowLetters(lettersFocus);}).catch(()=>{});
 void 0;canvas.parentElement.append(overlay);
 // The tint of the section in focus (a grey a step lighter than the floor) sits on its own layer between the venue artwork and the seat canvas, so it colours the floor
 // of the section and never the seats. The layer above the seats keeps only the outline.
 const underlay=document.createElementNS(overlay.namespaceURI,'svg'),underTurn=document.createElementNS(overlay.namespaceURI,'g'),underFill=document.createElementNS(overlay.namespaceURI,'path');
 underlay.classList.add('flat-section-outline','flat-section-underlay');underlay.setAttribute('preserveAspectRatio','none');underlay.style.zIndex='0';
 underFill.setAttribute('fill','rgba(255,255,255,.07)');underFill.setAttribute('transform',alignmentTransform);underFill.style.opacity='0';underFill.style.transition='opacity 220ms ease';
 // a soft green glow just inside the edge of the section in focus: faint strokes along its outline, cut off at the outline so only their inner halves show
  const underClip=document.createElementNS(overlay.namespaceURI,'clipPath'),underClipPath=document.createElementNS(overlay.namespaceURI,'path'),underGlow=document.createElementNS(overlay.namespaceURI,'g'),glowSeat=map.seatById.values().next().value?.w||10,
   glowLines=Array.from({length:14},(_,n)=>{const near=(n+1)/14;return [5.6*(1-near)*(1-near)+.25,.016];}).map(([wide,alpha])=>{ /* fourteen fine steps, each barely there and each a little narrower than the last, so they add up to an even fade with no visible bands at any zoom */const line=document.createElementNS(overlay.namespaceURI,'path');for(const [k,v] of [['fill','none'],['stroke','#97dd62'],['stroke-opacity',String(alpha)],['stroke-width',String(glowSeat*wide)],['stroke-linejoin','round'],['transform',alignmentTransform]])line.setAttribute(k,v);return line;});
  underClip.id='flat-under-clip';underClipPath.setAttribute('transform',alignmentTransform);underClip.append(underClipPath);underGlow.setAttribute('clip-path','url(#flat-under-clip)');underGlow.style.opacity='0';underGlow.style.transition='opacity 260ms ease';underGlow.append(...glowLines);
  underTurn.append(underFill,underGlow);underlay.append(underClip,underTurn);turnGroups.push(underTurn);canvas.parentElement.insertBefore(underlay,canvas);
 outline.setAttribute('transform',alignmentTransform);let hoverLayer=0,renderedHoverId=null,renderedIdentifierId=null;
 function selectedIdentifierArtwork(){return null;}
 function texture(draw){const c=document.createElement('canvas');c.width=c.height=64;draw(c.getContext('2d'));const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;ownedTextures.add(t);return t;}
 const seatTexture=texture(c=>{c.fillStyle='#fff';c.fillRect(0,0,64,64);});
 function batch(tex){const mesh=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2),basic({map:tex,transparent:true,alphaTest:.05,depthWrite:false}),seats.length);mesh.frustumCulled=false;scene.add(mesh);return mesh;}
 const seatMesh=batch(seatTexture),accessibleMesh=batch(textures.accessible),lockMesh=batch(textures.lock),checkMesh=batch(textures.check),starMesh=batch(textures.star);
 // Per-instance rounded corners preserve authored rectangles, round seats and
 // ellipses in the same draw call, with an antialiased GPU edge at every zoom.
 seatMesh.geometry.setAttribute('seatCorners',new THREE.InstancedBufferAttribute(new Float32Array(seats.flatMap(s=>art?.seatShapes.get(s.id)||[.5,.5])),2));
 seatMesh.material.onBeforeCompile=shader=>{
  shader.vertexShader='attribute vec2 seatCorners; varying vec2 vSeatCorners;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvSeatCorners=seatCorners;');
  shader.fragmentShader='varying vec2 vSeatCorners;\n'+shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
   vec2 corner=(abs(vMapUv-0.5)-(0.5-vSeatCorners))/max(vSeatCorners,vec2(0.0001));
   float edge=length(max(corner,vec2(0.0)));
   float aa=max(fwidth(edge),0.001);
   diffuseColor.a*=1.0-smoothstep(1.0-aa,1.0+aa,edge);`);
 };
 seatMesh.material.customProgramCacheKey=()=> 'authored-seat-corners';
 seatMesh.renderOrder=2;accessibleMesh.renderOrder=3;lockMesh.renderOrder=3;starMesh.renderOrder=3;checkMesh.renderOrder=4;checkMesh.material.color.set('#051b35');
 function matrix(mesh,i,s,visible=true,size=1,lift=.08){const sx=visible?s.w*scale*size:0,sz=visible?s.h*scale*size:0,c=Math.cos(iconTurn),n=Math.sin(iconTurn);matrixValues[0]=c*sx;matrixValues[2]=n*sx;matrixValues[8]=-n*sz;matrixValues[10]=c*sz;matrixValues[12]=(s.x-cx)*scale;matrixValues[13]=lift;matrixValues[14]=(s.y-cy)*scale;attributeWriter.write(mesh.instanceMatrix,i,matrixValues);}
 function tint(mesh,i,value){if(!mesh.instanceColor)mesh.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(seats.length*3),3);color.set(value).toArray(colorValues);attributeWriter.write(mesh.instanceColor,i,colorValues);}
 const links=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:'#97dd62',depthTest:false,toneMapped:false}));links.renderOrder=5;scene.add(links);
 const pairLinks=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:'#7ea9df',transparent:true,opacity:.34,depthTest:false,toneMapped:false}));pairLinks.renderOrder=3;scene.add(pairLinks);let defaultPairCount=0;
 const ringTexture=texture(c=>{c.strokeStyle='#fff';c.lineWidth=5;c.beginPath();c.arc(32,32,29,0,Math.PI*2);c.stroke();}),haloTexture=texture(c=>{c.fillStyle='#fff';c.beginPath();c.arc(32,32,30,0,Math.PI*2);c.fill();}),rings=batch(ringTexture),hoverHalos=batch(haloTexture);rings.renderOrder=4;hoverHalos.material.opacity=.25;hoverHalos.renderOrder=1;hoverHalos.visible=false;
 // Only defer when every reserved seat section has an authored opaque cover.
 // Other maps keep their visible seat layer on the first frame.
 const deferSeats=!!art&&seats.length>0&&seats.every(s=>isGA(s)||art.coveredSectionIds.has(s.sectionId));
 const seatMeshes=[seatMesh,accessibleMesh,lockMesh,checkMesh,starMesh,rings,hoverHalos];
 let seatLayerOccluded=false,seatDataReady=!deferSeats,seatLayerReady=!deferSeats,seatBuildStarted=false,seatBuildIndex=0;
 if(deferSeats)for(const mesh of seatMeshes)mesh.visible=false;
 function initializeSeat(i){const seat=seats[i];matrix(seatMesh,i,seat,!isGA(seat),1);paintSeat(seat);}
 function prepareSeatSlice(){
  if(seatDataReady)return;
  seatBuildStarted ||= context.workspace==='admin'||current[2]<home[2]*.72;
  if(!seatBuildStarted)return;
  const deadline=performance.now()+3,end=Math.min(seats.length,seatBuildIndex+1024);
  do{initializeSeat(seatBuildIndex++);}while(seatBuildIndex<end&&(seatBuildIndex%64!==0||performance.now()<deadline));
  if(seatBuildIndex===seats.length){seatDataReady=true;for(const mesh of seatMeshes)mesh.visible=mesh!==hoverHalos||!!hoveredSeat;}
 }

 function label(text,position,ga=false){
  const key=String(text)+'/'+ga;let cached=labelTextures.get(key);
  if(!cached){const c=document.createElement('canvas'),measure=c.getContext('2d');measure.font='700 44px system-ui';c.width=Math.max(96,Math.min(1024,Math.ceil(measure.measureText(text).width+28)));c.height=72;const ctx=c.getContext('2d');ctx.fillStyle=ga?'#2563eb':'#fff';ctx.beginPath();ctx.roundRect(1,1,c.width-2,70,12);ctx.fill();ctx.font='700 44px system-ui';ctx.fillStyle=ga?'#fff':'#334a65';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,c.width/2,36,c.width-20);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;ownedTextures.add(tex);cached={tex,width:c.width,refs:0};labelTextures.set(key,cached);}
  cached.refs++;const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:cached.tex,depthTest:false,toneMapped:false}));sprite.userData.labelKey=key;sprite.position.copy(position);sprite.position.y=.2;const w=Math.max(2,Math.min(9,cached.width/45));sprite.scale.set(w,w*72/cached.width,1);sprite.renderOrder=6;scene.add(sprite);return sprite;
 }

 const badgeLayer=document.createElement('div');badgeLayer.className='section-annotation-layer';badgeLayer.style.visibility='hidden';canvas.parentElement.append(badgeLayer);
 const isHoverSurface=target=>target===canvas||target instanceof Node&&badgeLayer.contains(target);
 const leaveHover=event=>{if(isHoverSurface(event.relatedTarget))return;pendingHover=null;hover(null);};
 const badgeResizeObserver=new ResizeObserver(entries=>{let changed=false;for(const entry of entries){const data=entry.target.badgeData,w=entry.target.offsetWidth,h=entry.target.offsetHeight;if(data&&w&&h&&(w!==data.badgePixels.width||h!==data.badgePixels.height)){data.badgePixels={width:w,height:h};changed=true;}}if(changed)invalidate();});
 function badgeName(name){const span=document.createElement('span');span.className='section-badge-name';span.textContent=sectionBadgeLabel(name);return span;}
 function sectionBadge(section,box,polygons,component){
  const button=document.createElement('button');button.type='button';button.className='section-annotation-badge';button.append(badgeName(section.name));button.dataset.sectionId=section.id;button.dataset.component=String(component);button.dataset.full=sectionBadgeLabel(section.name);button.dataset.short=shortSectionLabel(section.name);button.setAttribute('aria-label',`Open section ${section.name}`);badgeLayer.append(button);
  button.addEventListener('click',()=>{onHover?.(null);onPick({sectionId:section.id});});
  button.addEventListener('pointermove',event=>{pendingHover={sectionId:section.id,clientX:event.clientX,clientY:event.clientY};invalidate();});
  button.addEventListener('pointerleave',leaveHover);
  // World-space anchors position the screen-space section badges.
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({transparent:true,opacity:0,depthTest:false,depthWrite:false})),anchor=section.identifier?.center,authored=anchor?world(anchor.x,anchor.y):null,point=authored&&polygons.some(p=>labelRectangleFits(p,{x:authored.x,y:authored.z,width:seatSize*.3,height:seatSize*.3},seatSize*.1))?authored:box.getCenter(new THREE.Vector3());
  // A venue can pin a section's label by hand (view2d.sectionLabels in its venue.json, map coordinates, one point per piece of the section).
  // The pin that falls inside this piece wins over the automatic placement.
  const pinned=(window.maps2d?.venue?.view2d?.sectionLabels?.[section.name]||[]).map(a=>world(a.x,a.y)).find(p=>p.x>=box.min.x&&p.x<=box.max.x&&p.z>=box.min.z&&p.z<=box.max.z);
  const placement=pinned?{x:pinned.x,y:pinned.z,pinned:true}:fitSectionLabel(polygons,{aspect:1,maxWidth:seatSize*.3,anchor:[point.x,point.z],padding:seatSize*.1});
  sprite.material.visible=false;sprite.userData.labelPlacement=placement;sprite.userData.labelFits=!!placement;sprite.userData.badgeElement=button;sprite.userData.sectionHoverSize={width:box.max.x-box.min.x,height:box.max.z-box.min.z};sprite.userData.badgePixels={width:button.offsetWidth,height:button.offsetHeight};button.badgeData=sprite.userData;badgeResizeObserver.observe(button);
  if(placement)sprite.position.set(placement.x,.2,placement.y);sprite.renderOrder=6;scene.add(sprite);return sprite;
 }
 for(const [id,{box,section,group}] of sections){
  const polygons=group.userData.labelPolygons||[{outer:[[box.min.x,box.min.z],[box.max.x,box.min.z],[box.max.x,box.max.z],[box.min.x,box.max.z]],holes:[]}];
  polygons.forEach((polygon,component)=>{const xs=polygon.outer.map(p=>p[0]),ys=polygon.outer.map(p=>p[1]),componentBox=new THREE.Box3(new THREE.Vector3(Math.min(...xs),0,Math.min(...ys)),new THREE.Vector3(Math.max(...xs),0,Math.max(...ys))),sprite=sectionBadge(section,componentBox,[polygon],component);sprite.userData.sectionId=id;labels.push({sprite,id,component,ga:section.ga,dynamic:true,area:(componentBox.max.x-componentBox.min.x)*(componentBox.max.z-componentBox.min.z)});});
 }
// Adaptive section labels. Each pill is sized from the on-screen footprint of its own section (so labels shrink as the map zooms out
// and grow as sections open up) and steps down from the full name to a short code when the section is too tight for it.
const badgeMeasure=document.createElement('canvas').getContext('2d');
function shortSectionLabel(name){
 const text=String(name).trim().replace(/^(section|sec)\s+/i,''),words=text.split(/\s+/).filter(Boolean);
 if(text.length<=4||words.length<2)return text.slice(0,4);
 const letters=words.filter(w=>!/^\d/.test(w)).map(w=>w[0].toUpperCase()).join(''),digits=words.filter(w=>/^\d/.test(w)).join('');
 return (letters+digits).slice(0,4);
}
function pillSize(text,caption){
 badgeMeasure.font='500 14px Geist, ui-sans-serif, system-ui, sans-serif';
 const rows=String(text).split('\n');let w=Math.max(...rows.map(t=>badgeMeasure.measureText(t).width)),h=rows.length*20+10;
 if(caption){badgeMeasure.font='500 12px Geist, ui-sans-serif, system-ui, sans-serif';w=Math.max(w,badgeMeasure.measureText(caption).width);h+=16;}
 return {w:Math.min(188,Math.max(36,Math.ceil(w)+26)),h};
}
function badgeTiers(data){
 const button=data.badgeElement,full=button.dataset.full||'',short=button.dataset.short||'',caption=button.querySelector('.section-stock-caption')?.textContent||'',sig=full+'|'+short+'|'+caption;
 if(data.tierSig===sig)return data.tiers;
 const a=pillSize(full,caption),tiers=[{compact:false,w:a.w,h:a.h}];
 if(short&&short!==full.replace(/\n/g,' ')){const b=pillSize(short,'');tiers.push({compact:true,w:b.w,h:b.h});}
 data.tierSig=sig;data.tiers=tiers;return tiers;
}
function setBadgeCompact(button,compact){
 button.classList.toggle('is-compact',compact);
 const name=button.querySelector('.section-badge-name');
 if(name)name.textContent=compact?button.dataset.short:button.dataset.full;
}
 function updateSectionBadges(detailed){
  const seatPixels=seatSize/current[2]*width,fade=Math.max(0,Math.min(1,(28-seatPixels)/24)),seatZoomOpacity=fade*fade,badgeDetail=1-(art?art.state().authoredIdentifierOpacity:(detailed?0:1)),mobile=width<=760||(height<=500&&width<=1024),badgeScale=mobile?.78+.22*Math.max(0,Math.min(1,(seatPixels-1)/3)):1,occupied=[],focusId=context.workspace==='buyer'&&detailed&&map.sectionById.get(context.sectionId)?.path?context.sectionId:null,priority=label=>label.id===context.sectionId?2:label.id===hoveredSection?1:0;
  for(const l of [...labels].sort((a,b)=>priority(b)-priority(a)||b.area-a.area)){
   // Section context outlives the covers, then fades as individual seats grow.
   // around a focused section the other sections are dimmed, so their own label stays on instead of fading with zoom: larger, dark, and capped in size
   const beside=dimFocus&&focusId&&l.id!==focusId,
    // Once seats are drawn a bare name over them is unreadable, so the label turns into a solid pill. It stays fully visible while seats are still
    // small, then leaves over a short zoom range as seats become pickable; from there the label at the top of the map names the section.
    // The section in focus drops its pill at once: its seats are the ones being picked.
    pill=detailed&&!beside,leave=Math.max(0,Math.min(1,(12-seatPixels)/4)),opacity=beside?1:!detailed?1:l.id===focusId?0:l.ga?1:leave*leave*(3-2*leave);
   const d0=l.sprite.userData,p=l.sprite.position.clone().project(camera),onScreen=p.x>=-1&&p.x<=1&&p.y>=-1&&p.y<=1,px=(p.x+1)*width/2,py=(1-p.y)*height/2,
    secW=d0.sectionHoverSize.width/current[2]*width,secH=d0.sectionHoverSize.height/current[3]*height,tierList=badgeTiers(d0),
    comfy=Math.min(secW*.66/tierList[0].w,secH*.74/tierList[0].h)>=.9,order=comfy||tierList.length<2?tierList:[tierList[tierList.length-1]];
   let pixels,rect,x,y,overlap=true,pick;
   for(const tier of order){
    const fit=Math.min(secW*.66/tier.w,secH*.74/tier.h),s=Math.round(Math.max(.8,Math.min(beside?1.9:tier.compact?1.1:1.18,fit))*badgeScale*50)/50,w=tier.w*s,h=tier.h*s;
    x=Math.max(w/2+8,Math.min(width-w/2-8,px));y=Math.max(h/2+8,Math.min(height-h/2-8,py));
    rect={left:x-w/2,right:x+w/2,top:y-h/2,bottom:y+h/2};pixels={width:w,height:h};pick=tier;d0.fs=s;
    overlap=occupied.some(b=>rect.left<b.right+4&&rect.right>b.left-4&&rect.top<b.bottom+4&&rect.bottom>b.top-4);
    if(!overlap)break;
   }
   d0.pickCompact=!!pick.compact;
   l.sprite.scale.set(pixels.width*current[2]/width,pixels.height*current[3]/height,1);d0.badgeBounds=rect;
   l.sprite.visible=l.sprite.userData.labelFits!==false&&opacity>.01&&onScreen&&rect.right>0&&rect.left<width&&rect.bottom>0&&rect.top<height&&!overlap;
   const data=l.sprite.userData,button=data.badgeElement,hidden=!l.sprite.visible;
   if(button.hidden!==hidden)button.hidden=hidden;
   if(data.badgeScale!==data.fs){data.badgeScale=data.fs;button.style.setProperty('--badge-scale',String(data.fs));}
   if(data.compact!==data.pickCompact){data.compact=data.pickCompact;setBadgeCompact(button,data.compact);}
   // The polygon owns input once it is a usable target. Small overview sections
   // retain their badge as an enlarged pointer target; keyboard activation stays.
   const size=data.sectionHoverSize,mode=!detailed&&Math.min(size.width/current[2]*width,size.height/current[3]*height)<44?'badge':'polygon';
   if(data.hoverMode!==mode){data.hoverMode=mode;button.dataset.hoverTarget=mode;button.style.pointerEvents=mode==='badge'?'auto':'none';}
   if(!hidden){
    if(data.badgeX!==x){data.badgeX=x;button.style.setProperty('--badge-x',x+'px');}
    if(data.badgeY!==y){data.badgeY=y;button.style.setProperty('--badge-y',y+'px');}
    if(data.badgeOpacity!==opacity){data.badgeOpacity=opacity;button.style.opacity=String(opacity);}
    const detailMix=l.ga?0:badgeDetail;
    if(data.badgeDetail!==detailMix){data.badgeDetail=detailMix;button.style.setProperty('--badge-detail',(detailMix*100)+'%');}
    if(button.classList.contains('is-beside')!==!!beside)button.classList.toggle('is-beside',!!beside);
    if(button.classList.contains('is-pill')!==pill)button.classList.toggle('is-pill',pill);
    const selected=l.id===context.sectionId;
    if(button.classList.contains('is-selected')!==selected)button.classList.toggle('is-selected',selected);
   }
   if(l.sprite.visible)occupied.push(rect);
  }
 }
 // At full-venue zoom the sections carry the same price shades as their seats, so the dear end of the building can be told from the cheap end before opening anything.
 let tierKey='';
 function tierCovers(){if(!art?.setSectionTints)return;const tiers=context.workspace==='buyer'?context.sectionTier||{}:{},dark=mapIsDark(),key=(dark?'d':'l')+JSON.stringify(tiers);if(key===tierKey)return;tierKey=key;
  art.setSectionTints(Object.fromEntries(Object.entries(tiers).map(([id,rank])=>[id,mixHex(...PRICE_COVERS[dark?'dark':'light'],rank)])),dark);}
 function updateAvailability(states){
  art?.setAvailability(states);
  for(const l of labels){const data=l.sprite.userData,button=data.badgeElement,state=states[l.id]?.state||'available';if(!button||data.availabilityState===state)continue;data.availabilityState=state;button.dataset.availability=state;
   const section=map.sectionById.get(l.id),label=sectionStateLabels[state],notice=state==='nearly-sold-out'||state==='sold-out'||state==='killed';
   button.replaceChildren(badgeName(section.name));data.compact=null;data.tierSig=null;
   if(notice){const caption=document.createElement('small');caption.className='section-stock-caption';caption.textContent=label;button.append(caption);}
   button.setAttribute('aria-label',`Open section ${section.name}${notice?', '+label:''}`);
  }
  invalidate();
 }
 const gaCounts=new Map();
 function removeLabel(sprite){scene.remove(sprite);sprite.material.dispose();const key=sprite.userData.labelKey,cached=labelTextures.get(key);if(cached&&--cached.refs===0){ownedTextures.delete(cached.tex);cached.tex.dispose();labelTextures.delete(key);}}
 function updateGA(allocated={}){for(const [id,s] of sections){if(!s.section.ga)continue;const value=allocated[id],old=gaCounts.get(id);if(old?.value===value)continue;if(old){removeLabel(old.sprite);gaCounts.delete(id);}if(Number.isInteger(value)){const p=s.box.getCenter(new THREE.Vector3());p.z+=seatSize*3;const sprite=label(String(value),p,true);sprite.scale.multiplyScalar(.6);gaCounts.set(id,{value,sprite});}}}
 if(bounds.isEmpty())bounds.set(new THREE.Vector3(-45,0,-30),new THREE.Vector3(45,0,30));bounds.expandByScalar(seatSize*2);
 const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
 let cameraDirty=true;
 function setCamera(){cameraDirty=true;}
 function syncCamera(){if(!cameraDirty)return;cameraDirty=false;const [x,z,w,h]=current;camera.left=-w/2;camera.right=w/2;camera.top=h/2;camera.bottom=-h/2;const [px,pz]=spin(x+w/2,z+h/2,theta);camera.up.set(Math.sin(theta),0,-Math.cos(theta));camera.position.set(px,100,pz);camera.lookAt(px,0,pz);camera.updateProjectionMatrix();camera.updateMatrixWorld();}
 function resize(){const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;width=canvas.clientWidth;height=canvas.clientHeight;const size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
  /* A map that is wider than it is tall is shown turned a quarter turn on a screen that is taller than it is wide (a phone held upright), so it fills the screen instead of sitting
     as a thin strip across it. A venue can decide for itself in venue.json: view2d.portrait is "auto" (the default), "turn" (always on a tall screen) or "keep" (never),
     and view2d.portraitTurn is "left" (the default) or "right". Only the full-venue view is affected; sections still turn to face the playing surface as before. */
  {const rule=window.maps2d?.venue?.view2d?.portrait||'auto',tall=height>width*1.15,wide=size.x>size.z*1.15,turned=context.workspace==='buyer'&&tall&&rule!=='keep'&&(rule==='turn'||wide);homeTheta=turned?(window.maps2d?.venue?.view2d?.portraitTurn==='right'?-1:1)*Math.PI/2:0;}
  const across=homeTheta?size.z:size.x,down=homeTheta?size.x:size.z,w=Math.max(across,down*width/height)*(homeTheta?1.06:1.15),[hx,hz]=spin(center.x,center.z,-homeTheta);home=[hx-w/2,hz-w*height/width/2,w,w*height/width];
  if(!current||view==='overview'){current=[...home];theta=homeTheta;if(iconTurn!==theta){iconTurn=theta;if(seatDataReady)for(let i=0;i<seats.length;i++)initializeSeat(i);}}else{const h=current[2]*height/width;current=[current[0],current[1]+(current[3]-h)/2,current[2],h];}tween=null;setCamera();invalidate();}
 function limit(v){const w=THREE.MathUtils.clamp(v[2],seatSize*12,home[2]);return [v[0],v[1],w,w*height/width];}
 function move(v,animate=false,duration=450){minimapTarget=null;const target=limit(v);if(animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches)tween={from:[...current],to:target,start:performance.now(),duration};else{current=target;tween=null;setCamera();}invalidate();}
 function zoomBy(factor,px=width/2,py=height/2,animate=true){const base=tween?.to||current,w=THREE.MathUtils.clamp(base[2]*factor,seatSize*12,home[2]),h=w*height/width;move([base[0]+px/width*(base[2]-w),base[1]+py/height*(base[3]-h),w,h],animate,240);}
 // Move and turn in one motion: the centre travels in map space while the angle and the size ease together.
 function flyTo(box,angle,duration){minimapTarget=null;const to=limit(box),turn=((angle-theta+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI,end=theta+turn;if(matchMedia('(prefers-reduced-motion: reduce)').matches){theta=Math.atan2(Math.sin(end),Math.cos(end));current=to;tween=null;setCamera();if(iconTurn!==theta){iconTurn=theta;if(seatDataReady)for(let i=0;i<seats.length;i++)initializeSeat(i);}}else tween={from:[...current],to,start:performance.now(),duration,th0:theta,th1:end,c0:spin(current[0]+current[2]/2,current[1]+current[3]/2,theta),c1:spin(to[0]+to[2]/2,to[1]+to[3]/2,end)};invalidate();}
 // The angle that puts the playing surface straight above a point: toward the nearest edge of the surface, so side sections square up to the boards and corners sit on the diagonal.
 function facingAngle(c){
  if(rinkBounds===undefined){rinkBounds=null;let best=0;for(const shape of Object.values(map.raw?.shapes||{})){const ring=shape.boundary?.[0];if(!(ring?.length>2)||!shape.groupPath?.some(name=>/^surface_type_/i.test(name)))continue;const box=new THREE.Box3();for(const p of ring)box.expandByPoint(world(p.x,p.y));const size=box.getSize(new THREE.Vector3());if(size.x*size.z>best){best=size.x*size.z;rinkBounds=box;}}}
  if(!rinkBounds)return 0;const dx=THREE.MathUtils.clamp(c.x,rinkBounds.min.x,rinkBounds.max.x)-c.x,dz=THREE.MathUtils.clamp(c.z,rinkBounds.min.z,rinkBounds.max.z)-c.z;return Math.hypot(dx,dz)<1e-6?0:Math.atan2(dz,dx)+Math.PI/2;
 }
 function sectionView(id){const s=sections.get(id);if(!s)return;view='section';sectionId=id;const c=s.box.getCenter(new THREE.Vector3()),angle=context.workspace==='buyer'?facingAngle(c):0,ring=(map.sectionById.get(id)?.boundary||[]).filter(r=>r?.length>2).flat(),points=ring.length>2?ring.map(p=>world(p.x,p.y)):[s.box.min,s.box.max,new THREE.Vector3(s.box.min.x,0,s.box.max.z),new THREE.Vector3(s.box.max.x,0,s.box.min.z)];let x0=Infinity,x1=-Infinity,z0=Infinity,z1=-Infinity;for(const p of points){const [x,z]=spin(p.x,p.z,-angle);x0=Math.min(x0,x);x1=Math.max(x1,x);z0=Math.min(z0,z);z1=Math.max(z1,z);}const w=Math.max(x1-x0+seatSize*2,(z1-z0+seatSize*2)*width/height)*1.04;flyTo([(x0+x1)/2-w/2,(z0+z1)/2-w*height/width/2,w,w*height/width],angle,760);}
 function detail(){return seatLayerReady&&(context.workspace==='admin'||current[2]<home[2]*.5);}
 // Seats can be picked only once they are big enough to aim at (about 11px across for buyers). From further out the pointer works on
 // the section: hovering highlights it and a click flies in to it, where the seats can then be picked.
 const PICKABLE_SEAT_PX=11,OPEN_SECTION_SEAT_PX=5; /* seats drawn smaller than 11 px are not picked from a free zoom (the section is tapped first); once a section has been opened its seats can be picked at whatever size it was fitted to the screen, which on a phone is often under 11 px */
 function canPickSeats(){return detail()&&(!art||art.seatsExposed())&&(context.workspace!=='buyer'||seatSize/current[2]*width>=(view==='section'&&sectionId?OPEN_SECTION_SEAT_PX:PICKABLE_SEAT_PX));}
 function coversHidden(){return detail();}
 function hit(clientX,clientY){
  syncCamera();
  const rect=canvas.getBoundingClientRect(),u=(clientX-rect.left)/rect.width,v=(clientY-rect.top)/rect.height,[x,z]=spin(current[0]+u*current[2],current[1]+v*current[3],theta);
  if(canPickSeats()){
   let best=null,distance=Infinity;const pad=Math.min(seatSize*.6,current[2]/width*11),reach=maxHalf+pad;
   for(let gx=Math.floor((x-reach)/cellSize);gx<=Math.floor((x+reach)/cellSize);gx++)for(let gz=Math.floor((z-reach)/cellSize);gz<=Math.floor((z+reach)/cellSize);gz++)for(const s of seatCells.get(gx+','+gz)||[]){const p=world(s.x,s.y),dx=Math.abs(x-p.x),dz=Math.abs(z-p.z),d=dx*dx+dz*dz;if(dx<=s.w*scale/2+pad&&dz<=s.h*scale/2+pad&&d<distance){best=s;distance=d;}}
   if(dimFocus&&best&&context.workspace==='buyer'&&view==='section'&&context.sectionId&&best.sectionId!==context.sectionId)return {sectionId:best.sectionId};
   if(best&&context.workspace==='buyer'&&context.sectionAvailability?.[best.sectionId]?.state==='sold-out')return {sectionId:best.sectionId};
   if(best)return context.workspace==='admin'&&context.scope==='section'?{sectionId:best.sectionId}:{seatId:best.id,sectionId:best.sectionId};
  }
  pointer.set(u*2-1,1-v*2);ray.setFromCamera(pointer,camera);const targets=[...sections.values()].flatMap(s=>s.group.children.filter(o=>o.isMesh));const h=ray.intersectObjects(targets,false)[0];return h?{sectionId:h.object.userData.sectionId}:null;
 }
 // Seat states. Picked and focused seats use the brand green and amber, wheelchair spaces are yellow, exclusive seats a rich purple with a star.
 // Open seats are one colour whatever their offer. Dark: open seats white, locked white with a black lock, #52525b outside the chosen offer,
 // #3f3f46 sold or unavailable. Light: open seats in the brand navy (the same navy as the section block they open out of), locked navy with a
 // white lock, #b4b4bb outside the chosen offer, #d4d4d8 sold or unavailable. The seat canvas is not colour-inverted, so these are the colours as seen.
 const SEAT={picked:'#97dd62',focused:'#f5a524',wheelchair:'#facc15',exclusive:'#7c3aed'};
 let darkSeats=mapIsDark();
 // Price shades. A seat whose colour is one of the price ramp's (context.priceRamp, shade -> rank 0..1) is drawn in this theme's shade for that rank:
 // light runs from a soft blue up to the brand navy, dark from a soft blue up to white, so in both the dearest seats are the strongest.
 const mixHex=(a,b,t)=>'#'+[1,3,5].map(n=>Math.round(parseInt(a.slice(n,n+2),16)+(parseInt(b.slice(n,n+2),16)-parseInt(a.slice(n,n+2),16))*t).toString(16).padStart(2,'0')).join(''),
  PRICE_SEATS={light:[TEAM.light.soft,TEAM.light.strong],dark:[TEAM.dark.soft,TEAM.dark.strong]},PRICE_COVERS={light:[TEAM.light.soft,TEAM.light.strong],dark:[TEAM.dark.coverSoft,TEAM.dark.coverStrong]};
 const darkSeatFill=c=>{const k=String(c).toLowerCase(),rank=context.priceRamp?.[k];if(rank!==undefined)return mixHex(...PRICE_SEATS[darkSeats?'dark':'light'],rank);return k===SEAT.picked||k===SEAT.focused?c:k==='#d4dde8'?(darkSeats?'#5a5a63':'#d4d4d8'):k==='#cbd3dd'?(darkSeats?'#7c7c86':'#b4b4bb'):darkSeats?TEAM.dark.strong:TEAM.light.strong;};
 const themeSeats=dark=>{darkSeats=!!dark;lockMesh.material.color.set(dark?'#18181b':'#ffffff');};themeSeats(darkSeats);
 function paintSeat(s){if(!index.has(s.id))return;const i=index.get(s.id),selected=context.selected.has(s.id),focused=context.focused.has(s.id),accessible=s.accessible||s.da,disabled=context.disabled.has(s.id),raw=paint(s.id),key=String(raw).toLowerCase(),open=!selected&&!focused&&!disabled&&!context.locked.has(s.id)&&key!=='#d4dde8'&&key!=='#cbd3dd'&&key!=='#334155',exclusive=!!s.exclusive&&open&&!accessible,seatColor=exclusive?SEAT.exclusive:darkSeatFill(raw),fill=accessible&&!disabled&&!selected&&!focused?SEAT.wheelchair:seatColor;matrix(starMesh,i,s,exclusive&&!!seatRenderable[i],.7,.1);tint(seatMesh,i,fill);matrix(accessibleMesh,i,s,accessible&&!disabled&&!selected&&!!seatRenderable[i],1.14,.09);matrix(lockMesh,i,s,context.locked.has(s.id)&&!accessible&&!selected&&!!seatRenderable[i],.78,.1);matrix(checkMesh,i,s,context.workspace==='buyer'&&selected&&!!seatRenderable[i],.68,.12);const hover=s.id===hoveredSeat||context.workspace==='admin'&&context.scope==='row'&&map.seatById.get(hoveredSeat)?.rowId===s.rowId;matrix(rings,i,s,focused,1.2,.11);tint(rings,i,selected?SEAT.picked:SEAT.focused);matrix(hoverHalos,i,s,hover,accessible&&!selected?1.14*1.5:1.5,.07);tint(hoverHalos,i,seatColor);}
 function colorSeats(getColor,ids=null){paint=getColor;if(!seatDataReady){seatBuildIndex=0;invalidate();return;}const list=ids?[...ids].map(id=>map.seatById.get(id)).filter(Boolean):seats;for(const s of list)paintSeat(s);hoverHalos.visible=!!hoveredSeat;invalidate();}
 function colorSections(getColor){sectionPaint=getColor;for(const [id,s] of sections)for(const mesh of s.group.children)if(mesh.isMesh)mesh.material.color.set(id===hoveredSection?(s.section.ga?'#5b91e2':'#e8f2ff'):getColor(id));invalidate();}
 function updateLinks(){const units=context.workspace==='buyer'?[...groups]:[];if(context.workspace==='buyer'&&context.focused.size>1)units.push([...context.focused]);if(context.workspace==='buyer'&&hoveredSeat)units.push(getSeatUnit(hoveredSeat));const nextKey=JSON.stringify([units,hoveredSeat,context.focused.size]);if(nextKey===linkKey)return;linkKey=nextKey;for(const badge of linkBadges)removeLabel(badge);linkBadges=[];const points=[];for(const ids of units){const positions=ids.map(id=>map.seatById.get(id)).filter(Boolean).map(s=>{const p=world(s.x,s.y);p.y=.15;return p;});for(let i=1;i<positions.length;i++)points.push(positions[i-1],positions[i]);if(positions.length>1){const center=positions.reduce((a,p)=>a.add(p),new THREE.Vector3()).multiplyScalar(1/positions.length);center.z-=seatSize;const badge=label(positions.length+'×',center);badge.scale.multiplyScalar(seatSize*.45);linkBadges.push(badge);}}links.geometry.dispose();links.geometry=new THREE.BufferGeometry().setFromPoints(points);links.visible=points.length>0;links.material.color.set(hoveredSeat?'#64a9ff':context.focused.size?'#f4b740':'#10ac92');invalidate();}
 function updatePairLinks(){const seen=new Set(),points=[];for(const seat of seats){const unit=getSeatUnit(seat.id);if(unit?.length!==2||unit.some(id=>!map.seatById.has(id)))continue;const key=[...unit].sort().join('|');if(seen.has(key))continue;seen.add(key);const first=map.seatById.get(unit[0]),second=map.seatById.get(unit[1]),a=world(first.x,first.y),b=world(second.x,second.y),direction=b.clone().sub(a),length=direction.length();if(length<=1e-6)continue;direction.multiplyScalar(1/length);a.addScaledVector(direction,Math.max(first.w,first.h)*scale*.52);b.addScaledVector(direction,-Math.max(second.w,second.h)*scale*.52);a.y=b.y=.13;points.push(a,b);}defaultPairCount=seen.size;pairLinks.geometry.dispose();pairLinks.geometry=new THREE.BufferGeometry().setFromPoints(points);pairLinks.visible=context.workspace==='buyer'&&points.length>0;invalidate();}
 function hover(e){const h=e&&hoverEnabled?(e.sectionId?{sectionId:e.sectionId}:hit(e.clientX,e.clientY)):null,id=h?.seatId&&canInteractSeat(h.seatId)?h.seatId:null;const old=hoveredSeat;if(old!==id){hoveredSeat=id;const ids=new Set([old,id]);if(context.workspace==='admin'&&context.scope==='row')for(const seatId of [old,id]){const s=map.seatById.get(seatId);if(s)for(const rid of map.rowById.get(s.rowId).seats)ids.add(rid);}colorSeats(paint,ids);updateLinks();}if(hoveredSection!==h?.sectionId){hoveredSection=h?.sectionId||null;colorSections(sectionPaint);}canvas.style.cursor=h?'pointer':'grab';onHover?.(h?{...h,seatId:id||undefined,clientX:e.clientX,clientY:e.clientY}:null);}
 const abort=new AbortController(),on=(name,fn,opts={})=>canvas.addEventListener(name,e=>{if(active)fn(e);},{signal:abort.signal,...opts}),pointers=new Map();let dragged=false,origin=null;
 // Drift. When a finger (or the mouse) lets go of the map mid-pan, the map keeps going the way it was moving and eases to a stop; a pinch does the same for zoom. The speed at
 // the moment of letting go is read from the last tenth of a second of movement. Touching the map again, the wheel, or any move the player makes itself stops it.
 let drift=null,pinchEnded=null,lastTap=null;const trail=[],pinchTrail=[],recent=(list,t)=>{while(list.length&&t-list[0].t>120)list.shift();return list;};
 const local=e=>{const b=canvas.getBoundingClientRect();return {x:(e.clientX-b.left)*width/b.width,y:(e.clientY-b.top)*height/b.height};};
 function handleWheel(e){if(!active)return;drift=null;e.preventDefault();const p=local(e),delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?height:1);zoomBy(Math.exp(THREE.MathUtils.clamp(delta,-600,600)*.0013),p.x,p.y,false);onHover?.(null);}
 on('wheel',handleWheel,{passive:false});
 badgeLayer.addEventListener('wheel',handleWheel,{passive:false,signal:abort.signal});
 on('pointerdown',e=>{if(e.button!==0)return;drift=null;if(!pointers.size){dragged=false;origin=local(e);tween=null;minimapTarget=null;pendingHover=null;trail.length=0;pinchTrail.length=0;pinchEnded=null;}pointers.set(e.pointerId,local(e));canvas.setPointerCapture(e.pointerId);if(pointers.size>1)dragged=true;});
 on('pointermove',e=>{if(!pointers.has(e.pointerId)){if(e.pointerType==='mouse'){pendingHover={clientX:e.clientX,clientY:e.clientY};invalidate();}return;}const before=[...pointers.values()],prev=pointers.get(e.pointerId),p=local(e);pointers.set(e.pointerId,p);if(pointers.size===2){move(pinchView(current,before,[...pointers.values()],width,height,seatSize*12,home[2]));dragged=true;trail.length=0;const [a,b]=[...pointers.values()];recent(pinchTrail,e.timeStamp).push({t:e.timeStamp,z:Math.log(current[2]),x:(a.x+b.x)/2,y:(a.y+b.y)/2});}else if(pointers.size===1){if(!dragged&&Math.hypot(p.x-origin.x,p.y-origin.y)<=4)return;const from=dragged?prev:origin;dragged=true;move([current[0]-(p.x-from.x)*current[2]/width,current[1]-(p.y-from.y)*current[3]/height,...current.slice(2)]);recent(trail,e.timeStamp).push({t:e.timeStamp,x:p.x,y:p.y});}onHover?.(null);});
 function finish(e,cancel=false){if(!pointers.has(e.pointerId))return;const pick=!cancel&&!dragged&&pointers.size===1;
  if(!cancel&&dragged&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
   if(pointers.size===2){const z=recent(pinchTrail,e.timeStamp);if(z.length>1&&z[z.length-1].t>z[0].t){const last=z[z.length-1];pinchEnded={t:e.timeStamp,zv:THREE.MathUtils.clamp((last.z-z[0].z)/(last.t-z[0].t),-.006,.006),x:last.x,y:last.y};}}
   else if(pointers.size===1){
    if(pinchEnded&&e.timeStamp-pinchEnded.t<180){if(Math.abs(pinchEnded.zv)>.0002)drift={zv:pinchEnded.zv*.35,x:pinchEnded.x,y:pinchEnded.y,vx:0,vy:0,at:0};}
    else{const m=recent(trail,e.timeStamp);if(m.length>1&&m[m.length-1].t>m[0].t){const last=m[m.length-1],dt=last.t-m[0].t,vx=THREE.MathUtils.clamp((last.x-m[0].x)/dt,-4,4),vy=THREE.MathUtils.clamp((last.y-m[0].y)/dt,-4,4);if(Math.hypot(vx,vy)>.08)drift={vx,vy,zv:0,x:0,y:0,at:0};}}
    if(drift)invalidate();}}
  pointers.delete(e.pointerId);if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);if(cancel)dragged=true;if(pick){const at=local(e),twice=e.pointerType!=='mouse'&&lastTap&&e.timeStamp-lastTap.t<320&&Math.hypot(at.x-lastTap.x,at.y-lastTap.y)<32; /* a second tap in the same place, straight after the first, zooms in on that spot (the first tap has already done what a tap does) */
   if(twice){lastTap=null;zoomBy(.5,at.x,at.y,true);}else{lastTap={t:e.timeStamp,x:at.x,y:at.y};const h=hit(e.clientX,e.clientY);if(!h?.seatId||canInteractSeat(h.seatId)){onHover?.(null);onPick(h||{view});}}}origin=pointers.size?[...pointers.values()][0]:null;}
 on('pointerup',e=>finish(e));on('pointercancel',e=>finish(e,true));on('lostpointercapture',e=>finish(e,true));on('pointerleave',leaveHover);
 window.addEventListener('blur',()=>{pointers.clear();dragged=true;},{signal:abort.signal});
 function setAttributeIfChanged(node,name,value){if(node.getAttribute(name)!==value)node.setAttribute(name,value);}
 function setOpacity(node,value){if(node.style.opacity!==value)node.style.opacity=value;}
 function render(now){if(!active||disposed)return false;
  if(drift){if(pointers.size||tween||minimapTarget)drift=null;else{const dt=drift.at?Math.min(40,Math.max(1,now-drift.at)):16;drift.at=now;
    if(drift.zv){const w=THREE.MathUtils.clamp(current[2]*Math.exp(drift.zv*dt),seatSize*12,home[2]),h=w*height/width,stuck=w===current[2];current=[current[0]+drift.x/width*(current[2]-w),current[1]+drift.y/height*(current[3]-h),w,h];drift.zv*=Math.exp(-dt/170); /* a pinch carries on only a little: about a third of its speed, gone in a fifth of a second */if(stuck||Math.abs(drift.zv)<.00006)drift=null;}
    else{current=[current[0]-drift.vx*dt*current[2]/width,current[1]-drift.vy*dt*current[3]/height,current[2],current[3]];const fade=Math.exp(-dt/320);drift.vx*=fade;drift.vy*=fade;
     const [mx,mz]=spin(current[0]+current[2]/2,current[1]+current[3]/2,theta),out=mx<bounds.min.x||mx>bounds.max.x||mz<bounds.min.z||mz>bounds.max.z; /* it does not carry the map off the screen: once the middle of the view leaves the venue it stops */
     if(out||Math.hypot(drift.vx,drift.vy)<.012)drift=null;}
    setCamera();invalidate();}}const frameStarted=diagnosticSamples?performance.now():0,previousFrame=lastFrameAt;lastFrameAt=now;if(minimapTarget){const dt=Math.min(40,Math.max(1,now-minimapFrame||16)),k=1-Math.exp(-dt/65);minimapFrame=now;current[0]+=(minimapTarget[0]-current[0])*k;current[1]+=(minimapTarget[1]-current[1])*k;if(Math.hypot(minimapTarget[0]-current[0],minimapTarget[1]-current[1])<current[2]/Math.max(width,1)*.1){current[0]=minimapTarget[0];current[1]=minimapTarget[1];minimapTarget=null;}setCamera();}if(tween){const t=Math.min(1,(now-tween.start)/tween.duration),k=cameraEase(t);if(tween.c0){theta=tween.th0+(tween.th1-tween.th0)*k;const w=tween.from[2]+(tween.to[2]-tween.from[2])*k,h=tween.from[3]+(tween.to[3]-tween.from[3])*k,[mx,mz]=spin(tween.c0[0]+(tween.c1[0]-tween.c0[0])*k,tween.c0[1]+(tween.c1[1]-tween.c0[1])*k,-theta);current=[mx-w/2,mz-h/2,w,h];if(t===1){current=[...tween.to];theta=Math.atan2(Math.sin(tween.th1),Math.cos(tween.th1));if(Math.abs(theta)<1e-6)theta=0;if(iconTurn!==theta){iconTurn=theta;if(seatDataReady){for(let i=0;i<seats.length;i++)initializeSeat(i);hoverHalos.visible=!!hoveredSeat;}}}}else current=tween.from.map((n,i)=>n+(tween.to[i]-n)*k);setCamera();if(t===1)tween=null;}prepareSeatSlice();syncCamera();if(pendingHover){const e=pendingHover;pendingHover=null;hover(e);}const detailed=detail(),hideCovers=coversHidden();for(const {sprite} of gaCounts.values())sprite.visible=context.workspace==='admin';const mapBox=[cx+current[0]/scale,cy+current[1]/scale,current[2]/scale,current[3]/scale],artAnimating=art?.update(mapBox,width,height,hideCovers,now);updateSectionBadges(detailed);setAttributeIfChanged(overlay,'viewBox',mapBox.join(' '));setAttributeIfChanged(underlay,'viewBox',mapBox.join(' '));{const turned=theta?`rotate(${(-theta*180/Math.PI).toFixed(3)} ${cx} ${cy})`:'';if(turned!==turnedAs){turnedAs=turned;for(const g of turnGroups){if(turned)g.setAttribute('transform',turned);else g.removeAttribute('transform');}}// Row letters are one thing, drawn one way: text placed at each end of every row, upright whichever way the map is turned, shown whenever seats are
  // shown. They are sprites in the scene, so they stay upright and in place while the map turns.
  const show=detailed&&context.workspace==='buyer'&&view==='section'&&context.sectionId?'':'none'; // letters only for the section in focus: the rest of the map is faded, and letters on faded rows are noise
  if(rowGroup.visible!==(show===''))rowGroup.visible=show==='';if(authoredLetters&&authoredLetters.style.display!=='none')authoredLetters.style.display='none';}const selected=map.sectionById.get(context.sectionId);if(selected?.path&&selected.id!==outlinedId){ /* moving from one section to another: the old outline fades away where it was while the new one fades in, both eased, so the green does not jump */
   const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;if(outlinedId&&outline.getAttribute('d')&&!reduce){outlineGhost.setAttribute('d',outline.getAttribute('d'));for(const a of ['fill','stroke','stroke-width'])outlineGhost.setAttribute(a,outline.getAttribute(a)||'');outlineGhost.animate([{opacity:1},{opacity:0}],{duration:320,easing:'ease-in-out',fill:'forwards'});}
   if(!reduce)for(const node of [outline,underFill,underGlow])node.animate([{opacity:0},{opacity:1}],{duration:360,easing:'ease-in-out'});outlinedId=selected.id;}else if(!selected?.path)outlinedId=null;
  if(selected?.path){setAttributeIfChanged(outline,'d',selected.path);setAttributeIfChanged(underFill,'d',selected.path);setAttributeIfChanged(underClipPath,'d',selected.path);for(const line of glowLines)setAttributeIfChanged(line,'d',selected.path);}setOpacity(outline,selected?.path?'1':'0');setOpacity(underFill,selected?.path&&detailed?'1':'0');setOpacity(underGlow,selected?.path&&detailed&&!selected.ga?'1':'0');{const focus=context.workspace==='buyer'&&view==='section'&&selected?.path&&detailed?selected.id:null;if(!dimFocus&&focus&&!tween&&!pointers.size){const [mx,mz]=spin(current[0]+current[2]/2,current[1]+current[3]/2,theta),inside=b=>mx>=b.min.x&&mx<=b.max.x&&mz>=b.min.z&&mz<=b.max.z;let want=null;if(!inside(sections.get(focus).box)){let near=Infinity;for(const [id,{box,section}] of sections){if(section.ga||section.killed||!section.seats?.length||!inside(box))continue;const d=(mx-(box.min.x+box.max.x)/2)**2+(mz-(box.min.z+box.max.z)/2)**2;if(d<near){near=d;want=id;}}}if(want!==followWant){followWant=want;followSince=now;}if(want){if(now-followSince>220){followWant=null;sectionId=want;onPick({sectionId:want,follow:true});}else invalidate();}}else followWant=null;if(focus!==veiledFor){veiledFor=focus;if(focus){veil.setAttribute('d',`M${veilBox[0]} ${veilBox[1]}h${veilBox[2]}v${veilBox[3]}h${-veilBox[2]}z`+selected.path);for(const band of veilBands)band.setAttribute('d',selected.path);}veil.style.opacity=focus?(dimFocus?'1':'.22'):'0';if(noWash)veil.style.display='none'; // neighbours stay readable right beside the section and fade out with distance
   showRowLetters(focus);}}setAttributeIfChanged(outline,'fill',detailed&&!selected?.ga?'none':'#97dd62');setAttributeIfChanged(outline,'stroke',detailed?(darkSeats?'rgba(151,221,98,.7)':'#78c246'):'transparent');setAttributeIfChanged(underFill,'fill',darkSeats?'rgba(255,255,255,.07)':'rgba(5,27,53,.045)');setAttributeIfChanged(outline,'stroke-width',detailed?'2':'3');if((selected?.id||null)!==renderedIdentifierId){const label=selectedIdentifierArtwork(selected?.id);selectedIdentifier.replaceChildren(...(label?[label]:[]));renderedIdentifierId=selected?.id||null;}setOpacity(selectedIdentifier,selected?.path&&!detailed?'1':'0');const hovering=map.sectionById.get(hoveredSection),nextHoverId=hovering?.path&&hovering.id!==selected?.id?hovering.id:null;if(nextHoverId!==renderedHoverId){setOpacity(hoverOutlines[hoverLayer],'0');if(nextHoverId){hoverLayer=1-hoverLayer;const incoming=hoverOutlines[hoverLayer];setAttributeIfChanged(incoming,'d',hovering.path);setAttributeIfChanged(incoming,'fill',detailed?'rgba(147,197,253,.14)':'rgba(255,255,255,.16)');setAttributeIfChanged(incoming,'stroke',detailed?'#93c5fd':'rgba(255,255,255,.62)');setAttributeIfChanged(incoming,'stroke-width',detailed?'2':'2.5');setOpacity(incoming,'1');}renderedHoverId=nextHoverId;}for(const hoverOutline of hoverOutlines){const flatHover=detailed&&!hovering?.ga;setAttributeIfChanged(hoverOutline,'fill',flatHover?'none':'rgba(151,221,98,.3)');setAttributeIfChanged(hoverOutline,'stroke',flatHover?(darkSeats?'rgba(151,221,98,.45)':'rgba(120,194,70,.65)'):'rgba(151,221,98,.85)');setAttributeIfChanged(hoverOutline,'stroke-width',flatHover?'2':'2.5');}
  // Picking a seat is acknowledged quietly: the seat settles up to its size from a touch smaller, on a spring with no bounce in it, its ring draws in a little, and a chosen seat's tick grows in. Letting a seat go has no movement.
  if(pops.size){for(const [id,pop] of pops){const s=map.seatById.get(id),i=index.get(id),q=Math.min(1,Math.max(0,(now-pop.at)/POP_MS));if(!s||i===undefined){pops.delete(id);continue;}
    if(q>=1||matchMedia('(prefers-reduced-motion: reduce)').matches){pops.delete(id);matrix(seatMesh,i,s,!isGA(s),1);paintSeat(s);continue;}
    const left=(1+9*q)*Math.exp(-9*q)*(1-q),size=1-.1*left,tick=1-(1-q)*(1-q)*(1-q),shown=!!seatRenderable[i]; /* left: what remains of the move, a critically damped spring's own curve */
    matrix(seatMesh,i,s,!isGA(s),size);matrix(checkMesh,i,s,context.workspace==='buyer'&&context.selected.has(id)&&shown,.68*(.6+.4*tick),.12);matrix(rings,i,s,context.focused.has(id),1.2+.22*left,.11);}
   if(pops.size)invalidate();}
  attributeWriter.flush();
 // Preserve the initial GPU upload; afterward opaque covers can occlude whole seat batches.
 seatLayerOccluded=deferSeats&&seatLayerReady&&!!art?.coversSeats();
 for(const mesh of seatMeshes)mesh.visible=seatDataReady&&!seatLayerOccluded&&(mesh!==hoverHalos||!!hoveredSeat);
 renderer.render(scene,camera);const seatsJustUploaded=seatDataReady&&!seatLayerReady;if(seatsJustUploaded)seatLayerReady=true;frames++;if(diagnosticSamples){diagnosticSamples[diagnosticFrameIndex++%diagnosticSamples.length]={time:performance.now(),gapMs:previousFrame&&now-previousFrame<1000?now-previousFrame:0,frameWorkMs:performance.now()-frameStarted};}const key=current.join('/')+'/'+theta;if(key!==lastKey){lastKey=key;onCameraChange?.();}return !!minimapTarget||!!tween||!!artAnimating||seatsJustUploaded||(seatBuildStarted&&!seatLayerReady);}
 resize();if(!deferSeats){for(let i=0;i<seats.length;i++)initializeSeat(i);seatBuildIndex=seats.length;}
 return {
  setActive(value){active=value;badgeLayer.style.visibility=value?'':'hidden';minimapTarget=null;overlay.style.display=value?'':'none';art?.setVisible(value);pointers.clear();pendingHover=null;hoveredSeat=null;hoveredSection=null;lastKey='';if(value){resize();invalidate();}},render,resize,sectionView,zoomBy,hit,
  captureView:()=>({values:[...current],view,sectionId,theta}),
  /* slide the map up or down the screen by a number of pixels, as one glide; it is not reported as camera travel, so cards on top stay put while it runs */ shift(dy,duration=380){const base=tween?.to||current;move([base[0],base[1]+dy*base[3]/height,base[2],base[3]],true,duration);if(tween)tween.quiet=true;},
   restoreView(saved){view=saved.view;sectionId=saved.sectionId;flyTo(saved.values,saved.theta||0,450);},
  reset(){view='overview';sectionId=null;flyTo(home,homeTheta,theta!==homeTheta?720:540);},
  setContext(next){if(!seatDataReady)seatBuildIndex=0;if(context.workspace!==next.workspace||context.scope!==next.scope){hoveredSeat=null;hoveredSection=null;}const hadSelected=context.selected,hadFocused=context.focused;context={...context,...next,selected:new Set(next.selected),focused:new Set(next.focused),locked:new Set(next.locked),disabled:new Set(next.disabled||[])};
   /* a seat that has just been picked, chosen or let go gets a moment of movement (see the render loop) */
   if(seatDataReady&&context.workspace==='buyer'){const at=performance.now();for(const id of context.focused)if(!hadFocused.has(id)&&index.has(id))pops.set(id,{at,dir:1});for(const id of context.selected)if(!hadSelected.has(id)&&index.has(id))pops.set(id,{at,dir:1});if(pops.size)invalidate();}updateGA(next.allocated);updateAvailability(next.sectionAvailability||{});tierCovers();pairLinks.visible=context.workspace==='buyer'&&defaultPairCount>0;updateLinks();},
  colorSeats,colorSections,setGroupedSeats(units){groups=units||[];updatePairLinks();updateLinks();},setActiveSeat(){},setHoverEnabled(value){hoverEnabled=value;if(!value)hover(null);},
  // Show exactly this much of the map, centred here, at the current turn, with no easing and no zoom limit: the 3D flight drives the 2D map with this while the two are cross-fading.
  follow(mapX,mapY,mapWidth){const [sx,sz]=spin((mapX-cx)*scale,(mapY-cy)*scale,-theta),w=mapWidth*scale,h=w*height/width;if(![sx,sz,w,h].every(Number.isFinite)||w<=0)return;current=[sx-w/2,sz-h/2,w,h];tween=null;minimapTarget=null;setCamera();invalidate();},
  setTheme(dark){const d=MAP_ALWAYS_DARK||!!dark;themeCovers(d);themeSeats(d);tierKey='';tierCovers();colorSeats(paint);invalidate();},
  panScreen(dx,dy){move([current[0]-dx*current[2]/width,current[1]-dy*current[3]/height,...current.slice(2)],true);},
  panToMap(x,y,animate=true){const at=world(x,y),[tx,tz]=spin(at.x,at.z,-theta),p={x:tx,z:tz},target=[p.x-current[2]/2,p.z-current[3]/2,...current.slice(2)];if(!animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches){if(!minimapTarget)minimapFrame=performance.now();minimapTarget=target;tween=null;invalidate();}else move(target,animate);},
  mapView:()=>{const [mx,mz]=spin((minimapTarget?.[0]??current[0])+current[2]/2,(minimapTarget?.[1]??current[1])+current[3]/2,theta);return {x:cx+mx/scale,y:cy+mz/scale,rotation:theta,ratio:current[2]/home[2],width:current[2]/scale,height:current[3]/scale,view,sectionId};},
  projectSeat(id){syncCamera();const s=map.seatById.get(id);if(!s||(map.sectionById.get(s.sectionId)?.killed||map.sectionById.get(s.sectionId)?.convertedGA))return null;const p=world(s.x,s.y).project(camera),b=canvas.getBoundingClientRect();const x=b.left+(p.x+1)*b.width/2,y=b.top+(1-p.y)*b.height/2,radius=Math.max(s.w,s.h)*scale/current[2]*b.width/2;return {x,y,radius,inViewport:x+radius>=b.left&&x-radius<=b.right&&y+radius>=b.top&&y-radius<=b.bottom};},
  diagnostics:()=>{if(!diagnosticSamples)return null;const now=performance.now(),samples=diagnosticSamples.filter(sample=>sample&&now-sample.time<=5000),percentile=values=>{if(!values.length)return 0;const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.min(sorted.length-1,Math.floor((sorted.length-1)*.95))];},gaps=samples.map(sample=>sample.gapMs).filter(value=>value>0),work=samples.map(sample=>sample.frameWorkMs),avg=values=>values.length?values.reduce((sum,value)=>sum+value,0)/values.length:0;return {windowSeconds:5,sampleCount:samples.length,fps:gaps.length?1000/avg(gaps):0,frameGapMs:{p95:percentile(gaps),max:Math.max(0,...gaps),over50:gaps.filter(value=>value>50).length,over100:gaps.filter(value=>value>100).length},frameWorkMs:{avg:avg(work),p95:percentile(work),max:Math.max(0,...work)},drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,canvas:{width:canvas.width,height:canvas.height,cssWidth:canvas.clientWidth,cssHeight:canvas.clientHeight,pixelRatio:renderer.getPixelRatio()},contextLost:diagnosticContext.isContextLost(),lastContextEvent:lastDiagnosticContextEvent,view,sectionId};},
  state:()=>({renderMode:'2d',sectionLabelStyle:'blue-badges',projection:'orthographic',rotationLocked:false,rotation:theta,view,sectionId,camera:camera.position.toArray(),target:[camera.position.x,0,camera.position.z],cameraMotion:tween&&!tween.quiet?{kind:'flat'}:null,seatInteraction:canPickSeats(),seatLayerReady,seatLayerOccluded,seatLayerDeferred:deferSeats,preparedSeatCount:seatBuildIndex,seatInstances:seats.length,seatSymbolScale:1,seatHoverHaloFilled:true,seatHoverRingScale:1.5,seatHoverRingOpacity:.25,defaultPairCount,dynamicSectionLabels:labels.filter(l=>l.dynamic).map(l=>({id:l.id,component:l.component,name:map.sectionById.get(l.id).name,visible:l.sprite.visible,placement:l.sprite.userData.labelPlacement,badgePixels:l.sprite.userData.badgePixels,bounds:l.sprite.userData.badgeBounds})),rowLabelCount:rowSprites.length,rowLabelsVisible:rowGroup.visible&&rowSprites.length>0,frames,drawCalls:renderer.info.render.calls,bufferPixels:canvas.width*canvas.height,...art?.state(),selectedSectionId:context.sectionId||null,hoveredSeatId:hoveredSeat,hoveredSection}),
  destroy(){disposed=true;abort.abort();if(diagnosticSamples){canvas.removeEventListener('webglcontextlost',onContextLost);canvas.removeEventListener('webglcontextrestored',onContextRestored);}overlay.remove();underlay.remove();badgeResizeObserver.disconnect();badgeLayer.remove();art?.destroy();scene.traverse(o=>{o.geometry?.dispose();for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[])m.dispose();});for(const t of ownedTextures)t.dispose();}
 };
}
