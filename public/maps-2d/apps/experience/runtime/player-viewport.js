// Public /player embeds the experience in a same-origin iframe. Its own visual
// viewport does not always report the keyboard clipping the parent page.
export function playerViewport(){
 const v=window.visualViewport;
 let box={left:v?.offsetLeft||0,top:v?.offsetTop||0,width:v?.width||innerWidth,height:v?.height||innerHeight};
 try{
  const frame=window.frameElement,parentView=window.parent.visualViewport;
  if(frame&&parentView){const r=frame.getBoundingClientRect(),left=Math.max(r.left,parentView.offsetLeft),top=Math.max(r.top,parentView.offsetTop),right=Math.min(r.right,parentView.offsetLeft+parentView.width),bottom=Math.min(r.bottom,parentView.offsetTop+parentView.height);box={left:left-r.left,top:top-r.top,width:Math.max(0,right-left),height:Math.max(0,bottom-top)};}
 }catch{/* Cross-origin embeds use the viewport exposed to the experience. */}
 return box;
}

export function observePlayerViewport(callback){
 const viewports=new Set([window.visualViewport]);
 try{if(window.frameElement)viewports.add(window.parent.visualViewport);}catch{}
 for(const viewport of viewports){viewport?.addEventListener('resize',callback);viewport?.addEventListener('scroll',callback);}
 return ()=>{for(const viewport of viewports){viewport?.removeEventListener('resize',callback);viewport?.removeEventListener('scroll',callback);}};
}
