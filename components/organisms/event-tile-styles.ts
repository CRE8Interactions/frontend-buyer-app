/**
 * The event tile (a 3:4 poster with the title over it and a ticket-stub bar under it) that Browse's Tiles view uses.
 * Copied from app/browse/styles.ts so the wallet can show the same tile; keep the two in step. Needs --land and --out
 * (set on the page's root) and the page's --ink/--ink2 tokens.
 */
export const EVENT_TILE_CSS = `@keyframes br-rise{from{opacity:0;transform:translateY(14px)}}
.br-cat-t{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:500;line-height:1;color:var(--ink2)}
.br-et-t .br-cat-t{color:rgb(255 255 255 / .94);text-shadow:0 1px 2px rgb(0 0 0 / .5),0 1px 10px rgb(0 0 0 / .5)}
.br-pr{display:grid;justify-items:start;gap:4px;line-height:1}
.br-pr small{font-size:12px;color:var(--ink2)}
.br-pr b{font-size:22px;font-weight:600;letter-spacing:-.03em;font-variant-numeric:tabular-nums;transition:transform .35s var(--land)}
.br-tg{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));list-style:none;margin:0;padding:0}
@media(max-width:559px){.br-tg{grid-template-columns:minmax(0,1fr)}}
.br-tg li{animation:br-rise .55s var(--out) backwards;animation-delay:calc(var(--i) * 45ms);filter:drop-shadow(0 12px 22px rgb(0 0 0 / .16)) drop-shadow(0 1px 3px rgb(0 0 0 / .2))}
.br-et{--sh:84px;--r:9px;position:relative;display:grid;grid-template-rows:minmax(0,1fr) var(--sh);aspect-ratio:3/4;border-radius:30px;background:var(--dark,#101012);color:white;isolation:isolate;transition:transform .45s var(--land);
  -webkit-mask:radial-gradient(circle var(--r) at 0 calc(100% - var(--sh)),#0000 98%,#000),radial-gradient(circle var(--r) at 100% calc(100% - var(--sh)),#0000 98%,#000);-webkit-mask-composite:source-in;
  mask:radial-gradient(circle var(--r) at 0 calc(100% - var(--sh)),#0000 98%,#000),radial-gradient(circle var(--r) at 100% calc(100% - var(--sh)),#0000 98%,#000);mask-composite:intersect}
/* a hairline edge and the pointer light, above everything but the clicks */
.br-et::after{content:"";position:absolute;inset:0;z-index:3;border-radius:inherit;pointer-events:none;background:radial-gradient(260px circle at var(--px,50%) var(--py,50%),rgb(255 255 255 / .12),transparent 70%) 0 0/100% 100% no-repeat;box-shadow:inset 0 0 0 1px rgb(255 255 255 / .09);opacity:1}
.br-et::after{background-color:transparent}
/* the poster */
.br-et-img{position:relative;display:grid;align-content:end;overflow:hidden;border-radius:30px 30px 0 0;color:white;background:#101012}
.br-et-ph{position:absolute;inset:0;background-size:cover;background-position:center;transform:scale(1.02);transition:transform .9s var(--out)}
.br-et-img[data-blank="1"] .br-et-ph{background:radial-gradient(110% 80% at 85% 8%,rgb(255 255 255 / .16),transparent 62%),radial-gradient(90% 70% at 0 100%,rgb(255 255 255 / .06),transparent 70%)}
.br-et-img::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgb(0 0 0 / .4) 0%,rgb(0 0 0 / .04) 22%,rgb(0 0 0 / .32) 38%,rgb(0 0 0 / .68) 54%,rgb(0 0 0 / .88) 72%,rgb(0 0 0 / .96) 100%);box-shadow:inset 0 -36px 48px -24px rgb(0 0 0 / .6)}
.br-et-mono{position:absolute;left:50%;top:30%;translate:-50% -50%;font-size:46px;font-weight:600;letter-spacing:-.02em;color:rgb(255 255 255 / .9)}
/* the status sits straight on the photo: white type with a soft shadow keeps it readable */
.br-et-s{position:absolute;left:16px;top:16px;z-index:1;display:grid;color:white;text-shadow:0 1px 10px rgb(0 0 0 / .55)}
.br-et-dt{position:absolute;right:14px;top:14px;z-index:1;display:grid}
/* the tile is dark in both themes, so the date on it is white in both (the badge would otherwise take the theme's dark text in light mode) */
.br-et-dt [data-slot=badge]{color:#fff;text-shadow:0 1px 10px rgb(0 0 0 / .55)}
/* and its fill is dark glass in both themes, set through the badge's own colour tokens, so white type reads on a light photo too */
.br-et-dt{--h-default:rgb(0 0 0 / .5);--h-default-soft:rgb(0 0 0 / .5);--h-default-foreground:#fff;--h-default-soft-foreground:#fff}
.br-et-dt [data-slot=badge]{-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
.br-et-t{position:relative;z-index:1;display:grid;justify-items:start;gap:8px;padding:0 20px 18px}
.br-et-t h4{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;line-clamp:3;overflow:hidden;overflow-wrap:anywhere;font-size:19px;line-height:1.2;font-weight:600;letter-spacing:-.02em;text-wrap:balance;text-shadow:0 1px 2px rgb(0 0 0 / .5),0 2px 18px rgb(0 0 0 / .55)}
.br-et-v{font-size:13px;line-height:1.4;color:rgb(255 255 255 / .92);display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;line-clamp:2;overflow:hidden;text-shadow:0 1px 2px rgb(0 0 0 / .5),0 1px 10px rgb(0 0 0 / .5)}
/* the whole tile is the link: a stretched pseudo-element on the title. The ring is drawn inside, because the mask would clip an outside outline. */
.br-et-a::after{content:"";position:absolute;inset:0;z-index:2;border-radius:30px}
.br-et-a:focus-visible{outline:none}
.br-et-a:focus-visible::after{box-shadow:inset 0 0 0 2px var(--ink)}
/* the stub */
.br-et-b{position:relative;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:2px 18px 0 22px;background:linear-gradient(180deg,rgb(0 0 0 / .5),rgb(0 0 0 / .2) 60%),#0a0a0b}
/* the perforation: a row of small round holes between the two notches */
.br-et-b::before{content:"";position:absolute;left:22px;right:22px;top:-2px;height:4px;background:radial-gradient(circle,rgb(255 255 255 / .38) 1px,transparent 1.5px) 0 0/8px 4px repeat-x}
.br-et-b .br-pr b{font-size:24px;letter-spacing:-.035em;color:white}
.br-et-b .br-pr small{color:rgb(255 255 255 / .62)}
.br-et-cta{position:relative;z-index:4;display:grid}
/* page links inherit their text colour, which beats the button's own foreground token: use the token so the label reads on its fill in both themes */
.br-et-cta [data-slot=button]{color:var(--button-fg)}
/* the tile stub is black in both themes, so its buttons are set for a dark surface through the button's own colour variables */
.br-et-cta [data-slot=button]{--button-fg:white;--button-bg-hover:rgb(255 255 255 / .14);--button-bg-pressed:rgb(255 255 255 / .2)}
@keyframes br-holes{to{background-position:8px 0}}
@media(hover:hover) and (pointer:fine){
  .br-et:hover{transform:translateY(-5px)}
  .br-et:hover .br-et-ph{transform:scale(1.08)}
  .br-et:hover .br-et-b::before{animation:br-holes .8s linear infinite}
}
.br-et:active{transform:scale(.99)}

:root[data-nt="light"] .br-tg li{filter:drop-shadow(0 12px 22px rgb(0 0 0 / .1)) drop-shadow(0 1px 3px rgb(0 0 0 / .12))}
@media(prefers-color-scheme:light){:root:not([data-nt="dark"]) .br-tg li{filter:drop-shadow(0 12px 22px rgb(0 0 0 / .1)) drop-shadow(0 1px 3px rgb(0 0 0 / .12))}}
@media(prefers-reduced-motion:reduce){.br-et,.br-et::before,.br-et-ph,.br-pr b{transition:none}.br-et:hover .br-et-b::before{animation:none}.br-tg li{animation:none}}`;
