/* Legal pages. One typeface (Geist, the design system's), tokens only, no hex.
   Layout: title on the page, a reading spine on the left (sticky below the glass nav), the text in a 68ch column.
   Motion is limited to state changes: hover, press, open/close, the fill of the section you are reading. */
export const LEGAL_CSS = `
.lg{--measure:68ch;--nav-clear:112px;font-variant-numeric:tabular-nums}
.lg a,.lg button{touch-action:manipulation;-webkit-tap-highlight-color:transparent}
.lg button{font-family:inherit}

.lg-body{padding:clamp(112px,14vw,152px) 0 clamp(64px,8vw,112px)}
.lg-hd{padding-bottom:clamp(28px,4vw,48px)}
.lg-h1{font-size:clamp(40px,5.6vw,80px);line-height:1;letter-spacing:-.04em;font-weight:600;text-wrap:balance}
.lg-h1 i{font-style:normal;color:var(--green-deep)}
.lg-meta{margin-top:18px;display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px;font-size:15px;color:var(--ink3)}

/* document switch */
.lg-sw{position:relative}
.lg-sw-b{display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:0 14px 0 16px;border:0;border-radius:999px;background:var(--paper2);color:var(--ink);font-size:14px;font-weight:500;cursor:pointer;box-shadow:inset 0 0 0 1px var(--line);transition:background-color .18s ease,transform .16s ease-out}
.lg-sw-b svg{transition:transform .2s cubic-bezier(.23,1,.32,1)}
.lg-sw[data-open] .lg-sw-b svg{transform:rotate(180deg)}
.lg-sw-b:active{transform:scale(.97)}
@media(hover:hover) and (pointer:fine){.lg-sw-b:hover{background:var(--paper3)}}
.lg-sw-m{position:absolute;z-index:30;top:calc(100% + 8px);left:0;min-width:260px;padding:6px;border-radius:20px;background:var(--surface);box-shadow:inset 0 0 0 1px var(--line),0 18px 40px -16px rgb(0 0 0 / .35);transform-origin:top left;opacity:0;transform:scale(.96) translateY(-4px);visibility:hidden;pointer-events:none;transition:opacity .15s ease-out,transform .15s cubic-bezier(.23,1,.32,1),visibility 0s linear .15s}
.lg-sw[data-open] .lg-sw-m{opacity:1;transform:none;visibility:visible;pointer-events:auto;transition:opacity .15s ease-out,transform .18s cubic-bezier(.23,1,.32,1)}
.lg-sw-m a{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:44px;padding:0 14px;border-radius:14px;font-size:15px;font-weight:500;color:var(--ink);transition:background-color .15s ease}
.lg-sw-m a span{font-size:12px;font-weight:500;color:var(--ink2)}
.lg-sw-m a[aria-current=page]{font-weight:600}
@media(hover:hover) and (pointer:fine){.lg-sw-m a:hover{background:var(--paper3)}}

/* grid */
.lg-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:20px;align-items:start}
@media(min-width:960px){.lg-grid{grid-template-columns:240px minmax(0,var(--measure));gap:clamp(56px,8vw,128px);justify-content:start}}
.lg-rail{min-width:0}
@media(min-width:960px){.lg-rail{align-self:stretch}}

/* the spine (desktop). Sticky starts below the nav's glass, so nothing of it ever slides under the blur. */
.lg-spine{display:none}
@media(min-width:960px){
  .lg-spine{display:flex;flex-direction:column;gap:20px;position:sticky;top:var(--nav-clear);height:calc(100vh - var(--nav-clear) - 28px);max-height:620px}
}
.lg-now{display:block}
.lg-count{font-size:15px;font-weight:500;color:var(--ink3)}
.lg-count b{font-weight:600;color:var(--ink)}
.lg-now-t{font-size:22px;line-height:1.2;letter-spacing:-.02em;font-weight:600;color:var(--ink);text-wrap:balance}
.lg-segs{flex:1;min-height:96px;display:flex;flex-direction:column;gap:4px;overflow:auto;scrollbar-width:none;padding-right:2px}
.lg-segs::-webkit-scrollbar{display:none}
.lg-segs li{flex:none;height:40px;display:flex}
.lg-seg{position:relative;flex:1;display:flex;align-items:center;gap:12px;outline:none;border-radius:6px}
.lg-seg i{flex:none;position:relative;align-self:stretch;width:8px}
.lg-seg i::before{content:"";position:absolute;left:50%;translate:-50% 0;top:0;bottom:0;width:2px;border-radius:2px;background:linear-gradient(to bottom,rgb(var(--ink-rgb) / .75) calc(var(--p,0)*100%),rgb(var(--ink-rgb) / .2) 0);transition:width .24s cubic-bezier(.23,1,.32,1),background-color .24s ease}
.lg-seg[data-on] i::before{width:4px;background:linear-gradient(to bottom,var(--green) calc(var(--p,0)*100%),rgb(var(--green-rgb) / .28) 0)}
.lg-seg b{min-width:0;font-size:14px;line-height:18px;font-weight:500;color:var(--ink);overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;transition:color .2s ease}
.lg-seg[data-next] b{color:rgb(var(--ink-rgb) / .55)}
.lg-seg[data-on] b{color:var(--ink);font-weight:700}
@media(hover:hover) and (pointer:fine){.lg-seg:hover i::before{width:4px}.lg-seg:hover b,.lg-seg[data-next]:hover b{color:var(--ink)}}
.lg-seg:focus-visible{outline:2px solid var(--green-deep);outline-offset:3px}
.lg-seg em{display:none}
@media(hover:hover) and (pointer:fine){.lg-seg[data-cut]:hover em,.lg-seg[data-cut]:focus-visible em{display:block;position:absolute;z-index:5;left:20px;top:calc(100% + 4px);width:260px;padding:10px 14px;border-radius:12px;background:var(--dark);color:#fff;box-shadow:inset 0 0 0 1px rgb(255 255 255 / .1),0 10px 24px -10px rgb(0 0 0 / .5);font-style:normal;font-size:14px;font-weight:600;line-height:1.35;pointer-events:none}}

.lg-find{display:flex;align-items:center;gap:10px;width:100%;min-height:44px;padding:0 10px 0 14px;border:0;border-radius:999px;background:var(--paper2);color:var(--ink);font-size:14px;font-weight:500;white-space:nowrap;cursor:pointer;text-align:left;box-shadow:inset 0 0 0 1px var(--line);transition:background-color .18s ease,color .18s ease,transform .16s ease-out}
.lg-find kbd{margin-left:auto;font:inherit;font-size:12px;padding:3px 8px;border-radius:999px;background:var(--paper3);color:var(--ink2)}
.lg-find:active,.lg-bar:active{transform:scale(.98)}
@media(hover:hover) and (pointer:fine){.lg-find:hover{background:var(--paper3);color:var(--ink)}}

/* phone: one bar */
.lg-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;min-height:48px;padding:0 8px 0 18px;border:0;border-radius:999px;background:var(--paper2);box-shadow:inset 0 0 0 1px var(--line);color:var(--ink);font-size:15px;cursor:pointer;text-align:left;transition:transform .16s ease-out}
.lg-bar span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lg-bar b{font-weight:600;margin-right:6px}
.lg-bar em{flex:none;font-style:normal;font-size:14px;font-weight:500;padding:8px 14px;border-radius:999px;background:var(--paper3)}
@media(min-width:960px){.lg-bar{display:none}}

/* jump + search dialog */
.lg-dlg{position:fixed;inset:0;margin:auto;width:min(600px,calc(100vw - 24px));max-height:min(620px,calc(100vh - 48px));padding:0;border:0;border-radius:24px;background:var(--surface);color:var(--ink);box-shadow:inset 0 0 0 1px var(--line),0 30px 80px -20px rgb(0 0 0 / .5);overflow:hidden;opacity:0;transform:scale(.97);transition:opacity .15s ease-out,transform .18s cubic-bezier(.23,1,.32,1),display .18s allow-discrete,overlay .18s allow-discrete}
.lg-dlg[open]{opacity:1;transform:none}
@starting-style{.lg-dlg[open]{opacity:0;transform:scale(.97)}}
.lg-dlg::backdrop{background:rgb(0 0 0 / 0);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);transition:background-color .18s ease-out,display .18s allow-discrete,overlay .18s allow-discrete}
.lg-dlg[open]::backdrop{background:rgb(0 0 0 / .4)}
@starting-style{.lg-dlg[open]::backdrop{background:rgb(0 0 0 / 0)}}
.lg-dlg-in{display:flex;flex-direction:column;max-height:inherit}
.lg-q{flex:none;width:100%;height:60px;padding:0 24px;border:0;border-bottom:1px solid var(--line);background:transparent;color:var(--ink);font:inherit;font-size:18px;letter-spacing:-.01em;outline:none}
.lg-q::placeholder{color:var(--mut)}
.lg-res{flex:1;min-height:0;overflow:auto;padding:8px;display:grid;gap:2px;align-content:start}
.lg-res button{display:flex;gap:14px;width:100%;padding:12px 14px;border:0;border-radius:14px;background:transparent;color:var(--ink);text-align:left;cursor:pointer;min-height:44px}
.lg-res button[data-on]{background:var(--paper3)}
.lg-r-n{flex:none;width:22px;padding-top:2px;font-size:13px;color:var(--ink2)}
.lg-r-b{display:grid;gap:4px;min-width:0}
.lg-r-t{font-size:16px;font-weight:600;letter-spacing:-.01em}
.lg-r-s{font-size:14px;line-height:1.5;color:var(--ink2);overflow-wrap:anywhere}
.lg-r-s mark,.lg-res mark{background:rgb(var(--green-rgb) / .55);color:inherit;border-radius:3px;padding:0 1px}
.lg-none{padding:28px 14px;font-size:15px;color:var(--ink2)}
.lg-hint{flex:none;display:flex;gap:18px;padding:12px 24px;border-top:1px solid var(--line);font-size:13px;color:var(--ink2)}
@media(max-width:639px){.lg-hint{display:none}}
::highlight(lg-hit){background-color:rgb(151 221 98 / .55);color:inherit}

/* prose: the section you are reading is full strength, the rest recedes */
.lg-sec[data-live] :is(.lg-p,.lg-ul li){opacity:1}
.lg-sec:focus{outline:none}
.lg-p,.lg-ul{scroll-margin-top:calc(var(--nav-clear) + 8px)}
@media(prefers-reduced-motion:reduce){.lg-p,.lg-ul li{transition:none}}
.lg-prose{min-width:0}
.lg-lead{font-size:clamp(19px,2vw,22px);line-height:1.5;letter-spacing:-.01em;color:var(--ink);text-wrap:pretty;padding:clamp(8px,2vw,20px) 0 clamp(28px,4vw,44px);border-bottom:1px solid var(--line)}
.lg-sec{scroll-margin-top:var(--nav-clear);padding-top:clamp(32px,4vw,48px)}
.lg-h2{display:grid;gap:8px;font-size:clamp(24px,2.6vw,32px);line-height:1.15;letter-spacing:-.025em;font-weight:600;color:var(--ink);text-wrap:balance}
.lg-h2 span{font-size:14px;font-weight:600;letter-spacing:.02em;color:var(--ink3)}
.lg-h3{margin-top:28px;font-size:18px;line-height:1.35;letter-spacing:-.01em;font-weight:600;color:var(--ink)}
.lg-p{margin-top:14px;font-size:16px;line-height:1.7;color:var(--ink);opacity:.8;transition:opacity .35s ease;text-wrap:pretty;overflow-wrap:anywhere}
.lg-h2+.lg-p,.lg-h3+.lg-p{margin-top:16px}
.lg-ul{margin-top:14px;display:grid;gap:10px}
.lg-ul li{position:relative;padding-left:22px;font-size:16px;line-height:1.65;color:var(--ink);opacity:.8;transition:opacity .35s ease;text-wrap:pretty;overflow-wrap:anywhere}
.lg-ul li::before{content:"";position:absolute;left:4px;top:.72em;width:5px;height:5px;border-radius:999px;background:var(--mut)}
.lg-prose a{color:var(--ink);text-decoration:underline;text-decoration-color:rgb(var(--ink-rgb) / .3);text-underline-offset:3px;transition:text-decoration-color .18s ease}
@media(hover:hover) and (pointer:fine){.lg-prose a:hover{text-decoration-color:var(--ink)}}
.lg-ask{margin-top:clamp(48px,6vw,72px);display:flex;flex-wrap:wrap;gap:16px 24px;align-items:center;justify-content:space-between;padding:clamp(24px,3vw,32px);border-radius:24px;background:var(--paper2);box-shadow:inset 0 0 0 1px var(--line)}
.lg-ask b{display:block;font-size:20px;letter-spacing:-.02em;font-weight:600}
.lg-ask p{margin-top:4px;font-size:15px;line-height:1.5;color:var(--ink2)}
.lg :is(.lg-sw-b,.lg-find,.lg-bar,.lg-q,.lg-res button):focus-visible{outline:2px solid var(--green-deep);outline-offset:2px}
.lg-q:focus-visible{outline-offset:-4px}

@media(prefers-reduced-motion:reduce){.lg *,.lg-dlg,.lg-dlg::backdrop{transition-duration:.01ms!important}}
`;
