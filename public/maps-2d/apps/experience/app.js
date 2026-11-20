const page=await fetch('./runtime-shell.html').then(r=>r.text());
const doc=new DOMParser().parseFromString(page,'text/html');
for(const script of doc.querySelectorAll('script'))script.remove();
document.body.classList.add('player-only');
const brand=document.querySelector('a.brand');if(brand){brand.removeAttribute('href');brand.setAttribute('aria-label','2D Maps');}
// Theme: the map follows the device's own light or dark setting, and changes with it. The host page can decide instead, with ?theme=light or ?theme=dark in the address
// or maps2d.setTheme('light'|'dark') at any time; maps2d.setTheme('auto') hands it back to the device.
const themeAsked=new URLSearchParams(location.search).get('theme'),deviceDark=matchMedia('(prefers-color-scheme: dark)');let themeFixed=themeAsked==='dark'||themeAsked==='light';
const showTheme=dark=>{document.body.classList.toggle('bt-map-dark',dark);document.documentElement.classList.toggle('bt-map-dark',dark);};
showTheme(themeFixed?themeAsked==='dark':deviceDark.matches);
deviceDark.addEventListener('change',event=>{if(!themeFixed)window.maps2d?.setTheme?.('auto');else void event;});
const css=['./runtime/style.css','./runtime/mobile.css','./runtime/buyer-ui.css','./runtime/venue-loader.css','./runtime/blocktickets-callouts.css','./runtime/seat-view-3d.css','./runtime/map-dark.css'];
await Promise.all(css.map(href=>new Promise(resolve=>{const link=document.createElement('link');link.rel='stylesheet';link.href=href;link.onload=link.onerror=resolve;document.head.append(link);}))); 
document.body.append(...doc.body.children);
const style=document.createElement('style');style.textContent='.map-view-switch,.three-only,.workspace-switch,.eventbar{display:none!important}';document.head.append(style);
const imports=document.createElement('script');imports.type='importmap';imports.textContent=JSON.stringify({imports:{three:'./runtime/vendor/three.module.js'}});document.head.append(imports);
await import('./runtime/buyer-app.js');
const api=window.__studio;delete window.__studio;
window.maps2d={sectionAvailability:api.sectionAvailability,loadBundle:api.loadBundle,getState:api.getState,map:api.map,store:api.store,player:api.player,showSection:api.showSection,chooseSeat:api.chooseSeat,refresh:api.refresh};

// Host hooks: season context for the popups, party size for section highlighting, and seat search.
{
 const norm=v=>String(v??'').trim().toLowerCase(),layerSel='.section-annotation-badge[data-section-id]';
 let party=0,pending=0;
 let range=null;
 const priceOf=(store,id)=>{const inv=store.inventory;return inv.offers[inv.assignments[id]]?.tiers?.[0]?.price;};
 const priceOk=price=>!range||(Number.isFinite(price)&&price>=range.lo&&price<=range.hi);
 const fitsGroup=(map,store,section,n)=>{
  if(section.killed)return false;
  if(section.ga){const pool=store.inventory.ga?.[section.id];if(!pool||pool.capacity-pool.sold<n)return false;return priceOk(store.inventory.offers[pool.offerId]?.tiers?.[0]?.price);}
  for(const rowId of section.rowIds||[]){const row=map.rowById.get(rowId);if(!row)continue;let run=0;for(const id of row.seats){if(store.status(id)==='available'&&priceOk(priceOf(store,id))){if(++run>=n)return true;}else run=0;}}
  return false;
 };
 const applyParty=()=>{
  clearTimeout(pending);pending=setTimeout(()=>{
   const map=api.map(),store=api.store();if(!map||!store)return;
   const on=party>1||!!range,need=Math.max(1,party),verdict=new Map();
   for(const badge of document.querySelectorAll(layerSel)){
    const id=badge.dataset.sectionId;let fit=true;
    if(on){if(!verdict.has(id))verdict.set(id,fitsGroup(map,store,map.sectionById.get(id),need));fit=verdict.get(id);}
    badge.classList.toggle('fits-party',on&&fit);badge.classList.toggle('no-fit',on&&!fit);
   }
  },0);
 };
 window.maps2d.setTheme=name=>{themeFixed=name!=='auto';const dark=themeFixed?name!=='light':deviceDark.matches;showTheme(dark);api.player()?.setTheme?.(dark);return dark?'dark':'light';};
 window.maps2d.getTheme=()=>document.body.classList.contains('bt-map-dark')?'dark':'light';
 window.maps2d.seasonGames=0;
 window.maps2d.setContext=ctx=>{if(ctx&&Number.isFinite(ctx.seasonGames))window.maps2d.seasonGames=ctx.seasonGames;};
 window.maps2d.setPartySize=n=>{party=Math.max(0,Math.floor(Number(n)||0));applyParty();};
 // price band in cents; setPriceRange() clears it
 window.maps2d.setPriceRange=(lo,hi)=>{range=Number.isFinite(lo)&&Number.isFinite(hi)?{lo,hi}:null;applyParty();};
 // real view photos: { seatId | sectionId | sectionNumber | 'sectionNumber:row': url }
 window.maps2d.viewPhotos={};
 window.maps2d.setViewPhotos=map=>{Object.assign(window.maps2d.viewPhotos,map||{});};
 const baseRefresh=window.maps2d.refresh;window.maps2d.refresh=(...a)=>{const r=baseRefresh?.(...a);applyParty();return r;};
 new MutationObserver(()=>{if(party>1||range)applyParty();}).observe(document.getElementById('map-area')||document.body,{subtree:true,childList:true,attributeFilter:['data-availability']});

}

