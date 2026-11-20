/* /search: the palette's results as a page. A big field, three labelled filter rows, the count, then teams and venues and the events as ticket strips by month.
   Colours come from the page's own tokens (surface, ink, green), so it follows the theme switch. Spacing runs on one 8px rhythm: 20 between a field and its filters, 28 between blocks, 40 between sections. */
export const SR_CSS = `
.sr{--land:cubic-bezier(.34,1.3,.64,1);--out:cubic-bezier(.23,1,.32,1);-webkit-tap-highlight-color:transparent}
.sr a,.sr button{touch-action:manipulation}
.sr ::selection{background:color-mix(in srgb,var(--green) 40%,transparent)}
.sr-main{padding:clamp(120px,17svh,156px) 0 88px}
.sr mark{background:linear-gradient(transparent 58%,color-mix(in srgb,var(--green) 70%,transparent) 58%);color:inherit;padding:0}
.sr :focus-visible:not(input){outline:2px solid var(--ink);outline-offset:3px}
/* the nav measures what is under it only after the page has loaded; until then it is told the page is light (dark theme excepted), so it never flashes white controls on white */
.sr .un{--fg:1}
html[data-nt="dark"] .sr .un{--fg:0}

.sr-page.n-wrap{max-width:960px}
.sr-page{display:grid;gap:28px}
.sr-head{display:grid;justify-items:center;gap:10px;text-align:center;margin-bottom:-4px}
.sr-head h1{margin:0;max-width:20ch;font-size:clamp(34px,5.4vw,60px);line-height:1;font-weight:600;letter-spacing:-.045em;text-wrap:balance;overflow-wrap:anywhere}
.sr-head[data-empty="1"] h1{font-size:clamp(26px,3.4vw,38px);letter-spacing:-.035em}
.sr-sub{margin:0;font-size:16px;line-height:1.4;color:var(--ink2)}
.sr-sub b{font-weight:600;color:var(--ink)}

.sr-top{display:flex;align-items:center;gap:12px;width:100%;max-width:720px;margin-inline:auto;height:clamp(56px,7vw,68px);padding:0 12px 0 20px;border-radius:22px;background:rgb(var(--surface-rgb));box-shadow:inset 0 0 0 1px rgb(var(--ink-rgb) / .14);transition:box-shadow .2s var(--out)}
.sr-top:focus-within{box-shadow:inset 0 0 0 2px var(--ink)}
.sr-top>svg{flex:none;width:22px;height:22px;color:var(--ink)}
.sr-field{position:relative;flex:1;min-width:0;display:block}
.sr-field input,.sr-ghost{font-size:clamp(18px,2.2vw,22px);font-weight:500;letter-spacing:-.02em;line-height:1.3}
.sr-field input{position:relative;display:block;width:100%;padding:0;border:0;outline:0;background:transparent;color:var(--ink);font-family:inherit;-webkit-appearance:none;appearance:none}
.sr-field input::-webkit-search-cancel-button{display:none}
.sr-field input::placeholder{font-weight:400;color:var(--ink2);opacity:.7}
.sr-ghost{position:absolute;inset:0;display:flex;align-items:center;overflow:hidden;white-space:pre;pointer-events:none;color:var(--ink2);opacity:.55}
.sr-ghost i{font-style:normal;visibility:hidden}
.sr-accept{flex:none;display:inline-flex}
.sr-clear{display:grid;place-items:center;flex:none;width:34px;height:34px;border:0;border-radius:50%;background:rgb(var(--ink-rgb) / .08);color:var(--ink);cursor:pointer}
.sr-clear svg{width:14px;height:14px}
.sr-clear:active{transform:scale(.94)}
@media(hover:none){.sr-accept{display:none}}

/* filters: labelled rows in two aligned columns, centred as a block: what it narrows, then the choices */
.sr-filters{display:grid;grid-template-columns:auto auto;justify-content:center;align-items:center;gap:12px 16px;margin-top:-4px}
.sr-row{display:contents}
.sr-gl{justify-self:end;font-size:13.5px;font-weight:600;color:var(--ink2)}
.sr-opts{display:flex;flex-wrap:wrap;gap:8px}
.sr-opt{display:inline-flex;align-items:center;gap:8px;min-height:36px;padding:0 15px;border:0;border-radius:999px;background:rgb(var(--ink-rgb) / .06);color:var(--ink);font:inherit;font-size:14.5px;font-weight:500;white-space:nowrap;cursor:pointer;transition:background-color .15s var(--out),color .15s var(--out),transform .12s var(--out)}
.sr-opt:active{transform:scale(.97)}
@media(hover:hover) and (pointer:fine){.sr-opt[data-on="0"]:hover{background:rgb(var(--ink-rgb) / .12)}}
.sr-opt[data-on="1"]{background:var(--green);color:#0a0a0a;box-shadow:0 0 0 1px color-mix(in srgb,var(--green) 70%,#000)}
.sr-opt-n{font-size:13px;font-variant-numeric:tabular-nums;opacity:.6}
.sr-clearrow{display:flex;justify-content:center;margin-top:-8px}
.sr-reset{padding:0;border:0;background:none;color:var(--ink);font:inherit;font-size:14.5px;font-weight:600;text-decoration:underline;text-underline-offset:3px;cursor:pointer}
@media(max-width:759px){
  .sr-filters{grid-template-columns:minmax(0,1fr);justify-content:stretch;gap:14px}
  .sr-row{display:grid;gap:8px}
  .sr-gl{justify-self:start}
  .sr-opts{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;margin-inline:-16px;padding:2px 16px}
  .sr-opts::-webkit-scrollbar{display:none}
  .sr-opt{flex:none}
}

/* teams and venues: one quiet row of chips above the strips */
.sr-orgs ul{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin:0;padding:2px 0;list-style:none}
.sr-org{display:flex;align-items:center;gap:12px;flex:none;padding:8px 20px 8px 8px;border-radius:999px;background:rgb(var(--ink-rgb) / .05);color:var(--ink);text-decoration:none;transition:background-color .15s var(--out)}
@media(hover:hover) and (pointer:fine){.sr-org:hover{background:rgb(var(--ink-rgb) / .09)}}
.sr-org-ic{display:grid;place-items:center;flex:none;width:44px;height:44px;border-radius:50%;background:rgb(var(--surface-rgb));color:var(--ink2);overflow:hidden;box-shadow:inset 0 0 0 1px rgb(var(--ink-rgb) / .08)}
.sr-org-ic img{width:30px;height:30px;object-fit:contain}
.sr-org-ic svg{width:20px;height:20px}
.sr-org-t{display:grid;gap:1px}
.sr-org-t strong{font-size:15px;font-weight:600;letter-spacing:-.01em;white-space:nowrap}
.sr-org-t small{font-size:12.5px;color:var(--ink2);white-space:nowrap}

/* months and strips */
.sr-res>*+*{margin-top:28px}
.sr-res>.sr-mo{margin-top:36px}
.sr-res>:first-child{margin-top:0}
.sr-mo h2{display:flex;align-items:center;gap:14px;margin:0 0 16px;font-size:22px;line-height:1;font-weight:600;letter-spacing:-.03em}
.sr-mo h2::before,.sr-mo h2::after{content:"";flex:1;height:1px;background:rgb(var(--ink-rgb) / .12)}
.sr-mo h2 small{margin-left:-4px}
.sr-mo h2 small{font-size:14px;font-weight:500;letter-spacing:0;color:var(--ink2)}
.sr-list{display:grid;gap:10px;list-style:none;margin:0;padding:0}
.sr-st{--sw:220px;--r:11px;position:relative;display:grid;grid-template-columns:52px 60px minmax(0,1fr) var(--sw);align-items:center;gap:16px;min-height:96px;padding:16px 0 16px 20px;border-radius:24px;background:rgb(var(--ink-rgb) / .05);color:var(--ink);isolation:isolate;transition:transform .3s var(--land);
  -webkit-mask:radial-gradient(circle var(--r) at calc(100% - var(--sw)) 0,#0000 98%,#000),radial-gradient(circle var(--r) at calc(100% - var(--sw)) 100%,#0000 98%,#000);-webkit-mask-composite:source-in;
  mask:radial-gradient(circle var(--r) at calc(100% - var(--sw)) 0,#0000 98%,#000),radial-gradient(circle var(--r) at calc(100% - var(--sw)) 100%,#0000 98%,#000);mask-composite:intersect}
.sr-st::before{content:"";position:absolute;inset:0;z-index:-1;border-radius:inherit;background:radial-gradient(280px circle at var(--px,50%) var(--py,50%),color-mix(in srgb,var(--ac) 12%,transparent),transparent 70%);opacity:0;transition:opacity .3s var(--out);pointer-events:none}
@media(hover:hover) and (pointer:fine){.sr-st:hover{transform:translateY(-2px)}.sr-st:hover::before{opacity:1}.sr-st:hover .sr-st-pic{transform:rotate(-2deg) scale(1.08)}.sr-st:hover .sr-st-go svg{transform:translateX(3px)}}
.sr-st:active{transform:scale(.995)}
.sr-st-d{display:grid;justify-items:center;line-height:1}
.sr-st-d i{font-style:normal;font-size:12.5px;font-weight:600;color:var(--ink2)}
.sr-st-d b{margin-top:4px;font-size:30px;font-weight:600;letter-spacing:-.05em;font-variant-numeric:tabular-nums}
.sr-st-pic{display:grid;place-items:center;width:56px;aspect-ratio:1;rotate:-4deg;border-radius:12px;background:color-mix(in srgb,var(--ac) 22%,rgb(var(--ink-rgb) / .06));box-shadow:0 0 0 2px rgb(var(--surface-rgb)),0 4px 10px rgb(0 0 0 / .18);overflow:hidden;transition:transform .35s var(--land)}
.sr-st-pic img{width:100%;height:100%;object-fit:cover}
.sr-st-pic em{display:grid;place-items:center;width:100%;height:100%;font-style:normal;font-size:16px;font-weight:600}
.sr-st-m{display:grid;gap:3px;min-width:0}
.sr-st-e{display:flex;align-items:center;gap:8px;margin:0;font-size:13.5px;color:var(--ink2)}
.sr-st-e i{width:3px;height:3px;border-radius:50%;background:currentColor;opacity:.6}
.sr-st-m h3{margin:0;font-size:19px;line-height:1.2;font-weight:600;letter-spacing:-.02em;text-wrap:balance}
.sr-st-m h3 a{color:inherit;text-decoration:none}
.sr-st-m h3 a::after{content:"";position:absolute;inset:0;z-index:2;border-radius:inherit}
.sr-st-m h3 a:focus-visible{outline:none}
.sr-st-m h3 a:focus-visible::after{box-shadow:inset 0 0 0 2px var(--ink)}
.sr-st-v{margin:0;font-size:14px;color:var(--ink2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sr-st-s{position:relative;align-self:stretch;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 20px 0 26px;background:radial-gradient(circle,rgb(var(--ink-rgb) / .34) 1px,transparent 1.5px) 0 0/3px 8px repeat-y}
.sr-st-pr{display:grid;gap:3px;line-height:1}
.sr-st-pr small{font-size:12.5px;color:var(--ink2)}
.sr-st-pr b{font-size:24px;font-weight:600;letter-spacing:-.035em;font-variant-numeric:tabular-nums}
.sr-st-go{display:inline-flex;align-items:center;gap:6px;font-size:14px;font-weight:600;white-space:nowrap}
.sr-st-go svg{width:15px;height:15px;transition:transform .25s var(--out)}
@media(max-width:759px){
  .sr-st{--sh:64px;grid-template-columns:44px 52px minmax(0,1fr);gap:12px;padding:16px 16px 0;min-height:0;
    -webkit-mask:radial-gradient(circle var(--r) at 0 calc(100% - var(--sh)),#0000 98%,#000),radial-gradient(circle var(--r) at 100% calc(100% - var(--sh)),#0000 98%,#000);-webkit-mask-composite:source-in;
    mask:radial-gradient(circle var(--r) at 0 calc(100% - var(--sh)),#0000 98%,#000),radial-gradient(circle var(--r) at 100% calc(100% - var(--sh)),#0000 98%,#000);mask-composite:intersect}
  .sr-st-d b{font-size:26px}
  .sr-st-pic{width:48px}
  .sr-st-s{grid-column:1/-1;align-self:auto;height:var(--sh);margin:4px -16px 0;padding:0 18px;background:radial-gradient(circle,rgb(var(--ink-rgb) / .34) 1px,transparent 1.5px) 0 0/8px 3px repeat-x}
}

.sr-skel{height:96px;border-radius:24px;background:linear-gradient(100deg,rgb(var(--ink-rgb) / .05) 30%,rgb(var(--ink-rgb) / .1) 50%,rgb(var(--ink-rgb) / .05) 70%) 0 0/220% 100%;animation:sr-shim 1.4s linear infinite}
@keyframes sr-shim{to{background-position:-120% 0}}

/* nothing found: a one-line ticket and a magnifier, then what went wrong and what to do next, all on the centre line */
.sr-none{display:grid;justify-items:center;gap:22px;padding:8px 0 4px;text-align:center}
.sr-none-t{display:grid;justify-items:center;gap:18px;max-width:560px}
.sr-none p{margin:0;max-width:44ch;color:var(--ink2);font-size:16px;line-height:1.55}
.sr-acts{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:10px 20px}
.sr-dym{padding:11px 20px;border:0;border-radius:999px;background:var(--green);color:#0a0a0a;font:inherit;font-size:15px;font-weight:500;cursor:pointer;box-shadow:0 0 0 1px color-mix(in srgb,var(--green) 70%,#000)}
.sr-dym b{font-weight:700}
.sr-dym:active{transform:scale(.97)}
.sr-ghostbtn{display:inline-flex;align-items:center;gap:6px;color:var(--ink);font-size:15px;font-weight:600;text-decoration:underline;text-underline-offset:4px}
.sr-ghostbtn svg{width:14px;height:14px}
.sr-sugg{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:8px 12px}
.sr-sugg .sr-opt{text-decoration:none}
.sr-sugg .sr-gl{justify-self:auto}

/* the empty-state mark: the thinking orb on its own, nothing around it */
/* the library has fixed sizes (64, 32, 20), so the 64 orb is enlarged with a transform; the margins hand back the room the transform does not take */
.sro{display:grid;place-items:center;width:64px;height:64px;margin:34px 0 30px;transform:scale(1.9);transform-origin:center}
.sr-busy{display:inline-flex;align-items:center;gap:8px}

.sr-more{display:flex;justify-content:center}
.sr-morebtn{padding:12px 22px;border:0;border-radius:999px;background:rgb(var(--ink-rgb) / .08);color:var(--ink);font:inherit;font-size:15px;font-weight:600;cursor:pointer}
.sr-morebtn:active{transform:scale(.97)}

@media(prefers-reduced-motion:reduce){.sr-skel{animation:none}.sr-st,.sr-st-pic,.sr-opt{transition:none}}
`;
