import * as THREE from 'three';
import {createFlatWebGL} from './flat-webgl.js';
import {createPlayerTextures} from './player-textures.js';
import {createRenderScheduler} from './render-scheduler.js';
import {icons} from './icons.js';

// A single orthographic WebGL scene. No perspective renderer or background build.
export async function createMapPlayer(host,map,presentation,onPick,onHover,canInteractSeat,getSeatUnit,onCameraChange,options={}) {
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 host.append(renderer.domElement);
 const markers=createPlayerTextures({THREE,icons,document});
 let flat,scheduler,observer,disposed=false;
 const destroy=()=>{if(disposed)return;disposed=true;observer?.disconnect();scheduler?.destroy();flat?.destroy();markers.dispose();renderer.dispose();renderer.domElement.remove();options.signal?.removeEventListener('abort',destroy);document.removeEventListener('visibilitychange',visibility);};
 const visibility=()=>{if(!document.hidden)scheduler?.invalidate();};
 try {
 const b=map.bounds,focus=presentation.focus||{cx:(b.x+b.right)/2,cy:(b.y+b.bottom)/2,width:(b.right-b.x)*.57,height:(b.bottom-b.y)*.36};
 flat=await createFlatWebGL({renderer,map,presentation:{...presentation,focus},artwork:options.artwork,artworkCacheKey:options.artworkCacheKey,viewport:{width:host.clientWidth,height:host.clientHeight,dpr:renderer.getPixelRatio()},scale:90/Math.max(b.right-b.x,b.bottom-b.y,1),cx:focus.cx,cy:focus.cy,textures:markers,invalidate:()=>scheduler?.invalidate(),onPick,onHover,canInteractSeat,getSeatUnit,onCameraChange,diagnosticsEnabled:options.diagnostics===true});
 if(options.signal?.aborted)throw new DOMException('Map load cancelled','AbortError');
 scheduler=createRenderScheduler(time=>flat.render(time));
 const resize=()=>{renderer.setSize(host.clientWidth,host.clientHeight);flat.resize();scheduler.invalidate();};
 observer=new ResizeObserver(resize);observer.observe(host);resize();
 document.addEventListener('visibilitychange',visibility);options.signal?.addEventListener('abort',destroy,{once:true});
 return {...flat,setFlatContext:value=>flat.setContext(value),setFlatMode:async()=>{},setActive(value){flat.setActive(value);scheduler.setActive(value);},resize,navigationState:flat.state,performanceState:()=>({renderMode:'2d'}),destroy};
 }catch(error){destroy();throw error;}
}
