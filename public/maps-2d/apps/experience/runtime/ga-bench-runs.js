import Clipper from './vendor/clipper.js';
import {nearestPointOnLine} from './geometry-2d.js';
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const cross=(a,b)=>a[0]*b[1]-a[1]*b[0];
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1]];
const area=ring=>ring.reduce((sum,a,i)=>sum+cross(a,ring[(i+1)%ring.length]),0)/2;
const xy=p=>Array.isArray(p)?p:[p.x,p.y];

// Remove duplicate/collinear export samples only; deliberate facets remain facets.
export function cleanBenchEdge(points,closed=false){
 const result=[];
 for(const value of points){const p=xy(value);if(!result.length||dist(p,result.at(-1))>1e-10)result.push([...p]);}
 if(closed&&result.length>1&&dist(result[0],result.at(-1))<1e-10)result.pop();
 let changed=true;
 while(changed&&result.length>(closed?3:2)){
  changed=false;
  for(let i=closed?0:1;i<(closed?result.length:result.length-1);i++){
   const a=result[(i-1+result.length)%result.length],b=result[i],c=result[(i+1)%result.length],u=sub(b,a),v=sub(c,b);
   if(Math.abs(cross(u,v))<=1e-7*dist(a,b)*dist(b,c)&&u[0]*v[0]+u[1]*v[1]>=0){result.splice(i,1);changed=true;break;}
  }
 }
 return result;
}

// The reference selects a boundary chain only. Its geometry never shapes a row.
export function inferFieldEdge(polygons,reference){
 if(!reference?.length)return [];
 const ref=reference.length===1?[reference[0],reference[0]]:reference;
 let best=null;
 for(const polygon of polygons){
  const ring=cleanBenchEdge(polygon.outer,true),sign=Math.sign(area(ring))||1,n=ring.length;
  if(n<3)continue;
  const segments=ring.map((a,i)=>{const b=ring[(i+1)%n],v=sub(b,a),length=dist(a,b),mid=[(a[0]+b[0])/2,(a[1]+b[1])/2],near=nearestPointOnLine(mid,ref),toward=sub(near.point,mid);
   return {length,normal:[sign*v[1]/length,-sign*v[0]/length],facing:(sign*v[1]*toward[0]-sign*v[0]*toward[1])/(length*(Math.hypot(...toward)||1)),distance:near.distance};
  });
  const flags=segments.map(s=>s.facing>.55);
  // Split at pronounced corners but keep arcs and small authored facets together.
  const breaks=segments.map((s,i)=>{const prev=segments[(i-1+n)%n];return !flags[i]||!flags[(i-1+n)%n]||s.normal[0]*prev.normal[0]+s.normal[1]*prev.normal[1]<Math.cos(Math.PI/4);});
  for(let start=0;start<n;start++){
   if(!flags[start]||(!breaks[start]&&flags.some(f=>!f)))continue;
   const points=[ring[start]];let length=0,score=0;
   for(let k=0;k<n;k++){const i=(start+k)%n;if(!flags[i]||(k>0&&breaks[i]))break;points.push(ring[(i+1)%n]);length+=segments[i].length;score+=segments[i].length*segments[i].facing/(segments[i].distance+segments[i].length*.1+1e-10);}
   if(points.length>=2&&(!best||score>best.score))best={points,score,length};
  }
 }
 if(best)return best.points;
 // A focal point inside the section is ambiguous; choose the nearest edge as
 // an editable starting value rather than making the project impossible to open.
 let fallback=null;
 for(const polygon of polygons){const r=cleanBenchEdge(polygon.outer,true);for(let i=0;i<r.length;i++){const a=r[i],b=r[(i+1)%r.length],d=nearestPointOnLine([(a[0]+b[0])/2,(a[1]+b[1])/2],ref).distance;if(!fallback||d<fallback.distance)fallback={points:[a,b],distance:d};}}
 return fallback?.points||[];
}

function coordinates(polygons){
 const points=polygons.flatMap(p=>p.outer),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),x=Math.min(...xs),y=Math.min(...ys),extent=Math.max(Math.max(...xs)-x,Math.max(...ys)-y,1e-12),scale=1e7/extent;
 return {extent,to:p=>({X:Math.round((p[0]-x)*scale),Y:Math.round((p[1]-y)*scale)}),from:p=>[p.X/scale+x,p.Y/scale+y],scale};
}
function clips(polygons,to){
 return polygons.flatMap(p=>[p.outer,...(p.holes||[])].map(r=>r.map(to)));
}
function clipLines(paths,boundaries){
 const engine=new Clipper.Clipper(),tree=new Clipper.PolyTree();
 engine.AddPaths(paths,Clipper.PolyType.ptSubject,false);
 engine.AddPaths(boundaries,Clipper.PolyType.ptClip,true);
 engine.Execute(Clipper.ClipType.ctIntersection,tree,Clipper.PolyFillType.pftEvenOdd,Clipper.PolyFillType.pftEvenOdd);
 return Clipper.Clipper.OpenPathsFromPolyTree(tree);
}

