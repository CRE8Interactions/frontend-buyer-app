import {sectionLevelsFromSVG} from './svg-levels.js';
import {normalizeMap} from './model.js';
import {prepareSVG,svgFromJSON,presentationFromSVG} from './svg.js?v=bench-tread-slope-8-20260923';
import {visualRevisionKey} from './visual-cache.js';
import {readPublishedPresentation} from './published-presentation.js';
// At most two imported revisions; never share mutable inventory or scene objects.
const revisions=[];
async function normalize(text) {
  if(typeof Worker==='undefined')return normalizeMap(JSON.parse(text));
  return new Promise((resolve,reject)=>{
    let worker;
    try { worker=new Worker(new URL('./map-data-worker.js',import.meta.url),{type:'module'}); }
    catch { resolve(normalizeMap(JSON.parse(text)));return; }
    worker.onmessage=({data})=>{worker.terminate();data.error?reject(Error(data.error)):resolve(data.map);};
    worker.onerror=()=>{worker.terminate();reject(Error('Could not read map data.'));};
    worker.postMessage(text);
  });
}
export async function prepareMapRevision(json,svg,{seatSource='auto'}={}) {
  if(!['auto','svg','json'].includes(seatSource))throw Error('svgSeatSource must be auto, svg or json.');
  if(seatSource==='svg'&&!svg)throw Error('svgSeatSource: svg requires SVG artwork with seat shapes.');
  let cached=revisions.find(entry=>entry.json===json&&entry.svg===svg&&entry.seatSource===seatSource);
  if(!cached){
    const map=await normalize(json);let published=null;
    try{if(seatSource==='auto')published=await readPublishedPresentation(map,svg);}catch{/* Invalid derived data uses the legacy import path. */}
    const info=published?.info||prepareSVG(svg||svgFromJSON(map),map,{seatSource:!svg&&seatSource==='auto'?'json':seatSource});
    const presentation={...(published?.presentation||presentationFromSVG(info.root)),sectionLevels:sectionLevelsFromSVG(info.root)};
    cached={json,svg,seatSource,map,info,presentation,preparationSource:published?'published':'runtime-svg',visualRevision:visualRevisionKey(json,svg)+'-'+seatSource};revisions.push(cached);if(revisions.length>2)revisions.shift();
  }
  return {map:structuredClone(cached.map),info:{...cached.info,root:cached.info.root.cloneNode(true)},presentation:structuredClone(cached.presentation),preparationSource:cached.preparationSource,visualRevision:cached.visualRevision};
}
