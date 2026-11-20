import {normalizeMap} from './model.js';
import {prepareSVG,presentationFromSVG,readSVGArtwork,svgFromJSON} from './svg.js';

const VERSION=1;
const digest=async text=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(byte=>byte.toString(16).padStart(2,'0')).join('');
// Derived caches must not invalidate each other or become part of their own key.
const source=({preparedVenue,preparedPresentation,elevationModel,...raw})=>raw;

// Run where SVG layout is available: Studio export/preview. The normalized SVG
// remains the artwork asset; JSON holds only the presentation and small deltas.
export async function preparePublishedPresentation(raw,svg){
 const map=normalizeMap(raw),before=new Map(map.seats.map(s=>[s.id,[!!s.da,!!s.accessible]]));
 const info=prepareSVG(svg||svgFromJSON(map),map),presentation=presentationFromSVG(info.root);
 const artwork=new XMLSerializer().serializeToString(info.root);
 const data=JSON.parse(JSON.stringify({presentation,uuidMatches:info.uuidMatches,classMatches:info.classMatches,
  seatFlags:map.seats.filter(s=>before.get(s.id)[0]!==!!s.da||before.get(s.id)[1]!==!!s.accessible).map(s=>[s.id,!!s.da,!!s.accessible]),
  sectionStrokes:map.sections.filter(s=>s.boundaryStroke).map(s=>[s.id,s.boundaryStroke.width])}));
 const [sourceKey,artworkKey,dataKey]=await Promise.all([digest(JSON.stringify(source(raw))),digest(artwork),digest(JSON.stringify(data))]);
 return {svg:artwork,preparedPresentation:{version:VERSION,sourceKey,artworkKey,dataKey,data}};
}

export async function readPublishedPresentation(map,svg){
 const packed=map.raw?.preparedPresentation;
 if(packed?.version!==VERSION||typeof svg!=='string'||!packed.data)return null;
 const [sourceKey,artworkKey,dataKey]=await Promise.all([digest(JSON.stringify(source(map.raw))),digest(svg),digest(JSON.stringify(packed.data))]);
 if(sourceKey!==packed.sourceKey||artworkKey!==packed.artworkKey||dataKey!==packed.dataKey)return null;
 const {presentation,seatFlags,sectionStrokes,uuidMatches,classMatches}=packed.data;
 if(!presentation||typeof presentation!=='object'||!Array.isArray(seatFlags)||!Array.isArray(sectionStrokes)||!Number.isSafeInteger(uuidMatches)||!Number.isSafeInteger(classMatches))return null;
 if(seatFlags.some(([id,da,accessible])=>!map.seatById.has(id)||typeof da!=='boolean'||typeof accessible!=='boolean')||sectionStrokes.some(([id,width])=>!map.sectionById.has(id)||!Number.isFinite(width)||width<=0))return null;
 // Still sanitize artwork at the boundary. No geometry/layout APIs are used.
 const root=readSVGArtwork(svg);
 for(const [id,da,accessible]of seatFlags)Object.assign(map.seatById.get(id),{da,accessible});
 for(const [id,width]of sectionStrokes)map.sectionById.get(id).boundaryStroke={width};
 return {info:{root,uuidMatches,classMatches},presentation:structuredClone(presentation)};
}