// Select the opposite boundary, never synthesize it from a field/rink curve.
export function inferRearEdge(polygon,front){
 front=cleanBenchEdge(front);if(front.length<2)return [];
 const a=front[0],b=front.at(-1),mid=[(a[0]+b[0])/2,(a[1]+b[1])/2],v=sub(b,a),length=Math.hypot(...v);
 if(!length)return [];
 const center=polygon.outer.reduce((s,p)=>[s[0]+p[0]/polygon.outer.length,s[1]+p[1]/polygon.outer.length],[0,0]);
 let normal=[-v[1]/length,v[0]/length];if(normal[0]*(center[0]-mid[0])+normal[1]*(center[1]-mid[1])<0)normal=normal.map(n=>-n);
 const reach=coordinates([polygon]).extent*10;
 let rear=inferFieldEdge([polygon],[[mid[0]+normal[0]*reach,mid[1]+normal[1]*reach]]);
 if(rear.length>1&&dist(a,rear[0])+dist(b,rear.at(-1))>dist(a,rear.at(-1))+dist(b,rear[0]))rear=[...rear].reverse();
 return rear;
}

function parameterize(points){
 const lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths.at(-1)+dist(points[i-1],points[i]));
 const total=lengths.at(-1);return {knots:lengths.map(d=>d/total),at(t){let i=1;while(i<lengths.length-1&&lengths[i]/total<t)i++;const f=(t*total-lengths[i-1])/(lengths[i]-lengths[i-1]);return points[i].map((n,k)=>points[i-1][k]+(n-points[i-1][k])*f);}};
}

// Inset the actual footprint, including enlarging holes. Used for both plan
// clipping and solid tread clipping, so padding is not merely centerline spacing.
export function insetBenchPolygons(polygons,padding=0){
 if(!Number.isFinite(padding)||padding<0)throw Error('Bench edge padding must be non-negative.');
 if(!padding||!polygons.length)return polygons;
 const {to,from,scale}=coordinates(polygons),offset=new Clipper.ClipperOffset(4,.25),tree=new Clipper.PolyTree();
 for(const p of polygons)for(const [i,ring] of [p.outer,...(p.holes||[])].entries()){let path=ring.map(to);if(Clipper.Clipper.Orientation(path)!==(i===0))path.reverse();offset.AddPath(path,Clipper.JoinType.jtMiter,Clipper.EndType.etClosedPolygon);}
 offset.Execute(tree,-padding*scale);
 const result=[];function visit(node){for(const child of node.Childs()){if(!child.IsHole())result.push({outer:child.Contour().map(from),holes:child.Childs().filter(h=>h.IsHole()).map(h=>h.Contour().map(from))});visit(child);}}visit(tree);return result;
}

/**
 * Row centers start half a row depth behind the designated edge.
 * Keep the requested pitch and emit complete-depth rows only; leave the rear
 * remainder clear. Split every run at holes and concavities, retaining all pieces.
 * Miter joins preserve facets; Clipper unions offsets to eliminate crossed loops.
 * Endpoint tangents extend before clipping, allowing trapezoids to widen.
 */
