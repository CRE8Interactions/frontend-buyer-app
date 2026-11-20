/* nor.ma-inspired landing, in Blocktickets brand terms.
   Colours and card type sizes are tokens (see the token block below), light and dark.
   Buttons: Blocktickets green (--green), black text, Inter 600, full pill.
   Cards 28px, hero 36px, overlapping rounded sections, glass pills (blur 12px),
   blur-rise reveal 700ms cubic-bezier(.22,1,.36,1). No blue field. */
export const CSS = `
body:has(.n){background:var(--paper)}
/* Colour and card type-size tokens (light and dark) live in app/globals.css, shared with the rest of the app.
   Everything below references them; nothing here hardcodes a colour or card type size. */
:root[data-nt="dark"] .n-glass{box-shadow:none}
@media(prefers-color-scheme:dark){:root:not([data-nt="light"]) .n-glass{box-shadow:none}}
@media(prefers-color-scheme:dark){:root:not([data-nt="light"]) .n-card-dark,:root:not([data-nt="light"]) .n-out,:root:not([data-nt="light"]) .n .a3-total{box-shadow:inset 0 0 0 1px rgb(255 255 255 / .08)}}
:root[data-nt="dark"] .n-card-dark,:root[data-nt="dark"] .n-out,:root[data-nt="dark"] .n .a3-total{box-shadow:inset 0 0 0 1px rgb(255 255 255 / .08)}
.n{--ease:cubic-bezier(.22,1,.36,1);
  background:var(--paper);color:var(--ink);-webkit-font-smoothing:antialiased;overflow-x:clip}
.n *{box-sizing:border-box}
@layer base{.n :where(h1,h2,h3,p,ul,ol,dl,dd,figure){margin:0;padding:0}.n :where(ul,ol){list-style:none}}
.n :where(a:not([data-slot="link"])){color:inherit;text-decoration:none}
.n-mono{font-family:var(--font-mono-n),ui-monospace,monospace;font-variant-numeric:tabular-nums}
.n-wrap{width:100%;max-width:1240px;margin-inline:auto;padding-inline:16px}
@media(min-width:640px){.n-wrap{padding-inline:32px}}
@media(min-width:1536px){.n-wrap{max-width:1440px}}
.n-wrap-flush{padding-inline:0}

/* reveal */
.n-rv{opacity:0;transform:translateY(16px);transition:opacity .5s var(--ease),transform .5s var(--ease)}
.n-rv.in{opacity:1;transform:none}
@media(prefers-reduced-motion:reduce){.n-rv{transform:none;transition:opacity .2s var(--ease)}.n *:not(.n-rv){transition:none!important;animation:none!important}.n-video{display:none}}

/* nav: glass pills */
.n-nav{position:fixed;top:32px;left:36px;right:36px;max-width:1824px;z-index:50;display:flex;align-items:center;justify-content:space-between;gap:12px;margin-inline:auto;pointer-events:none}
@media(min-width:640px){.n-nav{left:60px;right:60px}}
.n-nav>*{pointer-events:auto}
.n-nav{--bg:0;--fg:0}
/* a soft blur that fades out below the nav, so content slides under it instead of being cut off by it */
.n-fade{position:fixed;top:0;left:0;right:0;height:100px;z-index:-2;pointer-events:none;opacity:var(--bg);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);-webkit-mask-image:linear-gradient(180deg,#000 0,#000 52%,transparent 100%);mask-image:linear-gradient(180deg,#000 0,#000 52%,transparent 100%)}
@media(min-width:760px){.n-fade{height:150px}}
.n-glass{border-radius:999px;background:rgb(var(--surface-rgb) / calc(var(--bg) * .6));border:1px solid rgb(var(--ink-rgb) / calc(var(--bg) * .06));-webkit-backdrop-filter:blur(calc(var(--bg) * 40px)) saturate(calc(1 + var(--bg) * .5));backdrop-filter:blur(calc(var(--bg) * 40px)) saturate(calc(1 + var(--bg) * .5));box-shadow:inset 0 2px 0 color-mix(in srgb,var(--glass-highlight) calc(var(--bg) * 100%),transparent),0 8px 24px -12px rgb(var(--ink-rgb) / calc(var(--bg) * .35))}
.n-logo{display:flex;align-items:center;height:44px;padding:0 20px}
.n-logo img{height:16px;width:auto;filter:brightness(0) invert(calc(1 - var(--fg) * (1 - var(--logo-inv))))}
.n-links{display:none;gap:2px;padding:0 4px;height:44px;align-items:center}
@media(min-width:760px){.n-links{display:flex}}
.n-links a{display:inline-flex;align-items:center;height:36px;padding:0 14px;border-radius:999px;font-size:14px;font-weight:500;color:color-mix(in srgb,#fff calc((1 - var(--fg)) * 100%),var(--ink));transition:background-color .15s var(--ease)}
@media(hover:hover) and (pointer:fine){.n-links a:hover{background:rgba(128,128,128,.2)}}

/* theme switch */
.n-theme{display:grid;place-items:center;width:44px;height:44px;padding:0;margin-left:auto;border:0;cursor:pointer;color:color-mix(in srgb,#fff calc((1 - var(--fg)) * 100%),var(--ink));transition:background-color .15s var(--ease),transform 160ms var(--ease)}
.n-theme svg{width:18px;height:18px}
.n-theme-seg{align-items:center;margin-left:auto;color:var(--ink)}
.n-theme .i-sun{display:var(--sun-d)}.n-theme .i-moon{display:var(--moon-d)}
@media(hover:hover) and (pointer:fine){.n-theme:hover{background:rgba(128,128,128,.2)}}
.n-theme:active{transform:scale(.95)}
.n-theme:focus-visible{outline:2px solid var(--ink);outline-offset:3px}
.n-nav-r{display:flex;align-items:center;gap:8px}
/* small screens (under 760px): the bar is one floating island inset to match the hero card. It shows the current chapter below it,
   draws page progress along its bottom edge, and grows into the menu (its pill stretches down and rounds off) over a blurred page. */
.n-menu,.n-sheet,.n-prog,.n-chap,.n-scrim{display:none}
@media(max-width:759px){
.n-nav{top:16px;left:16px;right:16px;display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-rows:56px var(--chh) auto;--chh:0px;align-items:center;gap:0;pointer-events:auto;transition:grid-template-rows .8s cubic-bezier(.45,.05,.25,1)}
/* the bar's own backing: nothing at rest (no fill, no outline), solid once you scroll; it stretches down to hold the menu */
.n-nav::before{content:"";position:absolute;left:0;right:0;top:0;height:56px;z-index:-1;border-radius:28px;pointer-events:none;
  background:rgb(var(--surface-rgb) / calc(var(--bg) * .7));-webkit-backdrop-filter:blur(calc(var(--bg) * 40px)) saturate(calc(1 + var(--bg) * .5));backdrop-filter:blur(calc(var(--bg) * 40px)) saturate(calc(1 + var(--bg) * .5));
  box-shadow:inset 0 2px 0 color-mix(in srgb,var(--glass-highlight) calc(var(--bg) * 100%),transparent),inset 0 0 0 1px color-mix(in srgb,var(--glass-edge) calc(var(--bg) * 100%),transparent),0 14px 40px -16px rgb(0 0 0 / calc(var(--bg) * .25));
  transition:height .55s var(--ease),border-radius .55s var(--ease),background-color .4s var(--ease),box-shadow .4s var(--ease)}
.n-nav[data-open="1"]::before{height:100%;border-radius:32px}
/* one 1px outline for the whole island (bar, chapter row and menu), so the join between bar and row is a single thin line */
.n-nav::after{content:"";position:absolute;inset:0;z-index:1;border-radius:26px;pointer-events:none;box-shadow:inset 0 0 0 1px rgb(var(--ink-rgb) / calc(var(--bg) * .1));transition:border-radius .55s var(--ease)}
.n-nav[data-open="1"]::after{border-radius:32px}
.n-nav[data-open="1"]{border-radius:32px;--bg:1!important;--fg:1!important}
.n-nav[data-chap="1"]{--chh:34px}
.n-nav[data-chap="1"][data-open="0"]::before{border-radius:28px 28px 0 0}
.n-nav[data-mode="menu"]{--chh:0px}
.n-nav .n-glass{background:none;border:0;box-shadow:none;-webkit-backdrop-filter:none;backdrop-filter:none}
.n-logo{grid-column:1;grid-row:1;justify-self:start;height:56px;padding:0 6px 0 18px}
.n-logo img{height:18px}
.n-links{display:none}
.n-nav-r{grid-column:2;grid-row:1;gap:2px;padding-right:6px}
.n-nav-r>.n-theme,.n-nav-r>.n-theme-seg{display:none}
@media(min-width:760px){.n-nav-r>.n-theme-seg{display:flex}}
.n-nav-r .n-nav-cta{margin-right:4px}
/* the nav button is the design system's sm size on phones and md from tablet up */
/* sm while the nav is a plain bar over the hero, md once the chapter row has dropped in */
@media(max-width:759px){.n-nav-r .n-nav-cta{height:36px;padding:0 12px}.n-nav[data-chap="1"] .n-nav-r .n-nav-cta{height:40px;padding:0 16px}}
@media(max-width:759px){.n-nav-r .n-nav-cta{transition:opacity .4s var(--ease) .3s,visibility 0s,transform 160ms cubic-bezier(.65,0,.35,1),height .3s var(--ease),padding .3s var(--ease)}.n-nav[data-mode="menu"] .n-nav-r .n-nav-cta{opacity:0;visibility:hidden;pointer-events:none;transition:opacity .15s var(--ease),visibility 0s .15s,transform 160ms cubic-bezier(.65,0,.35,1)}}
.n-menu{display:grid;place-items:center;width:44px;height:44px;padding:0;border:0;cursor:pointer;color:color-mix(in srgb,#fff calc((1 - var(--fg)) * 100%),var(--ink));transition:transform 160ms var(--ease)}
.n-menu{position:relative}
.n-menu::before{content:"";position:absolute;inset:4px;border-radius:50%;background:rgb(var(--ink-rgb) / .1);scale:0;transition:scale .5s cubic-bezier(.34,1.56,.64,1)}
.n-menu[aria-expanded="true"]::before{scale:1}
.n-menu span{position:relative;display:block;width:20px;height:12px}
.n-menu i{position:absolute;right:0;height:2px;border-radius:2px;background:currentColor;transition:transform .55s cubic-bezier(.34,1.56,.64,1),top .4s var(--ease),left .4s var(--ease)}
.n-menu i:first-child{top:1px;left:0}
.n-menu i:last-child{top:9px;left:8px}
@media(hover:hover) and (pointer:fine){.n-menu:hover i:last-child{left:0}}
.n-menu[aria-expanded="true"] i:first-child{top:5px;left:0;transform:rotate(45deg)}
.n-menu[aria-expanded="true"] i:last-child{top:5px;left:0;transform:rotate(-45deg)}
.n-menu:active{transform:scale(.92)}
.n-menu:focus-visible{outline:2px solid var(--ink);outline-offset:-2px}
.n-prog{display:block;position:absolute;left:28px;right:28px;top:54px;height:2px;border-radius:2px;background:var(--green);transform-origin:left;transform:scaleX(var(--sp,0));opacity:0;transition:opacity .4s var(--ease) .25s}
.n-nav[data-chap="1"]:not([data-open="1"]) .n-prog{opacity:.9}
.n-nav[data-open="1"] .n-prog{opacity:0}
.n-chap{grid-column:1 / -1;grid-row:2;align-self:start;display:flex;align-items:center;gap:9px;width:100%;height:34px;padding:0 18px;border:0;border-radius:0 0 28px 28px;cursor:pointer;overflow:hidden;white-space:nowrap;font:inherit;font-size:12.5px;font-weight:600;letter-spacing:-.005em;text-align:left;color:var(--ink);
  background:rgb(var(--surface-rgb) / .6);-webkit-backdrop-filter:blur(40px) saturate(1.5);backdrop-filter:blur(40px) saturate(1.5);
  box-shadow:inset 0 2px 0 var(--glass-highlight),inset 0 0 0 1px var(--glass-edge),0 14px 40px -16px rgb(0 0 0 / .25);
  visibility:hidden;clip-path:inset(0 -40px 100% -40px);transition:clip-path .9s cubic-bezier(.45,.05,.25,1),opacity .3s var(--ease),visibility 0s linear .9s,background-color .4s var(--ease),box-shadow .4s var(--ease)}
.n-nav[data-chap="1"] .n-chap{visibility:visible;clip-path:inset(0 -40px -40px -40px);transition:clip-path .95s cubic-bezier(.45,.05,.25,1),opacity .3s var(--ease),background-color .4s var(--ease),box-shadow .4s var(--ease)}
.n-nav[data-open="1"] .n-chap{background:none;-webkit-backdrop-filter:none;backdrop-filter:none;box-shadow:inset 0 1px 0 rgb(var(--ink-rgb) / .1);border-radius:0;color:var(--ink)}
.n-chap i{flex:none;width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 0 3px rgb(var(--green-rgb) / .28)}
.n-chap-t{animation:n-chap-in .45s var(--ease)}
.n-chap em{margin-left:auto;font-style:normal;font-weight:500;color:var(--ink3);font-variant-numeric:tabular-nums}
.n-chap svg{flex:none;width:15px;height:15px;color:var(--ink3);transition:transform .4s var(--ease)}
.n-chap[aria-expanded="true"] svg{transform:rotate(180deg)}
.n-chap:focus-visible{outline:2px solid var(--ink);outline-offset:-3px}
.n-nav[data-mode="menu"] .n-chap{opacity:0;pointer-events:none}
@keyframes n-chap-in{from{transform:translateY(7px);filter:blur(4px);opacity:0}}
.n-scrim{display:block;position:fixed;inset:0;z-index:49;background:rgb(0 0 0 / .4);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);opacity:0;visibility:hidden;transition:opacity .4s var(--ease),visibility 0s linear .4s}
.n-scrim[data-open="1"]{opacity:1;visibility:visible;transition:opacity .4s var(--ease)}
.n-sheet{display:grid;grid-column:1 / -1;grid-row:3;grid-template-rows:0fr;visibility:hidden;color:var(--ink);transition:grid-template-rows .55s var(--ease),visibility 0s linear .55s}
.n-nav[data-open="1"] .n-sheet{grid-template-rows:1fr;visibility:visible;transition:grid-template-rows .55s var(--ease)}
.n-sheet-in{min-height:0;overflow:hidden}
.n-sheet-pad{padding:4px 18px 18px;display:grid}
.n-pane-menu,.n-pane-jump{display:none}
.n-nav[data-pane="menu"] .n-pane-menu,.n-nav[data-pane="jump"] .n-pane-jump{display:grid}
.n-sheet .n-big,.n-sheet .n-sheet-cta,.n-sheet-th,.n-jump{opacity:0;transform:translateY(16px);transition:opacity .25s var(--ease),transform .3s var(--ease)}
.n-nav[data-open="1"] .n-sheet .n-big,.n-nav[data-open="1"] .n-sheet .n-sheet-cta,.n-nav[data-open="1"] .n-sheet-th,.n-nav[data-open="1"] .n-jump{opacity:1;transform:none;transition:opacity .45s var(--ease) calc(.14s + var(--i) * .055s),transform .6s var(--ease) calc(.14s + var(--i) * .055s)}
.n-jump{display:flex;align-items:center;gap:14px;min-height:50px;padding:0;border:0;background:none;font:inherit;font-size:22px;font-weight:600;letter-spacing:-.03em;line-height:1;color:var(--ink2);cursor:pointer;text-align:left}
.n-jump+.n-jump{box-shadow:0 -1px 0 rgb(var(--ink-rgb) / .07)}
.n-jump small{width:22px;font-size:12px;font-weight:500;letter-spacing:.02em;color:var(--ink3);font-variant-numeric:tabular-nums}
.n-jump i{margin-left:auto;width:8px;height:8px;border-radius:50%;background:var(--green);box-shadow:0 0 0 4px rgb(var(--green-rgb) / .28);scale:0;transition:scale .35s cubic-bezier(.34,1.56,.64,1)}
.n-jump.is-on{color:var(--ink)}
.n-jump.is-on i{scale:1}
.n-jump:active span{opacity:.6}
.n-jump:focus-visible{outline:2px solid var(--ink);outline-offset:-2px;border-radius:12px}
.n-nav[data-open="1"] .n-jump{transition-delay:calc(.06s + var(--i) * .028s)}
.n-jump-top{margin-top:6px;min-height:46px;font-size:15px;font-weight:500;color:var(--ink3)}
.n-jump-top svg{width:18px;height:18px;margin-left:auto}
[data-chapter]{scroll-margin-top:96px}
.n-big{display:flex;align-items:center;gap:14px;min-height:62px;padding:0;font-size:32px;font-weight:600;letter-spacing:-.04em;line-height:1;color:var(--ink)}
.n-big+.n-big{box-shadow:0 -1px 0 rgb(var(--ink-rgb) / .08)}
.n-big small{width:22px;font-size:12px;font-weight:500;letter-spacing:.02em;color:var(--ink3);font-variant-numeric:tabular-nums}
.n-big svg{width:20px;height:20px;margin-left:auto;color:var(--ink3)}
.n-big:active span{opacity:.6}
.n-big:focus-visible{outline:2px solid var(--ink);outline-offset:-2px;border-radius:12px}
.n-sheet-cta{width:100%;margin-top:10px}
.n-sheet-cta svg{width:18px;height:18px}
.n-sheet-th{display:flex;align-items:center;justify-content:space-between;min-height:54px;margin-top:8px;padding:0 8px 0 18px;border:0;border-radius:18px;background:rgb(var(--ink-rgb) / .06);font:inherit;font-size:15px;font-weight:500;color:var(--ink2);cursor:pointer;text-align:left}
.n-sheet-pill{display:grid;place-items:center;width:38px;height:38px;border-radius:50%;background:rgb(var(--ink-rgb) / .09);color:var(--ink)}
.n-sheet-pill svg{width:17px;height:17px}
.n-sheet-pill .i-sun{display:var(--sun-d)}.n-sheet-pill .i-moon{display:var(--moon-d)}
}
@media(min-width:960px){.n .en-sticky{top:128px;height:min(660px,calc(100vh - 152px))}}
/* tablet and desktop (760px and up): a separate frosted chapter pill sits just below the centre link pill and opens the jump list as its own dropdown card */
@media(min-width:760px){
.n-links{position:absolute;left:50%;translate:-50% 0;width:auto;justify-content:center}
.n-links{padding:3px;gap:2px}
.n-links a{flex:0 0 auto;justify-content:center;height:100%;padding:0 12px;white-space:nowrap}
.n-links a:nth-child(2){display:none}
@media(min-width:900px){.n-links a:nth-child(2){display:inline-flex}}
.n-nav[data-open="1"] .n-links{--bg:1;--fg:1}
.n-prog{display:block;position:absolute;z-index:3;left:calc(50% - 110px);width:220px;top:79px;height:2px;border-radius:2px;background:var(--green);transform-origin:left;transform:scaleX(var(--sp,0));opacity:0;pointer-events:none;transition:opacity .4s var(--ease)}
.n-nav[data-chap="1"]:not([data-open="1"]) .n-prog{opacity:.95}
.n-chap{display:flex;align-items:center;gap:9px;position:absolute;top:48px;left:50%;translate:-50% 0;width:300px;height:34px;padding:0 18px;border:0;border-radius:99px;cursor:pointer;overflow:hidden;white-space:nowrap;font:inherit;font-size:12.5px;font-weight:600;letter-spacing:-.005em;text-align:left;color:var(--ink);
  background:rgb(var(--surface-rgb) / .66);-webkit-backdrop-filter:blur(40px) saturate(1.5);backdrop-filter:blur(40px) saturate(1.5);
  box-shadow:inset 0 2px 0 var(--glass-highlight),inset 0 0 0 1px var(--glass-edge),0 14px 36px -16px rgb(0 0 0 / .22);
  opacity:0;visibility:hidden;transform:translateY(-4px);transition:opacity .4s var(--ease),transform .5s var(--ease),visibility 0s linear .4s,background-color .3s var(--ease)}
.n-nav[data-chap="1"] .n-chap{opacity:1;visibility:visible;transform:none;transition:opacity .4s var(--ease),transform .5s var(--ease),background-color .3s var(--ease)}
.n-nav[data-open="1"] .n-chap{background:var(--surface);-webkit-backdrop-filter:none;backdrop-filter:none}
@media(hover:hover) and (pointer:fine){.n-nav:not([data-open="1"]) .n-chap:hover{background:rgb(var(--surface-rgb) / .8)}}
.n-chap i{flex:none;width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 0 3px rgb(var(--green-rgb) / .28)}
.n-chap-t{animation:n-chap-in .45s var(--ease)}
.n-chap em{margin-left:auto;font-style:normal;font-weight:500;color:var(--ink3);font-variant-numeric:tabular-nums}
.n-chap svg{flex:none;width:15px;height:15px;color:var(--ink3);transition:transform .4s var(--ease)}
.n-chap[aria-expanded="true"] svg{transform:rotate(180deg)}
.n-chap:focus-visible{outline:2px solid var(--ink);outline-offset:-3px}
.n-sheet{display:grid;position:absolute;top:90px;left:50%;translate:-50% 0;width:300px;grid-template-rows:0fr;visibility:hidden;overflow:hidden;border-radius:22px;background:var(--surface);color:var(--ink);
  box-shadow:inset 0 0 0 1px rgb(var(--ink-rgb) / .1),0 28px 48px -22px rgb(0 0 0 / .55);transition:grid-template-rows .5s var(--ease),visibility 0s linear .5s}
.n-nav[data-open="1"] .n-sheet{grid-template-rows:1fr;visibility:visible;transition:grid-template-rows .5s var(--ease)}
.n-sheet-in{min-height:0;overflow:hidden}
.n-sheet-pad{padding:8px 18px 14px;display:grid}
.n-pane-menu{display:none!important}
.n-pane-jump{display:grid}
.n-jump{display:flex;align-items:center;gap:14px;min-height:46px;padding:0;border:0;background:none;font:inherit;font-size:19px;font-weight:600;letter-spacing:-.03em;line-height:1;color:var(--ink2);cursor:pointer;text-align:left;opacity:0;transform:translateY(12px);transition:opacity .25s var(--ease),transform .3s var(--ease),color .2s}
.n-nav[data-open="1"] .n-jump{opacity:1;transform:none;transition:opacity .4s var(--ease) calc(.06s + var(--i) * .028s),transform .5s var(--ease) calc(.06s + var(--i) * .028s),color .2s}
.n-jump+.n-jump{box-shadow:0 -1px 0 rgb(var(--ink-rgb) / .07)}
.n-jump small{width:22px;font-size:12px;font-weight:500;letter-spacing:.02em;color:var(--ink3);font-variant-numeric:tabular-nums}
.n-jump i{margin-left:auto;width:8px;height:8px;border-radius:50%;background:var(--green);box-shadow:0 0 0 4px rgb(var(--green-rgb) / .28);scale:0;transition:scale .35s cubic-bezier(.34,1.56,.64,1)}
.n-jump.is-on{color:var(--ink)}.n-jump.is-on i{scale:1}
@media(hover:hover) and (pointer:fine){.n-jump:hover{color:var(--ink)}}
.n-jump:focus-visible{outline:2px solid var(--ink);outline-offset:-2px;border-radius:12px}
.n-jump-top{margin-top:4px;min-height:42px;font-size:14px;font-weight:500;color:var(--ink3)}
.n-jump-top svg{width:17px;height:17px;margin-left:auto}
[data-chapter]{scroll-margin-top:112px}
}
@media(prefers-reduced-motion:reduce){.n-nav,.n-sheet,.n-sheet .n-big,.n-sheet .n-sheet-cta,.n-sheet-th,.n-chap{transition:none!important;animation:none!important}}


/* buttons: brand green, navy text */
.n a[data-slot="button"]:is([data-variant="primary"]),.n a[data-slot="button"]:is([data-variant="primary"]):hover,.n a[data-slot="button"]:is([data-variant="primary"]):focus-visible,.n a[data-slot="button"]:is([data-variant="primary"]):visited{color:var(--on-green)}
.n-link:focus-visible,.n-card-a:focus-visible{outline:2px solid var(--ink);outline-offset:3px}
.n-link{display:inline-flex;align-items:center;gap:6px;font-size:15px;font-weight:600;color:var(--ink);border-bottom:1px solid var(--line);padding-bottom:2px;transition:border-color .15s var(--ease)}
.n-link:hover{border-color:var(--ink)}

/* hero */
.n-hero{position:relative;padding:8px 8px 0;z-index:2}
.n-hero-card{position:relative;overflow:hidden;max-width:1920px;margin-inline:auto;min-height:min(calc(100svh - 24px),820px);border-radius:36px;background:#000;color:#fff;display:flex;flex-direction:column;justify-content:flex-end;padding:112px 24px 88px}
@media(min-width:640px){.n-hero-card{padding-inline:48px}}
.n-hero-card>img,.n-hero-card>video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 22%}
.n-hero-shade{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,.5) 0%,rgba(0,0,0,.2) 38%,rgba(0,0,0,.7) 100%)}
.n-hero-body{position:relative;display:grid;gap:32px;align-items:end}
@media(min-width:960px){.n-hero-body{grid-template-columns:1.7fr 1fr;gap:48px}}
.n-chip{display:flex;width:fit-content;align-items:center;gap:6px;height:32px;margin-bottom:20px;padding:0 12px;font-size:12px;font-weight:500;color:#fff;background:rgba(255,255,255,.15);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.2);border-radius:999px}
.n-chip svg{width:12px;height:12px}
/* chip: default whitish border; a long green light trail (75% of the outline) orbits it at constant speed
   (offset-distance moves by arc length, so the speed is the same on every edge). */
.n-chip{position:relative;isolation:isolate;border-color:rgba(255,255,255,.34)}
.n-trail{position:absolute;inset:0;pointer-events:none;border-radius:inherit}
.n-trail i{position:absolute;left:0;top:0;width:var(--s);height:var(--s);border-radius:50%;
  background:radial-gradient(closest-side,rgba(var(--c),var(--o)) 0%,rgba(var(--c),calc(var(--o) * .85)) 42%,rgba(var(--c),0) 100%);
  offset-path:inset(0 round 14px);offset-anchor:50% 50%;offset-rotate:0deg;offset-distance:0%;
  animation:n-orbit 7.5s linear infinite;animation-delay:calc(var(--k) * var(--lag) - 7.5s)}
@keyframes n-orbit{from{offset-distance:0%}to{offset-distance:100%}}
@media(prefers-reduced-motion:reduce){.n-trail i{animation:none;offset-distance:calc(80% - var(--k) * .5%)}}
.n-h1{font-size:clamp(44px,6.6vw,96px);line-height:.98;letter-spacing:-.04em;font-weight:600;color:#fff}
.n-h1 span{display:block;white-space:nowrap}
.n-h1 span:first-child{color:rgba(255,255,255,.55)}
.n-hero-copy p{font-size:clamp(17px,1.5vw,20px);line-height:1.5;color:rgba(255,255,255,.78);max-width:40ch}
.n-hero-copy p b{color:#fff;font-weight:600}
.n-hero-copy .n-row{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px}
@media(max-width:639px){
.n-hero-card{padding:96px 20px 84px}
.n-hero-shade{background:linear-gradient(to bottom,rgba(0,0,0,.5) 0%,rgba(0,0,0,.08) 28%,rgba(0,0,0,.5) 52%,rgba(0,0,0,.9) 100%)}
.n-hero-body{gap:22px}
.n-chip{height:34px;margin-bottom:16px;font-size:12.5px}
.n-h1{font-size:clamp(30px,10.8vw,52px);line-height:1;text-shadow:0 2px 24px rgba(0,0,0,.45)}
.n-h1 span:first-child{color:rgba(255,255,255,.72)}
.n-hero-copy p{font-size:16.5px;line-height:1.5;color:rgba(255,255,255,.86);text-shadow:0 1px 14px rgba(0,0,0,.5)}
.n-hero-copy .n-row{flex-direction:column;gap:10px;margin-top:22px}
.n-hero-copy .n-row [data-slot="button"]{width:100%}
}
.n-stock{position:absolute;left:50%;bottom:20px;transform:translateX(-50%);display:inline-flex;align-items:center;gap:8px;height:34px;padding:0 16px;font-size:13px;font-weight:500;color:#fff;background:rgba(0,0,0,.35);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.18);border-radius:999px;white-space:nowrap}
.n-stock i{width:8px;height:8px;border-radius:50%;background:var(--green)}
@media(max-width:560px){.n-stock{font-size:12px;padding:0 12px;height:30px}}

/* overlapping sections (cutouts) */
.n-under{position:relative;z-index:1;margin-top:-32px;padding:0 8px}
.n-under>.n-under-in{padding:64px 0 0}
@media(max-width:639px){.n-under>.n-under-in{padding:88px 0 8px}}
.n-under>div{max-width:1920px;margin-inline:auto;overflow:hidden;border-radius:0 0 28px 28px;background:var(--paper2);padding:104px 24px 64px;text-align:center}
.n-h2{font-size:clamp(32px,4.2vw,56px);line-height:1.06;letter-spacing:-.03em;font-weight:600;text-wrap:balance}
.n-lede{font-size:clamp(17px,1.5vw,20px);line-height:1.5;color:var(--ink2);text-wrap:pretty}
.n-logos{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:28px 48px;margin:48px auto 0;max-width:1100px}
.n-logos img{height:36px;width:auto;max-width:150px;object-fit:contain;filter:grayscale(1) brightness(.35);opacity:.8}
.n-tags{display:flex;flex-wrap:wrap;justify-content:center;gap:8px 24px;margin-top:40px;font-size:14px;color:var(--ink2)}
.n-sec{padding:64px 0}
@media(min-width:640px){.n-sec{padding:96px 0}}
.n-head{max-width:760px}
.n-head .n-lede{margin-top:20px;max-width:52ch}

/* cards */
.n-card{position:relative;overflow:hidden;border-radius:24px;background:var(--paper2);padding:20px;display:flex;flex-direction:column}
@media(min-width:640px){.n-card{border-radius:28px;padding:44px}}
.n-card-dark{background:var(--dark);color:#fff}
.n-card h3{margin:0;font-size:var(--fs-title-lg);line-height:1.2;letter-spacing:-.02em;font-weight:600;text-wrap:balance}
@media(min-width:960px){.n-card.n-c2 h3{font-size:var(--fs-title-lg)}}
.n-card p{margin-top:12px;font-size:var(--fs-body-lg);line-height:1.5;color:var(--ink2);max-width:46ch}
.n-card-dark p{color:rgba(255,255,255,.66)}
.n-k{display:flex;align-items:center;gap:9px;width:fit-content;font-size:14px;line-height:1.4;font-weight:600;letter-spacing:-.005em;color:var(--ink);margin-bottom:14px}
.n-k::before{content:"";flex:none;width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 0 3px rgb(var(--green-rgb) / .28)}
.n .n-card .n-k{margin:0 0 14px;max-width:none;font-size:14px;line-height:1.4}
.n-card-dark .n-k{color:rgba(255,255,255,.82)}.n-card-dark .n-k::before{box-shadow:0 0 0 3px rgb(var(--green-rgb) / .22),0 0 10px rgb(var(--green-rgb) / .5)}
.n-grid2{display:grid;gap:16px;margin-top:56px}
@media(min-width:960px){.n-grid2{grid-template-columns:1fr 1fr}}
.n-bento{display:grid;gap:16px;margin-top:56px}
@media(min-width:960px){.n-bento{grid-template-columns:repeat(6,1fr)}.n-c4{grid-column:span 4}.n-c2{grid-column:span 2}.n-c6{grid-column:span 6}.n-r2{grid-row:span 2}}
.n-checks{display:grid;gap:12px;margin-top:28px}
.n-checks li{display:flex;gap:12px;font-size:17px;line-height:1.45;color:rgba(255,255,255,.82)}
.n-checks li::before{content:"";flex:none;width:6px;height:6px;margin-top:10px;border-radius:2px;background:var(--green)}
.n-card-dark .n-checks{margin-top:auto;padding-top:32px}
.n .n-fb{padding:0}
.n-pt{border-radius:0;overflow:visible;padding:0;color:var(--ink);background:var(--paper)}
.n-pt-in{width:100%;max-width:1360px;margin-inline:auto;padding-inline:20px}

.n-pt-copy{display:grid;align-content:start}
.tr{position:relative;height:240svh}
.tr-stick{position:sticky;top:0;z-index:1;height:100svh;display:grid;place-items:center;overflow:hidden;background:var(--paper);padding:0 28px;contain:layout paint}
@media(max-width:759px){.tr-stick{padding-top:116px}}
@media(min-width:760px){.tr-stick{padding-top:120px}}
@media(min-width:640px){.tr-stick{padding-inline:64px}}
@media(min-width:960px){.tr-stick{padding-inline:13vw}}
.tr-blk{grid-area:1/1;display:grid;place-items:center;width:100%;will-change:transform,opacity}
.tr-b1{opacity:0}
.tr-go{position:absolute;left:50%;bottom:clamp(20px,4svh,40px);translate:-50%;display:grid;justify-items:center;color:var(--ink);opacity:0}
.tr-go svg{width:26px;height:15px;overflow:visible;animation:tr-bob 1.9s cubic-bezier(.45,0,.25,1) infinite}
@keyframes tr-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(6px)}}
.tr-in{width:min(100%,26em);font-size:clamp(34px,3.3vw,48px)}
@media(min-width:960px){.tr-in{width:min(100%,19em);font-size:clamp(36px,3.5vw,56px)}}
.tr-pill{display:inline-flex;align-items:center;margin-bottom:22px;padding:8px 16px;border-radius:99px;box-shadow:inset 0 0 0 1px rgb(var(--ink-rgb) / .2);font-size:15px;font-weight:600;letter-spacing:-.01em;color:var(--ink)}
.n .n-card .tr-t{margin:0;max-width:none;font-size:1em;line-height:1.14;letter-spacing:-.03em;font-weight:600;color:inherit}
.tr-c{color:var(--ink);opacity:.2;transition:opacity .3s ease-out,color .3s ease-out}
.tr-c.on{opacity:1}
.tr-br{display:none}
@media(min-width:960px){.tr-br{display:inline}}
.tr-g.on{color:color-mix(in srgb,var(--green) 55%,var(--green-ink))}
@media(prefers-reduced-motion:reduce){.tr-c{opacity:1}.tr-go{opacity:1}.tr-go svg{animation:none}.tr{height:auto}.tr-stick{position:relative;height:auto;display:grid;gap:12svh;padding-block:12svh}.tr-blk{grid-area:auto}.tr-b1{opacity:1}}
.n-pt .n-k{margin-bottom:14px}
.n-pt .n-h2{font-size:clamp(32px,4.4vw,60px);max-width:18ch}
.n .n-pt .n-pt-lede{margin-top:20px;font-size:clamp(16px,1.5vw,19px);line-height:1.55;max-width:52ch;color:var(--ink2)}
@media(min-width:960px){.n-pt-copy{justify-items:center;text-align:center}.n-pt .n-h2,.n .n-pt .n-pt-lede{margin-inline:auto}}
/* onboarding timeline, scroll-driven: a tall track holds one pinned stage, and scrolling down pans a wide world
   sideways. A puck rides the centre of the line; the line fills behind it, giant numerals drift at half speed and
   a field of specks at 1.4x for depth. Each milestone ignites (a plain transition, class .on) as the puck reaches it.
   The pan is a native scroll-linked transform animation where supported, otherwise Process.tsx writes the same
   transforms; under reduced motion the stage is an ordinary swipeable row. */
.tl{--sp:max(52vw,440px);--top:116px;position:relative;height:340svh}
@media(min-width:760px){.tl{--top:120px}}
.tl,.tl-stick{touch-action:pan-y;overscroll-behavior-x:none}
[data-off],[data-off]::before,[data-off]::after{animation-play-state:paused!important}
@media(pointer:coarse){.tl-fg{display:none}}
.tl-stick{position:sticky;top:0;z-index:1;height:100svh;overflow:hidden;contain:layout paint;background:var(--paper)}
.tl-world,.tl-slow,.tl-fg{position:absolute;top:0;bottom:0;left:0;will-change:transform}
.tl-world{width:calc(100vw + 3 * var(--sp))}
.tl-slow{width:calc(100vw + 1.5 * var(--sp));pointer-events:none}
.tl-fg{width:calc(100vw + 4.2 * var(--sp));pointer-events:none;opacity:.8;background:radial-gradient(circle at 20px 30px,rgb(var(--green-rgb) / .9) 0 1.5px,transparent 2.5px) 0 0/190px 170px,radial-gradient(circle at 90px 120px,rgb(var(--ink-rgb) / .45) 0 1px,transparent 2px) 0 0/130px 150px,radial-gradient(circle at 150px 60px,rgb(var(--green-rgb) / .55) 0 1px,transparent 2px) 0 0/230px 210px;-webkit-mask-image:linear-gradient(90deg,transparent,#000 14%,#000 86%,transparent);mask-image:linear-gradient(90deg,transparent,#000 14%,#000 86%,transparent)}
.tl{--ly:calc(var(--top) + (100svh - var(--top)) * .5)}
.tl-line,.tl-fill{position:absolute;left:50vw;top:var(--ly);width:calc(3 * var(--sp));height:3px;margin-top:-1.5px;border-radius:2px}
.tl-line{background:rgb(var(--ink-rgb) / .14)}
.tl-fill{background:linear-gradient(90deg,rgb(var(--green-rgb) / .2),var(--green));transform-origin:left;transform:scaleX(0);box-shadow:0 0 14px 1px rgb(var(--green-rgb) / .6)}
.tl-num{position:absolute;bottom:3svh;left:calc(50vw + var(--m) * .5 * var(--sp));translate:-50% 0;font-size:min(calc(var(--sp) * .3),16svh);line-height:.8;font-weight:700;letter-spacing:-.06em;color:transparent;-webkit-text-stroke:1.5px rgb(var(--ink-rgb) / .12);user-select:none}
.tl-puck{position:absolute;left:50%;top:var(--ly);z-index:4;width:46px;height:46px;margin:-23px 0 0 -23px;display:grid;place-items:center;border-radius:50%;background:var(--green);box-shadow:0 0 0 6px rgb(var(--green-rgb) / .22),0 0 30px 6px rgb(var(--green-rgb) / .55);pointer-events:none}
.tl-puck img{width:24px;height:24px}
.tl-in{position:absolute;left:50vw;top:var(--top);bottom:calc(100svh - var(--ly) + 34px);width:min(84vw,520px);translate:-50% 0;display:grid;align-content:end;justify-items:center;gap:12px;text-align:center}
.tl-in b{font-size:clamp(30px,8.4vw,58px);line-height:1.04;font-weight:600;letter-spacing:-.04em;text-wrap:balance}
.tl-in span{max-width:26ch;font-size:clamp(15px,1.5vw,18px);color:var(--ink2);text-wrap:balance}
.tl-hint{position:absolute;left:50vw;top:calc(var(--ly) + 46px);translate:-50% 0;display:grid;justify-items:center;gap:6px;font-size:14px;font-weight:600;color:var(--ink2)}
.tl-hint svg{width:18px;height:18px;animation:tl-nudge 1.6s cubic-bezier(.45,0,.25,1) infinite}
@keyframes tl-nudge{50%{transform:translateX(7px)}}
.tl-ms{position:absolute;top:0;bottom:0;width:0;left:calc(50vw + var(--m) * var(--sp));--d:0s}
.tl-node{position:absolute;left:0;top:var(--ly);z-index:2;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;background:var(--paper);box-shadow:inset 0 0 0 3px var(--unlit);transition:background-color .4s ease,box-shadow .5s ease}
.tl-ms.on .tl-node{background:var(--green);box-shadow:inset 0 0 0 3px var(--green),0 0 0 6px rgb(var(--green-rgb) / .25),0 0 20px 3px rgb(var(--green-rgb) / .75)}
.tl-vis{--w:min(84vw,440px,44svh);position:absolute;left:0;bottom:calc(100svh - var(--ly) + 34px);width:var(--w);aspect-ratio:4/3;translate:-50% 0;container-type:inline-size;display:grid;place-items:center;opacity:.35;transition:opacity .6s ease,scale .7s cubic-bezier(.22,1,.36,1);scale:.94}
.tl-ms.on .tl-vis{opacity:1;scale:1}
.tl-txt{position:absolute;left:0;top:calc(var(--ly) + 46px);width:min(84vw,420px);translate:-50% 0;display:grid;justify-items:center;text-align:center;opacity:.4;transition:opacity .6s ease}
.tl-ms.on .tl-txt{opacity:1}
.tl-no{font-family:var(--font-mono-n,ui-monospace,monospace);font-size:13px;letter-spacing:.06em;color:var(--green-deep)}
.tl-h{display:block;margin-top:6px;font-size:clamp(24px,6.4vw,34px);line-height:1.08;font-weight:600;letter-spacing:-.03em;text-wrap:balance}
@media(min-width:760px){.tl-h{font-size:clamp(26px,2.4vw,36px)}}
.tl-d{display:block;margin-top:8px;max-width:30ch;font-size:clamp(15px,1.4vw,18px);line-height:1.4;color:var(--ink3);text-wrap:pretty}
@keyframes tl-pan{to{transform:translate3d(calc(-3 * var(--sp)),0,0)}}
@keyframes tl-pan-slow{to{transform:translate3d(calc(-1.5 * var(--sp)),0,0)}}
@keyframes tl-pan-fast{to{transform:translate3d(calc(-4.2 * var(--sp)),0,0)}}
@keyframes tl-fillx{to{transform:scaleX(1)}}
@supports (animation-timeline:view()){
  .tl-world,.tl-slow,.tl-fg,.tl-fill{animation-timing-function:linear;animation-fill-mode:both;animation-timeline:scroll(root block);animation-range:var(--a,0px) var(--b,1px)}
  .tl-world{animation-name:tl-pan}.tl-slow{animation-name:tl-pan-slow}.tl-fg{animation-name:tl-pan-fast}.tl-fill{animation-name:tl-fillx}
}
.tl.nat{height:auto}
.tl.nat,.tl.nat .tl-stick{touch-action:auto}
.tl.nat .tl-stick{position:relative;overflow-x:auto;overflow-y:hidden;contain:none;scroll-snap-type:x proximity;scrollbar-width:none}
.tl.nat .tl-world,.tl.nat .tl-slow,.tl.nat .tl-fg,.tl.nat .tl-fill{animation:none!important;transform:none}
.tl.nat .tl-fill{transform:scaleX(1)}
.tl.nat .tl-puck,.tl.nat .tl-fg,.tl.nat .tl-hint{display:none}
.tl.nat .tl-ms{scroll-snap-align:center}
.tl.nat .tl-vis,.tl.nat .tl-txt{opacity:1;scale:1}
/* scene 1: your setup moves across */
.tl-mv{width:86%;display:grid;grid-template-columns:1fr 8cqw 1fr;align-items:center}
.tl-col{display:grid;gap:2.4cqw;align-content:center}
.tl-col>em{font-style:normal;font-size:3.2cqw;font-weight:600;color:var(--ink2);margin-bottom:.4cqw}
.tl-it{display:flex;align-items:center;gap:2cqw;height:7.6cqw;padding:0 2.4cqw;border-radius:2.6cqw;background:rgb(var(--ink-rgb) / .06);font-size:3.3cqw;font-weight:600;color:var(--ink)}
.tl-it svg{width:3.6cqw;height:3.6cqw;flex:none}
.tl-from .tl-it{transition:opacity .5s ease calc(var(--d) + .5s + var(--k) * .22s)}
.tl-ms.on .tl-from .tl-it{opacity:.28}
.tl-to .tl-it{opacity:0;transform:translateX(-9cqw);transition:opacity .5s ease calc(var(--d) + .5s + var(--k) * .22s),transform .7s cubic-bezier(.22,1,.36,1) calc(var(--d) + .5s + var(--k) * .22s)}
.tl-ms.on .tl-to .tl-it{opacity:1;transform:none;background:rgb(var(--green-rgb) / .2);box-shadow:inset 0 0 0 1px rgb(var(--green-rgb) / .55)}
.tl-ar{justify-self:center;width:5cqw;height:5cqw;color:var(--ink2)}
/* scene 2: a call away */
.tl-call{position:relative;display:grid;justify-items:center;gap:3.4cqw}
.tl-av{position:relative;display:flex;align-items:center}
.tl-av i{display:block;width:17cqw;height:17cqw;border-radius:50%;box-shadow:0 0 0 1.2cqw var(--paper)}
.tl-av i+i{margin-left:-4.6cqw}
.tl-av .a0{background:radial-gradient(circle at 30% 30%,#fff,#9db8ff 55%,#7ea0f5)}
.tl-av .a1{background:radial-gradient(circle at 30% 30%,#fff,#a4e8c1 55%,#6fd1a0)}
.tl-av .a2{background:radial-gradient(circle at 30% 30%,#fff,#d6a8ff 55%,#a86bf0)}
.tl-av .more{display:grid;place-items:center;background:var(--surface);font-style:normal;font-size:4cqw;font-weight:600;color:var(--ink)}
.tl-ph{position:absolute;right:-3cqw;top:-4cqw;display:grid;place-items:center;width:8.6cqw;height:8.6cqw;border-radius:50%;background:var(--green);color:var(--on-green);box-shadow:0 0 0 1.2cqw var(--paper);transform:scale(0);transition:transform .5s cubic-bezier(.34,1.56,.64,1) calc(var(--d) + .4s)}
.tl-ms.on .tl-ph{transform:scale(1)}
.tl-ph svg{width:55%;height:55%}
.tl-ring{position:absolute;left:50%;top:calc(50% - 4cqw);width:34cqw;height:34cqw;margin:-17cqw 0 0 -17cqw;border-radius:50%;box-shadow:inset 0 0 0 .5cqw rgb(var(--green-rgb) / .7);opacity:0}
.tl-ms.on .tl-ring{animation:tl-ring 2.6s cubic-bezier(.22,1,.36,1) calc(var(--d) + .9s) infinite}
.tl-ring+.tl-ring{animation-delay:calc(var(--d) + 1.8s)!important}
@keyframes tl-ring{0%{opacity:.9;transform:scale(.5)}100%{opacity:0;transform:scale(1.5)}}
.tl-bub{padding:2.2cqw 4.2cqw;border-radius:99px;background:#fff;color:#0A0A0A;font-size:3.8cqw;font-weight:600;box-shadow:0 1.4cqw 4cqw -1cqw rgb(0 0 0 / .4);opacity:0;transform:translateY(3cqw) scale(.9);transition:opacity .4s ease calc(var(--d) + .9s),transform .6s cubic-bezier(.34,1.56,.64,1) calc(var(--d) + .9s)}
.tl-ms.on .tl-bub{opacity:1;transform:none}
.tl-gl{font-size:3.2cqw;color:var(--ink2)}
/* scene 3: you and the team build it together. A seat map fills in section by section, two named cursors taking
   turns (yours in green, ours in blue); when the last section lands the map goes Live. */
.tl-co{position:absolute;inset:0}
.tl-co svg.map{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.tl-rk{fill:none;stroke:rgb(var(--ink-rgb) / .16);stroke-width:1.2}
.bk{fill:rgb(var(--ink-rgb) / .06);stroke:rgb(var(--ink-rgb) / .16);stroke-width:1.2;transition:fill .45s ease var(--t),stroke .45s ease var(--t)}
.tl-ms.on .bk.y{fill:rgb(var(--green-rgb) / .5);stroke:var(--green)}
.tl-ms.on .bk.t{fill:color-mix(in srgb,var(--seat) 55%,transparent);stroke:color-mix(in srgb,var(--seat) 70%,#fff)}
.tl-cu{position:absolute;left:0;top:0;display:flex;align-items:flex-start;gap:.4cqw;opacity:0;translate:50cqw 38cqw;pointer-events:none;z-index:3}
.tl-cu svg{width:4.6cqw;height:4.6cqw;flex:none;filter:drop-shadow(0 .4cqw .8cqw rgb(0 0 0 / .4))}
.tl-cu em{margin-top:3.4cqw;padding:.7cqw 2cqw;border-radius:99px;font-style:normal;font-size:2.9cqw;font-weight:600;white-space:nowrap}
.tl-cu.y svg{color:var(--green)}.tl-cu.y em{background:var(--green);color:var(--on-green)}
.tl-cu.t svg{color:var(--seat)}.tl-cu.t em{background:var(--seat);color:#fff}
.tl-ms.on .tl-cu.y{animation:tl-cu-y 4s cubic-bezier(.45,0,.25,1) both}
.tl-ms.on .tl-cu.t{animation:tl-cu-t 4s cubic-bezier(.45,0,.25,1) .32s both}
@keyframes tl-cu-y{0%{opacity:0;translate:50cqw 38cqw}5%{opacity:1;translate:29cqw 14.5cqw}21%{translate:71cqw 14.5cqw}37%{translate:85.5cqw 46.25cqw}53%{translate:50cqw 60.5cqw}69%{translate:14.5cqw 46.25cqw}88%{opacity:1;translate:14.5cqw 46.25cqw}100%{opacity:0;translate:14.5cqw 46.25cqw}}
@keyframes tl-cu-t{0%{opacity:0;translate:50cqw 38cqw}5%{opacity:1;translate:50cqw 14.5cqw}21%{translate:85.5cqw 28.75cqw}37%{translate:71cqw 60.5cqw}53%{translate:29cqw 60.5cqw}69%{translate:14.5cqw 28.75cqw}88%{opacity:1;translate:14.5cqw 28.75cqw}100%{opacity:0;translate:14.5cqw 28.75cqw}}
.tl-fin{position:absolute;left:50%;top:50%;translate:-50% -50%;display:grid;justify-items:center;gap:1.4cqw;text-align:center;z-index:2}
.tl-pill{display:inline-flex;align-items:center;gap:1.8cqw;padding:1.3cqw 3.8cqw 1.3cqw 3cqw;border-radius:99px;background:rgb(var(--ink-rgb) / .08);box-shadow:inset 0 0 0 1px rgb(var(--ink-rgb) / .18);font-size:4cqw;font-weight:600;letter-spacing:-.01em;color:var(--ink)}
.tl-pill i{width:2.4cqw;height:2.4cqw;border-radius:50%;background:var(--green);box-shadow:0 0 2cqw .5cqw rgb(var(--green-rgb) / .95);animation:tl-blink 1.8s ease-in-out infinite}
@keyframes tl-blink{50%{opacity:.35}}
.tl-fin .tl-pill{opacity:0;transform:scale(.8);transition:opacity .4s ease 3.7s,transform .6s cubic-bezier(.34,1.56,.64,1) 3.7s}
.tl-ms.on .tl-fin .tl-pill{opacity:1;transform:none}
@media(prefers-reduced-motion:reduce){.tl-ms *,.tl-node,.tl-vis,.tl-txt{transition:none!important;animation:none!important}.tl-ms .tl-from .tl-it{opacity:.28}.tl-ms .tl-to .tl-it{opacity:1;transform:none}.tl-ms .tl-ph,.tl-ms .tl-bub{transform:none;opacity:1}.tl-ms .tl-pill{opacity:1;transform:none}.tl-ms .bk.y{fill:rgb(var(--green-rgb) / .5);stroke:var(--green)}.tl-ms .bk.t{fill:color-mix(in srgb,var(--seat) 55%,transparent)}.tl-cu{display:none}.tl-node{background:var(--green)}}

/* phones: no pinning and no sideways pan. The three steps stack down a vertical line, each one lights (class "on",
   set by an IntersectionObserver in Process.tsx) when it reaches the middle of the screen. Plain native scrolling. */
@media(max-width:759px){
  .tl,.tl.nat{height:auto;padding:12px 20px 40px;touch-action:auto}
  .tl-stick,.tl.nat .tl-stick{position:relative;top:auto;height:auto;overflow:visible;contain:none;background:none;touch-action:auto;scroll-snap-type:none}
  .tl-slow,.tl-fg,.tl-puck,.tl-hint,.tl-line,.tl-fill{display:none}
  .tl-world{animation:none!important}
  .tl-world,.tl.nat .tl-world{position:relative;inset:auto;width:auto;display:grid;gap:64px;padding-left:34px;will-change:auto;transform:none}
  .tl-in{position:static;translate:none;width:auto;display:grid;justify-items:start;text-align:left;gap:10px;margin:0 0 -16px -34px}
  .tl-in b{font-size:clamp(30px,9vw,40px)}
  .tl-in span{max-width:30ch}
  .tl-ms{position:relative;inset:auto;left:auto;width:auto;display:grid;gap:20px}
  .tl-ms::before,.tl-ms::after{content:"";position:absolute;left:-27px;top:20px;bottom:-72px;width:3px;margin-left:-1.5px;border-radius:2px}
  .tl-ms::after{background:rgb(var(--ink-rgb) / .14)}
  .tl-ms::before{z-index:1;background:linear-gradient(var(--green),rgb(var(--green-rgb) / .25));box-shadow:0 0 12px 1px rgb(var(--green-rgb) / .5);transform:scaleY(0);transform-origin:top;transition:transform .9s cubic-bezier(.22,1,.36,1) .25s}
  .tl-ms.on::before{transform:scaleY(1)}
  .tl-ms:last-child::before,.tl-ms:last-child::after{display:none}
  .tl-node{left:-35px;top:4px;margin:0;z-index:2}
  .tl-txt{position:static;translate:none;width:auto;order:1;justify-items:start;text-align:left}
  .tl-vis{position:relative;left:auto;bottom:auto;translate:none;order:2;width:100%;max-width:440px;--w:100%}
  .tl-d{max-width:34ch}
}
.n-seats{display:grid;grid-template-columns:repeat(14,1fr);gap:6px;margin-bottom:36px}
.n-seats i{height:22px;border-radius:6px;background:rgb(var(--ink-rgb) / .14)}
.n-seats i.tk{background:rgb(var(--ink-rgb) / .05)}
.n-seats i.sel{background:var(--green)}
.n-wide{display:grid;gap:32px;align-items:center}
@media(min-width:960px){.n-wide{grid-template-columns:minmax(0,1fr) minmax(380px,560px);gap:56px}.n-wide h3{font-size:clamp(30px,3vw,44px)}.n-wide p{font-size:19px;max-width:54ch}.n-ren{padding:32px;gap:26px}.n-ren b{font-size:var(--fs-title-sm)}.n-ren small,.n-ren .n-row2{font-size:var(--fs-body-sm)}}
.n-ren{background:var(--surface);border-radius:20px;padding:24px;display:grid;gap:20px}
.n-ren .n-row2{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;font-size:var(--fs-body-sm);color:var(--ink2)}
.n-ren b{display:block;font-size:var(--fs-title-sm);font-weight:600;color:var(--ink)}
.n-ren small{display:block;margin-top:2px;font-size:var(--fs-body-sm);color:var(--ink2)}
.n-bar{height:6px;border-radius:3px;background:rgb(var(--ink-rgb) / .1);overflow:hidden;margin-top:10px}
.n-bar i{display:block;height:100%;border-radius:3px;background:var(--ink)}

.n p:has(+ .n-pushbtn){margin-bottom:28px}
/* dynamic pricing illustration: one cause and effect (demand rises, so the price rises).
   Bleeds to the top and sides of the dark card; content uses the card's own padding. */
.n .pv{margin:-20px -20px 24px;background:radial-gradient(120% 80% at 50% 0%,rgb(var(--green-rgb) / .09),rgb(var(--green-rgb) / 0) 60%),var(--dark)}
@media(min-width:640px){.n .pv{margin:-44px -44px 28px}}
.n .n-card-dark>.pv{flex:1 1 auto;display:flex;flex-direction:column}
@property --aiv-n{syntax:"<integer>";inherits:false;initial-value:0}
@property --aiv-d{syntax:"<integer>";inherits:false;initial-value:0}
@property --rv-t{syntax:"<number>";inherits:true;initial-value:1}
@property --pr{syntax:"<number>";inherits:true;initial-value:0}
@property --aiv-p{syntax:"<integer>";inherits:false;initial-value:32}
.n .aiv-in{flex:1 1 auto;display:flex;flex-direction:column;padding:20px 20px 0}
@media(min-width:640px){.n .aiv-in{padding:44px 44px 0}}

.n .aiv-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
.n .aiv-title{display:inline-flex;align-items:center;gap:10px;font-size:15px;font-weight:600;line-height:1.25;color:#fff}
.n .aiv-logo{display:grid;place-items:center;width:26px;height:26px;border-radius:8px;background:var(--green);color:var(--on-green);box-shadow:0 0 14px rgb(var(--green-rgb) / .45)}
.n .aiv-logo svg{width:16px;height:16px;animation:aiv-glint 4s ease-in-out infinite}
.n .aiv-note{display:flex;align-items:center;gap:8px;margin-top:16px;font-size:14px;line-height:1.35;color:rgba(255,255,255,.72);opacity:0;animation:aiv-note 6s var(--ease) infinite}
.n .aiv-note svg{flex:none;width:14px;height:14px;color:var(--green)}
@keyframes aiv-note{0%,56%{opacity:0;transform:translateY(6px)}66%,100%{opacity:1;transform:none}}
.n .aiv-status{display:inline-grid;align-items:center;margin-left:auto;font-size:13px;line-height:1.25;color:rgba(255,255,255,.62);text-align:right}
.n .aiv-status>*{grid-area:1/1}
.n .aiv-s{opacity:0}
.n .aiv-s1{animation:aiv-s1 6s ease-in-out infinite}
.n .aiv-s2{animation:aiv-s2 6s ease-in-out infinite}
.n .aiv-s3{animation:aiv-s3 6s ease-in-out infinite}

/* the one story, centred in whatever height the card gives it */
.n .aiv-main{flex:1 1 auto;display:flex;flex-direction:column;justify-content:center;gap:0;padding:36px 0 32px;animation:aiv-fade 6s linear infinite}
.n .aiv-sig{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;container-type:inline-size}
.n .aiv-s-c{display:grid;grid-template-rows:auto auto auto;justify-items:start;gap:3px;min-width:0;padding:12px 12px 13px;border-radius:16px;background:rgba(255,255,255,.04);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1);animation:aiv-sig 6s ease-in-out infinite;animation-delay:calc(var(--k) * .35s)}
.n .aiv-s-i{display:grid;place-items:center;width:24px;height:24px;margin-bottom:6px;border-radius:8px;background:rgb(var(--green-rgb) / .14);color:var(--green)}
.n .aiv-s-i svg{width:14px;height:14px}
.n .aiv-s-c em{font-style:normal;font-size:12px;line-height:1.2;font-weight:500;color:rgba(255,255,255,.58);max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.n .aiv-s-c b{font-size:clamp(15px,5.2cqw,21px);font-weight:600;line-height:1.1;letter-spacing:-.02em;color:#fff;font-variant-numeric:tabular-nums;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}
.n .aiv-dnum{counter-reset:aiv-d var(--aiv-d);animation:aiv-dcount 6s var(--ease) infinite}
.n .aiv-dnum::after{content:counter(aiv-d) "%"}
.n .aiv-wires{display:block;width:100%;height:auto;overflow:visible;margin-top:2px}
.n .aiv-w{fill:none;stroke:rgba(255,255,255,.4);stroke-width:1.4;stroke-linecap:round;stroke-dasharray:4 4;animation:aiv-wire 6s ease-in-out infinite;animation-delay:calc(var(--k) * .3s)}
.n .aiv-dot{fill:var(--green);offset-rotate:0deg;offset-distance:0%;opacity:0;filter:drop-shadow(0 0 5px rgb(var(--green-rgb) / .95));animation:aiv-dot 6s cubic-bezier(.5,0,.3,1) infinite;animation-delay:calc(var(--k) * .3s)}
.n .aiv-orb{position:relative;align-self:center;display:grid;place-items:center;width:56px;height:56px;margin-top:-6px}
.n .aiv-orb::before,.n .aiv-orb::after{content:"";position:absolute;inset:0;border-radius:50%;box-shadow:inset 0 0 0 1.5px rgb(var(--green-rgb) / .55);opacity:0;animation:aiv-orbring 6s ease-out infinite}
.n .aiv-orb::after{animation-delay:.25s}
.n .aiv-orb-core{display:grid;place-items:center;width:44px;height:44px;border-radius:50%;background:radial-gradient(circle at 35% 30%,var(--green-l),var(--green) 55%,var(--green-d));color:var(--on-green);box-shadow:0 0 22px rgb(var(--green-rgb) / .55);animation:aiv-orb 6s ease-in-out infinite}
.n .aiv-orb-core svg{width:22px;height:22px;animation:aiv-glint 4s ease-in-out infinite}
.n .aiv-down{align-self:center;display:block;width:2px;height:20px;margin:-2px 0 -1px;border-radius:1px;background:linear-gradient(var(--green),rgb(var(--green-rgb) / .2));transform-origin:top;transform:scaleY(0);animation:aiv-down 6s var(--ease) infinite}
.n .aiv-tw{filter:drop-shadow(0 0 0 rgb(var(--green-rgb) / 0));animation:aiv-twglow 6s ease-in-out infinite}
.n .aiv-ticket{container-type:inline-size;position:relative;display:grid;grid-template-columns:minmax(0,1fr) 24%;border-radius:18px;background:linear-gradient(180deg,var(--d-1),var(--d-2));box-shadow:inset 0 0 0 1px rgba(255,255,255,.16);-webkit-mask:radial-gradient(circle 9px at 76% 0,#0000 98%,#000) top/100% 51% no-repeat,radial-gradient(circle 9px at 76% 100%,#0000 98%,#000) bottom/100% 51% no-repeat;mask:radial-gradient(circle 9px at 76% 0,#0000 98%,#000) top/100% 51% no-repeat,radial-gradient(circle 9px at 76% 100%,#0000 98%,#000) bottom/100% 51% no-repeat}
.n .aiv-stub{display:grid;place-items:center;border-left:2px dashed rgba(255,255,255,.22);padding:12px 8px}
.n .aiv-stub{position:relative;min-height:112px}
.n .aiv-stub>*{position:absolute;inset:0}
.n .aiv-trow{display:flex;align-items:center;justify-content:space-between;gap:8px}
.n .aiv-sa,.n .aiv-sb{display:grid;place-items:center}
.n .aiv-rot{writing-mode:vertical-rl;transform:rotate(180deg);display:flex;align-items:center;gap:10px;white-space:nowrap;line-height:1}
.n .aiv-rot b{font-size:15px;font-weight:600;letter-spacing:.02em}
.n .aiv-rot i{font-style:normal;font-size:13px;font-weight:500;letter-spacing:.02em}
.n .aiv-bar{display:block;width:44%;max-width:34px;height:auto;max-height:84%;fill:rgba(255,255,255,.72)}
.n .aiv-sb .aiv-rot b{font-size:17px;font-weight:700;color:var(--green)}.n .aiv-sb .aiv-rot i{color:rgba(255,255,255,.6)}
.n .aiv-stubcap{font-size:12px;line-height:1.2;font-weight:600;text-align:center;color:rgba(255,255,255,.6)}
.n .aiv-work{position:absolute;inset:0;border-radius:18px;pointer-events:none;opacity:0;box-shadow:inset 0 0 0 1.5px rgb(var(--green-rgb) / .9),inset 0 0 30px rgb(var(--green-rgb) / .18);background:linear-gradient(105deg,transparent 30%,rgb(var(--green-rgb) / .22) 50%,transparent 70%) 150% 0/250% 100% no-repeat,rgb(var(--green-rgb) / .05);animation:aiv-work 6s ease-in-out infinite}
.n .aiv-tmain{display:flex;flex-direction:column;justify-content:center;gap:6px;padding:16px 8px 18px 20px;min-width:0}
.n .aiv-tlabel{font-size:15px;line-height:1.3;color:rgba(255,255,255,.7)}
.n .aiv-chip{font-size:13px;font-weight:600;line-height:1;padding:5px 8px;border-radius:99px;background:var(--green);color:var(--on-green);white-space:nowrap;opacity:0;animation:aiv-chip 6s var(--ease) infinite}
.n .aiv-tprice{display:flex;align-items:baseline;gap:8px;color:#fff}
.n .aiv-money{font-size:clamp(34px,15cqw,56px);font-weight:600;line-height:1;letter-spacing:-.03em;font-variant-numeric:tabular-nums}
.n .aiv-pnum{counter-reset:aiv-p var(--aiv-p);animation:aiv-pcount 6s var(--ease) infinite}
.n .aiv-pnum::after{content:counter(aiv-p)}
.n .aiv-per{font-size:clamp(12px,4.4cqw,15px);line-height:1.3;white-space:nowrap;color:rgba(255,255,255,.6)}
.n .aiv-stub{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;border-left:2px dashed rgba(255,255,255,.22);font-size:13px;font-weight:600;color:rgba(255,255,255,.7)}
.n .aiv-spark{display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:var(--green);color:var(--on-green);animation:aiv-pop 6s var(--ease) infinite;box-shadow:0 0 0 0 rgb(var(--green-rgb) / .5)}
.n .aiv-spark svg{width:20px;height:20px}
@keyframes aiv-draw{0%,4%{stroke-dashoffset:100}36%,100%{stroke-dashoffset:0}}
@keyframes aiv-area{0%,6%{opacity:0}36%,100%{opacity:1}}
@keyframes aiv-tip{0%,4%{offset-distance:0%}36%,100%{offset-distance:100%}}
@keyframes aiv-tipring{0%,36%{transform:scale(.6);opacity:0}38%{opacity:.9}50%,100%{transform:scale(2.6);opacity:0}}
@keyframes aiv-link{0%,38%{stroke-dashoffset:100}46%,100%{stroke-dashoffset:0}}
@keyframes aiv-pop{0%,45%{transform:scale(1) rotate(0);box-shadow:0 0 0 0 rgb(var(--green-rgb) / .5)}50%{transform:scale(1.25) rotate(90deg);box-shadow:0 0 0 10px rgb(var(--green-rgb) / 0)}58%,100%{transform:scale(1) rotate(90deg);box-shadow:0 0 0 0 rgb(var(--green-rgb) / 0)}}
@keyframes aiv-pcount{0%,46%{--aiv-p:32}62%,100%{--aiv-p:96}}
@keyframes aiv-chip{0%,60%{opacity:0;transform:translateY(6px)}68%,100%{opacity:1;transform:none}}
.n .aiv-dnum{counter-reset:aiv-d var(--aiv-d);animation:aiv-dcount 6s var(--ease) infinite}
.n .aiv-dnum::after{content:counter(aiv-d) "%"}

@keyframes aiv-sig{0%,4%{box-shadow:inset 0 0 0 1px rgba(255,255,255,.1);background:rgba(255,255,255,.04)}12%,40%{box-shadow:inset 0 0 0 1px rgb(var(--green-rgb) / .6),0 0 18px -6px rgb(var(--green-rgb) / .5);background:rgb(var(--green-rgb) / .08)}56%,100%{box-shadow:inset 0 0 0 1px rgba(255,255,255,.1);background:rgba(255,255,255,.04)}}
@keyframes aiv-wire{0%,12%{stroke:rgba(255,255,255,.4)}20%,46%{stroke:rgb(var(--green-rgb) / .85)}60%,100%{stroke:rgba(255,255,255,.4)}}
@keyframes aiv-dot{0%,14%{offset-distance:0%;opacity:0}18%{opacity:1}40%{offset-distance:100%;opacity:1}44%,100%{offset-distance:100%;opacity:0}}
@keyframes aiv-work{0%,44%{opacity:0;background-position:150% 0,0 0}48%{opacity:1}64%{background-position:-50% 0,0 0}66%{opacity:1}74%,100%{opacity:0;background-position:-50% 0,0 0}}
@keyframes aiv-twglow{0%,44%{filter:drop-shadow(0 0 0 rgb(var(--green-rgb) / 0))}52%,64%{filter:drop-shadow(0 0 16px rgb(var(--green-rgb) / .55))}76%,100%{filter:drop-shadow(0 0 0 rgb(var(--green-rgb) / 0))}}
@keyframes aiv-orb{0%,38%{transform:scale(1);box-shadow:0 0 16px rgb(var(--green-rgb) / .4)}46%{transform:scale(1.14);box-shadow:0 0 38px rgb(var(--green-rgb) / .9)}58%,100%{transform:scale(1);box-shadow:0 0 22px rgb(var(--green-rgb) / .55)}}
@keyframes aiv-orbring{0%,40%{transform:scale(1);opacity:0}44%{opacity:.9}62%,100%{transform:scale(1.9);opacity:0}}
@keyframes aiv-down{0%,44%{transform:scaleY(0)}52%,100%{transform:scaleY(1)}}
@keyframes aiv-dcount{0%,6%{--aiv-d:18}40%,100%{--aiv-d:99}}
@keyframes aiv-fade{0%{opacity:0}6%,92%{opacity:1}100%{opacity:0}}
@keyframes aiv-s1{0%,28%{opacity:1}34%,100%{opacity:0}}
@keyframes aiv-s2{0%,30%{opacity:0}36%,58%{opacity:1}64%,100%{opacity:0}}
@keyframes aiv-s3{0%,60%{opacity:0}66%,90%{opacity:1}96%,100%{opacity:0}}
@keyframes aiv-ring{0%{transform:scale(1);opacity:.7}100%{transform:scale(1.7);opacity:0}}
@media(prefers-reduced-motion:reduce){
  .n .aiv-in *,.n .aiv-in *::after{animation:none!important}
  .n .aiv-pnum{--aiv-p:96}.n .aiv-dnum{--aiv-d:99}
  .n .aiv-down{transform:none}.n .aiv-work{opacity:0}.n .aiv-chip,.n .aiv-note{opacity:1;transform:none}.n .aiv-dot{opacity:0}
  .n .aiv-s1,.n .aiv-s2{opacity:0}.n .aiv-s3{opacity:1}
  .n .aiv-tip-ring{opacity:0}
}

/* recurring revenue panel */
.n .rv{gap:0;padding:4px 16px}
@media(min-width:960px){.n .rv{padding:12px 28px}}
.n .rv-row{display:flex;align-items:center;gap:14px;padding:18px 0}
.n .rv-row{flex-wrap:wrap}
@media(max-width:639px){.n .rv-ico{display:none!important}}
@media(max-width:419px){.n .rv-t{flex-basis:100%}}
.n .rv-ico{display:grid;place-items:center;flex:none;width:40px;height:40px;border-radius:12px;background:var(--paper2);color:var(--ink)}
.n .rv-ico svg{width:20px;height:20px}
.n .rv-t{flex:1 1 120px;min-width:0}
.n .rv-t b{font-size:16px;line-height:1.3}
.n .rv-t small{font-size:14px;line-height:1.4}
.n .rv-tag{display:inline-flex;align-items:center;gap:6px;flex:none;height:30px;padding:0 12px;border-radius:999px;background:var(--paper2);font-size:13px;font-weight:500;color:var(--ink);white-space:nowrap}
.n .rv-tag svg{width:14px;height:14px}
.n .rv-spin{animation:rv-spin 8s linear infinite}
.n .rv-plan{padding:18px 0;border-top:1px solid rgb(var(--ink-rgb) / .08);border-bottom:1px solid rgb(var(--ink-rgb) / .08)}
.n .rv-line{display:flex;align-items:baseline;justify-content:space-between;gap:12px;font-size:14px;color:var(--ink2)}
.n .rv-line b{font-size:16px;font-weight:600;color:var(--ink)}
.n .rv-line em{font-style:normal;font-weight:600;color:var(--ink)}
.n .rv{--pp:clamp(0,calc((var(--rv-t) - .62)/.04),1);--pi:clamp(0,calc((var(--rv-t) - .72)/.03),1);animation:rv-t 8s linear infinite}
.n .rv-pay{display:inline-grid;padding:0;background:none;height:auto}
.n .rv-pay>span{grid-area:1/1;display:inline-flex;align-items:center;justify-content:center;gap:6px;height:30px;padding:0 12px;border-radius:999px;font-size:13px;font-weight:500;white-space:nowrap}
.n .rv-pend{background:rgba(232,163,23,.18);color:var(--warn-ink);opacity:calc(1 - var(--pi))}
.n .rv-pend i{width:8px;height:8px;border-radius:50%;background:var(--warn)}
.n .rv-done{background:rgba(77,154,31,.16);color:var(--green-ink);opacity:var(--pi)}
.n .rv-done path{stroke-dasharray:1;stroke-dashoffset:calc(1 - var(--pi))}
.n .rv-steps,.n .rv-sum,.n .rv-next,.n .rv-pay{animation:rv-wrap 8s ease-in-out infinite}
.n .rv-steps{position:relative;display:flex;justify-content:space-between;margin:20px 0 18px;--p1:clamp(0,calc((var(--rv-t) - .24)/.12),1)}
.n .rv-steps::before,.n .rv-steps::after{content:"";position:absolute;top:10px;left:11px;right:11px;height:2px;border-radius:1px;transform-origin:left}
.n .rv-steps::before{background:rgb(var(--ink-rgb) / .14);transform:scaleX(calc((1 - cos(clamp(0,calc((var(--rv-t) - .02)/.09),1)*3.14159))/2))}
.n .rv-steps::after{background:var(--green-deep);transform:scaleX(calc(var(--p1)*.6 + var(--pp)*.2))}
.n .rv-st{position:relative;z-index:1;width:22px;display:flex;flex-direction:column;align-items:center;gap:8px;font-size:13px;line-height:1;color:var(--ink2);--s:clamp(0,calc((var(--rv-t) - (.07 + var(--i)*.018))/.05),1);opacity:var(--s);transform:translateY(calc((1 - var(--s))*10px))}
.n .rv-st i{position:relative;display:grid;place-items:center;width:22px;height:22px;border-radius:50%;background:var(--surface);border:2px solid rgb(var(--ink-rgb) / .14);color:#fff;box-sizing:border-box}
.n .rv-st i svg{width:12px;height:12px}
.n .rv-st.on{--g:clamp(0,calc((var(--rv-t) - (.24 + var(--i)*.04))/.03),1)}
.n .rv-st.on i{background:color-mix(in srgb,var(--green-deep) calc(var(--g)*100%),var(--surface));border-color:color-mix(in srgb,var(--green-deep) calc(var(--g)*100%),rgb(var(--ink-rgb) / .14));transform:scale(calc(1 + .15*sin(var(--g)*3.14159)))}
.n .rv-st.on svg{opacity:var(--g)}
.n .rv-st.on span{color:color-mix(in srgb,var(--ink) calc(var(--g)*100%),var(--ink2))}
.n .rv-st.next{--a:clamp(0,calc((var(--rv-t) - .40)/.03),1);--k:calc(var(--a) - var(--pp))}
.n .rv-st.next i{background:color-mix(in srgb,var(--green-deep) calc(var(--pp)*100%),color-mix(in srgb,var(--warn) calc(var(--a)*100%),var(--surface)));border-color:color-mix(in srgb,var(--green-deep) calc(var(--pp)*100%),color-mix(in srgb,var(--warn) calc(var(--a)*100%),rgb(var(--ink-rgb) / .14)));transform:scale(calc(1 + .2*sin(var(--pp)*3.14159)));box-shadow:0 0 0 calc(var(--pr)*11px) color-mix(in srgb,var(--warn) calc(var(--k)*(1 - var(--pr))*55%),transparent);animation:rv-pr 2s ease-out infinite}
.n .rv-st.next svg{opacity:var(--pp)}
.n .rv-st.next span{color:var(--ink);font-weight:600}
.n .rv-sw{display:inline-grid;vertical-align:baseline}
.n .rv-sw>*{grid-area:1/1;white-space:nowrap}
.n .rv-sw>:first-child{opacity:calc(1 - var(--pp))}.n .rv-sw>:last-child{opacity:var(--pp)}
.n .rv-sum .rv-sw>*{text-align:left}.n .rv-sum>span:last-child .rv-sw>*{text-align:right}
.n .rv-sum b.rv-sw{display:inline-grid;width:auto;font-size:inherit;font-weight:600}
.n .rv-next .rv-sw{display:grid;min-width:0}.n .rv-next .rv-sw>*{white-space:normal}
.n .rv-sum{display:flex;justify-content:space-between;gap:12px;font-size:14px;color:var(--ink2)}
.n .rv-sum b{display:inline;font-size:inherit;color:var(--ink);font-weight:600}
.n .rv-next{display:flex;align-items:flex-start;gap:10px;margin-top:14px;font-size:14px;line-height:1.35;color:var(--ink)}
.n .rv-dot{flex:none;margin-top:6px;width:8px;height:8px;border-radius:50%;background:color-mix(in srgb,var(--green-deep) calc(var(--pp)*100%),var(--warn))}
@keyframes rv-wrap{0%{opacity:0}4%,90%{opacity:1}97%,100%{opacity:0}}
@keyframes rv-t{0%{--rv-t:0}100%{--rv-t:1}}
@keyframes rv-pr{from{--pr:0}to{--pr:1}}
@keyframes rv-spin{to{transform:rotate(360deg)}}
@media(prefers-reduced-motion:reduce){.n .rv,.n .rv *,.n .rv *::after{animation:none!important}}

/* AI engine scroll showcase */
@property --v{syntax:"<integer>";inherits:false;initial-value:0}
.n .en{margin-top:48px}
.n .en-list{display:grid;grid-template-columns:minmax(0,1fr);gap:16px}
.n .en-li,.n .en-it{min-width:0}
.n .en-it{overflow:hidden;border-radius:24px;background:var(--paper2);padding:20px 16px 0}
.n .en-it h3{font-size:var(--fs-title-lg);line-height:1.15;letter-spacing:-.02em;font-weight:600}
.n .en-body p{margin-top:12px;font-size:var(--fs-body-lg);line-height:1.5;color:var(--ink2)}
.n .en-inline{margin:20px -16px 0}
.n .en-stage{display:none}
.n .en-art{display:flex;flex-direction:column;gap:14px;height:100%;padding:16px;border-radius:20px 20px 0 0;background:var(--surface);overflow:hidden;min-width:0}
.n .a-kpis{margin-top:auto;display:grid;gap:0}
.n .a-kpis>div{display:flex;align-items:baseline;gap:14px;padding:12px 0;border-top:1px solid var(--line)}
.n .a-kpis .n-kv{flex:none;min-width:88px;font-size:22px;line-height:26px}.n .a-kpis .n-kl{margin:0;font-size:var(--fs-body-sm);line-height:1.35}
.n .a-foot{font-size:15px;line-height:1.45;color:var(--ink2)}.n .a-foot b{color:var(--ink);font-weight:600}
/* counters */
.n .en-n{--v:var(--to);counter-reset:en var(--v)}
.n .en-n::after{content:counter(en)}
html.cs .n :is(.en-n,.aiv-dnum,.aiv-pnum)::after{content:none}
.n .en-d{counter-reset:ei calc((var(--v) - mod(var(--v),10))/10) ef mod(var(--v),10)}
.n .en-d::after{content:counter(ei) "." counter(ef)}
@keyframes en-count{from{--v:0}to{--v:var(--to)}}
@keyframes en-rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes en-grow{from{transform:scaleY(0)}to{transform:scaleY(1)}}
@keyframes en-growx{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes en-pop{0%{transform:scale(.6);opacity:0}70%{transform:scale(1.08);opacity:1}100%{transform:none;opacity:1}}
/* 01 ingest */
.n .a1{gap:12px}
.n .a1-drop{position:relative;display:flex;flex-direction:column;align-items:stretch;gap:8px;padding:8px;border:1.5px dashed rgb(var(--ink-rgb) / .22);border-radius:18px;background:var(--paper2)}
.n .a1-file{position:relative;overflow:hidden;flex:1;display:flex;align-items:center;gap:12px;min-width:0;padding:12px 12px 14px;border-radius:12px;background:var(--surface);box-shadow:0 6px 18px -8px rgb(var(--ink-rgb) / .25),0 0 0 1px rgb(var(--ink-rgb) / .06)}
.n .a1-file svg{flex:none;width:22px;height:22px}
.n .a1-file>div{min-width:0;flex:1}.n .a1-file b{display:block;font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.n .a1-file small{display:block;font-size:12px;line-height:1.3;color:var(--ink2)}
.n .a1-st{display:inline-grid;flex:none;margin-left:auto;font-size:13px;font-weight:500}
.n .a1-st>*{grid-area:1/1;display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 12px;border-radius:99px;white-space:nowrap}
.n .a1-pg{position:absolute;left:0;right:0;bottom:0;height:3px;background:var(--green);transform-origin:left;transform:scaleX(1);opacity:0}
@media(max-width:380px){.n .a1-st>*{font-size:0;gap:0;width:28px;padding:0;justify-content:center}.n .a1-st2 svg{width:14px;height:14px}.n .a1-file small{white-space:nowrap}}
.n .a1-st1{background:var(--paper2);color:var(--ink2);opacity:0}.n .a1-st1 i{width:8px;height:8px;border-radius:50%;background:var(--green)}
.n .a1-st2{background:rgb(var(--green-rgb) / .35);color:var(--green-ink)}.n .a1-st2 svg{width:13px;height:13px}
.n .a1-sheet{position:relative;display:flex;flex-direction:column;flex:1 1 auto;border:1px solid var(--line);border-radius:14px;overflow:hidden;font-size:13px;min-height:0;background:var(--surface)}
.n .a1-r{display:grid;grid-template-columns:20px minmax(0,1fr) 40px 56px;align-items:center;column-gap:8px;box-sizing:border-box;height:40px;padding:0 12px;border-top:1px solid var(--line);color:var(--ink);line-height:1;white-space:nowrap;overflow:hidden}
.n .a1-h{height:36px;border-top:0;background:var(--paper2);color:var(--ink2);font-size:13px;font-weight:500}
.n .a1-r>:nth-child(4),.n .a1-r>:nth-child(6){display:none}
.n .a1-hk{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}.n .a1-hk::after{content:"";display:none;width:6px;height:6px;border-radius:50%;background:var(--green-deep)}
.n .a1-ck{display:grid;place-items:center;width:18px;height:18px;line-height:0;border-radius:50%;background:rgb(var(--green-rgb) / .4);color:var(--green-ink)}.n .a1-ck:empty{background:none}
.n .a1-ck svg{width:11px;height:11px}
.n .a1-bad{max-height:0;opacity:0;border-top-width:0}
.n .a1-flag{color:var(--danger);font-weight:500}
.n .a1-more{margin-top:auto;display:flex;align-items:center;min-height:40px;box-sizing:border-box;padding:8px 12px;line-height:1.35;border-top:1px solid var(--line);background:var(--paper2);font-size:13px;color:var(--ink2)}
.n .a1-scan{position:absolute;left:0;right:0;top:0;height:54px;background:linear-gradient(180deg,rgb(var(--green-rgb) / 0),rgb(var(--green-rgb) / .32) 70%,rgb(var(--green-rgb) / .75));border-bottom:2px solid var(--green);opacity:0;pointer-events:none}
@media(min-width:561px){.n .a1{gap:16px}.n .a1-drop{padding:10px}.n .a1-file{padding:12px 16px 14px}.n .a1-file b{font-size:15px}.n .a1-file small{font-size:13px;white-space:nowrap}.n .a1-sheet{font-size:14px}.n .a1-r{grid-template-columns:22px 1.3fr .6fr .6fr .8fr 1fr;column-gap:10px;height:44px;padding:0 16px}.n .a1-r>:nth-child(4),.n .a1-r>:nth-child(6){display:block}.n .a1-r>.a1-hk:nth-child(4),.n .a1-r>.a1-hk:nth-child(6){display:inline-flex}.n .a1-h{height:40px;font-size:13px}.n .a1-hk::after{display:block;flex:none}.n .a1-more{padding:0 16px;height:40px}}
/* 02 diagnose */
.n .a2{gap:14px}
.n .a2-m{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.n .a2-m>.a2-mt:first-child{grid-column:1/-1;flex-direction:row;flex-wrap:wrap;align-items:baseline;gap:2px 10px}.n .a2-m>.a2-mt:first-child em{display:block;margin:0 0 0 auto;font-size:12px}.n .a2-m>.a2-mt:first-child .a2-mbar{flex-basis:100%}
.n .a2-sum{display:flex;flex-direction:column;gap:12px;padding:16px;border:1px solid var(--line);border-radius:16px}.n .a2-rev{display:flex;align-items:baseline;justify-content:space-between;gap:12px;font-size:14px;color:var(--ink2)}.n .a2-rev b{font-size:26px;line-height:30px;font-weight:600;letter-spacing:-.03em;color:var(--ink);font-variant-numeric:tabular-nums}.n .a2-sl{display:flex;justify-content:space-between;gap:12px;font-size:13px;color:var(--ink2)}.n .a2-sl b{color:var(--ink);font-weight:600;font-variant-numeric:tabular-nums}.n .a2-sl .bad,.n .a2-sl .bad b{color:var(--danger)}.n .a2-sbar i{transform-origin:left}
.n .a2-lg{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:13px;line-height:1.3;color:var(--ink2)}.n .a2-lg span{display:inline-flex;align-items:center;gap:8px}.n .a2-lg i{flex:none;width:10px;height:10px;border-radius:50%}.n .a2-lg .s{background:var(--sold)}.n .a2-lg .e{border:1.6px solid rgba(179,56,44,.5);background:repeating-linear-gradient(135deg,rgba(179,56,44,.35) 0 2px,rgba(179,56,44,.08) 2px 5px);border-radius:3px;box-sizing:border-box}.n .a2-lg .h{background:var(--green)}.n .a2-lg i{border-radius:3px}
.n .a2-mt{display:flex;flex-direction:column;gap:2px;padding:10px 10px;border:1px solid var(--line);border-radius:14px;min-width:0}
.n .a2-mt>span{font-size:12px;line-height:1.3;color:var(--ink2)}
.n .a2-mt b{display:block;font-size:19px;line-height:26px;white-space:nowrap;font-weight:600;letter-spacing:-.03em;font-variant-numeric:tabular-nums}
.n .a2-mt em{display:none;font-style:normal;font-size:13px;line-height:1.3;color:var(--ink2);margin-top:4px}
.n .a2-mt.bad{background:rgba(179,56,44,.05);border-color:rgba(179,56,44,.22)}.n .a2-mt.bad b{color:var(--danger)}
.n .a2-mbar{display:block;height:6px;margin-top:8px;border-radius:3px;background:rgb(var(--ink-rgb) / .08);overflow:hidden}
.n .a2-mbar u{display:block;height:100%;width:var(--w);border-radius:3px;background:var(--sold);transform-origin:left;text-decoration:none}
.n .a2-mt.bad .a2-mbar{background:rgba(179,56,44,.12)}.n .a2-mt.bad .a2-mbar u{background:var(--danger)}
@media(min-width:561px){.n .a2{gap:20px}.n .a2-m{grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.n .a2-m>.a2-mt:first-child{grid-column:auto;flex-direction:column;align-items:normal;gap:2px}.n .a2-m>.a2-mt:first-child em{margin:4px 0 0;font-size:13px}.n .a2-m>.a2-mt:first-child .a2-mbar{flex-basis:auto}.n .a2-lg{font-size:14px}.n .a2-mt{padding:14px 16px}.n .a2-mt>span{font-size:13px}.n .a2-mt b{font-size:30px;line-height:36px}.n .a2-mt em{display:block}.n .a2-sum{padding:20px 24px;gap:14px}.n .a2-rev{font-size:15px}.n .a2-rev b{font-size:34px;line-height:40px}.n .a2-sl{font-size:14px}.n .a2-bowl{min-height:200px}}
/* summary card shares the event rows' geometry: 32px tracks, 10px radius, same hatch, 15px labels */
.n .a2-sum{padding:16px;gap:12px;border-radius:16px}
.n .a2-rev{font-size:15px;line-height:1.3}.n .a2-rev span{font-weight:600;color:var(--ink)}.n .a2-rev b{font-size:19px;line-height:24px}
.n .a2-sum .a2-sbar{height:32px;gap:4px;border-radius:0}.n .a2-sum .a2-sbar .s,.n .a2-sum .a2-sbar .e{border-radius:10px}
.n .a2-sum .a2-sbar .e{background:repeating-linear-gradient(135deg,rgba(179,56,44,.2) 0 2px,rgba(179,56,44,.05) 2px 7px);box-shadow:inset 0 0 0 1px rgba(179,56,44,.18)}
.n .a2-sl{font-size:15px;line-height:1.3}.n .a2-sl b{font-weight:600}
.n .a2-games::after{font-size:13px}
@media(min-width:561px){.n .a2-sum{padding:20px;gap:14px}.n .a2-rev b{font-size:20px;line-height:26px}}
.n :is(.en-stage.seen>.en-p.on,.en-inline.seen) .a2-mt{animation:en-rise .6s var(--ease) both}.n :is(.en-stage.seen>.en-p.on,.en-inline.seen) .a2-sum{animation:en-rise .6s var(--ease) both}
.n :is(.en-stage.seen>.en-p.on,.en-inline.seen) .a2-mt:nth-child(2){animation-delay:.1s}.n :is(.en-stage.seen>.en-p.on,.en-inline.seen) .a2-mt:nth-child(3){animation-delay:.2s}
.n :is(.en-stage.seen>.en-p.on,.en-inline.seen) .a2-mbar u{animation:en-growx 1.4s var(--ease) .4s both}.n :is(.en-stage.seen>.en-p.on,.en-inline.seen) .a2-sbar i{animation:en-growx 1.2s var(--ease) .4s both}
.n .a2-games{flex:1 1 auto;display:grid;grid-template-columns:minmax(0,1fr);grid-auto-rows:32px;gap:6px;--gk:en-growx;position:relative;padding-top:22px}
.n .a2-games::before{content:"";position:absolute;left:72.5%;top:22px;bottom:0;width:2px;margin-left:-1px;background:rgb(var(--ink-rgb) / .7);-webkit-mask:repeating-linear-gradient(#000 0 5px,transparent 5px 9px);mask:repeating-linear-gradient(#000 0 5px,transparent 5px 9px);pointer-events:none}
.n .a2-games::after{content:"Season average 72.5%";position:absolute;left:72.5%;top:0;translate:-50% 0;font-size:12px;line-height:16px;font-weight:600;color:var(--ink2);white-space:nowrap}
.n .a2-g{position:relative;overflow:hidden;border-radius:10px;background:repeating-linear-gradient(135deg,rgba(179,56,44,.2) 0 2px,rgba(179,56,44,.05) 2px 7px);box-shadow:inset 0 0 0 1px rgba(179,56,44,.18)}
.n .a2-g>i{position:absolute;left:0;top:0;bottom:0;width:var(--h);background:var(--sold);border-radius:10px;transform-origin:left}
.n .a2-g.hot>i{background:var(--green)}
.n .a2-gn{position:absolute;left:12px;top:50%;translate:0 -50%;font-size:13px;font-weight:600;color:color-mix(in srgb,var(--on-sold) 75%,transparent)}.n .a2-g.hot .a2-gn{color:color-mix(in srgb,var(--on-green) 88%,transparent)}
.n .a2-gp{position:absolute;left:calc(var(--h) - 12px);top:50%;translate:-100% -50%;font-size:15px;font-weight:600;letter-spacing:-.02em;color:var(--on-sold);font-variant-numeric:tabular-nums}
.n .a2-g.hot .a2-gp{color:var(--on-green)}
@media(min-width:561px){.n .a2-games{grid-template-columns:repeat(5,minmax(0,1fr));grid-auto-rows:minmax(120px,1fr);gap:10px;--gk:en-grow;padding-top:0}.n .a2-games::before,.n .a2-games::after{display:none}.n .a2-g{border-radius:14px}.n .a2-g>i{left:0;right:0;top:auto;bottom:0;width:auto;height:var(--h);border-radius:10px 10px 0 0;transform-origin:bottom}.n .a2-gn{font-size:12px;left:12px;top:10px;translate:none;font-weight:500;color:var(--ink2)}.n .a2-g.hot .a2-gn{color:var(--on-green)}.n .a2-gp{font-size:20px;left:12px;right:auto;top:auto;bottom:10px;translate:none}}
.n .a2-gap{color:var(--danger)}
.n .a2-sbar{display:flex;height:14px;border-radius:7px;overflow:hidden;gap:3px}
.n .a2-sbar i{display:block;height:100%;transform-origin:left}
.n .a2-sbar .s{width:72.5%;background:var(--sold);border-radius:7px}
.n .a2-sbar .e{width:27.5%;background:repeating-linear-gradient(135deg,rgba(179,56,44,.35) 0 2px,rgba(179,56,44,.1) 2px 6px);border-radius:7px}
.n .a2-split p{display:flex;flex-wrap:wrap;gap:6px 20px;margin-top:12px;font-size:14px;color:var(--ink2)}
.n .a2-split p span{display:inline-flex;align-items:center;gap:8px}.n .a2-split b{color:var(--ink);font-weight:600}
.n .a2-split p i{width:10px;height:10px;border-radius:3px}.n .a2-split p .s{background:var(--sold)}.n .a2-split p .e{background:rgba(179,56,44,.5)}
.n .a2-n{margin-left:auto}
/* 03 recommend */
.n .a3{gap:14px}
.n .a3-top{display:flex;align-items:center;gap:8px;font-size:14px;color:var(--ink2)}
.n .a3-top em{margin-left:auto;font-style:normal;font-size:12px}
.n .a3-dot{width:8px;height:8px;border-radius:50%;background:var(--green)}
.n .a3-chart{position:relative;display:grid;gap:20px;padding:4px 0}
.n .a3-axis{display:none}
.n .a3-row{display:grid;gap:8px;min-width:0}
.n .a3-h{display:flex;align-items:center;justify-content:space-between;gap:8px}
.n .a3-h b{font-size:15px;font-weight:600}
.n .a3-chip{height:24px;display:inline-flex;align-items:center;padding:0 10px;border-radius:99px;background:var(--paper2);font-size:12px;font-weight:500;white-space:nowrap}
.n .a3-track{display:flex;align-items:center;gap:10px;height:32px;padding:0;border-radius:10px;background:var(--paper2);overflow:hidden}
.n .a3-bar{flex:none;align-self:stretch;width:var(--w);border-radius:10px;background:var(--green);transform-origin:left}
.n .a3-v{font-size:15px;font-weight:600;letter-spacing:-.02em;color:var(--ink);font-variant-numeric:tabular-nums;white-space:nowrap}
.n .a3-row.down .a3-bar{background:var(--danger);min-width:6px}
.n .a3-row.down .a3-v{color:var(--danger)}
.n .a3-row>small{font-size:13px;line-height:1.35;color:var(--ink2)}
.n .a3-total{display:flex;flex-direction:row;align-items:center;justify-content:space-between;gap:12px;margin-top:auto;padding:14px 16px;border-radius:16px;background:var(--dark);color:#fff;font-size:14px;line-height:1.35}
.n .a3-total span{flex:1;min-width:0}.n .a3-total b{flex:none;font-size:24px;letter-spacing:-.02em;color:var(--green);white-space:nowrap;font-variant-numeric:tabular-nums}
@media(min-width:561px){.n .a3{gap:20px}.n .a3-chart{gap:24px}.n .a3-h b{font-size:17px}.n .a3-track{height:38px}.n .a3-v{font-size:17px}.n .a3-row>small{font-size:14px}.n .a3-total{flex-direction:row;align-items:center;justify-content:space-between;gap:12px;padding:16px 18px}.n .a3-total b{font-size:26px}}
/* 04 protect */
.n .a4{gap:18px}
.n .a4-flow{display:grid}
.n .a4-fl{display:flex;align-items:center;gap:8px;font-size:13px;line-height:1.3;color:var(--ink2)}
.n .a4-fl b{font-size:15px;font-weight:600;color:var(--ink)}
.n .a4-fl em{margin-left:auto;font-style:normal;font-size:12px}
.n .a4-fi{display:grid;place-items:center;flex:none;width:26px;height:26px;border-radius:8px;background:var(--slate);color:#fff}.n .a4-fi.r{background:var(--green);color:var(--on-green)}
.n .a4-fi svg{width:15px;height:15px}
.n .a4-flow>.a4-sb:first-of-type{margin-top:10px}
.n .a4-sb{display:flex;gap:3px;height:44px}
.n .a4-sb+.a4-rib+.a4-sb{margin-bottom:10px}
.n .a4-sb>span{flex:0 0 calc(var(--w) - 3px*(2/3));display:flex;align-items:center;justify-content:center;border-radius:10px;min-width:0;transform-origin:left}
.n .a4-sb .c{background:var(--green);color:var(--on-green)}.n .a4-sb .s{background:var(--slate);color:#fff}.n .a4-sb .o{background:var(--line-2)}
.n .a4-sb b{white-space:nowrap;font-size:14px;font-weight:600;font-variant-numeric:tabular-nums}
.n .a4-rib{display:block;width:100%;height:56px;margin:-1px 0}
.n .a4-rib .c{fill:rgb(var(--green-rgb) / .5)}.n .a4-rib .s{fill:rgba(47,58,69,.22)}.n .a4-rib .o{fill:rgb(var(--ink-rgb) / .05)}
.n .a4-key{display:grid;gap:10px}
.n .a4-key li{display:flex;align-items:center;gap:10px;font-size:15px;line-height:1.3}
.n .a4-key i{flex:none;width:12px;height:12px;border-radius:4px;background:var(--green)}.n .a4-key .s i{background:var(--slate)}.n .a4-key .o i{background:var(--line-2);box-shadow:inset 0 0 0 1px rgb(var(--ink-rgb) / .12)}
.n .a4-key em{margin-left:auto;font-style:normal;font-size:12px;font-weight:600;color:var(--green-ink);background:rgb(var(--green-rgb) / .3);border-radius:99px;padding:4px 10px;white-space:nowrap}
.n .a4-key .s em{color:var(--ink);background:var(--paper2)}
@media(min-width:561px){.n .a4{gap:24px}.n .a4-sb{height:56px}.n .a4-sb b{font-size:16px}.n .a4-rib{height:80px}.n .a4-fl b{font-size:16px}.n .a4-fl em{font-size:13px}.n .a-kpis{gap:16px}.n .a-kpis .n-kv{font-size:28px;line-height:32px}.n .a-kpis .n-kl{font-size:var(--fs-body-sm)}.n .en-art{gap:20px}}
/* motion: plays when a stage panel becomes active, or when an inline card is revealed */
.n :is(.en-stage.seen>.en-p.on,.en-inline.seen) .a-kpis>*{animation:en-rise .6s var(--ease) .15s both}
/* 04 protect: paired bars per segment (share of fans vs share of revenue) */
.n .a4{gap:18px}
.n .a1-x{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.n .a1-x>div{display:grid;gap:3px;align-content:start;padding:14px 12px;border-radius:16px;background:var(--paper2);min-width:0}
.n .a1-x i{width:10px;height:10px;border-radius:3px;background:var(--green);margin-bottom:6px}
.n .a1-x b{font-size:20px;line-height:1;font-weight:700;letter-spacing:-.04em;font-variant-numeric:tabular-nums;white-space:nowrap}
.n .a1-x>div>span{margin-top:4px;font-size:13px;font-weight:600;line-height:1.25}
.n .a1-x small{font-size:12px;line-height:1.3;color:var(--ink3)}
@media(min-width:561px){.n .a1-x{gap:12px}.n .a1-x>div{padding:16px}.n .a1-x b{font-size:30px}.n .a1-x>div>span{font-size:14px}}
.n :is(.en-stage.seen>.en-p.on,.en-inline.seen) .a1-x>div{animation:en-rise .6s var(--ease) calc(.15s + var(--i)*.1s) both}
.n .a4-donuts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.n .a4-dn{display:grid;justify-items:center;gap:12px;min-width:0}
.n .a4-ring{position:relative;width:100%;max-width:170px;aspect-ratio:1}
.n .a4-ring svg{display:block;width:100%;height:100%;transform:rotate(-90deg)}
.n .a4-ring circle{fill:none;stroke-width:13}
.n .a4-ring .t{stroke:rgb(var(--ink-rgb) / .07)}
.n .a4-ring .seg{stroke-dasharray:calc(var(--w) - 1.6) 100;stroke-dashoffset:calc(var(--o) * -1)}
.n .a4-ring .c{stroke:var(--green)}.n .a4-ring .s{stroke:var(--sold)}.n .a4-ring .o{stroke:var(--bar-neutral)}
.n .a4-mid{position:absolute;inset:0;display:grid;place-content:center;text-align:center}
.n .a4-mid b{font-size:30px;line-height:1;font-weight:700;letter-spacing:-.04em;font-variant-numeric:tabular-nums}
.n .a4-mid>span{margin-top:5px;font-size:12px;font-weight:500;color:var(--ink3)}
.n .a4-rl{font-size:14px;font-weight:600;color:var(--ink2)}
@keyframes a4-draw{from{stroke-dasharray:0 100}}
.n :is(.en-stage.seen>.en-p.on,.en-inline.seen) .a4-ring .seg{animation:a4-draw 1s var(--ease) calc(.15s + var(--i)*.12s) both}
.n :is(.en-stage.seen>.en-p.on,.en-inline.seen) .a4-mid{animation:en-fade .8s ease-out .5s both}
/* before an artwork is first seen it already sits in its start state, so the reveal never flashes the final number or ring first */
html.cs .n :is(.en-inline:not(.seen),.en-stage:not(.seen)) .en-n{--v:0}
html.cs .n :is(.en-inline:not(.seen),.en-stage:not(.seen)) .a4-ring .seg{stroke-dasharray:0 100}
html.cs .n :is(.en-inline:not(.seen),.en-stage:not(.seen)) .a4-mid{opacity:0}
@media(min-width:561px){.n .a4-mid b{font-size:38px}.n .a4-rl,.n .a4-legend{font-size:14px}}
@media(prefers-reduced-motion:reduce){.n .a4-ring .seg,.n .a4-mid{animation:none!important}}
.n .a4-x{display:none}
@media(min-width:960px){
.n .en-stage .a4{justify-content:center;gap:34px}
.n .en-stage .a4-lead{font-size:20px;max-width:34ch}
.n .en-stage .a4-donuts{gap:28px}
.n .en-stage .a4-ring{max-width:250px}
.n .en-stage .a4-mid b{font-size:52px}
.n .en-stage .a4-mid>span{font-size:13px}
.n .en-stage .a4-rl{font-size:15px}
.n .en-stage .a4-legend{display:none}
.n .en-stage .a4-x{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.n .a4-x>div{display:grid;gap:4px;align-content:start;padding:16px;border-radius:16px;background:var(--paper2);min-width:0}
.n .a4-x i{width:10px;height:10px;border-radius:3px;background:var(--green);margin-bottom:6px}.n .a4-x .s i{background:var(--sold)}.n .a4-x .o i{background:var(--bar-neutral)}
.n .a4-x b{font-size:30px;line-height:1;font-weight:700;letter-spacing:-.04em;font-variant-numeric:tabular-nums}
.n .a4-x span{margin-top:4px;font-size:14px;font-weight:600;line-height:1.25}
.n .a4-x small{font-size:12px;line-height:1.3;color:var(--ink3)}
.n :is(.en-stage.seen>.en-p.on) .a4-x>div{animation:en-rise .6s var(--ease) calc(.9s + var(--i)*.1s) both}
}
.n .a4-legend{display:flex;flex-wrap:wrap;gap:8px 18px;font-size:13px;line-height:1.3;color:var(--ink2)}
.n .a4-legend li{display:flex;align-items:center;gap:8px}
.n .a4-legend i{flex:none;width:10px;height:10px;border-radius:3px;background:var(--green)}.n .a4-legend .s i{background:var(--sold)}.n .a4-legend .o i{background:var(--bar-neutral)}
.n :is(.en-stage.seen>.en-p.on,.en-inline.seen) .a4-legend li{animation:en-rise .5s var(--ease) 1.5s both}
.n .a4-lead{font-size:16px;line-height:1.4;font-weight:500;color:var(--ink2)}.n .a4-lead b{color:var(--ink);font-weight:600}
@media(min-width:561px){.n .a4{gap:22px}.n .a4-lead{font-size:18px}.n .a4-gh b{font-size:16px}.n .a4-bt{height:32px}.n .a4-bt b{font-size:15px}.n .a-kpis{grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.n .a-kpis>div{display:block;padding:14px 0 0}.n .a-kpis .n-kv{min-width:0;font-size:26px;line-height:30px}.n .a-kpis .n-kl{margin-top:4px;font-size:var(--fs-body-sm)}}
@keyframes a4-draw{from{stroke-dasharray:0 100}}
.n :is(.en-stage.seen>.en-p.on,.en-inline.seen) .en-n{animation:en-count 1.1s var(--ease) .2s both}
.n :is(.en-stage.seen>.en-p.on,.en-inline.seen) .a1-file{animation:a1-drop .9s var(--ease) both}
.n :is(.en-stage.seen>.en-p.on,.en-inline.seen) .a1-drop{animation:a1-zone 1.2s ease-out .5s both}
.n :is(.en-stage.seen>.en-p.on,.en-inline.seen) .a1-sheet{animation:en-rise .6s var(--ease) .15s both}
.n :is(.en-stage.seen>.en-p.on,.en-inline.seen) .a1-bad{animation:a1-clean 1.5s var(--ease) calc(var(--d) + .5s) both}
.n :is(.en-stage.seen>.en-p.on,.en-inline.seen) .a1-ck{animation:en-pop .4s var(--ease) var(--d) both}
.n :is(.en-stage.seen>.en-p.on,.en-inline.seen) .a1-hk::after{animation:en-pop .4s var(--ease) calc(.5s + var(--i)*.1s) both}
.n :is(.en-stage.seen>.en-p.on,.en-inline.seen) .a1-scan{animation:a1-scan 1.9s linear .45s both}
.n :is(.en-stage.seen>.en-p.on,.en-inline.seen) .a1-st1{animation:a1-st1 3.2s var(--ease) both}
.n :is(.en-stage.seen>.en-p.on,.en-inline.seen) .a1-pg{animation:a1-pg 3.2s cubic-bezier(.4,0,.2,1) both}
.n :is(.en-stage.seen>.en-p.on,.en-inline.seen) .a1-st2{animation:a1-st2 3.2s var(--ease) both}
@keyframes a1-drop{0%{transform:translateY(-34px) scale(.96);opacity:0}55%{transform:translateY(5px);opacity:1}75%{transform:translateY(-2px)}100%{transform:none;opacity:1}}
@keyframes a1-zone{0%{border-color:var(--green);background:rgb(var(--green-rgb) / .25)}100%{border-color:rgb(var(--ink-rgb) / .22);background:var(--paper2)}}
@keyframes a1-pg{0%{transform:scaleX(0);opacity:1}72%{transform:scaleX(1);opacity:1}84%,100%{transform:scaleX(1);opacity:0}}
@keyframes a1-st1{0%,8%{opacity:0}16%,70%{opacity:1}80%,100%{opacity:0}}
@keyframes a1-st2{0%,72%{opacity:0;transform:translateY(4px)}84%,100%{opacity:1;transform:none}}
@keyframes a1-scan{0%{top:-54px;opacity:0}8%{opacity:1}92%{opacity:1}100%{top:100%;opacity:0}}
.n :is(.en-stage.seen>.en-p.on,.en-inline.seen) .a3-h,.n :is(.en-stage.seen>.en-p.on,.en-inline.seen) .a3-row>small{animation:en-rise .5s var(--ease) calc(.1s + var(--i)*.15s) both}
.n :is(.en-stage.seen>.en-p.on,.en-inline.seen) .a3-bar{animation:en-growx 1s var(--ease) calc(.3s + var(--i)*.18s) both}
.n :is(.en-stage.seen>.en-p.on,.en-inline.seen) .a3-v{animation:en-rise .5s var(--ease) calc(.7s + var(--i)*.18s) both}
.n :is(.en-stage.seen>.en-p.on,.en-inline.seen) .a3-total{animation:en-rise .6s var(--ease) 1.2s both}
.n :is(.en-stage.seen>.en-p.on,.en-inline.seen) .a2-g>i{animation:var(--gk) 1s var(--ease) calc(.2s + var(--i)*.07s) both}
.n :is(.en-stage.seen>.en-p.on,.en-inline.seen) .a2-gp{animation:en-rise .5s var(--ease) calc(.7s + var(--i)*.07s) both}
.n :is(.en-stage.seen>.en-p.on,.en-inline.seen) .a2-lg{animation:en-rise .5s var(--ease) 1.2s both}
.n :is(.en-stage.seen>.en-p.on,.en-inline.seen) .a4-sb>span{animation:en-growx .9s var(--ease) calc(.15s + var(--i)*.1s) both}
.n :is(.en-stage.seen>.en-p.on,.en-inline.seen) .a4-sb+.a4-rib+.a4-sb>span{animation-delay:calc(.9s + var(--i)*.1s)}
.n :is(.en-stage.seen>.en-p.on,.en-inline.seen) .a4-rib{animation:en-fade .8s ease-out .6s both}
.n :is(.en-stage.seen>.en-p.on,.en-inline.seen) .a4-key li{animation:en-rise .5s var(--ease) 1.4s both}
@keyframes en-fade{from{opacity:0}to{opacity:1}}
@keyframes a1-clean{0%,35%{max-height:44px;opacity:1;border-top-width:1px;background:rgba(179,56,44,.08)}100%{max-height:0;opacity:0;border-top-width:0}}
@media(min-width:960px){
  .n .en{height:calc(var(--n)*72vh + 24vh);margin-top:56px}
  .n .en-sticky{position:sticky;top:96px;height:min(660px,calc(100vh - 120px));display:grid;grid-template-columns:5fr 7fr;gap:56px}
  .n .en-list{align-content:center;gap:0}
  .n .en-it{position:relative;padding:22px 0 22px 30px;border-radius:0;background:none;opacity:.38;transition:opacity .5s var(--ease)}
  .n .en-it::before,.n .en-it::after{content:"";position:absolute;left:0;top:0;bottom:0;width:2px;border-radius:1px;background:var(--line)}
  .n .en-it::after{background:var(--ink);transform:scaleY(0);transform-origin:top;transition:transform .6s var(--ease)}
  .n .en-it.on,.n .en-it.done{opacity:1}.n .en-it.done{opacity:.55}
  .n .en-it.on::after,.n .en-it.done::after{transform:scaleY(1)}
  .n .en-it .n-k{margin-bottom:6px}
  .n .en-body{display:grid;grid-template-rows:0fr;opacity:0;transition:grid-template-rows .6s var(--ease),opacity .5s var(--ease)}
  .n .en-body p{overflow:hidden;min-height:0}
  .n .en-it.on .en-body{grid-template-rows:1fr;opacity:1}
  .n .en-inline{display:none}
  .n .en-it{overflow:visible}
  .n .en-stage .en-art{padding:24px;border-radius:20px;gap:20px}
  .n .en-stage{display:block;position:relative;border-radius:28px;background:var(--paper2);padding:28px;overflow:hidden}
  .n .en-p{position:absolute;inset:28px;opacity:0;visibility:hidden;transform:translateY(18px) scale(.985);transition:opacity .45s var(--ease),transform .7s var(--ease),visibility 0s .45s}
  .n .en-p.on{opacity:1;visibility:visible;transform:none;transition-delay:0s}
}
@media(prefers-reduced-motion:reduce){.n .en *{animation:none!important;transition:none!important}}

/* seat map */
.n .sm{margin:-20px -20px 24px}
@media(min-width:640px){.n .sm{margin:-44px -44px 28px}}
.n .sm-stage{position:relative}
.n .sm-canvas{position:relative}
.n .sm-svg{display:block;width:100%;height:auto;overflow:hidden}
@media(max-width:640px){.n .sm-stage{overflow-x:auto;overflow-y:hidden;scrollbar-width:none}.n .sm-stage::-webkit-scrollbar{display:none}.n .sm-canvas{width:620px}}
.n .sm-wedge{fill:var(--wedge);stroke:var(--surface);stroke-width:3;transition:fill .2s var(--ease)}
.n .sm-wedge.on{fill:var(--wedge-on)}
.n .sm-sec{font-size:var(--fs-micro);font-weight:600;fill:var(--ink2);font-variant-numeric:tabular-nums}
.n .sm-rink{font-size:var(--fs-micro);font-weight:600;fill:var(--ink2)}
.n .sm-seat{cursor:pointer;outline:none}
.n .sm-seat .hit{fill:transparent;stroke:none;transform:none!important;animation:none!important;opacity:1!important}
.n .sm-seat .dot{fill:var(--seat);transform-box:fill-box;transform-origin:center;transition:fill .15s var(--ease),transform .25s var(--ease),stroke .15s}
@media(hover:hover) and (pointer:fine){.n .sm-seat:hover .dot{fill:var(--seat-h);transform:scale(1.18)}}
.n .sm-seat.sel .dot{fill:var(--green);stroke:none;transform:scale(1.18)}
.n .sm-seat .tick{fill:none;stroke:var(--on-green);stroke-width:2;stroke-linecap:round;stroke-linejoin:round;pointer-events:none;animation:sm-tick .3s var(--ease) backwards}
@keyframes sm-tick{from{opacity:0;transform:scale(.4)}to{opacity:1}}
@media(hover:hover) and (pointer:fine){.n .sm-seat.sel:hover .dot{fill:var(--green-h)}}
.n .sm-seat.sold{cursor:not-allowed}
.n .sm-seat.sold .dot{fill:var(--seat-off);stroke:none;transform:none}
.n .sm-seat:focus-visible .dot{stroke:var(--ink);stroke-width:2;transform:scale(1.18)}
.n .sm:not(.sm-in) .sm-seat .dot{opacity:0}
.n .sm-in .sm-seat .dot{animation:sm-pop .55s var(--ease) var(--d) backwards}
@keyframes sm-pop{from{opacity:0;transform:scale(.3)}to{opacity:1}}
.n .sm-boards{fill:var(--surface);stroke:var(--rink-line);stroke-width:3}
.n .sm-pop{position:absolute;z-index:3;transform:translate(-50%,calc(-100% - 16px));display:flex;align-items:center;gap:16px;padding:10px 14px;border-radius:12px;background:var(--surface);color:var(--ink);border:1px solid rgb(var(--ink-rgb) / .08);box-shadow:0 10px 28px -8px rgb(var(--ink-rgb) / .22),0 2px 6px rgb(var(--ink-rgb) / .06);pointer-events:none;white-space:nowrap;animation:sm-pop-in .14s var(--ease)}
@keyframes sm-pop-in{from{opacity:0}to{opacity:1}}
.n .sm-pop-seat{display:flex;flex-direction:column;gap:1px}
.n .sm-pop-seat b{font-size:13px;font-weight:600;line-height:1.25}
.n .sm-pop-seat small{font-size:12px;line-height:1.25;color:var(--ink2)}
.n .sm-pop-price{font-size:20px;font-weight:600;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.n .sm-pop-price.sold{font-size:13px;font-weight:500;letter-spacing:0;color:var(--ink2)}
.n .sm-foot{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px 24px;margin-top:20px;padding:0 32px}
@media(min-width:640px){.n .sm-foot{padding:0 44px}}
.n .sm-legend{display:flex;gap:20px;margin:0;font-size:13px;line-height:1.2;color:var(--ink2)}
.n .sm-legend span{display:inline-flex;align-items:center;gap:8px}
.n .sm-legend i{width:12px;height:12px;border-radius:50%}
.n .sm-legend i.a{background:var(--seat)}.n .sm-legend i.s{background:var(--green)}.n .sm-legend i.x{background:var(--seat-off)}
.n .sm-sum{display:flex;align-items:center;justify-content:space-between;gap:16px;flex:1 1 100%;min-height:60px;padding:10px 12px 10px 18px;border-radius:18px;background:var(--surface);box-shadow:inset 0 0 0 1px rgb(var(--ink-rgb) / .08),0 8px 24px -16px rgb(var(--ink-rgb) / .2)}
.n .sm-sum{margin-inline:-16px}
@media(min-width:640px){.n .sm-sum{padding:12px 14px 12px 22px;margin-inline:-28px}}
.n .sm-info{display:grid;gap:1px;min-width:0;animation:en-fade .25s ease-out both}
.n .sm-info b{font-size:15px;font-weight:600;color:var(--ink)}
.n .sm-info span{font-size:13px;line-height:1.3;color:var(--ink2)}
.n .sm-pay{display:flex;align-items:center;gap:12px;flex:none;animation:en-fade .25s ease-out both}
.n .sm-total{font-size:18px;font-weight:600;letter-spacing:-.02em;color:var(--ink);font-variant-numeric:tabular-nums}
.n .sm-hint{font-size:14px;color:var(--ink2)}
.n .sm-clear{font:inherit;font-size:13px;font-weight:600;height:40px;padding:0 14px;border:0;border-radius:99px;background:var(--paper2);color:var(--ink);cursor:pointer;transition:background-color .15s var(--ease),transform 160ms var(--ease)}
@media(hover:hover) and (pointer:fine){.n .sm-clear:hover{background:var(--paper3)}}
.n .sm-clear:active{transform:scale(.97)}
.n .sm-clear:focus-visible{outline:2px solid var(--ink);outline-offset:3px}

/* outcomes */
.n-outsec{padding:0 8px}
.n-out{border-radius:24px;padding:28px 20px 4px}
@media(max-width:639px){.n-outsec{padding:0}.n .n-out{border-radius:0}}
.n-out .n-wrap-flush{max-width:none;margin-inline:auto}
@media(min-width:640px){.n-out{border-radius:32px;padding:44px 40px 8px}}
.n-feat{display:grid;margin-top:28px;border-top:1px solid rgba(255,255,255,.14)}
@media(min-width:960px){.n-feat{grid-template-columns:minmax(0,4fr) minmax(0,8fr);margin-top:36px}}
.n-fs{display:grid;grid-template-columns:56px minmax(0,1fr);column-gap:18px;align-items:start;padding:20px 0 22px}
.n-fs>:not(svg){grid-column:2}
@media(min-width:960px){.n-fs{grid-template-columns:none;column-gap:0;padding:28px 32px 28px 0;border-right:1px solid rgba(255,255,255,.14);display:flex;flex-direction:column;justify-content:flex-end}}
.n-fs .n-st-art{grid-row:1/4}
@media(min-width:960px){.n-fs>:not(svg){grid-column:auto}.n-fs .n-st-art{grid-row:auto;margin-bottom:auto}}
.n-fs .n-num{font-size:clamp(34px,3.6vw,44px);line-height:1}
@media(min-width:960px){.n-fs .n-num{font-size:clamp(56px,6vw,84px)}}
.n-fs h3{margin-top:10px;font-size:var(--fs-title-sm)}
.n-fs p{max-width:34ch}
.n-stats{display:grid}
@media(min-width:960px){.n-stats{padding-left:32px}}
.n-stat{display:grid;grid-template-columns:56px minmax(0,1fr);column-gap:18px;align-items:start;padding:18px 0;border-top:1px solid rgba(255,255,255,.14)}
@media(min-width:960px){.n-stat{grid-template-columns:64px minmax(0,1fr);column-gap:20px;padding:20px 0}.n-stat:first-child{border-top:0;padding-top:28px}.n-stat:last-child{padding-bottom:28px}}
.n-st-art{display:block;width:56px;height:56px;overflow:visible}
@media(min-width:960px){.n-st-art{width:64px;height:64px}}
.n-st-b{min-width:0}
.n-num{font-size:clamp(44px,5vw,64px);line-height:1;letter-spacing:-.045em;font-weight:600;font-variant-numeric:tabular-nums}
.n-stat .n-num{font-size:clamp(34px,3.6vw,44px)}
.n-stat h3{margin-top:8px;font-size:var(--fs-title-sm);line-height:1.25;letter-spacing:-.01em;font-weight:600}
.n-fs h3{line-height:1.25;letter-spacing:-.01em;font-weight:600}
.n .n-stat h3,.n .n-fs h3{text-wrap:wrap}
.n-stat p,.n-fs p{margin-top:6px;font-size:var(--fs-body-sm);line-height:1.5;color:rgba(255,255,255,.62)}
.n-st-art *{vector-effect:non-scaling-stroke}
.n-st-art .sa-fr{fill:none;stroke:rgba(255,255,255,.14);stroke-width:1.5}
.n-st-art .sa-o{fill:none;stroke:rgba(255,255,255,.5);stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:100}
.n-st-art .sa-g{stroke:var(--green)}
.n-st-art .sa-hand{transform-box:view-box;transform-origin:32px 32px}
.n-st-art .sa-hand path{fill:none;stroke-width:1.5;stroke-linecap:round}
.n-st-art .sa-btn{stroke:rgba(255,255,255,.3)}
.n-st-art .sa-dot{fill:var(--green);stroke:none}
.n-st-art .sa-ring{fill:none;stroke:var(--green);stroke-width:1.5;transform-box:fill-box;transform-origin:center;opacity:0}
/* motion: outlines draw in once when the card is revealed, then the green accent idles on a 4s beat */
.n-out.in .n-st-art .sa-o{animation:st-draw 1.1s var(--ease) calc(.15s + var(--k,0)*.1s) both}
.n-out.in .n-st-art .sa-g{animation:st-draw 1.1s var(--ease) .45s both,sa-glow 4s ease-in-out 1.8s infinite}
.n-out.in .n-st-art .sa-dot{animation:en-pop .5s var(--ease) .9s both}
.n-out.in .n-st-art .sa-ring{animation:sa-ping 4s ease-out 1.8s infinite}
.n-out.in .n-st-art .sa-hand{animation:sa-spin 8s linear infinite}
.n-out.in .en-n{animation:en-count 1s var(--ease) .15s both}
html.cs .n-out:not(.in) .en-n{--v:0}
.n-out.in .n-stat,.n-out.in .n-fs{animation:en-rise .6s var(--ease) calc(.05s + var(--i)*.12s) both}
@keyframes st-draw{from{stroke-dashoffset:100}to{stroke-dashoffset:0}}
@keyframes sa-glow{0%,100%{opacity:1}50%{opacity:.45}}
@keyframes sa-ping{0%{transform:scale(1);opacity:.8}70%,100%{transform:scale(4.2);opacity:0}}
@keyframes sa-spin{to{transform:rotate(360deg)}}
@media(prefers-reduced-motion:reduce){.n-out.in .n-st-art *,.n-out.in .en-n,.n-out.in .n-stat,.n-out.in .n-fs{animation:none!important}.n-st-art .sa-o{stroke-dashoffset:0}}
.n-out-head{display:grid;gap:20px}
@media(min-width:960px){.n-out-head{grid-template-columns:minmax(0,1fr) minmax(0,400px);align-items:end;gap:56px}}
.n .n-out-note{margin:0;max-width:none;font-size:17px;line-height:1.5;color:rgba(255,255,255,.62)}
@media(max-width:639px){.n-out .n-h2{font-size:clamp(28px,8.4vw,34px)}.n .n-out-note{font-size:15px}.n-stat,.n-fs{column-gap:14px}.n-stat{grid-template-columns:48px minmax(0,1fr)}.n-stat .n-st-art,.n-fs .n-st-art{width:48px;height:48px}.n-stat .n-num,.n-fs .n-num{font-size:30px}.n-stat h3,.n-fs h3{margin-top:6px;font-size:16px}.n-stat p,.n-fs p{font-size:14px;line-height:1.45}}

/* engine */
.n-steps{display:grid;gap:16px;margin-top:56px}
.n-step{display:grid;gap:32px;border-radius:28px;background:var(--paper2);padding:32px}
@media(min-width:960px){.n-step{grid-template-columns:4fr 8fr;gap:56px;padding:44px}}
.n-step h3{font-size:clamp(22px,2vw,28px);line-height:1.15;letter-spacing:-.02em;font-weight:600}
.n-step-t p{margin-top:14px;font-size:17px;line-height:1.5;color:var(--ink2)}
.n-d{background:var(--surface);border-radius:20px;padding:24px;min-width:0}
.n-d .n-row2{display:flex;justify-content:space-between;gap:16px;font-size:14px;color:var(--ink2);margin-bottom:16px}
.n-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:20px}
@media(max-width:640px){.n-kpis{grid-template-columns:1fr}}
.n-kv{display:block;font-size:28px;line-height:32px;font-weight:600;letter-spacing:-.03em;font-variant-numeric:tabular-nums}
.n-kl{display:block;margin-top:4px;font-size:var(--fs-body-sm);line-height:1.35;color:var(--ink2)}
.n-ticks{display:grid;gap:8px;margin-top:20px;font-size:15px;color:var(--ink2)}
.n-ticks li{display:flex;gap:12px}
.n-ticks li::before{content:"";flex:none;width:6px;height:6px;margin-top:8px;border-radius:2px;background:var(--ink)}
.n-chart{display:flex;align-items:flex-end;gap:10px;height:220px;margin-top:8px;padding-bottom:28px;border-bottom:1px solid var(--line);position:relative}
.n-col{flex:1;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:8px;position:relative}
.n-col i{display:block;width:100%;border-radius:8px 8px 0 0;background:rgb(var(--ink-rgb) / .14)}
.n-col i.hot{background:var(--green)}
.n-col span{font-size:12px;color:var(--ink2)}
.n-col .l{position:absolute;bottom:-28px}
.n-table{width:100%;border-collapse:collapse;font-size:15px}
.n-table th{font-weight:500;font-size:13px;color:var(--ink2);text-align:left;padding:0 12px 10px 0;border-bottom:1px solid var(--line)}
.n-table td{padding:14px 12px 14px 0;border-bottom:1px solid var(--line);color:var(--ink2)}
.n-table td:first-child{color:var(--ink);font-weight:500}
.n-table .r{text-align:right;padding-right:0}
.n-table tfoot td{border-bottom:0;padding-bottom:0}
.n-table .tot{color:var(--ink);font-weight:600}
@media(max-width:640px){.n-table th:nth-child(3),.n-table td:nth-child(3){display:none}}
@media(max-width:640px){.n-chart{gap:4px}.n-col>span:first-child{display:none}.n-d{overflow-x:auto;padding:20px}.n-table{min-width:0}.n-table td,.n-table th{padding-right:8px}}
.n-sp{margin-bottom:20px}
.n-sp .n-row2{margin-bottom:8px}
.n-sp .n-row2 b{font-weight:500;color:var(--ink);font-size:14px}
.n-b2{height:8px;margin-bottom:4px;border-radius:4px;background:rgb(var(--ink-rgb) / .08)}
.n-b2 i{display:block;height:100%;border-radius:4px}
.n-b2 i.a,.n-lg i.a{background:rgb(var(--ink-rgb) / .28)}
.n-b2 i.b,.n-lg i.b{background:var(--green)}
.n-lg{display:flex;gap:24px;font-size:13px;color:var(--ink2)}
.n-lg span{display:inline-flex;align-items:center;gap:8px}
.n-lg i{width:10px;height:10px;border-radius:3px}
.n-cta-row{position:relative;overflow:hidden;display:flex;flex-direction:column;align-items:stretch;gap:18px;margin-top:32px;padding:22px 20px;border-radius:24px;background:radial-gradient(60% 140% at 0% 50%,rgb(var(--green-rgb) / .14),transparent 70%),var(--paper2)}
.n-cta-copy{display:grid;gap:4px;min-width:0}
.n-cta-copy b{font-size:var(--fs-title-sm);line-height:1.25;font-weight:600;letter-spacing:-.015em}
.n-cta-copy span{font-size:15px;line-height:1.5;color:var(--ink2);max-width:46ch}
.n-cta-row [data-slot="button"]{width:100%}
@media(min-width:640px){.n-cta-row{flex-direction:row;align-items:center;justify-content:space-between;gap:28px;padding:26px 28px;border-radius:28px}.n-cta-copy b{font-size:var(--fs-title-lg)}.n-cta-row [data-slot="button"]{width:auto;flex:none}}

/* why switch */
.n-sw{display:grid;gap:48px}
@media(min-width:960px){.n-sw{grid-template-columns:5fr 7fr;gap:80px}.n-sw>div:first-child{position:sticky;top:104px;align-self:start}}
.n-sw-list{display:grid;gap:16px}
.n-sw-list li{border-radius:28px;background:var(--paper2);padding:32px}
@media(min-width:640px){.n-sw-list li{padding:40px}}
.n-sw-list .n-mono{font-size:13px;color:var(--ink2)}
.n-sw-list h3{margin-top:12px;font-size:var(--fs-title-lg);line-height:1.15;letter-spacing:-.02em;font-weight:600;text-wrap:balance}
.n-sw-list h3 b{font-weight:600;color:var(--ink)}
.n-sw-list h3 span{color:var(--ink2)}
.n-sw-list p{margin-top:12px;font-size:var(--fs-body-lg);line-height:1.5;color:var(--ink2);max-width:46ch}

/* cases */
/* featured stories: expanding panels */
.st{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;margin-top:40px}
@media(min-width:640px){.st{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(min-width:960px){.st{margin-top:56px;gap:16px}.st .st-p{min-height:500px;border-radius:28px}.st .st-body{padding:32px}.st .st-logo{left:32px;top:64px;max-height:88px}.st .st-no{left:32px;top:26px}}
.st-go::after{content:"";position:absolute;inset:0;z-index:3}
.st-go svg{transition:transform .3s cubic-bezier(.22,1,.36,1)}
@media(hover:hover) and (pointer:fine){
  .st-p{cursor:pointer}
  .st-bg{transition:transform .8s cubic-bezier(.22,1,.36,1)}
  .st-p:hover .st-bg{transform:scale(1.04)}
  .st-p:hover .st-go{background:rgb(255 255 255 / .14)}
  .st-p:hover .st-go svg{transform:translateX(4px)}
}
.st-p:has(.st-go:focus-visible){outline:2px solid #fff;outline-offset:3px}
.st-go:focus-visible{outline:none}
@media(prefers-reduced-motion:reduce){.st-bg,.st-go svg{transition:none!important}.st-p:hover .st-bg{transform:none}}
.st-p{position:relative;isolation:isolate;overflow:hidden;display:flex;min-height:440px;border-radius:24px;background:var(--dark);color:#fff}
.st-bg{position:absolute;inset:0;z-index:-2;width:100%;height:100%;object-fit:cover}
.st-p::after{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgb(0 0 0 / .2) 0%,rgb(0 0 0 / .15) 35%,rgb(0 0 0 / .82) 100%)}
.st-no{position:absolute;left:22px;top:18px;font-size:13px;font-weight:600;letter-spacing:.04em;color:rgb(255 255 255 / .7);font-variant-numeric:tabular-nums}
.st-body{position:relative;z-index:2;display:flex;flex-direction:column;justify-content:flex-end;gap:10px;width:100%;padding:22px}
.st-logo{position:absolute;left:22px;top:46px;max-height:74px;max-width:56%;width:auto;object-fit:contain;filter:drop-shadow(0 2px 10px rgb(0 0 0 / .5))}
.st-org{font-size:var(--fs-body-sm);font-weight:600;color:rgb(255 255 255 / .85)}
.st-org em{display:block;margin-top:2px;font-style:normal;font-weight:500;color:rgb(255 255 255 / .6)}
.st-r{max-width:20ch;font-size:clamp(20px,5.4vw,24px);line-height:1.15;font-weight:600;letter-spacing:-.025em;color:#fff;text-wrap:balance}
.st-go{display:inline-flex;align-items:center;gap:8px;width:fit-content;height:40px;padding:0 14px;margin-left:-14px;border-radius:99px;background:transparent;color:#fff;font-size:14px;font-weight:600;transition:background-color .2s var(--ease),transform 160ms cubic-bezier(.65,0,.35,1)}
@media(hover:hover) and (pointer:fine){.st-go:hover{background:rgb(255 255 255 / .16)}}
.st-go:active{transform:scale(.97)}
.st-go:focus-visible{outline:2px solid #fff;outline-offset:3px}
.st-go{margin-top:14px}
@media(min-width:960px){.st .st-r{font-size:clamp(26px,2.4vw,34px);max-width:18ch}}

/* statement */
.n-state{padding:80px 0 24px;text-align:center}
.n-state{min-height:75svh;display:grid;align-content:center}
.n-state .n-k{margin-inline:auto}
.n-state h2{max-width:18ch;margin-inline:auto;font-size:clamp(34px,5.2vw,72px);line-height:1.18;letter-spacing:-.04em;font-weight:600;color:var(--ink);text-wrap:balance}
@media(min-width:960px){.n-state h2{max-width:20ch}}
.ns-rot{display:inline-grid;justify-items:center;vertical-align:baseline}
.ns-chip{grid-area:1/1;display:inline-flex;align-items:center;gap:.22em;padding:.02em .3em .02em .2em;border-radius:99px;white-space:nowrap;background:color-mix(in srgb,var(--c) 24%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c) 75%,transparent),0 0 24px -8px color-mix(in srgb,var(--c) 80%,transparent);opacity:0;transform:translateY(55%);transition:opacity .35s cubic-bezier(.65,0,.35,1),transform .5s cubic-bezier(.65,0,.35,1)}
.ns-chip svg{width:.78em;height:.78em;color:color-mix(in srgb,var(--c) 75%,var(--ink))}
.ns-chip:nth-child(1){--c:var(--green)}.ns-chip:nth-child(2){--c:var(--seat)}.ns-chip:nth-child(3){--c:var(--warn)}.ns-chip:nth-child(4){--c:var(--danger)}
.ns-chip.on{opacity:1;transform:none}
.ns-chip.out{opacity:0;transform:translateY(-55%)}
@media(prefers-reduced-motion:reduce){.ns-chip{transition:none}}

/* quotes */
/* partner quotes: one big stage */
@property --qp{syntax:"<number>";inherits:false;initial-value:0}
.qs{position:relative;isolation:isolate;overflow:hidden;margin-top:40px;padding:32px 22px 26px;border-radius:28px;background:radial-gradient(90% 70% at 85% 0%,rgb(var(--green-rgb) / .2),transparent 70%),var(--dark);color:#fff}
@media(min-width:640px){.qs{padding:56px 48px 40px;border-radius:36px}}
.qs-mark{position:absolute;z-index:-1;left:14px;top:-36px;font-size:260px;line-height:1;font-weight:700;color:rgb(255 255 255 / .06);pointer-events:none}
@media(min-width:640px){.qs-mark{left:30px;top:-60px;font-size:420px}}
.qs-stage{display:grid;min-height:0}
.qs-q{grid-area:1/1;display:flex;flex-direction:column;justify-content:space-between;gap:28px;visibility:hidden}
.qs-q.on{visibility:visible}
.qs-t{display:block;font-size:clamp(21px,5.6vw,28px);line-height:1.2;font-weight:600;letter-spacing:-.03em;text-wrap:pretty}
@media(min-width:960px){.qs-t{font-size:clamp(32px,3.3vw,48px);max-width:24ch}}
.qs blockquote{margin:0}
.qw{display:inline-block;opacity:0}
.qs-q.on .qw{animation:qs-in .55s cubic-bezier(.65,0,.35,1) both;animation-delay:calc(var(--i) * 24ms + .05s)}
.qs-mk{background:linear-gradient(rgb(var(--green-rgb) / .5),rgb(var(--green-rgb) / .5)) no-repeat 0 92%/0% .38em;color:inherit;padding:0 .05em;-webkit-box-decoration-break:clone;box-decoration-break:clone}
.qs-q.on .qs-mk{animation:qs-mk .7s cubic-bezier(.65,0,.35,1) .55s both}
.qs figcaption{display:flex;flex-direction:column;gap:2px;opacity:0}
.qs-q.on figcaption{animation:qs-cap .5s cubic-bezier(.65,0,.35,1) .35s both}
.qs-n{font-size:var(--fs-title-sm);font-weight:600}
.qs-r{font-size:var(--fs-body-sm);color:rgb(255 255 255 / .62)}
@keyframes qs-in{from{opacity:0;transform:translateY(55%)}to{opacity:1;transform:none}}
@keyframes qs-mk{to{background-size:100% .38em}}
@keyframes qs-cap{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.qs-faces{display:flex;gap:14px;margin-top:32px}
.qs-f{position:relative;flex:none;width:52px;height:52px;padding:0;border:0;border-radius:50%;background:none;cursor:pointer;opacity:.55;filter:grayscale(1);transition:opacity .3s cubic-bezier(.65,0,.35,1),filter .3s cubic-bezier(.65,0,.35,1),transform .3s cubic-bezier(.65,0,.35,1)}
.qs-f img{display:block;width:100%;height:100%;border-radius:50%;object-fit:cover}
@media(hover:hover) and (pointer:fine){.qs-f:hover{opacity:.9}}
.qs-f.on{opacity:1;filter:none;transform:scale(1.12)}
.qs-f:focus-visible{outline:2px solid #fff;outline-offset:4px}
.qs-ring{position:absolute;inset:-6px;border-radius:50%;background:conic-gradient(var(--green) calc(var(--qp) * 1%),rgb(255 255 255 / .16) 0);-webkit-mask:radial-gradient(farthest-side,#0000 calc(100% - 3px),#000 calc(100% - 2px));mask:radial-gradient(farthest-side,#0000 calc(100% - 3px),#000 calc(100% - 2px));animation:qs-ring 7s linear both}
.qs-ring[data-paused="true"]{animation-play-state:paused}
@keyframes qs-ring{from{--qp:0}to{--qp:100}}
@media(prefers-reduced-motion:reduce){.qw{opacity:1}.qs-q.on .qw,.qs-q.on .qs-mk,.qs-q.on figcaption{animation:none}.qs figcaption{opacity:1}.qs-mk{background-size:100% .38em}.qs-ring{display:none}}

/* final CTA + footer */
.n-final{padding:0 8px 8px}
.n-final-card{position:relative;overflow:hidden;max-width:1920px;margin-inline:auto;border-radius:36px;background:#000;color:#fff;padding:96px 24px;text-align:center}
.n-final-card>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.3}
.n-final-card>div{position:relative;z-index:2}
.n-final-card h2{color:rgba(255,255,255,.55);max-width:14ch;margin-inline:auto;font-size:clamp(40px,6.4vw,88px);line-height:1;letter-spacing:-.04em;font-weight:600}
.n-final-card h2 span{color:#fff}
.n-final-card p{margin:24px auto 0;max-width:36ch;font-size:clamp(17px,1.5vw,20px);line-height:1.5;color:rgba(255,255,255,.78)}
.n-final-card [data-slot="button"]{margin-top:36px}
/* closing banner: green 3D cubes fall into the panel and pile up on its floor */
.cb-card{display:flex;flex-direction:column;justify-content:flex-start;min-height:500px;padding:56px 20px 170px;background:radial-gradient(70% 55% at 50% 0%,rgb(var(--green-rgb) / .2),transparent 70%),var(--navy)}
@media(min-width:840px){.cb-card{min-height:680px;padding:96px 32px 260px}}
.n-final-card>.cb-host{position:absolute;inset:0;z-index:1;pointer-events:none}
.cb-canvas{display:block;width:100%;height:100%}
.cb-copy{position:relative;z-index:2;text-align:center}
.cb-card .cb-copy [data-slot="button"]{pointer-events:auto}
.cb-card{touch-action:pan-y}
.cb-card.cb-grab{cursor:grabbing;user-select:none;-webkit-user-select:none}
.cb-static-row{display:none}
.cb-static .cb-static-row{display:flex;position:absolute;left:0;right:0;bottom:18px;justify-content:center;gap:10px;z-index:1}
.cb-static-row i{width:64px;height:64px;border-radius:9px;background:linear-gradient(145deg,var(--green-l),var(--green) 45%,var(--green-d));box-shadow:inset -4px -5px 0 rgb(0 0 0 / .14),0 10px 18px -8px rgb(0 0 0 / .6)}
.cb-static-row i:nth-child(odd){transform:translateY(-8px) rotate(-6deg)}
.cb-static-row i:nth-child(3n){transform:translateY(-4px) rotate(7deg)}
.n-footer{padding:56px 0 40px}
@media(max-width:639px){.n-sec{padding:88px 0}.n .n-fb{padding:0}.n-state{padding:104px 0 48px}.n-footer{padding:80px 0 64px}.n-outsec .n-out{padding:56px 20px 36px}.n-final{padding-top:24px;padding-bottom:16px}}
/* the footer: a hairline, the two-tone slogan, three quiet columns, the small print */
.n-footer{border-top:1px solid var(--line);margin-top:24px}
.n-foot-grid{display:flex;flex-wrap:wrap;justify-content:space-between;gap:48px 64px}
.n-foot-brand{display:grid;gap:22px;align-content:start}
.n-foot-brand img{height:17px;width:auto;filter:brightness(0) invert(var(--logo-inv))}
.n-foot-tag{margin:0;font-size:clamp(26px,2.8vw,36px);line-height:1.08;letter-spacing:-.035em;font-weight:600;color:var(--mut)}
.n-foot-tag b{display:block;color:var(--ink);font-weight:600}
.n-foot-tag span{display:block}
.n-foot-cols{display:flex;flex-wrap:wrap;gap:32px 72px}
.n-foot-cols h4{margin:0 0 8px;font-size:13px;font-weight:500;color:var(--ink2)}
.n-foot-cols a{display:flex;align-items:center;min-height:40px;font-size:15px;color:var(--ink);opacity:.82;text-decoration:none;transition:opacity .15s var(--ease)}
@media(hover:hover) and (pointer:fine){.n-foot-cols a:hover{opacity:1}}
.n-foot-cols a:focus-visible{outline:2px solid var(--ink);outline-offset:3px;border-radius:6px}
.n-legal{margin:56px 0 0;padding-top:24px;border-top:1px solid var(--line);font-size:13.5px;color:var(--ink2)}
@media(max-width:639px){.n-footer{padding:56px 0 40px}.n-foot-cols{gap:28px 40px}.n-legal{margin-top:40px}}

/* ---------- the top bar for ticket buyers ---------- */
/* a full-width band of glass: a light frost at rest, filling in with scroll */
.un-logo img{display:block;height:18px;width:auto;filter:brightness(0) invert(calc(1 - var(--fg) * (1 - var(--logo-inv))))}
.un-theme{display:grid;place-items:center;width:40px;height:40px;padding:0;border:0;border-radius:50%;background:transparent;color:inherit;cursor:pointer;transition:background-color .15s,transform .16s}
.un-theme svg{width:19px;height:19px}
.un-theme .i-sun{display:var(--sun-d)}.un-theme .i-moon{display:var(--moon-d)}
@media(hover:hover) and (pointer:fine){.un-theme:hover{background:rgba(128,128,128,.2)}}
.un-theme:active{transform:scale(.94)}
.un-logo:focus-visible,.un-theme:focus-visible,.sp-trigger:focus-visible{outline:2px solid currentColor;outline-offset:3px}
/* the field: it is only a trigger; the palette it opens is the same shape grown (a shared layout animation) */
/* ---------- the palette ---------- */
.sp-layer{position:fixed;inset:0;z-index:70;pointer-events:none;color:var(--ink)}
.sp-scrim{position:absolute;inset:0;background:rgb(8 12 22 / .46);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);pointer-events:auto}
.sp-pos{position:absolute;inset:clamp(8px,9vh,92px) 0 auto 0;display:flex;justify-content:center;padding-inline:clamp(8px,2vw,16px);pointer-events:none}
.sp-panel{pointer-events:auto;display:flex;width:min(980px,100%);max-height:min(80vh,660px);background:rgb(var(--surface-rgb));box-shadow:0 44px 100px -34px rgb(0 0 0 / .7),0 0 0 1px rgb(var(--ink-rgb) / .08);overflow:hidden}
.sp-in{display:flex;flex-direction:column;width:100%;min-height:0}
.sp-top{display:flex;align-items:center;gap:12px;padding:16px 16px 10px 22px}
.sp-top>svg{flex:none;width:22px;height:22px;color:var(--ink2)}
.sp-top input{flex:1;min-width:0;border:0;outline:0;background:none;color:var(--ink);font:inherit;font-size:clamp(18px,2.2vw,22px);letter-spacing:-.02em}
.sp-top input::placeholder{color:var(--ink2);opacity:.8}
.sp-clear{display:grid;place-items:center;width:32px;height:32px;border:0;border-radius:50%;background:rgb(var(--ink-rgb) / .07);color:var(--ink);cursor:pointer}
.sp-clear svg{width:14px;height:14px}
.sp-esc{padding:0;border:0;background:none;cursor:pointer}
.sp-chips{display:flex;flex-wrap:wrap;align-items:center;gap:8px 18px;padding:0 16px 12px 22px;border-bottom:1px solid rgb(var(--ink-rgb) / .08)}
.sp-recent{display:flex;flex-wrap:wrap;align-items:center;gap:6px;font-size:13px;color:var(--ink2)}
.sp-recent button,.sp-try button{padding:5px 11px;border:0;border-radius:999px;background:rgb(var(--ink-rgb) / .07);color:var(--ink);font:inherit;font-size:13px;font-weight:500;cursor:pointer}
.sp-body{display:grid;grid-template-columns:minmax(0,1fr);flex:1;min-height:0}
@media(min-width:860px){.sp-body{grid-template-columns:minmax(0,1.2fr) minmax(0,.8fr)}}
.sp-list{min-height:240px;overflow:auto;overscroll-behavior:contain;padding:6px 10px 12px}
.sp-g h3{display:flex;align-items:center;gap:6px;margin:12px 12px 4px;font-size:13px;font-weight:600;color:var(--ink2)}
.sp-g h3 svg{width:14px;height:14px}
.sp-row{position:relative;display:flex;align-items:center;gap:12px;padding:8px 12px;border-radius:16px;color:var(--ink);text-decoration:none}
.sp-row>*:not(.sp-hi){position:relative;z-index:1}
.sp-hi{position:absolute;inset:0;z-index:0;border-radius:16px;background:rgb(var(--ink-rgb) / .075)}
.sp-ic{display:grid;place-items:center;flex:none;width:44px;height:44px;border-radius:12px;background:rgb(var(--ink-rgb) / .06);color:var(--ink2);overflow:hidden}
.sp-ic img{width:30px;height:30px;object-fit:contain}
.sp-ic svg{width:20px;height:20px}
.sp-dt{display:grid;justify-items:center;line-height:1;color:var(--ink)}
.sp-dt b{font-size:17px;font-weight:600;letter-spacing:-.03em;font-variant-numeric:tabular-nums}
.sp-dt i{font-style:normal;font-size:12px;color:var(--ink2)}
.sp-t{display:grid;gap:1px;min-width:0}
.sp-t strong{font-size:15px;font-weight:600;letter-spacing:-.01em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sp-t small{font-size:13px;color:var(--ink2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sp-p{margin-left:auto;font-size:14px;font-weight:600;font-variant-numeric:tabular-nums}
.sp-layer mark{background:linear-gradient(transparent 58%,color-mix(in srgb,var(--green) 70%,transparent) 58%);color:inherit;padding:0}
.sp-none{display:grid;justify-items:center;gap:8px;padding:34px 16px;text-align:center;color:var(--ink2)}
.sp-none>svg{width:28px;height:28px}
.sp-none strong{font-size:17px;color:var(--ink)}
.sp-try{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;margin-top:4px}
.sp-none a{margin-top:6px;font-size:14px;font-weight:600;color:var(--ink)}
/* the preview pane: the highlighted row drawn as what you would open */
.sp-foot{display:flex;flex-wrap:wrap;align-items:center;gap:6px 18px;padding:10px 18px;border-top:1px solid rgb(var(--ink-rgb) / .08);background:rgb(var(--ink-rgb) / .03);font-size:13px;color:var(--ink2)}
.sp-foot>span{display:inline-flex;align-items:center;gap:8px}
.sp-foot a{display:inline-flex;align-items:center;gap:6px;margin-left:auto;font-weight:600;color:var(--ink);text-decoration:none}
.sp-foot a svg{width:14px;height:14px}
@media(max-width:859px){.sp-foot>span{display:none}}
@media(prefers-reduced-motion:reduce){.sp-trigger,.un-theme{transition:none}}

/* ---------- the resting bar: one small floating pill ---------- */
/* the same soft blur that sits under the business bar, on phones only, so content slides under the floating pill rather than past it */
.un>.n-fade{display:none}
/* it ends right where the pinned month capsule begins (76px), so the capsule is never blurred */
@media(max-width:759px){.un>.n-fade{display:block;height:76px;-webkit-mask-image:linear-gradient(180deg,#000 0,#000 45%,transparent 100%);mask-image:linear-gradient(180deg,#000 0,#000 45%,transparent 100%)}}
.un{--bg:0;--fg:0;position:fixed;top:14px;left:0;right:0;z-index:50;display:flex;justify-content:center;padding-inline:12px;pointer-events:none;color:color-mix(in srgb,#fff calc((1 - var(--fg)) * 100%),var(--ink))}
.un[data-static]{position:absolute}
.un[data-static] .n-fade{display:none}
.un[data-static] .un-logo img{height:22px}
.un-pill{--sx:50%;--sy:50%;pointer-events:auto;position:relative;isolation:isolate;display:flex;align-items:center;gap:2px;height:48px;padding:0 5px 0 4px;max-width:100%;border-radius:999px;transition:transform .4s cubic-bezier(.23,1,.32,1)}
.un-pill[data-open="1"]>*:not(.sp-shell){opacity:0;pointer-events:none}
.sp-shell{position:absolute;inset:0;z-index:-1;overflow:hidden;background:color-mix(in srgb,rgb(var(--surface-rgb)) calc(var(--bg) * 62%),rgb(255 255 255 / calc(.13 + var(--fg) * .34)));-webkit-backdrop-filter:blur(calc(16px + var(--bg) * 6px)) saturate(1.6);backdrop-filter:blur(calc(16px + var(--bg) * 6px)) saturate(1.6);box-shadow:inset 0 0 0 1px color-mix(in srgb,rgb(var(--ink-rgb) / .09) calc(var(--bg) * 100%),rgb(255 255 255 / .26)),inset 0 1px 0 rgb(255 255 255 / .28)}
/* a sheen that follows the pointer across the glass */
.sp-shell::after{content:"";position:absolute;inset:0;background:radial-gradient(130px circle at var(--sx) var(--sy),rgb(255 255 255 / .32),transparent 70%);opacity:0;transition:opacity .3s}
@media(hover:hover) and (pointer:fine){.un-pill:hover .sp-shell::after{opacity:1}}
.un-logo{display:flex;align-items:center;height:40px;padding:0 12px 0 14px;border-radius:999px}
.un-logo img{display:block;height:16px;width:auto;filter:brightness(0) invert(calc(1 - var(--fg) * (1 - var(--logo-inv))))}
.un-r{display:flex;align-items:center;gap:4px}
.un-theme{display:grid;place-items:center;width:38px;height:38px;padding:0;border:0;border-radius:50%;background:transparent;color:inherit;cursor:pointer;transition:background-color .15s,transform .16s}
.un-theme svg{width:19px;height:19px}
.un-theme .i-sun{display:var(--sun-d)}.un-theme .i-moon{display:var(--moon-d)}
@media(hover:hover) and (pointer:fine){.un-theme:hover{background:rgba(128,128,128,.2)}}
.un-theme:active{transform:scale(.94)}
.un-logo:focus-visible,.un-theme:focus-visible,.sp-trigger:focus-visible{outline:2px solid currentColor;outline-offset:2px}
/* the trigger: it leans open when you reach for it */
.sp-trigger{position:relative;display:flex;align-items:center;gap:9px;width:172px;height:38px;padding:0 10px 0 12px;border:0;border-radius:999px;background:rgb(255 255 255 / calc(.0 + var(--fg) * .0));color:inherit;font:inherit;font-size:15px;text-align:start;cursor:pointer;transition:width .45s cubic-bezier(.23,1,.32,1),background-color .2s,transform .16s}
@media(hover:hover) and (pointer:fine){.sp-trigger:hover,.sp-trigger:focus-visible{width:268px;background:rgba(128,128,128,.16)}}
.sp-trigger:active{transform:scale(.97)}
.sp-trigger>svg{flex:none;width:18px;height:18px}
.sp-ph{flex:1;display:flex;align-items:baseline;gap:.4em;min-width:0;overflow:hidden;white-space:nowrap;opacity:.92}
.sp-ph-w{position:relative;display:inline-flex;min-width:0;opacity:.7}
.sp-trigger [data-slot=kbd-group]{flex:none;opacity:0;transition:opacity .3s}
@media(hover:hover) and (pointer:fine){.sp-trigger:hover [data-slot=kbd-group],.sp-trigger:focus-visible [data-slot=kbd-group]{opacity:1}}
@media(max-width:559px){.un-pill{width:100%;justify-content:space-between}.sp-trigger{width:40px;padding:0;justify-content:center;flex:none}.sp-ph,.sp-trigger [data-slot=kbd-group]{display:none}.un-logo{padding:0 8px 0 12px}.un-pill>.sp-trigger{margin-left:auto}}
/* ---------- the palette: it takes the colour of whatever is highlighted ---------- */
.sp-in{position:relative;z-index:1}
/* ---------- the quick look ---------- */
.sp-pre{display:none;position:relative;padding:18px;background:rgb(var(--ink-rgb) / .03);border-left:1px solid rgb(var(--ink-rgb) / .08);perspective:900px;overflow:auto;overscroll-behavior:contain}
@media(min-width:860px){.sp-pre{display:block}}
.sp-pre-in{width:100%}
.sp-ql{display:grid;gap:14px}
.sp-tk-pr{display:grid;gap:2px;line-height:1}
.sp-tk-pr small{font-size:12px;opacity:.8}
.sp-tk-pr b{font-size:26px;font-weight:600;letter-spacing:-.03em;font-variant-numeric:tabular-nums}
/* the quick-look ticket: the schedule tile from the team pages, smaller (poster, crest, title over a fade, punched holes, price and button) */
.sp-tk{transform-style:preserve-3d;filter:drop-shadow(0 18px 20px rgb(0 0 0 / .22)) drop-shadow(0 1px 3px rgb(0 0 0 / .2))}
.sp-tl{--sh:76px;--r:9px;position:relative;display:grid;grid-template-rows:minmax(0,1fr) var(--sh);min-height:280px;border-radius:26px;background:#0a0508;color:#fff;isolation:isolate;
  -webkit-mask:radial-gradient(circle var(--r) at 0 calc(100% - var(--sh)),#0000 98%,#000),radial-gradient(circle var(--r) at 100% calc(100% - var(--sh)),#0000 98%,#000);-webkit-mask-composite:source-in;
  mask:radial-gradient(circle var(--r) at 0 calc(100% - var(--sh)),#0000 98%,#000),radial-gradient(circle var(--r) at 100% calc(100% - var(--sh)),#0000 98%,#000);mask-composite:intersect}
.sp-tl-img{position:relative;display:grid;align-content:end;overflow:hidden;border-radius:26px 26px 0 0;background:radial-gradient(120% 90% at 100% 0,color-mix(in srgb,var(--ac) 62%,#fff),transparent 60%),linear-gradient(165deg,var(--ac),color-mix(in srgb,var(--ac) 55%,#000))}
.sp-tl-img::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgb(0 0 0 / .3) 0%,transparent 24%,rgb(0 0 0 / .3) 46%,rgb(0 0 0 / .66) 70%,rgb(0 0 0 / .92) 100%)}
.sp-tl-art{position:absolute;left:50%;top:35%;width:min(22%,84px);translate:-50% -50%;rotate:-5deg}
.sp-tl-art img{display:block;width:100%;height:auto;border-radius:11px;box-shadow:0 0 0 3px #fff,0 12px 26px rgb(0 0 0 / .45)}
.sp-tl-big{position:absolute;left:50%;top:37%;translate:-50% -50%;font-size:72px;font-weight:600;letter-spacing:-.06em;line-height:1;color:rgb(255 255 255 / .9)}
.sp-tl-s{position:absolute;left:16px;top:15px;z-index:1;font-size:13px;font-weight:500;text-shadow:0 1px 10px rgb(0 0 0 / .55)}
.sp-tl-dt{position:absolute;right:14px;top:14px;z-index:1;padding:3px 10px;border-radius:999px;background:rgb(0 0 0 / .28);box-shadow:inset 0 0 0 1px rgb(255 255 255 / .2);font-size:12.5px;font-weight:600;font-variant-numeric:tabular-nums}
.sp-tl-t{position:relative;z-index:1;display:grid;gap:6px;padding:0 18px 18px}
.sp-tl-t h4{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;line-clamp:3;overflow:hidden;font-size:18px;line-height:1.2;font-weight:600;letter-spacing:-.02em;text-wrap:balance;text-shadow:0 1px 14px rgb(0 0 0 / .45)}
.sp-tl-t p{font-size:13px;line-height:1.4;color:rgb(255 255 255 / .86);text-shadow:0 1px 10px rgb(0 0 0 / .4)}
.sp-tl-t p a{color:inherit;text-decoration:underline;text-decoration-color:rgb(255 255 255 / .45);text-underline-offset:3px}
.sp-tl-b{position:relative;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 16px 0 20px;background:linear-gradient(180deg,rgb(255 255 255 / .05),transparent 60%)}
.sp-tl-b::before{content:"";position:absolute;left:20px;right:20px;top:-2px;height:4px;background:radial-gradient(circle,rgb(255 255 255 / .42) 1px,transparent 1.5px) 0 0/8px 4px repeat-x}
.sp-card{display:flex;align-items:center;gap:14px;padding:14px;border-radius:20px;background:rgb(var(--surface-rgb));box-shadow:0 0 0 1px rgb(var(--ink-rgb) / .08)}
.sp-card-ic{display:grid;place-items:center;flex:none;width:64px;height:64px;border-radius:18px;background:color-mix(in srgb,var(--ac) 16%,transparent);color:var(--ink)}
.sp-card-ic img{width:44px;height:44px;object-fit:contain}
.sp-card-ic svg{width:28px;height:28px}
.sp-card-t{display:grid;gap:2px;min-width:0}
.sp-card-t h4{font-size:18px;line-height:1.15;font-weight:600;letter-spacing:-.025em;text-wrap:balance}
.sp-card-t p{font-size:14px;color:var(--ink2)}
.sp-ql-g{display:grid;gap:2px}
.sp-ql-g h5{margin:0 4px 4px;font-size:13px;font-weight:600;color:var(--ink2)}
.sp-mini{display:flex;align-items:center;gap:10px;padding:7px 8px;border-radius:14px;color:var(--ink);text-decoration:none;transition:background-color .12s}
@media(hover:hover) and (pointer:fine){.sp-mini:hover{background:rgb(var(--ink-rgb) / .07)}}
.sp-mini-d{display:grid;justify-items:center;flex:none;width:38px;line-height:1}
.sp-mini-d b{font-size:16px;font-weight:600;letter-spacing:-.03em}
.sp-mini-d i{font-style:normal;font-size:12px;color:var(--ink2)}
.sp-mini-t{display:grid;min-width:0}
.sp-mini-t strong{font-size:14px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sp-mini-t small{font-size:13px;color:var(--ink2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sp-mini-p{margin-left:auto;font-size:14px;font-weight:600;font-variant-numeric:tabular-nums}
.sp-ql-a{display:flex;flex-wrap:wrap;gap:8px}
@media(prefers-reduced-motion:reduce){.sp-trigger,.un-pill{transition:none}}

/* ===== v2: the pill as two layers of glass, a switch, and the palette as glass holding two sheets ===== */
/* outer layer: a thick frosted capsule with a specular top edge and a faint inner rim */
.sp-shell{background:linear-gradient(180deg,rgb(255 255 255 / calc(.26 + var(--fg) * .3)),rgb(255 255 255 / calc(.1 + var(--fg) * .22)));-webkit-backdrop-filter:blur(calc(22px + var(--bg) * 8px)) saturate(1.9);backdrop-filter:blur(calc(22px + var(--bg) * 8px)) saturate(1.9);box-shadow:inset 0 1.5px 0 rgb(255 255 255 / .55),inset 0 -1.5px 0 rgb(255 255 255 / .1),inset 0 0 0 1px rgb(255 255 255 / .2),inset 0 0 22px rgb(255 255 255 / .08)}
.un-pill{gap:6px;height:52px;padding:6px}
.un-pill[data-open="0"] .sp-shell::before{content:"";position:absolute;inset:0;background:rgb(var(--surface-rgb) / calc(var(--bg) * .7))}
/* inner layer: each control is its own brighter capsule floating on the outer glass */
.un-logo{height:40px;padding:0 15px 0 16px;border-radius:999px}
@media(hover:hover) and (pointer:fine){.sp-trigger:hover,.sp-trigger:focus-visible{background:linear-gradient(180deg,rgb(255 255 255 / .42),rgb(255 255 255 / .2))}}
.un-r{gap:6px}
/* the switch: a sun and a moon with a glass thumb that slides to whichever is on */
@media(max-width:559px){.un-pill{padding:5px;gap:5px}.un-sw{width:66px}.un-sw-th{width:28px}.un-sw[data-dark="1"] .un-sw-th{transform:translateX(30px)}.un-logo{padding:0 10px 0 12px}}
/* the palette: a glass frame (the page is already blurred behind it) holding an opaque sheet for the list and a tinted one for the quick look, so every word sits on a flat surface */
.sp-panel{background:linear-gradient(180deg,rgb(var(--surface-rgb) / .97),rgb(var(--surface-rgb) / .94));box-shadow:inset 0 1.5px 0 rgb(255 255 255 / .5),0 0 0 1px rgb(var(--ink-rgb) / .1),0 50px 110px -36px rgb(0 0 0 / .7)}
.sp-top{padding:18px 18px 12px 24px}
.sp-top input{font-size:clamp(19px,2.3vw,24px)}
.sp-chips{border-bottom:0;padding:0 18px 12px 24px}
.sp-body{gap:8px;padding:0 8px 8px;min-height:0;flex:1}
.sp-list{min-height:0;max-height:calc(min(80vh,660px) - 176px);border-radius:22px;background:rgb(var(--surface-rgb));box-shadow:0 0 0 1px rgb(var(--ink-rgb) / .06);padding:0}
.sp-list-in{padding:6px 8px 8px}
.sp-pre{border-left:0;border-radius:22px;background:rgb(var(--ink-rgb) / .045);box-shadow:inset 0 0 0 1px rgb(var(--ink-rgb) / .05)}
.sp-foot{border-top:0;background:none;padding:6px 20px 12px}
.sp-row{padding:9px 12px}
.sp-t strong{font-size:16px}
.sp-list[data-fresh="1"] .sp-row{animation:sp-rise .34s calc(var(--i) * 24ms + 70ms) cubic-bezier(.23,1,.32,1) both}
@keyframes sp-rise{from{opacity:0;transform:translateY(8px)}}
.sp-live{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@media(prefers-reduced-motion:reduce){.sp-list[data-fresh="1"] .sp-row{animation:none}.un-sw-th{transition:none}}

/* ===== v3: real frost (heavy blur, an even tint, a little grain) for the pill and the palette, and controls that sit quietly on it ===== */
.sp-shell{background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.09'/%3E%3C/svg%3E"),rgb(255 255 255 / calc(.06 + var(--fg) * .3));-webkit-backdrop-filter:blur(calc(34px + var(--bg) * 8px)) saturate(1.5);backdrop-filter:blur(calc(34px + var(--bg) * 8px)) saturate(1.5);box-shadow:inset 0 0 0 1px rgb(255 255 255 / .22),0 8px 32px -8px rgb(0 0 0 / calc(.05 + var(--bg) * .09)),0 1px 3px rgb(0 0 0 / calc(var(--bg) * .04))}
@media(hover:hover) and (pointer:fine){.sp-trigger:hover,.sp-trigger:focus-visible{background:rgb(255 255 255 / .17)}}
.sp-panel{background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.09'/%3E%3C/svg%3E"),rgb(var(--surface-rgb) / .68);-webkit-backdrop-filter:blur(42px) saturate(1.6);backdrop-filter:blur(42px) saturate(1.6);box-shadow:inset 0 0 0 1px rgb(255 255 255 / .24),0 0 0 1px rgb(var(--ink-rgb) / .07),0 50px 110px -36px rgb(0 0 0 / .65)}
.sp-list{background:rgb(var(--surface-rgb) / .6);-webkit-backdrop-filter:blur(40px) saturate(1.5);backdrop-filter:blur(40px) saturate(1.5);box-shadow:inset 0 2px 0 var(--glass-highlight),inset 0 0 0 1px var(--glass-edge)}
.sp-pre{background:rgb(var(--surface-rgb) / .38);box-shadow:inset 0 0 0 1px rgb(var(--ink-rgb) / .06)}
.sp-scrim{background:rgb(8 12 22 / .34)}

/* ===== v4 ===== */
/* the rotating hint word only shows once the trigger has leaned open, so it is never clipped at rest */
.sp-ph-w{display:none}
@media(hover:hover) and (pointer:fine){.sp-trigger:hover .sp-ph-w,.sp-trigger:focus-visible .sp-ph-w{display:inline-flex}}
/* reaching for the pill fills the glass in with the theme's own surface colour */
.un-pill[data-open="0"] .sp-shell::before{transition:background-color .35s cubic-bezier(.23,1,.32,1)}
@media(hover:hover) and (pointer:fine){.un-pill[data-open="0"]:hover .sp-shell::before{background:rgb(var(--surface-rgb) / calc(.34 + var(--bg) * .4))}}
/* the palette: more white in the light theme (--logo-inv is 0 in light, 1 in dark), and the page behind is washed with the surface colour instead of blurred */
.sp-scrim{-webkit-backdrop-filter:none;backdrop-filter:none;background:rgb(var(--surface-rgb) / calc(.82 - var(--logo-inv,0) * .24))}
.sp-panel{background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.09'/%3E%3C/svg%3E"),rgb(var(--surface-rgb) / calc(.98 - var(--logo-inv,0) * .12))}
.sp-list{background:rgb(var(--surface-rgb) / calc(1 - var(--logo-inv,0) * .1))}
.sp-pre{background:rgb(var(--surface-rgb) / calc(.8 - var(--logo-inv,0) * .3))}

/* ===== v5: a calm hover ===== */
/* no pointer-following sheen: it read as a smear across the glass */
.sp-shell::after{display:none}
/* hovering the pill only deepens the tint a little, evenly across it */
@media(hover:hover) and (pointer:fine){.un-pill[data-open="0"]:hover .sp-shell::before{background:rgb(var(--surface-rgb) / calc(.16 + var(--bg) * .5))}}
@media(hover:hover) and (pointer:fine){.sp-trigger:hover,.sp-trigger:focus-visible{background:rgb(255 255 255 / .12)}}
/* the shortcut keys stay in the family of the glass instead of sitting on it as grey boxes */
.sp-trigger [data-slot=kbd]{background:rgb(255 255 255 / .14);color:inherit;box-shadow:none}

/* ===== v6: the search field itself fills in when you reach for it ===== */
.sp-trigger{transition:width .45s cubic-bezier(.23,1,.32,1),background-color .25s cubic-bezier(.23,1,.32,1),color .25s,transform .16s}
@media(hover:hover) and (pointer:fine){
.sp-trigger:hover,.sp-trigger:focus-visible{background:rgb(var(--surface-rgb) / .66);color:var(--ink);box-shadow:inset 0 0 0 1px rgb(var(--ink-rgb) / .08)}
.sp-trigger:hover [data-slot=kbd],.sp-trigger:focus-visible [data-slot=kbd]{background:rgb(var(--ink-rgb) / .08)}
}

/* hovering highlights the search field only; the pill's own glass stays as it is */
@media(hover:hover) and (pointer:fine){.un-pill[data-open="0"]:hover .sp-shell::before{background:rgb(var(--surface-rgb) / calc(var(--bg) * .7))}}


/* the logo sits straight on the glass, with no capsule of its own */
.un-logo{background:none;box-shadow:none;-webkit-backdrop-filter:none;backdrop-filter:none}

/* the search is always shown open: wide, with its hint and shortcut visible, and typing into it opens the palette with what you typed */
.sp-trigger{width:300px}
.sp-ph-w{display:inline-flex}
.sp-trigger [data-slot=kbd-group]{opacity:1}
@media(hover:hover) and (pointer:fine){.sp-trigger:hover,.sp-trigger:focus-visible{width:300px}}
@media(max-width:559px){.sp-trigger,.sp-trigger:hover{width:40px}}

/* the search field rests on a darker fill with light text, so it reads on any page; hovering still turns it to the surface colour */
.sp-trigger{background:rgb(10 14 24 / .34);color:#fff}
.sp-trigger [data-slot=kbd]{background:rgb(255 255 255 / .16);color:#fff}


/* the search field follows the pill: a dark well with light text at rest, a light well with dark text once the pill has filled in (--bg is 0 at rest, 1 scrolled) */
.sp-trigger{background:color-mix(in srgb,rgb(10 14 24 / .34) calc((1 - var(--fg)) * 100%),rgb(var(--ink-rgb) / .09));color:color-mix(in srgb,#fff calc((1 - var(--fg)) * 100%),var(--ink))}
.sp-trigger [data-slot=kbd]{background:color-mix(in srgb,rgb(255 255 255 / .16) calc((1 - var(--fg)) * 100%),rgb(var(--ink-rgb) / .08));color:inherit}

/* no outlines: the glass, the search field and the palette are edged by their fill and shadow alone (keyboard focus rings stay) */
.sp-shell{box-shadow:0 8px 32px -8px rgb(0 0 0 / calc(.05 + var(--bg) * .09)),0 1px 3px rgb(0 0 0 / calc(var(--bg) * .04))}
.sp-trigger,.sp-trigger:hover{box-shadow:none}
.sp-trigger:focus-visible{box-shadow:0 0 0 2px rgb(255 255 255 / .6)}
.sp-panel{box-shadow:0 50px 110px -36px rgb(0 0 0 / .65)}
.sp-list,.sp-pre,.sp-card{box-shadow:none}

/* the mode control rests as frosted glass like the rest of the pill: a clear track, a lighter thumb, light icons; scrolled (--bg 1) it takes the design system's own solid look back */
.un [data-slot=tabs-list]{background:color-mix(in srgb,rgb(255 255 255 / .14) calc((1 - var(--fg)) * 100%),var(--h-neutral-track))}
.un [data-slot=tabs-trigger]{color:color-mix(in srgb,#fff calc((1 - var(--fg)) * 100%),var(--ink))}
.un [data-slot=tabs-trigger][data-state=active]{background:color-mix(in srgb,rgb(255 255 255 / .3) calc((1 - var(--fg)) * 100%),var(--h-neutral-selected))}

/* the selected pill is a span inside the trigger */
.un [data-slot=tabs-trigger][data-state=active]{background:none}
.un [data-slot=tabs-trigger][data-state=active]>span:first-child{background:color-mix(in srgb,rgb(255 255 255 / .3) calc((1 - var(--fg)) * 100%),var(--h-neutral-selected));box-shadow:none}

/* hovering the search field deepens its own fill (never turns it to the surface colour): darker navy at rest, a darker grey well once the pill is filled in */
@media(hover:hover) and (pointer:fine){
.sp-trigger:hover,.sp-trigger:focus-visible{background:color-mix(in srgb,rgb(10 14 24 / .48) calc((1 - var(--fg)) * 100%),rgb(var(--ink-rgb) / .15));color:color-mix(in srgb,#fff calc((1 - var(--fg)) * 100%),var(--ink))}
.sp-trigger:hover [data-slot=kbd],.sp-trigger:focus-visible [data-slot=kbd]{background:color-mix(in srgb,rgb(255 255 255 / .18) calc((1 - var(--fg)) * 100%),rgb(var(--ink-rgb) / .1))}
}

/* the page behind the palette is blurred (the design system's blur backdrop), with a light dim so the panel stands off it */
.sp-scrim{-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);background:rgb(8 12 22 / .26)}

/* the design system's opaque backdrop: a flat dark dim in both themes, no blur */
.sp-scrim{-webkit-backdrop-filter:none;backdrop-filter:none;background:rgb(8 12 22 / .62)}

/* ===== v6: the palette, settled ===== */
/* One fixed-size panel. Nothing resizes while you type: results scroll inside it, so there is no height to animate and nothing to bounce. */
.sp-pos{--sp-top:clamp(12px,8vh,88px);inset:var(--sp-top) 0 auto 0}
.sp-panel{position:relative;isolation:isolate;height:min(600px,calc(100dvh - var(--sp-top) - 16px));max-height:none}
.sp-in{height:100%}
.sp-body{grid-template-rows:minmax(0,1fr)}
.sp-list,.sp-pre{height:100%;max-height:none;scrollbar-width:thin;scrollbar-color:rgb(var(--ink-rgb) / .22) transparent}
.sp-layer :focus-visible:not(input){outline:2px solid var(--ink);outline-offset:2px}
.sp-top input:focus-visible{outline:0}
.sp-layer ::selection{background:color-mix(in srgb,var(--green) 42%,transparent)}

/* the field */
.sp-top{position:relative;gap:14px;padding:20px 20px 16px 26px}
.sp-top>svg{width:22px;height:22px;color:var(--ink)}
.sp-top input{font-size:clamp(20px,2.4vw,26px);font-weight:500;letter-spacing:-.025em}
/* a hairline under the field, which firms up when it has focus (the field itself draws no outline) */
.sp-top::after{content:"";position:absolute;left:26px;right:20px;bottom:0;height:1px;background:rgb(var(--ink-rgb) / .06);transition:background-color .2s cubic-bezier(.23,1,.32,1)}
.sp-top:focus-within::after{background:rgb(var(--ink-rgb) / .12)}
/* the hint in the empty field: a step smaller, lighter and fainter than what you type */
.sp-top input::placeholder{font-size:clamp(17px,2vw,21px);font-weight:400;opacity:.5}
/* the panel's own faint edge */
.sp-panel{box-shadow:0 0 0 2px rgb(var(--ink-rgb) / .1),0 50px 110px -36px rgb(0 0 0 / .65)}
.sp-clear:active,.sp-esc:active{transform:scale(.94)}

/* filters: one row that scrolls sideways instead of wrapping into three */
.sp-chips{flex-wrap:nowrap;gap:10px;padding:12px 18px 12px 26px;overflow-x:auto;scrollbar-width:none;-webkit-mask-image:linear-gradient(90deg,#000 calc(100% - 40px),transparent);mask-image:linear-gradient(90deg,#000 calc(100% - 40px),transparent)}
.sp-chips::-webkit-scrollbar{display:none}
.sp-chips>*{flex:none}
.sp-sep{width:1px;height:20px;background:rgb(var(--ink-rgb) / .14)}

/* the list */
.sp-gh{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:6px;margin:0;padding:12px 12px 8px;font-size:13px;font-weight:600;color:var(--ink2);background:rgb(var(--surface-rgb) / .94);-webkit-backdrop-filter:blur(24px);backdrop-filter:blur(24px);box-shadow:0 1px 0 rgb(var(--ink-rgb) / .05)}
.sp-gh svg{width:14px;height:14px}
.sp-row{min-height:60px;transition:transform .16s cubic-bezier(.23,1,.32,1)}
.sp-row:active{transform:scale(.99)}
.sp-go{margin-left:auto;opacity:0;transition:opacity .14s cubic-bezier(.23,1,.32,1)}
.sp-p~.sp-go{margin-left:10px}
.sp-row[data-on="1"] .sp-go{opacity:1}
.sp-foot{align-items:center}

@media(max-width:859px){
  .sp-pos{--sp-top:10px;padding-inline:8px}
  .sp-panel{height:calc(100dvh - var(--sp-top) - 10px)}
    .sp-top{padding:16px 14px 12px 20px}
  .sp-top::after{left:20px;right:14px}
  .sp-chips{padding-left:20px}
  .sp-body{padding:0 6px 6px}
}
@media(hover:none){.sp-foot>span{display:none}.sp-go{display:none}}
@media(prefers-reduced-motion:reduce){.sp-row,.sp-go{transition:none}.sp-row:active{transform:none}}
.sp-tips{display:grid;align-content:start;gap:14px;padding:26px 24px;color:var(--ink2);font-size:14px}
.sp-tips strong{font-size:17px;font-weight:600;color:var(--ink);letter-spacing:-.02em}
.sp-tips ul{display:grid;gap:12px;margin:0;padding:0;list-style:none}
.sp-tips li{display:grid;gap:2px}
.sp-tips b{font-weight:600;color:var(--ink)}

/* autocomplete: the ghost text sits exactly under the field's own text, so what you typed is hidden in it and only the suggested rest shows */
.sp-field{position:relative;flex:1;min-width:0;display:block}
.sp-field input{position:relative;display:block;width:100%;padding:0;line-height:1.3;background:transparent}
.sp-ghost{position:absolute;inset:0;display:flex;align-items:center;overflow:hidden;white-space:pre;pointer-events:none;font-size:clamp(20px,2.4vw,26px);font-weight:500;letter-spacing:-.025em;line-height:1.3;color:var(--ink2);opacity:.5}
.sp-ghost i{font-style:normal;visibility:hidden}
.sp-accept{flex:none;display:inline-flex}
.sp-dym{padding:6px 14px;border:0;border-radius:999px;background:rgb(var(--ink-rgb) / .07);color:var(--ink);font:inherit;font-size:14px;cursor:pointer}
.sp-dym b{font-weight:600}
.sp-dym:active{transform:scale(.97)}
@media(hover:none){.sp-accept{display:none}}
/* the two filter groups say what they are */
.sp-fl{flex:none;font-size:13px;font-weight:500;color:var(--ink2)}
/* light theme: a whiter sheet (more of the surface colour, less of the page showing through); dark theme keeps its values (--logo-inv is 1 there) */
.sp-panel{background-color:rgb(var(--surface-rgb) / calc(.96 - var(--logo-inv,0) * .28))}
.sp-list{background:rgb(var(--surface-rgb) / .38)}
.sp-pre{background:rgb(var(--surface-rgb) / .4)}
/* the quick look on the right is not a card: no tinted box, the content sits straight on the sheet */
.sp-pre,.sp-pre:is(*){background:none;box-shadow:none;border-radius:0}
.sp-pre{padding:6px 14px 6px 12px}
.sp-card{padding:0;background:none;box-shadow:none}
/* resting on a light page (--fg is 1 there): the pill keeps a hairline and a faint fill of its own, so it never dissolves into a white background; the controls above now follow --fg, the surface, not the scroll depth */
.sp-shell{box-shadow:0 8px 32px -8px rgb(0 0 0 / calc(.05 + var(--bg) * .09)),0 1px 3px rgb(0 0 0 / calc(var(--bg) * .04)),inset 0 0 0 1px rgb(var(--ink-rgb) / calc(var(--fg) * .09))}
/* ===== the morph: pill content hands over to the palette ===== */
/* The pill's own controls leave quickly as the shell starts to grow, and come back late, once the shell is nearly pill-sized again, so nothing pops while the glass is mid-flight. */
.un-pill>*:not(.sp-shell){filter:blur(0)}
.un-pill[data-open="1"]>*:not(.sp-shell){filter:blur(3px)}
.un-pill>*:not(.sp-shell):not(.sp-trigger){transition:opacity .09s cubic-bezier(.23,1,.32,1),filter .09s cubic-bezier(.23,1,.32,1)}
.un-pill>.sp-trigger{transition:width .45s cubic-bezier(.23,1,.32,1),background-color .25s cubic-bezier(.23,1,.32,1),color .25s,transform .16s,opacity .09s cubic-bezier(.23,1,.32,1),filter .09s cubic-bezier(.23,1,.32,1)}
/* on close they arrive one after another as the glass settles: soft fade out of a slight blur, 40ms apart */
.un-pill[data-open="0"]>*:not(.sp-shell):not(.sp-trigger){transition:opacity .38s cubic-bezier(.23,1,.32,1) calc(.2s + var(--k,0) * .045s),filter .38s cubic-bezier(.23,1,.32,1) calc(.2s + var(--k,0) * .045s)}
.un-pill[data-open="0"]>.sp-trigger{transition:width .45s cubic-bezier(.23,1,.32,1),background-color .25s cubic-bezier(.23,1,.32,1),color .25s,transform .16s,opacity .38s cubic-bezier(.23,1,.32,1) calc(.2s + var(--k,0) * .045s),filter .38s cubic-bezier(.23,1,.32,1) calc(.2s + var(--k,0) * .045s)}
.un-pill>*:nth-child(2){--k:0}.un-pill>*:nth-child(3){--k:1}.un-pill>*:nth-child(4){--k:2}.un-pill>*:nth-child(5){--k:3}
@media(prefers-reduced-motion:reduce){.un-pill>*:not(.sp-shell),.un-pill[data-open="0"]>*:not(.sp-shell){transition:none;filter:none}}
/* the panel is scaled by the layout animation, so it gets its own compositor layer for the morph */
.sp-panel{will-change:transform}
/* skip link: off-screen until a keyboard user tabs to it */
.n-skip{position:fixed;left:16px;top:-64px;z-index:100;padding:10px 16px;border-radius:999px;background:var(--ink);color:var(--paper);font-size:14px;font-weight:600;text-decoration:none;transition:top .2s var(--ease)}
.n-skip:focus-visible{top:16px;outline:2px solid var(--green);outline-offset:2px}
/* glass panel, last so it wins over the earlier panel looks */
.sp-panel{background:rgb(var(--surface-rgb) / .64);-webkit-backdrop-filter:blur(40px) saturate(1.5);backdrop-filter:blur(40px) saturate(1.5);box-shadow:inset 0 2px 0 var(--glass-highlight),inset 0 0 0 1px var(--glass-edge),0 50px 110px -36px rgb(0 0 0 / .65)}
/* a venue is a photo, not a logo: it fills the whole mark (as on Browse) */
.sp-ic[data-photo="1"] img,.sp-card-ic[data-photo="1"] img{width:100%;height:100%;object-fit:cover;filter:none}
.sp-card-ic[data-photo="1"]{overflow:hidden}
/* macOS-style glass: one material (the panel), heavy blur with vibrancy, a thin tint, a top highlight and a hairline edge; the columns sit on it with no fill of their own */
.sp-panel{background:rgb(255 255 255 / .55);-webkit-backdrop-filter:blur(28px) saturate(180%);backdrop-filter:blur(28px) saturate(180%);box-shadow:inset 0 .5px 0 rgb(255 255 255 / .75),inset 0 0 0 .5px rgb(0 0 0 / .07),0 30px 80px -20px rgb(0 0 0 / .28)}
.sp-list{background:transparent;-webkit-backdrop-filter:none;backdrop-filter:none;box-shadow:none}
.sp-pre{background:rgb(255 255 255 / .22);box-shadow:inset 0 .5px 0 rgb(255 255 255 / .5),inset 0 0 0 .5px rgb(0 0 0 / .05)}
.sp-gh{background:rgb(255 255 255 / .6)}
.sp-row[data-on="1"] .sp-hi{background:rgb(0 0 0 / .06)}
:root[data-nt="dark"] .sp-panel{background:rgb(28 28 30 / .55);box-shadow:inset 0 .5px 0 rgb(255 255 255 / .16),inset 0 0 0 .5px rgb(255 255 255 / .08),0 30px 80px -20px rgb(0 0 0 / .6)}
:root[data-nt="dark"] .sp-pre{background:rgb(255 255 255 / .05)}
:root[data-nt="dark"] .sp-gh{background:rgb(40 40 42 / .7)}
:root[data-nt="dark"] .sp-row[data-on="1"] .sp-hi{background:rgb(255 255 255 / .09)}
@media(prefers-color-scheme:dark){:root:not([data-nt="light"]) .sp-panel{background:rgb(28 28 30 / .55);box-shadow:inset 0 .5px 0 rgb(255 255 255 / .16),inset 0 0 0 .5px rgb(255 255 255 / .08),0 30px 80px -20px rgb(0 0 0 / .6)}:root:not([data-nt="light"]) .sp-pre{background:rgb(255 255 255 / .05)}:root:not([data-nt="light"]) .sp-gh{background:rgb(40 40 42 / .7)}:root:not([data-nt="light"]) .sp-row[data-on="1"] .sp-hi{background:rgb(255 255 255 / .09)}}
/* the scrim was a flat 62% dark slab, so the glass was blurring a grey rectangle. It is now a light dim over a blurred page, so the panel's glass shows the page's own colours */
.sp-scrim{-webkit-backdrop-filter:blur(14px) saturate(140%);backdrop-filter:blur(14px) saturate(140%);background:rgb(0 0 0 / .12)}
:root[data-nt="dark"] .sp-scrim{background:rgb(0 0 0 / .4)}
@media(prefers-color-scheme:dark){:root:not([data-nt="light"]) .sp-scrim{background:rgb(0 0 0 / .4)}}
/* light theme: the scrim is a white wash over the blurred page, like macOS light materials */
.sp-scrim{background:rgb(255 255 255 / .45)}
:root[data-nt="dark"] .sp-scrim{background:rgb(0 0 0 / .4)}
@media(prefers-color-scheme:dark){:root:not([data-nt="light"]) .sp-scrim{background:rgb(0 0 0 / .4)}}
/* the page behind is not blurred; only the wash */
.sp-scrim{-webkit-backdrop-filter:none;backdrop-filter:none}
/* a stronger white wash behind the palette (light theme) */
.sp-scrim{background:rgb(255 255 255 / .75)}
:root[data-nt="dark"] .sp-scrim{background:rgb(0 0 0 / .4)}
@media(prefers-color-scheme:dark){:root:not([data-nt="light"]) .sp-scrim{background:rgb(0 0 0 / .4)}}
/* sticky section headers: opaque enough that rows never show through the label, with room below and a soft fade into the rows */
.sp-gh{background:rgb(247 247 249 / .97);-webkit-backdrop-filter:none;backdrop-filter:none;padding:12px 12px 10px;box-shadow:0 10px 10px -6px rgb(247 247 249 / .97)}
:root[data-nt="dark"] .sp-gh{background:rgb(38 38 41 / .97);box-shadow:0 10px 10px -6px rgb(38 38 41 / .97)}
@media(prefers-color-scheme:dark){:root:not([data-nt="light"]) .sp-gh{background:rgb(38 38 41 / .97);box-shadow:0 10px 10px -6px rgb(38 38 41 / .97)}}
/* dark theme: the same 75% wash, in black */
:root[data-nt="dark"] .sp-scrim{background:rgb(0 0 0 / .75)}
@media(prefers-color-scheme:dark){:root:not([data-nt="light"]) .sp-scrim{background:rgb(0 0 0 / .75)}}
/* sticky headers that blend with the glass at rest: the panel's own tint plus a blur that softens rows scrolling under the label, no grey bar and no shadow */
.sp-gh{background:rgb(255 255 255 / .5);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);box-shadow:none}
:root[data-nt="dark"] .sp-gh{background:rgb(28 28 30 / .5);box-shadow:none}
@media(prefers-color-scheme:dark){:root:not([data-nt="light"]) .sp-gh{background:rgb(28 28 30 / .5);box-shadow:none}}
/* sticky headers have no fill at rest; the fill (the glass tint and a blur) fades in only while a header is actually stuck to the top (container scroll-state query) */
.sp-gh{background:none!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important;box-shadow:none!important;container-type:scroll-state}
.sp-gh::before{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;opacity:0;transition:opacity .18s cubic-bezier(.23,1,.32,1);background:rgb(255 255 255 / .7);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px)}
@container scroll-state(stuck: top){.sp-gh::before{opacity:1}}
:root[data-nt="dark"] .sp-gh::before{background:rgb(28 28 30 / .7)}
@media(prefers-color-scheme:dark){:root:not([data-nt="light"]) .sp-gh::before{background:rgb(28 28 30 / .7)}}
/* quick look: a rounded inset sheet with even padding, and its heading, rows and buttons all on the same left edge */
.sp-pre,.sp-pre:is(*){border:0;border-radius:22px;padding:22px 20px 20px}
.sp-ql{gap:18px}
.sp-card{padding:0;gap:16px}
.sp-ql-g{gap:2px;margin:0 -8px}
.sp-ql-g h5{margin:0 0 6px;padding:0 8px}
.sp-mini{padding:8px}
.sp-ql-a{padding-top:4px;gap:10px}
/* sticky headers as a floating pill: at rest it is just the label; once stuck, only the label gets a small glass capsule, so rows pass under it with no bar across the list */
.sp-gh{width:fit-content;max-width:calc(100% - 24px);margin:6px 0 2px 12px;padding:6px 14px 6px 11px;border-radius:99px;top:8px}
.sp-gh::before{border-radius:inherit;background:rgb(255 255 255 / .78);box-shadow:0 0 0 .5px rgb(0 0 0 / .08),0 6px 18px -6px rgb(0 0 0 / .28);transform:scale(.94);transition:opacity .18s cubic-bezier(.23,1,.32,1),transform .22s cubic-bezier(.23,1,.32,1)}
@container scroll-state(stuck: top){.sp-gh::before{transform:none}}
:root[data-nt="dark"] .sp-gh::before{background:rgb(44 44 47 / .8);box-shadow:0 0 0 .5px rgb(255 255 255 / .1),0 6px 18px -6px rgb(0 0 0 / .6)}
@media(prefers-color-scheme:dark){:root:not([data-nt="light"]) .sp-gh::before{background:rgb(44 44 47 / .8);box-shadow:0 0 0 .5px rgb(255 255 255 / .1),0 6px 18px -6px rgb(0 0 0 / .6)}}
@media(prefers-reduced-motion:reduce){.sp-gh::before{transition:none;transform:none}}
/* the quick look's top glass reflection: a thicker, fainter line */
.sp-pre,.sp-pre:is(*){box-shadow:inset 0 2px 0 rgb(255 255 255 / .2),inset 0 0 0 .5px rgb(0 0 0 / .05)}
:root[data-nt="dark"] .sp-pre,:root[data-nt="dark"] .sp-pre:is(*){box-shadow:inset 0 2px 0 rgb(255 255 255 / .06),inset 0 0 0 .5px rgb(255 255 255 / .04)}
@media(prefers-color-scheme:dark){:root:not([data-nt="light"]) .sp-pre,:root:not([data-nt="light"]) .sp-pre:is(*){box-shadow:inset 0 2px 0 rgb(255 255 255 / .06),inset 0 0 0 .5px rgb(255 255 255 / .04)}}
/* the same thick, faint top reflection on the main panel */
.sp-panel{box-shadow:inset 0 2px 0 rgb(255 255 255 / .2),inset 0 0 0 .5px rgb(0 0 0 / .07),0 30px 80px -20px rgb(0 0 0 / .28)}
:root[data-nt="dark"] .sp-panel{box-shadow:inset 0 2px 0 rgb(255 255 255 / .06),inset 0 0 0 .5px rgb(255 255 255 / .08),0 30px 80px -20px rgb(0 0 0 / .6)}
@media(prefers-color-scheme:dark){:root:not([data-nt="light"]) .sp-panel{box-shadow:inset 0 2px 0 rgb(255 255 255 / .06),inset 0 0 0 .5px rgb(255 255 255 / .08),0 30px 80px -20px rgb(0 0 0 / .6)}}
/* while the palette is open, the Browse hero holds still: its slow zoom and cross-fade would otherwise repaint the blurred panel on every frame as it grows out of the pill */
html[data-sp-open] .br-photo,html[data-sp-open] .br-scene[data-on="1"] .br-photo{animation-play-state:paused!important}
html[data-sp-open] .br-scene{transition:none!important}
/* FLICKER FIX (seen in a screen recording: after opening, the panel alternates between full frames and frames with only the blur and no content). Backdrop blurs nested inside the panel's own backdrop blur make the compositor drop the content layer on some frames. Only the panel blurs the page now; everything inside it is a plain tint. */
.sp-panel *,.sp-panel *::before,.sp-panel *::after{-webkit-backdrop-filter:none!important;backdrop-filter:none!important}
.sp-gh::before{background:rgb(255 255 255 / .82)}
:root[data-nt="dark"] .sp-gh::before{background:rgb(40 40 43 / .86)}
@media(prefers-color-scheme:dark){:root:not([data-nt="light"]) .sp-gh::before{background:rgb(40 40 43 / .86)}}
/* filter row: two sliding-pill tab groups on one line that scrolls sideways, with the recent searches after them */
.sp-chips{align-items:center;gap:14px;padding:10px 18px 12px 26px}
.sp-seg{flex:none}
.sp-seg-wrap{display:flex;align-items:center;gap:14px;flex:none}
.sp-seg [data-slot=tabs-list]{height:34px}
.sp-seg [data-slot=tabs-trigger]{gap:6px;transition:color .15s}
.sp-seg [data-slot=tabs-trigger]:disabled{opacity:.4}
.sp-chips .sp-recent{flex:none;flex-wrap:nowrap;margin-left:auto;padding-left:6px}
/* phones and tablets: capability queries, not widths */
.sp-esc-x{display:none}
.sp-panel{height:min(600px,calc(var(--sp-vv,100dvh) - var(--sp-top) - 10px))}
@media(max-width:859px){.sp-panel{height:calc(var(--sp-vv,100dvh) - var(--sp-top) - 10px)}}
.sp-layer,.sp-row,.sp-esc,.sp-clear,.sp-seg [data-slot=tabs-trigger],.sp-recent button,.sp-try button{-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.sp-esc,.sp-row,.sp-seg [data-slot=tabs-trigger]{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
.sp-list{overscroll-behavior:contain;padding-bottom:calc(12px + env(safe-area-inset-bottom,0px))}
@media(pointer:coarse){
  .sp-esc kbd,.sp-esc [data-slot=kbd]{display:none}
  .sp-esc{display:grid;place-items:center;width:40px;height:40px;border-radius:50%;background:rgb(var(--ink-rgb) / .07);color:var(--ink)}
  .sp-esc-x{display:block;width:18px;height:18px}
  .sp-clear{width:40px;height:40px}
  .sp-seg [data-slot=tabs-list]{height:44px}
  .sp-seg [data-slot=tabs-trigger]{height:100%}
  .sp-seg [data-slot=tabs-trigger]{padding-inline:14px;font-size:15px}
  .sp-recent button,.sp-try button{padding:9px 14px;font-size:14px}
  .sp-row{min-height:64px}
}
@media(max-width:480px){.sp-pos{--sp-top:max(8px,env(safe-area-inset-top,0px))}.sp-panel{border-radius:24px}}
/* the filter tabs: a quiet track, brand-green selected pill with navy text, readable in both themes */
.sp-seg [data-slot=tabs-list]{background:rgb(var(--ink-rgb) / .06);--tab-selected:var(--green)}
.sp-seg [data-slot=tabs-trigger]{color:var(--ink2)}
.sp-seg [data-slot=tabs-trigger][data-state=active]{color:var(--on-green,#0b2540)}
.sp-seg [data-slot=tabs-trigger][data-state=active] span{opacity:1}

/* the filter row keeps its height before it mounts (no jump) and fades in once the palette has landed */
.sp-chips{min-height:56px}
/* the sliding pill takes the brand green (the library's dark-mode utility otherwise paints it white at 30%) */
.sp-seg [data-slot=tabs-trigger][data-state=active]>span[aria-hidden]:first-child{background-color:var(--green)!important;box-shadow:0 1px 2px rgb(0 0 0 / .12)}
/* small text: the glass lets the page show through, so secondary ink is stepped up to hold contrast (light ~7:1, dark ~9:1) */
.sp-panel{--sp-sub:rgb(var(--ink-rgb) / .78)}
.sp-panel .sp-gh,.sp-panel .sp-p,.sp-panel .sp-dt,.sp-panel .sp-mini-d,.sp-panel .sp-mini-p,.sp-panel .sp-card-t+*,.sp-panel .sp-ql-g,.sp-panel .sp-tips,.sp-panel .sp-try,.sp-panel .sp-none,.sp-panel .sp-dym,.sp-panel .sp-foot,.sp-panel .sp-recent,.sp-panel .sp-recent>span,.sp-panel .sp-seg [data-slot=tabs-trigger]:not([data-state=active]),.sp-panel .sp-esc,.sp-panel .sp-mini-t+*{color:var(--sp-sub)}
.sp-panel .sp-seg [data-slot=tabs-trigger]:not([data-state=active]) span{opacity:.85}
.sp-panel .sp-ghost{color:rgb(var(--ink-rgb) / .5)}
.sp-panel input::placeholder{color:rgb(var(--ink-rgb) / .62)}
/* the ticket card sits on a dark photo: its text stays light whatever the theme */
.sp-panel .sp-tk,.sp-panel .sp-tl-s,.sp-panel .sp-tl-dt,.sp-panel .sp-tk-pr,.sp-panel .sp-tk-pr small{color:#fff}
.sp-panel .sp-tl-s,.sp-panel .sp-tl-dt{text-shadow:0 1px 6px rgb(0 0 0 / .45)}
.sp-panel .sp-tk-pr small{opacity:.85}
/* while the palette is still morphing open, the active tab is painted green on the tab itself (it rides the panel as one surface);
   the sliding pill takes over once the morph has landed, so it never measures itself inside a scaling parent */
.sp-chips:not([data-settled]) .sp-seg [data-slot=tabs-trigger][data-state=active]{background-color:var(--green)}
.sp-chips:not([data-settled]) .sp-seg [data-slot=tabs-trigger][data-state=active]>span[aria-hidden]:first-child{display:none}
`;
