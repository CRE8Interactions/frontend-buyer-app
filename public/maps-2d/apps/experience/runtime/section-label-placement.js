import {insidePolygon} from './geometry-2d.js';

// Boundary contact counts as overlap, including a hole completely inside the box.
function segmentTouchesBox(a,b,box){
 let lo=0,hi=1;
 for(let axis=0;axis<2;axis++){
  const delta=b[axis]-a[axis],min=axis?box.top:box.left,max=axis?box.bottom:box.right;
  if(Math.abs(delta)<1e-12){if(a[axis]<min||a[axis]>max)return false;continue;}
  let start=(min-a[axis])/delta,end=(max-a[axis])/delta;if(start>end)[start,end]=[end,start];
  lo=Math.max(lo,start);hi=Math.min(hi,end);if(lo>hi)return false;
 }
 return true;
}
export function labelRectangleFits(polygon,{x,y,width,height},padding=0){
 if(!(width>0&&height>0)||padding<0||![x,y,width,height,padding].every(Number.isFinite))return false;
 const box={left:x-width/2-padding,right:x+width/2+padding,top:y-height/2-padding,bottom:y+height/2+padding},rings=[polygon.outer,...(polygon.holes||[])];
 if(!polygon.outer?.length)return false;
 for(const point of [[box.left,box.top],[box.right,box.top],[box.right,box.bottom],[box.left,box.bottom]])if(!insidePolygon(point,polygon.outer)||polygon.holes?.some(hole=>insidePolygon(point,hole)))return false;
 for(const ring of rings)for(let i=0;i<ring.length;i++)if(segmentTouchesBox(ring[i],ring[(i+1)%ring.length],box))return false;
 return true;
}

/** Fit a fixed-aspect label wholly inside one component, preserving edge clearance. */
export function fitSectionLabel(polygons,{aspect,maxWidth,anchor,padding}){
 if(!(aspect>0&&maxWidth>0)||!Number.isFinite(aspect)||!Number.isFinite(maxWidth)||!Number.isFinite(padding)||padding<0)return null;
 const rect=(x,y,width)=>({x,y,width,height:width/aspect,padding});
 if(anchor)for(const polygon of polygons){const candidate=rect(anchor[0],anchor[1],maxWidth);if(labelRectangleFits(polygon,candidate,padding))return candidate;}
 let best=null,bestDistance=Infinity;
 for(const polygon of polygons){
  if(polygon.outer.length<3)continue;
  const xs=polygon.outer.map(p=>p[0]),ys=polygon.outer.map(p=>p[1]),left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys),limit=Math.min(maxWidth,right-left-2*padding,(bottom-top-2*padding)*aspect);
  if(limit<=0)continue;
  const candidates=anchor?[[...anchor]]:[];candidates.push([(left+right)/2,(top+bottom)/2]);
  for(let row=0;row<16;row++)for(let column=0;column<16;column++)candidates.push([left+(column+.5)*(right-left)/16,top+(row+.5)*(bottom-top)/16]);
  for(const [x,y] of candidates){
   if(best&& !labelRectangleFits(polygon,rect(x,y,best.width),padding))continue;
   let lo=0,hi=limit;for(let i=0;i<14;i++){const width=(lo+hi)/2;if(labelRectangleFits(polygon,rect(x,y,width),padding))lo=width;else hi=width;}
   if(lo<=1e-6)continue;
   const distance=anchor?Math.hypot(x-anchor[0],y-anchor[1]):0;
   if(!best||lo>best.width+1e-5||Math.abs(lo-best.width)<=1e-5&&distance<bestDistance){best=rect(x,y,lo);bestDistance=distance;}
  }
 }
 return best;
}