export function generateBenchRuns(polygons,fieldReference,size,center=null,options={}){
 if(!polygons.length)return [];
 const rowDepth=options.rowDepth??size*2.45;
 if(!(rowDepth>0&&Number.isFinite(rowDepth)))throw Error('Bench row depth must be positive.');
 const runs=[];
 for(const polygon of polygons){
  const edge=cleanBenchEdge(options.fieldEdge?.length?options.fieldEdge:inferFieldEdge([polygon],fieldReference));
  if(edge.length<2)continue;
  const local=[polygon],coord=coordinates(local),{extent,to,from,scale}=coord;
  const extend=(a,b)=>{const l=dist(a,b);return [a[0]+(a[0]-b[0])/l*extent*4,a[1]+(a[1]-b[1])/l*extent*4];};
  const guide=[extend(edge[0],edge[1]),...edge,extend(edge.at(-1),edge.at(-2))];
  const depth=Math.max(...polygon.outer.map(p=>nearestPointOnLine(p,guide,false).distance));
  const padding=options.edgePadding??0,available=depth-2*padding;
  const requestedCount=options.rowCount;
  if(requestedCount!==undefined&&(!Number.isSafeInteger(requestedCount)||requestedCount<1||requestedCount>2000))throw Error('Row count must be between 1 and 2000.');
  const count=requestedCount??Math.max(0,Math.floor((available+extent*1e-8)/rowDepth));
  if(count>2000)throw Error('Bench row depth is too small for this section (more than 2000 rows).');
  if(requestedCount!==undefined&&available<=0)throw Error('Edge padding leaves no room for rows.');
  const spacing=requestedCount!==undefined?available/count:rowDepth;
  const offsetter=new Clipper.ClipperOffset(4,.25);offsetter.AddPath(guide.map(to),Clipper.JoinType.jtMiter,Clipper.EndType.etOpenButt);
  const padded=insetBenchPolygons(local,options.edgePadding??0),boundaries=clips(padded,to);
  if(!boundaries.length)continue;
  const rear=options.rowShape==='blend'?cleanBenchEdge(options.rearEdge?.length?options.rearEdge:inferRearEdge(polygon,edge)):[];
  let morph=null;
  if(rear.length>1){
   if(dist(edge[0],rear[0])+dist(edge.at(-1),rear.at(-1))>dist(edge[0],rear.at(-1))+dist(edge.at(-1),rear[0]))rear.reverse();
   const frontParam=parameterize(edge),rearParam=parameterize(rear),knots=[...new Set([...frontParam.knots,...rearParam.knots])].sort((a,b)=>a-b);
   morph=t=>knots.map(u=>{const a=frontParam.at(u),b=rearParam.at(u);return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];});
  }
  for(let row=0;row<count;row++){
   const offset=padding+(row+.5)*spacing,outline=[];
   if(!morph)offsetter.Execute(outline,offset*scale);
   // Treat the offset boundary as open chains; do not clip its filled area.
   const blended=morph?.(offset/depth);
   const paths=blended?[[extend(blended[0],blended[1]),...blended,extend(blended.at(-1),blended.at(-2))].map(to)]:outline.map(path=>[...path,path[0]]);
   for(const clipped of clipLines(paths,boundaries)){
    const run=cleanBenchEdge(clipped.map(from));if(run.length<2)continue;
    // Uniform extra samples allow the existing deck elevation to follow curves.
    const sampled=[run[0]];
    for(let i=1;i<run.length;i++){const a=run[i-1],b=run[i],steps=Math.max(2,Math.ceil(dist(a,b)/(spacing*.5)));for(let j=1;j<=steps;j++)sampled.push([a[0]+(b[0]-a[0])*j/steps,a[1]+(b[1]-a[1])*j/steps]);}
    sampled.rowIndex=row;sampled.offset=offset;runs.push(sampled);
   }
  }
 }
 return runs;
}

// Exact footprint clipping also keeps the physical tread out of holes/aisles.
export function benchFootprints(run,polygons,width){
 const {to,from,scale}=coordinates(polygons),offsetter=new Clipper.ClipperOffset(4,.25),out=[];
 offsetter.AddPath(cleanBenchEdge(run).map(to),Clipper.JoinType.jtMiter,Clipper.EndType.etOpenButt);offsetter.Execute(out,width*scale/2);
 const engine=new Clipper.Clipper(),tree=new Clipper.PolyTree();
 engine.AddPaths(out,Clipper.PolyType.ptSubject,true);engine.AddPaths(clips(polygons,to),Clipper.PolyType.ptClip,true);
 engine.Execute(Clipper.ClipType.ctIntersection,tree,Clipper.PolyFillType.pftNonZero,Clipper.PolyFillType.pftEvenOdd);
 const result=[];function visit(node){for(const child of node.Childs()){if(!child.IsHole())result.push({outer:child.Contour().map(from),holes:child.Childs().filter(h=>h.IsHole()).map(h=>h.Contour().map(from))});visit(child);}}visit(tree);return result;
}

// Match the reserved-row tread profile: the field-facing edge receives the
// full lift and the rear edge receives none. Both edges share the row's plan
// anchor, so the top follows deck rake without twisting across its width.
export function benchTreadSample(point,centerline,fieldReference,width,lift){
 const nearest=nearestPointOnLine(point,centerline,false),i=nearest.segment,a=centerline[i],b=centerline[Math.min(i+1,centerline.length-1)],length=dist(a,b)||1;
 let nx=-(b[1]-a[1])/length,ny=(b[0]-a[0])/length;
 if(fieldReference?.length>1){
  const closed=dist(fieldReference[0],fieldReference.at(-1))<1e-9,field=nearestPointOnLine(nearest.point,fieldReference,closed).point,toward=[field[0]-nearest.point[0],field[1]-nearest.point[1]];
  if(nx*toward[0]+ny*toward[1]>0){nx=-nx;ny=-ny;}
 }
 const signed=(point[0]-nearest.point[0])*nx+(point[1]-nearest.point[1])*ny;
 return {anchor:nearest.point,offset:lift*Math.max(0,Math.min(1,.5-signed/width))};
}
