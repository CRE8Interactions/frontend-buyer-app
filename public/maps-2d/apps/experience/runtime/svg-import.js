import {createVenueMap, newId, isUUID, validateVenueMap} from './venue-state.js';
const NS='http://www.w3.org/2000/svg';
const tokens=e=>(e.getAttribute('class')||'').split(/\s+/);
const role=(e,value)=>e.getAttribute('data-role')===value;
const sectionName=e=>e.getAttribute('data-section')||tokens(e).find(t=>/^sec-.+/.test(t)&&!t.includes('-row-'))?.slice(4)||e.id||'';
const seatLabel=e=>tokens(e).map(t=>t.match(/^sec-(.+)-row-(.+)-seat-(\d+)$/)).find(Boolean);
const pathString=p=>'M'+p.map(v=>`${v.x},${v.y}`).join(' L')+' Z';
const center=p=>({x:p.reduce((a,v)=>a+v.x,0)/p.length,y:p.reduce((a,v)=>a+v.y,0)/p.length});
const excluded=e=>!!e.closest('defs,clipPath,mask,pattern,marker,[data-role="label"],[data-role="decoration"],.identifier');

/** One-time v3 ingestion. Selectors/mappings resolve ambiguous authoring structures explicitly.
 * No elevation, capacity or deck suffixes are interpreted. Source SVG is never modified or persisted.
 * @param {string} text
 * @param {{name?:string,sectionSelector?:string,boundarySelectors?:Record<string,string>,seatSelector?:string,rowSelector?:string,landmarkSelector?:string,sampleSpacing?:number,millimetersPerUnit?:number}} options
 */
