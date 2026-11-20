import {cameraEase} from './camera-motion.js';
// One camera transform for wheel anchors, section fitting and minimap navigation.
export function createFlatNavigation(svg,{onChange=()=>{},seatSize=8,diagnostics=false}={}){
 const b=svg.viewBox.baseVal,art=[b.x,b.y,b.width,b.height];let current=[...art],target=[...art],raf=0,last=0,anchor=null,disposed=false,homeMode=true,buttonTween=null,lastDiagnosticFrame=0,diagnosticIndex=0;
 const diagnosticSamples=diagnostics?new Array(600):null;
 function recordDiagnosticFrame(now,started){if(!diagnosticSamples)return;const previous=lastDiagnosticFrame;lastDiagnosticFrame=now;diagnosticSamples[diagnosticIndex++%diagnosticSamples.length]={time:performance.now(),gapMs:previous&&now-previous<1000?now-previous:0,frameWorkMs:performance.now()-started};}
 const aspect=()=>{const w=svg.clientWidth,h=svg.clientHeight;return w>0&&h>0?w/h:art[2]/art[3];};
 const overview=()=>{const a=aspect(),w=Math.max(art[2],art[3]*a)*1.2;return [art[0]+art[2]/2-w/2,art[1]+art[3]/2-w/a/2,w,w/a];};
 // Permit close seat inspection (about 100% detail) without allowing an
 // unbounded zoom into a single glyph or seat marker.
 const limit=v=>{const a=aspect(),home=overview(),w=Math.max(seatSize*4,Math.min(home[2],v[2]));return [v[0],v[1],w,w/a];};
 // Keep section covers and identifiers through the first half of zooming so the
 // map stays visually anchored; seat detail takes over only after a deeper zoom.
 function draw(v){current=v;svg.setAttribute('viewBox',v.join(' '));svg.dataset.zoomed=String(v[2]<overview()[2]*.5);onChange(v);}
 function frame(now){raf=0;if(disposed)return;const started=diagnosticSamples?performance.now():0,k=1-Math.exp(-Math.min(40,now-last||16)/85);last=now;const t=buttonTween?Math.min(1,(now-buttonTween.start)/(buttonTween.duration||420)):null,e=t===null?null:cameraEase(t),next=buttonTween?buttonTween.from.map((x,i)=>x+(target[i]-x)*e):current.map((x,i)=>x+(target[i]-x)*k);if(anchor){next[0]=anchor.x-anchor.u*next[2];next[1]=anchor.y-anchor.v*next[3];}if(next.every((x,i)=>Math.abs(x-target[i])<.005)){draw(target);anchor=null;buttonTween=null;recordDiagnosticFrame(now,started);return;}draw(next);raf=requestAnimationFrame(frame);recordDiagnosticFrame(now,started);}
 function set(v,immediate=false){buttonTween=null;homeMode=false;anchor=null;target=limit(v);if(immediate){cancelAnimationFrame(raf);raf=0;draw(target);}else if(!raf){last=performance.now();raf=requestAnimationFrame(frame);}}
 function zoom(factor,clientX,clientY){const m=svg.getScreenCTM(),p=clientX===undefined||!m?new DOMPoint(current[0]+current[2]/2,current[1]+current[3]/2):new DOMPoint(clientX,clientY).matrixTransform(m.inverse()),u=(p.x-current[0])/current[2],v=(p.y-current[1])/current[3],x=p.x,y=p.y,w=limit([0,0,target[2]*factor,0])[2],h=w/aspect();set([x-u*w,y-v*h,w,h]);anchor={x,y,u,v};}

 const abort=new AbortController(),signal=abort.signal;svg.addEventListener('wheel',e=>{e.preventDefault();zoom(Math.exp(Math.max(-600,Math.min(600,e.deltaY*(e.deltaMode===1?16:1)))*.0013),e.clientX,e.clientY);},{passive:false,signal});
 const pointers=new Map();let dragged=false,origin=null;
 const local=e=>{const r=svg.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};};
 const gesture=v=>{buttonTween=null;homeMode=false;anchor=null;target=limit(v);current=target;if(!raf)raf=requestAnimationFrame(now=>{const started=diagnosticSamples?performance.now():0;raf=0;draw(current);recordDiagnosticFrame(now,started);});};
 svg.addEventListener('pointerdown',e=>{
  if(e.button!==0)return;
  if(!pointers.size){dragged=false;origin=local(e);cancelAnimationFrame(raf);raf=0;target=[...current];buttonTween=null;anchor=null;}
  pointers.set(e.pointerId,local(e));
  if(pointers.size>1){dragged=true;for(const id of pointers.keys())svg.setPointerCapture(id);}
 },{signal});
 svg.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId))return;
  const before=[...pointers.values()],previous=pointers.get(e.pointerId),point=local(e);pointers.set(e.pointerId,point);
  const r=svg.getBoundingClientRect();
  if(pointers.size===2){
   const next=pinchView(current,before,[...pointers.values()],r.width,r.height,seatSize*4,overview()[2]);gesture(next);dragged=true;
  }else if(pointers.size===1){
   if(!dragged&&Math.hypot(point.x-origin.x,point.y-origin.y)<=4)return;
   const from=dragged?previous:origin;dragged=true;svg.setPointerCapture(e.pointerId);
   gesture([current[0]-(point.x-from.x)*current[2]/r.width,current[1]-(point.y-from.y)*current[3]/r.height,...current.slice(2)]);
  }
 },{signal});
 const finish=e=>{if(!pointers.has(e.pointerId))return;pointers.delete(e.pointerId);if(svg.hasPointerCapture(e.pointerId))svg.releasePointerCapture(e.pointerId);origin=pointers.size?[...pointers.values()][0]:null;};
 svg.addEventListener('pointerup',finish,{signal});
 svg.addEventListener('pointercancel',e=>{dragged=true;finish(e);},{signal});
 svg.addEventListener('lostpointercapture',finish,{signal});
 window.addEventListener('blur',()=>{pointers.clear();origin=null;dragged=true;},{signal});
 svg.addEventListener('click',e=>{if(dragged){e.preventDefault();e.stopImmediatePropagation();dragged=false;}},{capture:true,signal});
 const observer=new ResizeObserver(()=>{if(svg.getBoundingClientRect().width){if(homeMode){set(overview(),true);homeMode=true;}else{const h=current[2]/aspect();set([current[0],current[1]+(current[3]-h)/2,current[2],h],true);}}});observer.observe(svg);
 set(overview(),true);homeMode=true;
 return {art,get:()=>[...current],set,zoom,zoomButton:factor=>{zoom(factor);buttonTween={from:[...current],start:performance.now()};},reset:()=>{set(overview());homeMode=true;},fit:box=>{const a=aspect(),w=Math.max(box.width,box.height*a)*1.12;set([box.x+box.width/2-w/2,box.y+box.height/2-w/a/2,w,w/a]);buttonTween={from:[...current],start:performance.now(),duration:750};},panPixels:(dx,dy)=>{const r=svg.getBoundingClientRect(),from=[...current];set([current[0]-dx*current[2]/r.width,current[1]-dy*current[3]/r.height,...current.slice(2)]);buttonTween={from,start:performance.now(),duration:760};},diagnostics(){if(!diagnosticSamples)return null;const now=performance.now(),samples=diagnosticSamples.filter(sample=>sample&&now-sample.time<=5000),percentile=values=>{if(!values.length)return 0;const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.min(sorted.length-1,Math.floor((sorted.length-1)*.95))];},gaps=samples.map(sample=>sample.gapMs).filter(value=>value>0),work=samples.map(sample=>sample.frameWorkMs),avg=values=>values.length?values.reduce((sum,value)=>sum+value,0)/values.length:0;return {rendererType:'svg',windowSeconds:5,sampleCount:samples.length,fps:gaps.length?1000/avg(gaps):0,frameGapMs:{p95:percentile(gaps),max:Math.max(0,...gaps),over50:gaps.filter(value=>value>50).length,over100:gaps.filter(value=>value>100).length},frameWorkMs:{avg:avg(work),p95:percentile(work),max:Math.max(0,...work)},dom:{seatElements:svg.querySelectorAll('[data-seat-id]').length,paths:svg.querySelectorAll('path').length,elements:svg.querySelectorAll('*').length,width:svg.clientWidth,height:svg.clientHeight,pixelRatio:devicePixelRatio},viewBox:svg.getAttribute('viewBox')};},destroy(){disposed=true;cancelAnimationFrame(raf);abort.abort();observer.disconnect();}};
}

/** Keep the world point beneath the pinch midpoint stable while both fingers move. */
export function pinchView(view,before,after,width,height,minWidth,maxWidth){
 const mid=points=>({x:(points[0].x+points[1].x)/2,y:(points[0].y+points[1].y)/2});
 const distance=points=>Math.hypot(points[1].x-points[0].x,points[1].y-points[0].y);
 const old=mid(before),next=mid(after),w=Math.max(minWidth,Math.min(maxWidth,view[2]*Math.max(1,distance(before))/Math.max(1,distance(after)))),h=w*height/width;
 return [view[0]+old.x*view[2]/width-next.x*w/width,view[1]+old.y*view[3]/height-next.y*h/height,w,h];
}
