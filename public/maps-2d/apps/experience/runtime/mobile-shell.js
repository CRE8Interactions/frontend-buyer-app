import {icons} from './icons.js';
import {playerViewport,observePlayerViewport} from './player-viewport.js';
export function mountMobileShell({onCheckout,onCloseOffers,onMinimapOpen=()=>{}}) {
  const mobile=matchMedia('(max-width: 1024px), (max-height: 500px) and (max-width: 1180px)');
  const sidebar=document.getElementById('sidebar'),workspace=document.getElementById('workspace');
  const toolbar=document.createElement('div');toolbar.id='mobile-toolbar';
  toolbar.innerHTML=`<button id="mobile-panel-toggle" aria-controls="sidebar" aria-expanded="false">Tickets & filters <span aria-hidden="true">${icons['caret-up']}</span></button><button id="minimap-toggle" aria-controls="map-navigator" aria-expanded="false" aria-label="Toggle minimap" title="Minimap">${icons['map-trifold']}</button><button id="mobile-fullscreen" aria-label="Enter full screen" title="Full screen">${icons['corners-out']}</button>`;
  const cart=document.createElement('div');cart.id='mobile-cart-bar';
  cart.innerHTML='<button id="mobile-cart-summary" aria-controls="sidebar"><strong>0 tickets</strong><span>$0.00</span></button><button id="mobile-checkout" class="primary" disabled>Review selection</button>';
  workspace.append(toolbar,cart);
  let open=false,mode='buyer',returnFocus=null,codeInputHeight=null;
  const toggle=toolbar.querySelector('#mobile-panel-toggle');
  function setOpen(value){
    if(value&&!open)returnFocus=document.activeElement;
    open=value;document.body.dataset.sheetOpen=String(open);
    toggle.setAttribute('aria-expanded',String(open));
    toggle.innerHTML=(open?'Close panel':mode==='admin'?'Selection & pricing':'Tickets & filters')+` <span aria-hidden="true">${icons[open?'caret-down':'caret-up']}</span>`;
    sidebar.inert=mobile.matches&&!open;
    if(sidebar.inert)sidebar.setAttribute('aria-hidden','true');else sidebar.removeAttribute('aria-hidden');
  }
  function syncViewport(){
    const viewport=playerViewport();
    const editing3DCode=!document.body.classList.contains('flat-map')&&document.activeElement?.matches('#seat-popup .popup-unlock input');
    if(editing3DCode){codeInputHeight??=innerHeight;}else codeInputHeight=null;
    document.body.toggleAttribute('data-editing-3d-code',!!editing3DCode);
    // Opening the access-code keyboard must not resize/reframe the 3D camera.
    document.documentElement.style.setProperty('--app-height',`${codeInputHeight??(viewport.height||innerHeight)}px`);
    document.documentElement.style.setProperty('--keyboard-offset',`${Math.max(0,innerHeight-viewport.height-viewport.top)}px`);
    document.body.classList.toggle('mobile-studio',mobile.matches);setOpen(open);
  }
  toggle.onclick=()=>{if(!open)onCloseOffers();setOpen(!open);};
  cart.querySelector('#mobile-cart-summary').onclick=()=>{onCloseOffers();setOpen(true);sidebar.querySelector('.cart')?.scrollIntoView({block:'nearest'});};
  cart.querySelector('#mobile-checkout').onclick=onCheckout;
  const minimapToggle=toolbar.querySelector('#minimap-toggle');
  const setMinimap=value=>{document.body.dataset.minimapOpen=String(value);minimapToggle.setAttribute('aria-expanded',String(value));if(value)onMinimapOpen();};
  minimapToggle.onclick=()=>{const value=document.body.dataset.minimapOpen!=='true';if(value){const legend=document.querySelector('#availability-legend details');if(legend)legend.open=false;}setMinimap(value);};
  document.addEventListener('click',event=>{if(mobile.matches&&event.target.closest?.('#availability-legend summary'))setMinimap(false);},true);
  document.addEventListener('toggle',event=>{if(mobile.matches&&event.target.matches?.('#availability-legend details')&&event.target.open)setMinimap(false);},true);
  const fullscreen=toolbar.querySelector('#mobile-fullscreen');
  const fullscreenElement=()=>document.fullscreenElement||document.webkitFullscreenElement;
  const syncFullscreen=()=>{const active=!!fullscreenElement();fullscreen.setAttribute('aria-label',active?'Exit full screen':'Enter full screen');fullscreen.innerHTML=icons[active?'corners-in':'corners-out'];};
  fullscreen.onclick=async()=>{try{if(fullscreenElement())await (document.exitFullscreen?.()||document.webkitExitFullscreen?.());else await (document.documentElement.requestFullscreen?.({navigationUI:'hide'})||document.documentElement.webkitRequestFullscreen?.());}catch{/* The viewport layout still remains distraction-free when browser fullscreen is unavailable. */}syncFullscreen();};
  document.addEventListener('fullscreenchange',syncFullscreen);document.addEventListener('webkitfullscreenchange',syncFullscreen);syncFullscreen();
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&mobile.matches&&open){setOpen(false);returnFocus?.focus();}});
  mobile.addEventListener('change',syncViewport);observePlayerViewport(syncViewport);document.addEventListener('focusin',syncViewport);syncViewport();
  return {
    close:()=>{setOpen(false);if(mobile.matches){setMinimap(false);const legend=document.querySelector('#availability-legend details');if(legend)legend.open=false;}},
    isMobile:()=>mobile.matches,
    update({workspace:next,quantity,total,selection}){
      if(mode!==next){mode=next;setOpen(false);}cart.hidden=mode==='admin';
      document.body.dataset.mobileMode=mode;
      cart.querySelector('strong').textContent=`${quantity} ticket${quantity===1?'':'s'}`;
      cart.querySelector('span').textContent=total;cart.querySelector('#mobile-checkout').disabled=!quantity;
      toggle.setAttribute('aria-label',mode==='admin'?`${selection} selected. Selection and pricing`:'Tickets and filters');
      if(!open&&mode==='admin')toggle.innerHTML=`${selection} selected · Pricing <span aria-hidden="true">${icons['caret-up']}</span>`;
    },
  };
}