// 3D view from the seat (runtime/seat-view-3d.js), generated from the map's own seat positions and row heights. A real photo, when one is supplied, still wins.
{
 let view=null,logos=null;
 // sponsor art for the boards, fascia, scoreboard and centre ice: our own wordmark and the home team's logo, lifted from the map artwork
 const picture=src=>new Promise(done=>{const i=new Image();i.onload=()=>done(i);i.onerror=()=>done(null);i.src=src;});
 const logoSets=new Map(),loadLogos=()=>{const key=window.maps2d.venue?.files.logo||window.maps2d.venue?.files.svg||svg;if(!logoSets.has(key))logoSets.set(key,(async()=>{let team=null;try{const doc=new DOMParser().parseFromString(await fetch(key).then(r=>r.text()),'image/svg+xml'),g=doc.querySelector('g.logo'),m=g?.querySelector('mask');if(m){const [x,y,w,h]=['x','y','width','height'].map(k=>Number(m.getAttribute(k)));team=await picture('data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="'+[x,y,w,h].join(' ')+'">'+new XMLSerializer().serializeToString(g)+'</svg>'));}}catch{}return {team,brand:await picture('./runtime/assets/blocktickets-logo-navy.svg'),brandLight:await picture('./runtime/assets/blocktickets-logo.svg')};})());return logoSets.get(key);};
 window.maps2d.realViewPhoto=seat=>{const p=window.maps2d.viewPhotos||{};return p[seat.id]||p[`${seat.sectionNumber}:${seat.rowNumber}`]||p[seat.sectionId]||p[seat.sectionNumber]||null;};
 window.maps2d.openSeatView=async seatId=>{
  const map=api.map(),store=api.store(),seat=map?.seatById.get(seatId);if(!seat)throw Error('Unknown seat.');
  const [{openSeatView3D,prepareSeatView},art]=await Promise.all([import('./runtime/seat-view-3d.js'),loadLogos()]);
  // if the arena is not there yet it is built now, in slices, with the button showing that it is working; the page stays alive meanwhile
  if(!built){const button=document.getElementById('see-view');button?.setAttribute('aria-busy','true');try{await prepareSeatView({map,logos:art,venue:venue3d(),urgent:true});}finally{document.getElementById('see-view')?.removeAttribute('aria-busy');}}
  const unit=store?.unit(seatId)||[],tiers=store?.inventory.offers[store.inventory.assignments[seatId]]?.tiers||[],low=tiers.length?Math.min(...tiers.map(t=>t.price)):null;
  const money=low===null?'':new Intl.NumberFormat(undefined,{style:'currency',currency:store.inventory.currency,currencyDisplay:'narrowSymbol'}).format(low/100),priceLabel=low===null?'':`From ${money} · Choose offer`;
  // offers are chosen inside the 3D view: a row puts this seat in the cart at that offer, or takes it out again, and the 2D side is redrawn to match
  const fmt=c=>new Intl.NumberFormat(undefined,{style:'currency',currency:store.inventory.currency,currencyDisplay:'narrowSymbol'}).format(c/100),key='seat:'+(unit[0]||seatId),line=()=>store.cart.get(key),sellable=store.status(seatId)==='available'||!!line();
  const offers=sellable?tiers.map(t=>({id:t.id,name:t.name,label:fmt(t.price)})):[],onPick=id=>{try{if(line()?.tierId===id)store.cart.delete(key);else store.addSeat(seatId,id);api.refresh?.();}catch{}return line()?.tierId??null;};
  // where the 2D map shows this seat and one far seat of its section: the 3D flight starts from that same framing
  let anchor=null;try{const pl=api.player(),a=pl.projectSeat(seatId);let far=null,best=0;for(const id of map.sectionById.get(seat.sectionId).seats){const q=map.seatById.get(id),d=(q.x-seat.x)**2+(q.y-seat.y)**2;if(d>best){best=d;far=id;}}const b=far&&pl.projectSeat(far);if(a&&b&&[a.x,a.y,b.x,b.y].every(Number.isFinite))anchor={radius:a.radius,seat:{x:a.x,y:a.y},other:{x:b.x,y:b.y},otherId:far,follow:(x,y,w)=>pl.follow?.(x,y,w)};}catch{}
  built=true; // opening the view builds the arena if it was not there yet
  view=openSeatView3D({host:document.getElementById('map-area'),map,seatId,logos:art,venue:venue3d(),anchor,under:document.getElementById('canvas-host'),offers,chosen:line()?.tierId??null,onPick,unit:unit.length?unit:[seatId],priceLabel,onClose:()=>{view=null;},onChoose:()=>document.querySelector('#seat-popup [data-tier-id]')?.focus()});
  return view;
 };
 // a still of the 3D view for the seat popup: made after the popup has drawn, one at a time, and remembered so reopening a seat costs nothing
 const shots=new Map(),venue3d=()=>({name:window.maps2d.venue?.name||'',...(window.maps2d.venue?.view3d||{})}); // this venue's 3D properties, from its own venue.json
 let built=false;
 window.maps2d.seatViewSnapshot=seatId=>{
  const shotKey=(api.map()?.raw?.id||'')+':'+seatId;
  if(shots.has(shotKey))return Promise.resolve(shots.get(shotKey));
  // The first still needs the arena, which is built a few milliseconds at a time (prepareSeatView), so the page keeps answering while it is made; the card's picture
  // arrives when it is ready. After that the arena is there and a still takes a few milliseconds.
  return new Promise(done=>setTimeout(async()=>{try{const map=api.map();if(!map?.seatById.get(seatId)||view)return done(null);const [{snapshotSeatView,prepareSeatView},art]=await Promise.all([import('./runtime/seat-view-3d.js'),loadLogos()]);if(!built&&!view)await prepareSeatView({map,logos:art,venue:venue3d(),urgent:true});const url=view?null:snapshotSeatView({map,seatId,logos:art,venue:venue3d()});built=true;if(url){shots.set(shotKey,url);if(shots.size>60)shots.delete(shots.keys().next().value);}done(url);}catch{done(null);}},460)); /* a still holds the page for a moment while it is drawn, so it waits until the drawer has slid in and the map has finished its glide (380ms) */
 };
 // The arena takes about a second and a half to build the first time. That is done in a quiet moment once the buyer has opened a section (and so is likely to pick a seat),
 // not on page load and not at the moment of the first seat click, so the map's own loading time is untouched and the first seat popup is not held up.
 // It is done while the buyer is not doing anything: a section is open, its seats can be clicked, and the pointer and keys have been still for a second and a half. Building the arena holds the page
 // for that long, so doing it the moment a section opened (as before) meant the first clicks on seats went unanswered.
 // Once a section is open the arena starts being made ready in the background, a few milliseconds at a time (on phones as well: it no longer holds the page, and a phone needs the head start most).
 const warm=setInterval(()=>{try{const state=window.maps2d.getState?.(),cur=state?.currentSection;if(!cur||!state.player?.seatInteraction)return;clearInterval(warm);if(built||view)return;const map=api.map();Promise.all([import('./runtime/seat-view-3d.js'),loadLogos()]).then(([mod,art])=>mod.prepareSeatView({map,logos:art,venue:venue3d()})).catch(()=>{});}catch{clearInterval(warm);}},400);
 window.maps2d.closeSeatView=()=>view?.close(true);
 window.maps2d.seatViewState=()=>view?.state()??null;
 window.maps2d.seatViewTimings=async()=>(await import('./runtime/seat-view-3d.js')).seatViewTimings();
 window.maps2d.seatViewBench=n=>view?.bench(n)??null;window.maps2d.seatViewWorld=()=>view?.world??null;window.maps2d.seatViewLook=(...a)=>view?.look(...a);window.maps2d.seatViewScrub=f=>view?.scrub(f);
}