export function parseSVG(text,options={}) {
  const doc=new DOMParser().parseFromString(text,'image/svg+xml');
  if(doc.querySelector('parsererror')||doc.documentElement.localName!=='svg')throw Error('Invalid SVG document.');
  if(doc.doctype)throw Error('SVG document types and entities are unsupported.');
  // Allow geometry only in the temporary measurement DOM. No scripts, resources or CSS execute.
  const allowed=new Set(['svg','g','path','polygon','polyline','rect','circle','ellipse','line','text','tspan','title','desc','defs','clipPath','mask']);
  for(const e of [...doc.querySelectorAll('*')]){
    if(!allowed.has(e.localName)){e.remove();continue;}
    for(const a of [...e.attributes])if(/^on/i.test(a.name)||['style','href','src','filter','clip-path','mask'].includes(a.localName)||/url\(/i.test(a.value))e.removeAttribute(a.name);
  }
  const svg=document.importNode(doc.documentElement,true);
  const mount=document.createElement('div');mount.style.cssText='position:fixed;left:-100000px;top:0;visibility:hidden;pointer-events:none';
  mount.append(svg);(document.body||document.documentElement).append(mount);
  const warnings=[];
  try {
    const map=createVenueMap(options.name||svg.getAttribute('aria-label')||'Imported venue');
    if(options.millimetersPerUnit!==undefined)map.coordinates.millimetersPerUnit=options.millimetersPerUnit;
    const rootCTM=svg.getScreenCTM();if(!rootCTM)throw Error('Cannot resolve SVG coordinate system.');
    const matrix=e=>{const m=e.getScreenCTM();if(!m)throw Error('Cannot resolve shape transform.');return rootCTM.inverse().multiply(m);};
    const absolute=(e,x,y)=>{const p=new DOMPoint(x,y).matrixTransform(matrix(e));return {x:p.x,y:p.y};};
    const spacing=options.sampleSpacing??2;
    if(!Number.isFinite(spacing)||spacing<=0)throw Error('sampleSpacing must be positive.');
    const boundary=e=>{
      if(e.localName==='polygon'){
        return [Array.from({length:e.points.numberOfItems},(_,i)=>{const p=e.points.getItem(i);return absolute(e,p.x,p.y);})];
      }
      if(e.localName==='rect'){
        const b=e.getBBox();return [[[b.x,b.y],[b.x+b.width,b.y],[b.x+b.width,b.y+b.height],[b.x,b.y+b.height]].map(([x,y])=>absolute(e,x,y))];
      }
      if(e.localName!=='path')throw Error('Boundary must be a path, polygon or rectangle.');
      const d=(e.getAttribute('d')||'').trim();
      const parts=d.split(/(?=[Mm])/).filter(Boolean);
      if(!parts.length || !/^[Mm]/.test(d))throw Error('Boundary needs a MoveTo command.');
      const number='[+-]?(?:\\d*\\.\\d+|\\d+\\.?\\d*)(?:[eE][+-]?\\d+)?';
      const move=new RegExp(`^([Mm])\\s*(${number})[\\s,]*(${number})`);
      let current={x:0,y:0};
      return parts.map(part=>{
        const match=part.match(move);
        if(!match || !/[zZ]\s*$/.test(part) || (part.match(/[zZ]/g)||[]).length!==1)throw Error('Each boundary sub-path must be a closed polygon.');
        const relative=match[1]==='m';
        const x=Number(match[2])+(relative?current.x:0),y=Number(match[3])+(relative?current.y:0);
        let rest=part.slice(match[0].length).trim().replace(/^,\s*/, '');
        // Additional pairs after moveto are implicit lines in the original command's coordinate mode.
        if(/^[+\-.\d]/.test(rest))rest=(relative?'l':'L')+rest;
        const path=document.createElementNS(NS,'path');path.setAttribute('d',`M${x},${y} ${rest}`);
        const length=path.getTotalLength(),m=matrix(e),scale=Math.max(Math.hypot(m.a,m.b),Math.hypot(m.c,m.d));
        const count=Math.max(16,Math.ceil(length*scale/spacing));
        if(!Number.isFinite(length)||length<=0||count>100000)throw Error('Invalid boundary or sampling limit exceeded.');
        const ring=Array.from({length:count},(_,i)=>{const p=path.getPointAtLength(length*i/count);return absolute(e,p.x,p.y);});
        // ClosePath resets the SVG current point to this sub-path's start, not its final drawn vertex.
        current={x,y};
        return ring;
      });
    };
    const uuid=(e,attribute)=>{const value=e.getAttribute(attribute)||e.id;return value&&isUUID(value)?value:newId();};
    const groups=[...svg.querySelectorAll(options.sectionSelector||'g')].filter(e=>!excluded(e)&&(options.sectionSelector||role(e,'section')||e.hasAttribute('data-section')||tokens(e).some(t=>/^sec-.+/.test(t)&&!t.includes('-row-'))));
    if(!groups.length)throw Error('No section groups found. Supply sectionSelector for unlabeled boundary groups.');
    const groupSet=new Set(groups);
    const owner=e=>{for(let p=e.parentElement;p&&p!==svg;p=p.parentElement)if(groupSet.has(p))return p;return null;};
    const usedBoundaries=new Set();let legacySections=0,modernSections=0;
    for(const group of groups){
      const name=sectionName(group)||`Section ${Object.keys(map.sections).length+1}`;
      const owned=selector=>[...group.querySelectorAll(selector)].filter(e=>!excluded(e)&&owner(e)===group);
      let candidates;
      const selector=options.boundarySelectors?.[name];
      if(selector)candidates=[...svg.querySelectorAll(selector)];
      else {
        candidates=[...group.querySelectorAll('[data-role="boundary"],path.overlay,polygon.overlay')].filter(e=>owner(e)===group&&!e.closest('defs,clipPath,mask'));
        if(!candidates.length)candidates=owned('polygon,path').filter(e=>!seatLabel(e)&&!e.closest('[data-role="row"],[data-row]')&&!tokens(e).some(t=>t.includes('-row-'))&&!e.closest('[data-role="identifier"]'));
        // Legacy exports keep the named polygon in base, apart from the section's seat group.
        if(!candidates.length)candidates=[...svg.querySelectorAll('path,polygon')].filter(e=>!excluded(e)&&!owner(e)&&tokens(e).includes(name));
      }
      if(candidates.length!==1)throw Error(`Section ${name}: expected one boundary, found ${candidates.length}. Supply boundarySelectors.`);
      const shape=candidates[0];if(usedBoundaries.has(shape))throw Error(`Section ${name}: boundary is already assigned.`);usedBoundaries.add(shape);
      let ring;try{ring=boundary(shape);}catch(error){throw Error(`Section ${name}: ${error.message}`);}
      const id=uuid(group,'data-section-id');
      const section={id,name,type:'reserved',boundary:ring,pathString:ring.map(pathString).join(' '),identifier:{text:name,path:'',center:center(ring.flat())},spatial3D:{tierIndex:0,baseElevation:0,seatingSlope:0,rowPitch:0,rowRiser:0,skirtingBase:0},reservedConfig:{layoutType:'linear_grid',seatSpacing:500,rowStagger:false,numberingRule:'ltr'},rows:{}};
      const labelNode=owned('text,[data-role="identifier"]').find(e=>e.localName==='text');
      if(labelNode){const b=labelNode.getBBox();section.identifier={text:labelNode.textContent.trim()||name,path:'',center:absolute(labelNode,b.x+b.width/2,b.y+b.height/2)};}
      if(map.sections[id])throw Error('Duplicate section UUID.');map.sections[id]=section;
      const shapes=owned(options.seatSelector||'rect,circle').filter(e=>e!==shape&&!role(e,'boundary'));
      const explicit=shapes.filter(e=>e.hasAttribute('data-seat-id')||role(e,'seat')||seatLabel(e));
      let seats=options.seatSelector?shapes:explicit.length?explicit:shapes;
      if(!explicit.length&&!options.seatSelector&&seats.length){
        // Uniform rect/circle shapes can represent anonymous legacy inventory. Mixed decoration is ambiguous.
        const dimensions=seats.map(e=>{const b=e.getBBox();return `${e.localName}:${b.width.toFixed(3)}:${b.height.toFixed(3)}`;});
        if(new Set(dimensions).size>1)throw Error(`Section ${name}: mixed anonymous shapes. Supply seatSelector to identify seats.`);
        warnings.push(`Section ${name}: uniform anonymous shapes imported as pinned seats; labels follow document order.`);
      }
      if(explicit.length&&explicit.length!==shapes.length)warnings.push(`Section ${name}: ignored ${shapes.length-explicit.length} unmarked decorative shapes.`);
      const rows=new Map();
      for(const e of seats){
        const label=seatLabel(e);let rowElement=e.parentElement;
        while(rowElement&&rowElement!==group&&!(options.rowSelector?rowElement.matches(options.rowSelector):role(rowElement,'row')||rowElement.hasAttribute('data-row')||tokens(rowElement).some(t=>/^sec-.+-row-.+$/.test(t))))rowElement=rowElement.parentElement;
        const rowName=rowElement&&rowElement!==group?(rowElement.getAttribute('data-row')||tokens(rowElement).find(t=>/^sec-.+-row-.+$/.test(t))?.split('-row-')[1]||rowElement.id||String(rows.size+1)):label?.[2]||'1';
        if(!rows.has(rowName)){
          const rowId=rowElement&&rowElement!==group?uuid(rowElement,'data-row-id'):newId();
          const row={id:rowId,sectionId:id,rowNumber:rowName,rowIndex:rows.size,seats:[]};rows.set(rowName,row);section.rows[rowId]=row;
        }
        const row=rows.get(rowName),b=e.getBBox(),p=absolute(e,b.x+b.width/2,b.y+b.height/2);
        if(b.width<=0||b.height<=0)throw Error(`Section ${name}: seat has no area.`);
        const number=Number(e.getAttribute('data-seat-number')||label?.[3]||row.seats.length+1);
        row.seats.push({id:uuid(e,'data-seat-id'),key:label?.[0]||`${name}/${rowName}/${number}`,row:row.id,number,x:p.x,y:p.y,z:0,status:'available',category:'',isPinned:true});
      }
      if(seats.length)legacySections++;else modernSections++;
    }
    for(const e of svg.querySelectorAll(options.landmarkSelector||'[data-role="landmark"]')){
      if(excluded(e)||usedBoundaries.has(e))continue;
      const shape=e.localName==='g'?e.querySelector('path,polygon,rect'):e;
      if(!shape)throw Error('Landmark needs a boundary.');
      const rings=boundary(shape);if(rings.length!==1)throw Error('Landmark schema supports one polygon.');const ring=rings[0];map.landmarks.push({id:uuid(e,'data-landmark-id'),name:e.getAttribute('aria-label')||e.id||'Landmark',boundary:ring,pathString:pathString(ring),center:center(ring)});
    }
    const vb=svg.viewBox.baseVal;
    if(vb.width>0&&vb.height>0)map.focalPoint={x:vb.x+vb.width/2,y:vb.y+vb.height/2};
    else {const points=Object.values(map.sections).flatMap(s=>s.boundary.flat());const bounds=points.reduce((b,p)=>({minX:Math.min(b.minX,p.x),maxX:Math.max(b.maxX,p.x),minY:Math.min(b.minY,p.y),maxY:Math.max(b.maxY,p.y)}),{minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity});map.focalPoint={x:(bounds.minX+bounds.maxX)/2,y:(bounds.minY+bounds.maxY)/2};}
    return {map:validateVenueMap(map),warnings,summary:{legacySections,modernSections}};
  } finally {mount.remove();}
}
