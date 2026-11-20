export function nearestPointOnLine(point,points,closed=true){
 if(points.length<2)throw Error('An elevation line needs at least two points.');
 let best={distanceSquared:Infinity};
 for(let i=0;i<points.length-(closed?0:1);i++){
  const a=points[i],b=points[(i+1)%points.length],dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy;
  const t=length?Math.max(0,Math.min(1,((point[0]-a[0])*dx+(point[1]-a[1])*dy)/length)):0;
  const x=a[0]+t*dx,y=a[1]+t*dy,distanceSquared=(point[0]-x)**2+(point[1]-y)**2;
  if(distanceSquared<best.distanceSquared)best={distanceSquared,point:[x,y],t,segment:i};
 }
 return {...best,distance:Math.sqrt(best.distanceSquared)};
}
export function insidePolygon(point,points){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
export function expandComponents(components,factor){
 return components.map(points=>{
  if(!points.length)return [];
  const xs=points.map(point=>point[0]),ys=points.map(point=>point[1]),cx=(Math.min(...xs)+Math.max(...xs))/2,cy=(Math.min(...ys)+Math.max(...ys))/2;
  return points.map(([x,y])=>[cx+(x-cx)*factor,cy+(y-cy)*factor]);
 });
}