// View photos come from maps2d.setViewPhotos() or ?photos=<url to a JSON file>. Sample notices and sample view images show unless ?dummy=0.
function applyDummyData(){
 const dummy=new URLSearchParams(location.search).get('dummy')!=='0';
 const map=api.map();if(!map?.seatById)return;
 const view=seat=>{
  const row=seat.rowNumber,sec=seat.sectionNumber,side=((Number(seat.number)||1)%9)-4,ice=`M${230+side*14} 255 L${570+side*14} 255 L${650+side*20} 360 L${150+side*20} 360 Z`;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500"><rect width="800" height="500" fill="#151517"/><rect y="0" width="800" height="150" fill="#1b1b1e"/><g fill="#26262a">${Array.from({length:8},(_,i)=>`<rect x="${20+i*98}" y="${34+(i%2)*10}" width="82" height="72" rx="10"/>`).join('')}</g><rect y="150" width="800" height="105" fill="#212124"/><path d="${ice}" fill="#e8edf3"/><path d="M${400+side*14} 255 L${400+side*20} 360" stroke="#c8d2e0" stroke-width="3"/><ellipse cx="${400+side*17}" cy="305" rx="38" ry="14" fill="none" stroke="#3358d4" stroke-width="3"/><rect y="360" width="800" height="140" fill="#0b0b0c"/><rect x="40" y="395" width="720" height="70" rx="22" fill="#f2f2f0" fill-opacity=".08"/><text x="400" y="440" text-anchor="middle" font-family="system-ui,sans-serif" font-size="26" font-weight="500" fill="#f2f2f0">Section ${sec} · Row ${row} · Seat ${seat.number}</text><text x="400" y="480" text-anchor="middle" font-family="system-ui,sans-serif" font-size="15" fill="#a6a6a8">Sample view, not a real photo</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
 };
 // Which seats carry sample notices is the venue's to say (view2d.sample in its venue.json): the player names no section, row or seat of any building.
 const sample=window.maps2d?.venue?.view2d?.sample||{},every=Number.isInteger(sample.obstructedEvery)&&sample.obstructedEvery>1?sample.obstructedEvery:0,same=(want,have)=>want===undefined||String(want)===String(have),
  hit=(r,seat)=>same(r.section,seat.sectionNumber)&&(r.rows?r.rows.map(String).includes(String(seat.rowNumber)):same(r.row,seat.rowNumber))&&same(r.seat,seat.number);
 // the stand-in view picture is a drawing of an ice rink, so it is only offered where the map's playing surface is one
 const rink=Object.values(map.raw?.shapes||{}).some(s=>s.groupPath?.some(g=>/^surface_type_.*(hockey|ice)/i.test(g)));
 let i=0;
 for(const seat of map.seatById.values()){
  i++;const h=(Number(seat.number)*7+String(seat.rowNumber).charCodeAt(0)*13+i)%97;
  if(dummy&&sample.exclusive?.some(r=>hit(r,seat)))seat.exclusive=true; // sample data, named by the venue itself (set seat.exclusive from real inventory in production)
  if(dummy){
   // accessible (ADA) seats are never sampled: they come only from the map, where a seat is marked DA or DB
   const named=sample.obstructed?.find(r=>hit(r,seat));if(named||every&&h%every===0){seat.obstructedView=true;seat.obstructedViewLabel=named?.label||sample.obstructedLabel||'Obstructed view';}
  }
  Object.defineProperty(seat,'viewPhoto',{configurable:true,get(){const photos=window.maps2d?.viewPhotos||{};return photos[seat.id]||photos[`${seat.sectionNumber}:${seat.rowNumber}`]||photos[seat.sectionId]||photos[seat.sectionNumber]||(dummy&&rink?view(seat):undefined);}});
 }
}

