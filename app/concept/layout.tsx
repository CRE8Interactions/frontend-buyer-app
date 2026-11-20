import type { ReactNode } from "react";
import { preload } from "react-dom";

/* The /concept loader lives here, not in the page, so it is the first thing in the HTML: a plain cover (theme
   colour, inline CSS) with only the Lottie on it. A plain script starts the Lottie as soon as the animation
   file and the "light" player (from /public, no bundler) arrive, without waiting for hydration. The page's
   <Intro /> decides when to fade the cover out (hero video really playing + the animation has played a beat);
   a timer here is the safety net if scripts never run. The animation host is dangerouslySetInnerHTML so React
   treats what the script draws in it as opaque and never prunes it during hydration. */
const CSS = `
#n-intro{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;background:#fff;transition:opacity .6s cubic-bezier(.22,1,.36,1),visibility 0s linear .6s}
@media(prefers-color-scheme:dark){:root:not([data-nt="light"]) #n-intro{background:#0B0B0C}}
:root[data-nt="dark"] #n-intro{background:#0B0B0C}
#n-intro[data-s="out"]{opacity:0;visibility:hidden;pointer-events:none}
#n-intro[data-s="off"]{display:none}
#n-intro .n-intro-anim{width:150px;height:187px;max-width:40vw}
:root[data-nt="dark"] @media(prefers-color-scheme:dark){:root:not([data-nt="light"]) html:has(#n-intro[data-s="on"]){overflow:hidden}
@media(prefers-reduced-motion:reduce){#n-intro{transition:opacity .2s}`;

const BOOT = `(function(){
try{var t=localStorage.getItem('concept-theme');if(t==='light'||t==='dark')document.documentElement.dataset.nt=t}catch(e){}
var el=document.getElementById('n-intro');if(!el)return;
var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
setTimeout(function(){if(el.dataset.s==='on')el.dataset.s='out'},14000);
var data=null,lib=null;
function go(){
  if(!data||!lib||el.dataset.lottie)return;
  var a=lib.loadAnimation({container:el.querySelector('.n-intro-anim'),renderer:'svg',loop:!reduce,autoplay:!reduce,animationData:data,rendererSettings:{preserveAspectRatio:'xMidYMid meet'}});
  if(reduce)a.goToAndStop(279,true);
  window.__ntShown=performance.now();el.dataset.lottie='1';
}
fetch('/animations/blocktickets-loader.json').then(function(r){return r.json()}).then(function(d){data=d;go()}).catch(function(){});
var s=document.createElement('script');s.src='/vendor/lottie_light.min.js';s.async=true;s.onload=function(){lib=window.lottie;go()};document.head.appendChild(s);
})();`;

export default function ConceptLayout({ children }: { children: ReactNode }) {
  preload("/animations/blocktickets-loader.json", { as: "fetch", crossOrigin: "anonymous" });
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div id="n-intro" data-s="on" suppressHydrationWarning role="img" aria-label="Loading blocktickets">
        <div className="n-intro-anim" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: "" }} />
      </div>
      <script dangerouslySetInnerHTML={{ __html: BOOT }} />
      {children}
    </>
  );
}
