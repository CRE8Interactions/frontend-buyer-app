/* Pages a team storefront links to (season seats, flex packs, venues). They sit on the storefront's tokens (--t and --on-t from the team, paper and ink from
   the theme) and use library parts for every control. What lives here is layout and the three drawn things: the stadium, the printed ticket and the fan.
   Type never goes under 14px. One rhythm: 8px steps, 12px between cards, 16px under a heading, 40px between sections. */
export const PG_CSS = `
/* primary buttons on these pages come out in the team colour; the text on them is --on-t */
/* the team tint on library tokens applies to the page content only; the top bar and footer outside it keep the design system's own variables */
.pg .tm-main{--on-green:var(--on-t,var(--on-photo));--h-accent:var(--t);--h-accent-foreground:var(--on-t,var(--on-photo));--h-accent-hover:color-mix(in oklab,var(--t) 84%,var(--on-t,var(--on-photo)) 16%);--h-accent-soft:color-mix(in oklab,var(--t) 16%,transparent);--h-accent-soft-hover:color-mix(in oklab,var(--t) 24%,transparent);--h-default:color-mix(in oklab,var(--t) 12%,transparent);--h-default-hover:color-mix(in oklab,var(--t) 22%,transparent);--h-border:color-mix(in srgb,var(--t2) 50%,transparent)}
/* the top nav and the stage's Get tickets button stay in the Blocktickets green on every page; only the rest of the page leans to the team colour */
.pg .tm-cut{--on-green:var(--navy);--h-accent:var(--green);--h-accent-foreground:var(--navy);--h-accent-hover:color-mix(in oklab,var(--green) 90%,var(--navy) 10%)}
.pg [data-slot=button]{color:var(--button-fg)}
.pg ::selection{background:color-mix(in srgb,var(--t2) 45%,transparent)}
.pg-page{padding-top:100px;padding-bottom:72px}
@media(min-width:960px){.pg-page{padding-top:112px}}
@media(max-width:959px){.pg-page.has-bar{padding-bottom:calc(112px + env(safe-area-inset-bottom))}}

/* the head: a back button, the crest (or the venue plate), one title, the facts */
.pg-head{display:grid;gap:8px;margin-bottom:clamp(14px,2vw,20px)}
.pg-head-row{display:flex;align-items:center;gap:clamp(16px,3vw,28px)}
.pg-mark{flex:none;width:clamp(64px,7vw,88px);rotate:-5deg;transition:rotate .4s var(--land)}
.pg-mark img{display:block;width:100%;height:auto;border-radius:12px;box-shadow:0 0 0 3px var(--on-photo),0 12px 28px color-mix(in srgb,var(--shade) 35%,transparent)}
@media(hover:hover) and (pointer:fine){.pg-head:hover .pg-mark{rotate:2deg}}
.pg-h1{margin:0;font-size:clamp(30px,4.6vw,56px);line-height:1;letter-spacing:-.045em;font-weight:500;text-wrap:balance;overflow-wrap:anywhere}
.pg-flex .pg-h1{font-size:clamp(24px,3vw,36px)}
.pg-flex .pg-head{margin-bottom:clamp(24px,3.5vw,44px)}
.pg-flex .pg-two{gap:clamp(20px,3vw,32px)}
.pg-flex .pg-vis{gap:clamp(16px,2vw,24px)}
@media(min-width:960px){.pg-flex .pg-two{gap:clamp(24px,2.4vw,36px)}}
.pg-facts{display:flex;flex-wrap:wrap;gap:6px 20px;margin:0;font-size:15px;line-height:1.4;color:var(--ink2)}
.pg-facts span{display:inline-flex;align-items:center;gap:8px}
.pg-facts svg{flex:none;width:16px;height:16px;color:var(--t2)}
.pg-facts b{font-weight:600;color:var(--ink);font-variant-numeric:tabular-nums}

/* sections */
.pg-sec{margin-top:40px;scroll-margin-top:104px}
.pg-h2{display:flex;align-items:baseline;justify-content:space-between;flex-wrap:wrap;gap:4px 16px;margin:0 0 16px;padding-inline:4px;font-size:clamp(24px,2.6vw,32px);font-weight:500;letter-spacing:-.04em;line-height:1.1}
.pg-h2 small{font-size:15px;font-weight:500;letter-spacing:0;color:var(--ink2);font-variant-numeric:tabular-nums}
.pg-two{display:grid;gap:12px}
@media(min-width:960px){.pg-two{grid-template-columns:minmax(0,1fr) 380px;gap:16px;align-items:start}}
.pg-two>*{min-width:0}
.pg-stick{display:grid;gap:12px}
@media(min-width:960px){.pg-stick{position:sticky;top:104px}}

/* ---- season seats: the stadium ---- */
.pg-bowl{position:relative}
.pg-bowl svg{display:block;width:100%;height:auto;border-radius:20px;background:color-mix(in srgb,var(--paper) 70%,var(--paper2))}
.pg-z{fill:color-mix(in srgb,var(--t) 20%,var(--paper2));stroke:var(--paper);stroke-width:7;stroke-linejoin:round;cursor:pointer;transition:fill .25s var(--out)}
.pg-z[data-hot="1"]{fill:color-mix(in srgb,var(--t) 42%,var(--paper2))}
.pg-z[data-on="1"]{fill:var(--t)}
.pg-z[data-out="1"]{fill:url(#pg-hatch);cursor:not-allowed}
.pg-rows{fill:none;stroke:color-mix(in srgb,var(--ink) 16%,transparent);stroke-width:1.5;pointer-events:none}
.pg-grass{fill:color-mix(in srgb,var(--h-success) 68%,var(--shade))}
.pg-lines{fill:none;stroke:color-mix(in srgb,var(--on-photo) 55%,transparent);stroke-width:2;pointer-events:none}
.pg-endz{fill:color-mix(in srgb,var(--t) 78%,var(--shade));opacity:.85}
.pg-pin{position:absolute;translate:-50% -50%;transition:transform .3s var(--land)}
.pg-pin::after{content:"";position:absolute;inset:-6px}
.pg-pin[data-hot="1"]{transform:scale(1.06)}
.pg-pin [data-slot=button]{border:2px solid var(--paper);box-shadow:0 8px 18px -10px color-mix(in srgb,var(--shade) 70%,transparent)}
@media(max-width:559px){.pg-pin [data-slot=button]{padding-inline:10px}}

/* the season ticket: it prints a line for every seat you add */
.pg-ticket{--sh:132px;position:relative;display:grid;border-radius:26px;background:var(--paper2);color:var(--ink);isolation:isolate;
  -webkit-mask:radial-gradient(circle 11px at 0 calc(100% - var(--sh)),transparent 98%,var(--shade)),radial-gradient(circle 11px at 100% calc(100% - var(--sh)),transparent 98%,var(--shade));-webkit-mask-composite:source-in;
  mask:radial-gradient(circle 11px at 0 calc(100% - var(--sh)),transparent 98%,var(--shade)),radial-gradient(circle 11px at 100% calc(100% - var(--sh)),transparent 98%,var(--shade));mask-composite:intersect}
.pg-ticket-top{display:flex;align-items:center;gap:14px;padding:18px 18px 16px;border-radius:26px 26px 0 0;color:var(--on-t,var(--on-photo));background:radial-gradient(120% 140% at 100% 0,var(--t2),transparent 62%),linear-gradient(160deg,var(--t),color-mix(in srgb,var(--t) 58%,var(--shade)))}
.pg-ticket-top img{flex:none;width:52px;height:52px;padding:6px;border-radius:14px;background:var(--on-photo);object-fit:contain}
.pg-ticket-top strong{display:block;font-size:18px;font-weight:600;letter-spacing:-.02em;line-height:1.2}
.pg-ticket-top span{display:block;margin-top:2px;font-size:15px;opacity:.9}
.pg-ticket-body{display:grid;gap:12px;padding:16px 18px;min-height:96px;align-content:start}
.pg-ticket-stub{display:grid;gap:12px;align-content:center;padding:0 18px;min-height:var(--sh);background:repeating-linear-gradient(90deg,rgb(var(--ink-rgb) / .3) 0 6px,transparent 6px 12px) left top/100% 2px no-repeat}
.pg-print{animation:pg-print .5s var(--out) backwards}
@keyframes pg-print{from{clip-path:inset(0 0 100% 0);opacity:0;transform:translateY(-6px)}}
.pg-strip{display:flex;align-items:center;gap:12px}
.pg-strip div{display:flex;padding-left:10px}
.pg-strip img{width:40px;height:auto;margin-left:-10px;border-radius:6px;rotate:-4deg;box-shadow:0 0 0 2px var(--paper2),0 0 0 3px rgb(var(--ink-rgb) / .18)}
.pg-strip img:nth-child(even){rotate:3deg}
.pg-games{--table-cell-bg:var(--h-surface)}
.pg-games thead th{position:sticky;top:0;z-index:2}

/* a bar that pins the action to the bottom on phones */
.pg-bar{position:fixed;left:8px;right:8px;bottom:max(8px,env(safe-area-inset-bottom));z-index:40;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 8px 8px 16px;border-radius:22px;--glass-shadow:0 1px 2px 0 rgb(0 0 0 / .02),0 10px 28px -12px rgb(0 0 0 / .08)}
.pg-bar div{display:grid;line-height:1.15}
.pg-bar b{font-size:18px;font-weight:600;letter-spacing:-.025em;font-variant-numeric:tabular-nums}
.pg-bar small{font-size:12.5px;line-height:1.3;color:var(--ink2)}
@media(min-width:960px){.pg-bar{display:none}}

/* ---- flex packs: the fan that deals, and the games a voucher can be spent on ---- */
.pg-vis{container:pgv/inline-size;position:relative;display:grid;gap:12px;padding:12px 12px 16px;border-radius:28px;overflow:hidden;background:radial-gradient(90% 60% at 50% 55%,color-mix(in srgb,var(--t) 26%,transparent),transparent 75%),var(--paper2)}
.pg-fan{--cw:clamp(112px,13vw,152px);position:relative;width:100%;height:clamp(230px,38svh,330px);user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
.pg-games{display:grid;gap:8px}
.pg-fan i{--a:calc((var(--k) - (var(--n) - 1) / 2) * var(--sp,4deg));position:absolute;left:50%;bottom:12px;width:var(--cw);aspect-ratio:7 / 10;margin-left:calc(var(--cw) / -2);border-radius:14px;transform-origin:50% 130%;transform:rotate(var(--a));transition:transform .6s var(--land);transition-delay:calc(var(--k) * 12ms);background:linear-gradient(170deg,var(--t2),var(--t));box-shadow:0 0 0 1px color-mix(in srgb,var(--shade) 22%,transparent),0 8px 18px color-mix(in srgb,var(--shade) 24%,transparent);animation:pg-deal .55s var(--land) backwards;animation-delay:calc(var(--k) * 28ms)}
@keyframes pg-deal{from{opacity:0;transform:translateY(46px) rotate(0)}}
.pg-fan i::before{content:"";position:absolute;inset:8px;border-radius:8px;border:1.5px dashed color-mix(in srgb,var(--on-t,var(--on-photo)) 45%,transparent)}
.pg-fan i::after{content:"";position:absolute;left:50%;top:50%;width:32px;height:32px;translate:-50% -50%;border-radius:50%;box-shadow:inset 0 0 0 2px color-mix(in srgb,var(--on-t,var(--on-photo)) 60%,transparent),inset 0 0 0 10px transparent,inset 0 0 0 16px color-mix(in srgb,var(--on-t,var(--on-photo)) 60%,transparent)}
.pg-fan-n{position:absolute;left:50%;top:8px;z-index:2;translate:-50% 0;white-space:nowrap}
.pg-fan-n [data-slot=badge]{justify-content:center;text-align:center}
.pg-fly{position:absolute;left:50%;bottom:12px;z-index:3;width:var(--cw);aspect-ratio:7 / 10;margin-left:calc(var(--cw) / -2);border-radius:14px;pointer-events:none;background:linear-gradient(170deg,var(--t2),var(--t));box-shadow:0 14px 30px color-mix(in srgb,var(--shade) 40%,transparent);animation:pg-fly .75s cubic-bezier(.5,0,.2,1) forwards}
@keyframes pg-fly{to{transform:translate(var(--dx),var(--dy)) scale(.34) rotate(14deg);opacity:.15}}
/* a game you can spend a voucher on: crest and game; a tap stamps it Spent */
.pg-game{grid-template-columns:auto minmax(0,1fr);align-items:stretch;min-height:80px;border-radius:20px;overflow:hidden;text-align:left}
.pg-game-crest{display:grid;place-items:center;padding:12px 2px 12px 16px}
.pg-game-crest img{display:block;width:60px;height:auto;rotate:-5deg;border-radius:9px;box-shadow:0 0 0 2px var(--on-photo),0 6px 14px color-mix(in srgb,var(--shade) 35%,transparent);transition:transform .35s var(--land),filter .3s}
.pg-game-t{display:grid;align-content:center;gap:2px;min-width:0;padding:10px 14px}
.pg-game-t b{font-size:17px;font-weight:600;letter-spacing:-.02em;line-height:1.2;overflow-wrap:anywhere}
.pg-game-t span{font-size:15px;line-height:1.3;color:var(--ink2);font-variant-numeric:tabular-nums}
.pg-game-t em{font-style:normal;font-size:14px;font-weight:500;line-height:1.3;color:var(--t2)}
@media(hover:hover) and (pointer:fine){.pg-game:not(:disabled):hover .pg-game-crest img{transform:scale(1.1) rotate(3deg)}}
.pg-game[data-spent="1"]{opacity:1}
.pg-game[data-spent="1"] .pg-game-crest img{filter:grayscale(1);opacity:.7}
.pg-game[data-spent="1"] .pg-game-t b{color:var(--ink2);text-decoration:line-through;text-decoration-thickness:1.5px}
.pg-game{position:relative}
.pg-game-stamp{position:absolute;left:50%;top:50%;translate:-50% -50%;rotate:-12deg;padding:3px 18px;border:2px solid var(--h-success);border-radius:8px;background:color-mix(in srgb,var(--paper) 82%,transparent);font-size:18px;font-weight:700;line-height:1.2;color:var(--h-success);pointer-events:none;animation:pg-stamp .35s var(--land) backwards}
@keyframes pg-stamp{from{opacity:0;scale:1.5}}
@container pgv (min-width:600px){
  .pg-games{grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
  .pg-games .pg-game{grid-template-columns:minmax(0,1fr);height:auto!important;min-height:0!important;text-align:center}
  .pg-game-crest{padding:20px 16px 2px}
  .pg-game-crest img{width:72px}
  .pg-game-t{justify-items:center;text-align:center;padding:10px 14px 16px;gap:3px}
    .pg-fan{height:clamp(220px,30svh,250px)}
  .pg-fan{--cw:clamp(104px,10vw,124px)}
}

@container pgv (max-width:420px){
  .pg-fan{height:clamp(200px,30svh,240px);--cw:104px}
  .pg-game-crest{padding:12px 0 12px 12px}
  .pg-game-crest img{width:52px}
  .pg-game-t{padding:10px 12px}
  .pg-game-t b{font-size:16px}
  .pg-game-t span{font-size:14px;white-space:nowrap}
  .pg-game-t em{font-size:13px}
  }
.pg-game{touch-action:manipulation;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
.pg-game:not(:disabled):active{transform:scale(.98)}

/* ---- venue: the venue on the left, the tickets on the right ---- */
/* the banner is the team's wallpaper: the image is blended into the team colour, so it reads the same whatever it holds; the top fades into the page so the nav is legible in both themes */
.pg-vbanner{position:relative;margin:8px 8px 0;height:clamp(300px,31vw,400px);border-radius:clamp(22px,2.6vw,36px);overflow:hidden;color:var(--ink);background:
  radial-gradient(120% 100% at 50% 130%,color-mix(in srgb,var(--shade) 50%,transparent),transparent 62%),
  radial-gradient(70% 90% at 12% 0%,color-mix(in srgb,var(--on-photo) 14%,transparent),transparent 60%),
  radial-gradient(circle,color-mix(in srgb,var(--shade) 22%,transparent) 1.1px,transparent 1.7px) 0 0 / 9px 9px,
  radial-gradient(circle,color-mix(in srgb,var(--shade) 22%,transparent) 1.1px,transparent 1.7px) 4.5px 4.5px / 9px 9px,
  linear-gradient(155deg,color-mix(in srgb,var(--t) 94%,var(--on-photo) 6%),color-mix(in srgb,var(--t) 66%,var(--shade)))}
.pg-vbanner-img{position:absolute;inset:0;display:block;width:100%;height:100%;object-fit:cover;object-position:50% 42%;mix-blend-mode:multiply;opacity:.85}
.pg-vbanner-fb{position:absolute;inset:0;display:grid;place-items:center}
.pg-vbanner-fb img{width:clamp(120px,18vw,240px);height:auto;filter:drop-shadow(0 12px 24px color-mix(in srgb,var(--shade) 50%,transparent))}
.pg-vscrim{position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(180deg,var(--paper) 0,color-mix(in srgb,var(--paper) 55%,transparent) 44px,transparent 104px)}
/* two cutouts: the team page stage's own notch, one at each bottom corner */
.pg-cut{position:absolute;bottom:0;z-index:3;display:flex;align-items:center;gap:16px;background:var(--paper);color:var(--ink)}
.pg-cut::before,.pg-cut::after{content:"";position:absolute;width:30px;height:30px}
.pg-cut-r{display:none}
@media(min-width:900px){.pg-cut-r{display:flex;max-width:min(52%,620px)}}
.pg-vavatar{flex:none;display:block;width:clamp(72px,8vw,112px);aspect-ratio:1;border-radius:18px;overflow:hidden;background:var(--on-photo);box-shadow:0 8px 20px -8px color-mix(in srgb,var(--shade) 55%,transparent);rotate:-4deg;transition:rotate .4s var(--land)}
@media(hover:hover) and (pointer:fine){.pg-vtext:hover .pg-vavatar{rotate:1deg}}
.pg-vavatar img{display:block;width:100%;height:100%;object-fit:cover}
.pg-vavatar-fb{display:grid;place-items:center;width:100%;height:100%;background:linear-gradient(160deg,var(--t),color-mix(in srgb,var(--t) 52%,var(--shade)))}
.pg-vtext{position:absolute;left:clamp(16px,3.6vw,52px);bottom:clamp(18px,3vw,36px);z-index:3;display:flex;align-items:flex-end;gap:clamp(14px,2vw,22px);max-width:calc(100% - 32px);color:var(--on-photo)}
@media(min-width:900px){.pg-vtext{max-width:calc(100% - 590px)}}
.pg-vname{min-width:0}
.pg-vname h1{margin:0;font-size:clamp(32px,4.8vw,64px);line-height:.98;letter-spacing:-.05em;font-weight:500;text-wrap:balance;overflow-wrap:anywhere;text-shadow:0 2px 30px color-mix(in srgb,var(--shade) 45%,transparent)}
.pg-vsub{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;margin:10px 0 0;font-size:15px;color:color-mix(in srgb,var(--on-photo) 90%,transparent);text-shadow:0 1px 14px color-mix(in srgb,var(--shade) 50%,transparent)}
.pg-vteam{color:inherit;text-decoration:underline;text-decoration-color:color-mix(in srgb,var(--on-photo) 50%,transparent);text-underline-offset:3px;transition:text-decoration-color .15s}
.pg-vteam:hover{text-decoration-color:currentColor}
.pg-vteam:focus-visible{outline:2px solid var(--on-photo);outline-offset:3px;border-radius:4px}
.pg-cut-g{display:grid;gap:2px;min-width:0;max-width:260px}
.pg-cut-g small{font-size:14px;font-weight:600;color:var(--t2)}
.pg-cut-g b{font-size:17px;font-weight:600;letter-spacing:-.02em;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pg-cut-g span{font-size:14px;color:var(--ink2);font-variant-numeric:tabular-nums;white-space:nowrap}
.pg-cut-r .tm-cut-p{padding-right:16px;border-right:2px dashed rgb(var(--ink-rgb) / .2)}
/* on a phone the next game sits right under the banner */
.pg-mob{display:grid;gap:12px;margin-top:14px}
@media(min-width:900px){.pg-mob{display:none}}
.pg-nextbar{display:grid;gap:12px;padding:14px;border-radius:24px;background:var(--paper2)}
.pg-nextbar-f{display:flex;align-items:center;justify-content:space-between;gap:12px}
.pg-nextbar .pg-cut-g{max-width:none}
.pg-nextbar .pg-cut-g b{white-space:normal}
/* one sticky tab bar: schedule, season seats and flex packs are always one tap away */
.pg-vmain{padding-top:14px;padding-bottom:72px}
.pg-tabbar{position:sticky;top:76px;z-index:30;display:flex;align-items:center;padding:8px 0 10px;background:linear-gradient(180deg,var(--paper) 72%,transparent)}
/* venue information, last: the aerial, the real description, the facts, the way there */
.pg-about{display:grid;gap:24px;align-items:center;padding:clamp(18px,3vw,32px);border-radius:32px;background:var(--paper2)}
@media(min-width:900px){.pg-about{grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:40px}}
.pg-about-map{display:grid;place-items:center;border-radius:24px;overflow:hidden}
.pg-about-map img,.pg-about-map svg{display:block;width:100%;height:auto;max-width:640px;filter:drop-shadow(0 24px 30px color-mix(in srgb,var(--shade) 35%,transparent))}
.pg-about-t{display:grid;gap:16px;align-content:center;min-width:0}
.pg-about-p{margin:0;max-width:52ch;font-size:16px;line-height:1.6;color:var(--ink2)}
.pg-art{display:block;width:100%;max-width:420px;height:auto;color:color-mix(in srgb,var(--on-t,var(--on-photo)) 55%,transparent)}
.pg-art-ring{transform-origin:50% 50%;animation:pg-ring .7s var(--out) backwards;animation-delay:calc(var(--k) * 90ms)}
@keyframes pg-ring{from{opacity:0;transform:scale(.86)}}
.pg-art-grass{fill:color-mix(in srgb,var(--h-success) 68%,var(--shade))}
.pg-art-end{fill:color-mix(in srgb,var(--t) 78%,var(--shade));opacity:.9}
.pg-art-wood{fill:color-mix(in srgb,var(--h-warning) 70%,var(--shade))}
.pg-art-dirt{fill:color-mix(in srgb,var(--h-warning) 68%,var(--shade))}
.pg-art-ice{fill:color-mix(in srgb,var(--on-photo) 86%,var(--h-info))}
.pg-art-line{fill:none;stroke:color-mix(in srgb,var(--on-photo) 60%,transparent);stroke-width:2}
.pg-art-line2{fill:none;stroke:color-mix(in srgb,var(--h-info) 70%,var(--on-photo));stroke-width:2.5}
.pg-art-red{stroke:var(--h-danger)}
.pg-vfacts{display:grid;gap:8px;margin:0;padding:0;list-style:none;font-size:15px;line-height:1.4;color:var(--ink2)}
.pg-vfacts li{display:flex;align-items:flex-start;gap:10px}
.pg-vfacts svg{flex:none;width:18px;height:18px;margin-top:1px;color:var(--t2)}
.pg-vfacts b{font-weight:600;color:var(--ink);font-variant-numeric:tabular-nums}
.pg-vblurb{margin:0;font-size:15px;line-height:1.5;color:var(--ink2);display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:4;line-clamp:4;overflow:hidden}
.pg-vlist{display:grid;gap:4px;align-content:start}
/* the list column is narrower than the team page's, so each month sits above its cards instead of beside them */
.pg-vlist .tm-mo{grid-template-columns:minmax(0,1fr);gap:12px;margin-top:28px}
.pg-vlist .tm-mo-h{position:static;flex-direction:row;align-items:baseline;gap:12px;padding-top:0}
.pg-vlist .tm-mo-h small::before{display:none}
.pg-vlist .tk{--sw:204px}
.pg-vlist .tm-tg{grid-template-columns:repeat(auto-fill,minmax(210px,1fr))}
.pg-vlist .tm-et{aspect-ratio:4 / 5}
.pg-vlist .tk-s{padding-inline:18px 12px;gap:8px}
.pg-bowl-plate{flex:none;display:grid;place-items:center;width:clamp(64px,7vw,88px);aspect-ratio:1;border-radius:24px;overflow:hidden;position:relative;color:var(--on-t,var(--on-photo));background:linear-gradient(160deg,var(--t),color-mix(in srgb,var(--t) 55%,var(--shade)))}
.pg-bowl-plate::before{content:"";position:absolute;inset:0;background:color-mix(in srgb,var(--on-t,var(--on-photo)) 28%,transparent);-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cg fill='none' stroke='%23000' stroke-width='1.2' vector-effect='non-scaling-stroke'%3E%3Crect x='28' y='28' width='44' height='44' rx='9'/%3E%3Crect x='17' y='17' width='66' height='66' rx='15'/%3E%3Crect x='6' y='6' width='88' height='88' rx='21'/%3E%3Crect x='-5' y='-5' width='110' height='110' rx='27'/%3E%3C/g%3E%3C/svg%3E") center/100% 100% no-repeat;mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cg fill='none' stroke='%23000' stroke-width='1.2' vector-effect='non-scaling-stroke'%3E%3Crect x='28' y='28' width='44' height='44' rx='9'/%3E%3Crect x='17' y='17' width='66' height='66' rx='15'/%3E%3Crect x='6' y='6' width='88' height='88' rx='21'/%3E%3Crect x='-5' y='-5' width='110' height='110' rx='27'/%3E%3C/g%3E%3C/svg%3E") center/100% 100% no-repeat}
.pg-bowl-plate svg{position:relative;width:28px;height:28px}

/* ---- checkout and confirmation ---- */
.pg-co-top{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:16px}
.pg-co{display:grid;gap:12px}
@media(min-width:960px){.pg-co{grid-template-columns:minmax(0,1fr) 400px;align-items:start;gap:16px}.pg-co .pg-co-sum{position:sticky;top:104px}}
.pg-fields{display:grid;grid-template-columns:1fr 1fr;gap:16px 12px}
.pg-fields .pg-wide{grid-column:1 / -1}
.pg-done{display:grid;justify-items:center;gap:16px;max-width:640px;margin:0 auto;text-align:center}
.pg-done-mark{display:grid;place-items:center;width:88px;height:88px;border-radius:50%;background:var(--t);color:var(--on-t,var(--on-photo));animation:pg-pop .6s var(--land) backwards}
.pg-done-mark svg{width:40px;height:40px}
@keyframes pg-pop{from{transform:scale(.4);opacity:0}}

@media(prefers-reduced-motion:reduce){.pg-art-ring{animation:none}.pg-fan i,.pg-fly,.pg-print,.pg-done-mark{animation:none}.pg-fan i,.pg-pin,.pg-mark,.pg-z{transition:none}.pg-fly{display:none}}

/* the full-screen seat page brings its own top bar, so the site's bar steps aside while it is open */
html[data-season-scene] .n-nav,html[data-season-scene] header.un{display:none}
`;