// Section label: says which section is open and how many seats are left. It never takes clicks, so seats under it stay pickable.
{
 const chip=document.createElement('div');chip.className='bt-section-chip';chip.setAttribute('role','status');
 const name=document.createElement('b'),left=document.createElement('span');chip.append(name,left);
 setInterval(()=>{
  let state;try{state=window.maps2d.getState();}catch{return;}
  const area=document.getElementById('map-area');if(!area)return;if(chip.parentElement!==area)area.append(chip);
  const map=window.maps2d.map(),store=window.maps2d.store(),id=state.currentSection?.id??state.currentSection,section=id&&map?.sectionById.get(id);
  if(!section||!store||state.focusSeat){chip.classList.remove('on');return;} // a picked seat has its own card, which names the section
  let open=0,low=Infinity; // low: the cheapest price open in this section, in cents
  const cheapest=offerId=>{for(const t of store.inventory.offers[offerId]?.tiers||[])if(Number.isFinite(t.price)&&t.price<low)low=t.price;};
  if(section.ga){open=window.maps2d.sectionAvailability(section.id)?.available||0;if(open)cheapest(store.inventory.ga[section.id]?.offerId);}
  else for(const seat of section.seats||[])if(store.status(seat)==='available'){open++;cheapest(store.inventory.assignments[seat]);}
  const title=/^\d+$/.test(String(section.name))?`Section ${section.name}`:String(section.name),note=section.killed?'Not available':section.ga?(open===0?'No tickets available':open===1?'1 ticket available':`${open} tickets available`):open===0?'No seats available':open===1?'1 seat available':`${open} seats available`,
   from=open&&Number.isFinite(low)?' · from '+new Intl.NumberFormat(window.maps2d.venue?.view2d?.locale||undefined,{style:'currency',currency:store.inventory.currency,currencyDisplay:'narrowSymbol'}).format(low/100):''; // on a phone there is no hover to show a section's price, so the label says it
  if(name.textContent!==title)name.textContent=title;if(left.textContent!==note+from)left.textContent=note+from;
  chip.classList.add('on');
 },250);
}

// Seat photo in the popover: while the pointer is over it the picture leans toward the pointer, like looking around from the seat.
// The values are only read by the hover style, so nothing happens on touch screens or with reduced motion.
document.addEventListener('pointermove',event=>{
 const slide=event.target?.closest?.('#see-view');if(!slide||event.pointerType==='touch'||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const box=slide.getBoundingClientRect(),shot=slide.querySelector('.bt-view-shot');if(!shot||!box.width)return;
 shot.style.setProperty('--bt-tilt-x',((event.clientX-box.left)/box.width*2-1).toFixed(3));shot.style.setProperty('--bt-tilt-y',((event.clientY-box.top)/box.height*2-1).toFixed(3));
},{passive:true});

// Map control tooltips: resting the pointer on a control for two seconds names what it does. One shared tip, placed beside the control,
// so it is never clipped by the control bar. The native title is taken off the buttons so the browser's own tooltip does not show as well.
{
 const tip=document.createElement('div');tip.className='bt-control-tip';tip.setAttribute('role','tooltip');tip.hidden=true;
 let timer=0,shownFor=null;
 const hide=()=>{clearTimeout(timer);timer=0;shownFor=null;tip.classList.remove('on');tip.hidden=true;};
 const label=button=>{if(button.title){button.dataset.tip=button.title;button.removeAttribute('title');}return button.dataset.tip||button.getAttribute('aria-label')||'';};
 const show=button=>{const area=document.getElementById('map-area');if(!area||!button.isConnected)return;const text=label(button);if(!text)return;if(tip.parentElement!==area)area.append(tip);tip.textContent=text;tip.hidden=false;const a=area.getBoundingClientRect(),b=button.getBoundingClientRect(),right=a.right-b.left+10;tip.style.right=right+'px';tip.style.top=(b.top-a.top+b.height/2)+'px';shownFor=button;requestAnimationFrame(()=>tip.classList.add('on'));};
 document.addEventListener('pointerover',event=>{const button=event.target?.closest?.('.map-control-rail button, .bt-theme-switch');if(!button||event.pointerType==='touch'){if(!event.target?.closest?.('.bt-control-tip'))hide();return;}if(button===shownFor)return;label(button);hide();timer=setTimeout(()=>show(button),2000);});
 document.addEventListener('pointerdown',hide,true);document.addEventListener('keydown',hide,true);window.addEventListener('blur',hide);
}


// Hold timer, arrow-key seat navigation and picked seats on the minimap.
{
 const HOLD=10*60,area=()=>document.getElementById('map-area'),ns='http://www.w3.org/2000/svg';
 const pill=document.createElement('div');pill.className='bt-hold';pill.hidden=true;
 pill.innerHTML='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9.5 2.5h5"/></svg><span class="bt-hold-text">Seats held</span><b class="bt-hold-time">10:00</b><span class="bt-hold-bar"><i></i></span>';
 const live=document.createElement('div');live.className='map-selection-status';live.setAttribute('role','status');live.setAttribute('aria-live','polite');
 const time=pill.querySelector('.bt-hold-time'),bar=pill.querySelector('.bt-hold-bar i');
 let heldAt=0,announced=0;
 const seatCount=()=>{try{return window.maps2d.getState().cart.length;}catch{return 0;}};
 const fmt=s=>`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
 const mountHold=()=>{const a=area();if(a&&!pill.isConnected){a.append(pill,live);}};
 setInterval(()=>{
  mountHold();
  if(!seatCount()){heldAt=0;announced=0;pill.hidden=true;return;}
  if(!heldAt){heldAt=Date.now();announced=0;}
  const left=Math.max(0,HOLD-Math.floor((Date.now()-heldAt)/1000));
  pill.hidden=false;time.textContent=fmt(left);bar.style.transform=`scaleX(${left/HOLD})`;pill.dataset.low=left<=60?'true':'false';
  if(left<=60&&announced<1){announced=1;live.textContent='One minute left on your held seats.';}
  if(left===0){const st=window.maps2d.store();st.cart.clear();window.maps2d.refresh();live.textContent='Your hold expired and the seats were released.';heldAt=0;pill.hidden=true;}
 },1000);

 // arrow keys move between seats once one is focused; left and right follow the row, up and down hop to the nearest seat in the next row
 document.addEventListener('keydown',event=>{
  if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)||event.altKey||event.metaKey||event.ctrlKey)return;
  if(/^(input|textarea|select)$/i.test(event.target?.tagName||''))return;
  let state;try{state=window.maps2d.getState();}catch{return;}
  const map=window.maps2d.map(),store=window.maps2d.store(),current=map?.seatById.get(state.focusSeat);
  if(!current)return;
  const row=map.rowById.get(current.rowId),open=id=>store.status(id)==='available'||store.status(id)==='locked';
  let next=null;
  if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
   const step=event.key==='ArrowRight'?1:-1;let i=row.seats.indexOf(current.id)+step;
   const player=window.maps2d.player(),across=id=>player?.projectSeat?.(id)?.x??map.seatById.get(id).x,order=[...row.seats].sort((a,b)=>across(a)-across(b)); // left and right as drawn, whichever way the map is turnedi=order.indexOf(current.id)+step;
   while(i>=0&&i<order.length&&!open(order[i]))i+=step;
   next=order[i]||null;
  }else{
   const section=map.sectionById.get(current.sectionId),rows=section.rowIds.map(id=>map.rowById.get(id)).sort((a,b)=>(a.rowIndex??0)-(b.rowIndex??0));
   let r=rows.findIndex(x=>x.id===row.id)+(event.key==='ArrowDown'?1:-1);
   while(r>=0&&r<rows.length){
    const best=rows[r].seats.filter(open).sort((a,b)=>Math.abs(map.seatById.get(a).x-current.x)-Math.abs(map.seatById.get(b).x-current.x))[0];
    if(best){next=best;break;}
    r+=event.key==='ArrowDown'?1:-1;
   }
  }
  if(next){event.preventDefault();window.maps2d.chooseSeat(next);}
 });

 // picked seats as green dots on the minimap, drawn from the same cart the popup edits
 const drawPicks=()=>{
  const mini=document.querySelector('#map-navigator-stage svg');if(!mini)return;
  let layer=mini.querySelector('.bt-picks');
  if(!layer){layer=document.createElementNS(ns,'g');layer.setAttribute('class','bt-picks');mini.append(layer);}
  let cart=[];try{cart=window.maps2d.getState().cart;}catch{return;}
  const map=window.maps2d.map(),vb=mini.viewBox.baseVal,r=vb.width/150,keys=[];
  for(const line of cart)for(const id of line.seatIds||[]){const seat=map?.seatById.get(id);if(seat)keys.push([id,seat.x,seat.y]);}
  const sig=keys.map(k=>k[0]).join();if(layer.dataset.sig===sig)return;layer.dataset.sig=sig;layer.replaceChildren();
  for(const [,x,y] of keys){const c=document.createElementNS(ns,'circle');c.setAttribute('cx',x);c.setAttribute('cy',y);c.setAttribute('r',r);c.setAttribute('fill','#97dd62');c.setAttribute('stroke','#051b35');c.setAttribute('stroke-width',r/3);layer.append(c);}
 };
 setInterval(drawPicks,500);
}
// This player holds no venue of its own. A venue is a folder under ../player/maps/<slug>/ with its seat map, its 2D artwork and venue.json, which carries that
// venue's 2D properties (view2d) and 3D properties (view3d). The folder to load comes from ?venue=<slug>, or the default named in maps/index.json.
// Before anything is drawn the files are checked against each other and against the folder's sealed manifest, so one venue's data can never be shown with another's.
const params=new URLSearchParams(location.search),mapsRoot='../player/maps/';
let json=params.get('map'),svg=params.get('svg'),venue=null;
const sha256=async text=>crypto.subtle?[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(b=>b.toString(16).padStart(2,'0')).join(''):null;
const fetchText=async(url,what)=>{const r=await fetch(url);if(!r.ok)throw Error('Unable to load '+what);return r.text();};
try{
 let venueText=null,dir=null;
 if(!json){ // the normal way in: a venue folder
  const named=params.get('venue'),index=named?null:await fetch(mapsRoot+'index.json').then(r=>r.ok?r.json():null),slug=named||index?.default; // a page that names its venue skips the index: one round trip fewer
  if(!slug||!/^[a-z0-9-]+$/.test(slug))throw Error('No venue was named');
  dir=mapsRoot+slug+'/';venueText=await fetchText(dir+'venue.json','this venue');venue=JSON.parse(venueText);
  if(venue.slug!==slug||!venue.mapId||!venue.files?.map||!venue.files?.artwork)throw Error('The venue file does not describe '+slug);
  json=dir+venue.files.map;svg=dir+venue.files.artwork;
 }
 // A venue's 2D map is either its own SVG artwork or a schematic drawn from the seat map (view2d.style in its venue.json; ?style= overrides it for a look).
 const style=params.get('style')||venue?.view2d?.style||'artwork',schematic=style==='schematic';
 // The seat map comes as a pack where the venue has one (a fraction of the size; see runtime/map-pack.js) and is unpacked here into the full structure.
 // Everything the venue needs is asked for at once, not one file after another.
 const packUrl=venue?.files?.mapPack&&params.get('pack')!=='0'?dir+venue.files.mapPack:null,decorUrl=schematic&&venue?.files?.decor?dir+venue.files.decor:null;
 const manifestAsk=venue?fetch(dir+venue.files.manifest).then(r=>r.ok?r.json():null).catch(()=>null):null,decorAsk=decorUrl?fetchText(decorUrl,'the venue artwork parts'):Promise.resolve(''),artAsk=schematic?null:fetchText(svg,'the map artwork');
 for(const ask of [decorAsk,artAsk])ask?.catch(()=>{}); // failures are reported where each is awaited
 const sealedText=await fetchText(packUrl||json,'the seat map'),meta=packUrl?(await import('./runtime/map-pack.js')).unpackMap(JSON.parse(sealedText)):JSON.parse(sealedText),raw=packUrl?JSON.stringify(meta):sealedText;
 // a schematic map may keep a few parts of the venue's own artwork (a logo, labels) from a small file of their own
 const decor=await decorAsk;
 const art=schematic?(await import('./runtime/schematic-artwork.js')).schematicSVG(meta,venue?.view2d?.schematic||{},decor):await artAsk;
 let overrides=null;
 if(venue){
  if(meta.id!==venue.mapId)throw Error('The seat map does not belong to this venue');
  const manifest=await manifestAsk;if(!manifest||manifest.mapId!==venue.mapId)throw Error('The venue has no manifest of its own');
  const sums=await Promise.all([sha256(sealedText),schematic?null:sha256(art),sha256(venueText)]),want=[manifest.files?.[packUrl?'pack':'json']?.sha256,manifest.files?.svg?.sha256,manifest.files?.venue?.sha256];
  if(sums[0]!==null&&sums.some((sum,i)=>!(schematic&&i===1)&&sum!==want[i]))throw Error('The venue files have changed since they were sealed');
  if(decor&&sums[0]!==null&&await sha256(decor)!==manifest.files?.decor?.sha256)throw Error('The venue artwork parts have changed since they were sealed'); // a schematic map uses no artwork file, so there is none to check
  if(venue.files.sectionNames)overrides=await fetch(dir+venue.files.sectionNames).then(r=>r.ok?r.json():null);
  if(overrides&&overrides.mapId!==venue.mapId)overrides=null;
 }
 window.maps2d.venue=Object.freeze({slug:venue?.slug??null,mapId:meta.id,name:venue?.name||meta.name||'',team:venue?.team||'',files:Object.freeze({json,svg,logo:decorUrl||svg,pack:packUrl}),style,view2d:Object.freeze(venue?.view2d||{}),view3d:Object.freeze(venue?.view3d||{})});
 {const t=venue?.view2d?.theme||{},set=(name,v)=>{if(/^#[0-9a-f]{6}$/i.test(v||''))document.body.style.setProperty(name,v);else document.body.style.removeProperty(name);}; /* the venue's team colours, for the parts of the map drawn by the page and not by the canvas (seat key, standing areas) */
  set('--team-strong',t.light?.strong);set('--team-soft',t.light?.soft);set('--team-line',t.light?.line);set('--team-strong-dark',t.dark?.strong);set('--team-soft-dark',t.dark?.soft);}
 await api.loadBundle(raw,art,{name:venue?.name||meta.name||'2D Maps',currency:venue?.view2d?.currency||'CAD',studioPreview:true,demoSectionAvailability:venue?.view2d?.demoSectionAvailability||{},gaSections:overrides?.ga||{},killedSections:overrides?.killed||{},sectionNames:overrides?.names||{}},true);{const manifest=new URLSearchParams(location.search).get('photos');if(manifest)await fetch(manifest).then(r=>r.ok?r.json():null).then(m=>m&&window.maps2d.setViewPhotos(m)).catch(()=>{});}applyDummyData();await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));document.body.classList.remove('map-loading');document.getElementById('boot-loader')?.remove();window.maps2d.readyAt=Math.round(performance.now());}catch(error){
 const loader=document.getElementById('boot-loader');loader.hidden=false;loader.replaceChildren();
 const card=document.createElement('div');card.className='bt-fail';
 const title=document.createElement('h2'),body=document.createElement('p'),retry=document.createElement('button'),detail=document.createElement('small');
 title.textContent=navigator.onLine===false?'You’re offline':'We couldn’t load this venue';
 body.textContent=navigator.onLine===false?'Reconnect and try again. Your picks are kept.':'Check your connection and try again.';
 detail.textContent=error.message;retry.type='button';retry.textContent='Try again';retry.onclick=()=>location.reload();
 card.append(title,body,retry,detail);loader.append(card);throw error;}
