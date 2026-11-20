// Generated from the team page schedule row; the single source of the ticket strip look. See components/organisms/TicketStrip.tsx.
export const TICKET_STRIP_CSS = `
/* TicketStrip: the one ticket row (date, picture, title, price stub with a button) used on Browse, team and venue pages. This is its only stylesheet; the pages embed it and never restyle it.
   The hover wash and hairline edge follow --t2 (the team colour on team pages) and fall back to the brand green elsewhere. the tk-team class also sets the accent token to the team colour. */
.tk{--sw:256px;--r:11px;position:relative;display:grid;grid-template-columns:60px 72px minmax(0,1fr) var(--sw);align-items:center;gap:18px;min-height:104px;padding:18px 0 18px 22px;border-radius:24px;background:var(--paper2);color:var(--ink);isolation:isolate;transition:transform .35s var(--land);
  -webkit-mask:radial-gradient(circle var(--r) at calc(100% - var(--sw)) 0,transparent 98%,var(--shade)),radial-gradient(circle var(--r) at calc(100% - var(--sw)) 100%,transparent 98%,var(--shade));-webkit-mask-composite:source-in;
  mask:radial-gradient(circle var(--r) at calc(100% - var(--sw)) 0,transparent 98%,var(--shade)),radial-gradient(circle var(--r) at calc(100% - var(--sw)) 100%,transparent 98%,var(--shade));mask-composite:intersect}
/* the team colour follows the pointer across the row */
.tk::before{content:"";position:absolute;inset:0;z-index:-1;border-radius:inherit;background:radial-gradient(260px circle at var(--px,50%) var(--py,50%),color-mix(in srgb,var(--t2,rgb(var(--green-rgb))) 9%,transparent),transparent 72%);opacity:0;transition:opacity .35s var(--out);pointer-events:none}
/* and a hairline edge that lights up only near the pointer, so the row is traced rather than flooded */
.tk::after{content:"";position:absolute;inset:0;z-index:-1;border-radius:inherit;padding:1px;background:radial-gradient(220px circle at var(--px,50%) var(--py,50%),color-mix(in srgb,var(--t2,rgb(var(--green-rgb))) 70%,transparent),transparent 70%);-webkit-mask:linear-gradient(var(--shade) 0 0) content-box,linear-gradient(var(--shade) 0 0);-webkit-mask-composite:xor;mask:linear-gradient(var(--shade) 0 0) content-box exclude,linear-gradient(var(--shade) 0 0);opacity:0;transition:opacity .35s var(--out);pointer-events:none}
.tk-a::after{content:"";position:absolute;inset:0;z-index:2;border-radius:24px}
.tk-a:focus-visible{outline:none}
.tk-a:focus-visible::after{box-shadow:inset 0 0 0 2px var(--ink)}
.tk:focus-visible{outline:none;box-shadow:inset 0 0 0 2px var(--ink)}
.tk-d{display:grid;justify-items:center;gap:4px;line-height:1}
.tk-d i{font-style:normal;font-size:13px;font-weight:600;color:var(--ink2);text-transform:uppercase;letter-spacing:.06em}
.tk-d b{font-size:32px;font-weight:600;letter-spacing:-.05em;font-variant-numeric:tabular-nums;transition:transform .4s var(--land)}
.tk-pic{display:grid;place-items:center;width:64px;height:64px;font-size:15px;font-weight:600;color:var(--ink2);transition:transform .4s var(--land)}
.tk-pic img{width:100%;height:100%;object-fit:cover;border-radius:10px;rotate:-4deg;box-shadow:0 0 0 2px var(--on-photo),0 4px 10px color-mix(in srgb,var(--shade) 25%,transparent)}
.tk-pic[data-blank="1"]{border-radius:16px;background:var(--paper);box-shadow:inset 0 0 0 1px rgb(var(--ink-rgb) / .1)}
.tk-m{display:grid;justify-items:start;gap:8px;min-width:0}
/* the descriptors (sport and status) sit above the title; the sport is plain text with its icon, not a badge */
.tk-c{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px}
/* the whole row is the link: a stretched pseudo-element on the title; the button sits above it as its own link */
.tk-a{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;line-clamp:3;overflow:hidden;overflow-wrap:anywhere}
.tk-m strong{font-size:17px;line-height:1.2;font-weight:600;letter-spacing:-.02em;text-wrap:balance}
.tk-v{max-width:100%;font-size:13.5px;color:color-mix(in srgb,var(--ink) 80%,var(--paper2));overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tk-s{position:relative;align-self:stretch;display:flex;align-items:center;justify-content:space-between;gap:14px;padding:0 20px 0 26px;/* the stub edge is the same row of round punched holes as the tiles' */
  background:radial-gradient(circle,rgb(var(--ink-rgb) / .34) 1px,transparent 1.5px) 0 0/3px 8px repeat-y}
@media(hover:hover) and (pointer:fine){
  .tk:hover{transform:translateY(-2px)}
  .tk:hover::before,.tk:hover::after{opacity:1}
  .tk:hover .tk-d b{transform:translateY(-2px)}
  .tk:hover .tk-pic{transform:scale(1.12) rotate(-3deg)}
  .tk:hover .tk-s{animation:tk-march .9s linear infinite}
  .tk:hover .tk-pr b{transform:scale(1.06);transform-origin:left center}
}
.tk:active{transform:scale(.99)}
/* a row that is only information (the wallet's listings): it still lifts and lights under the pointer, but it is not a link, so the pointer stays an arrow (the buttons on it keep theirs) and pressing it does nothing */
.tk[data-static]{cursor:default}
.tk[data-static]:active{transform:none}
@media(max-width:639px){
  .tk{--sh:62px;grid-template-columns:44px minmax(0,1fr);gap:14px;padding:18px 0 0 16px;align-items:start;
    -webkit-mask:radial-gradient(circle var(--r) at 0 calc(100% - var(--sh)),transparent 98%,var(--shade)),radial-gradient(circle var(--r) at 100% calc(100% - var(--sh)),transparent 98%,var(--shade));-webkit-mask-composite:source-in;
    mask:radial-gradient(circle var(--r) at 0 calc(100% - var(--sh)),transparent 98%,var(--shade)),radial-gradient(circle var(--r) at 100% calc(100% - var(--sh)),transparent 98%,var(--shade));mask-composite:intersect}
  .tk-pic{display:none}
  .tk-m{padding-right:16px}
  .tk-s{grid-column:1/-1;align-self:auto;height:var(--sh);margin:6px 0 0 -16px;padding:0 16px;background:radial-gradient(circle,rgb(var(--ink-rgb) / .34) 1px,transparent 1.5px) 0 0/8px 3px repeat-x}
  .tk:hover .tk-s{animation:none}
}
.tk-cat{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:500;line-height:1;color:var(--ink2)}
.tk-pr{display:grid;justify-items:start;gap:4px;line-height:1}
.tk-pr small{font-size:13px;color:var(--ink2)}
.tk-pr b{font-size:22px;font-weight:600;letter-spacing:-.03em;font-variant-numeric:tabular-nums;transition:transform .35s var(--land)}
.tk-cta{position:relative;z-index:4;display:grid}
/* page links inherit their text colour, which beats the button's own foreground token: use the token so the label reads on its fill in both themes */
.tk-cta [data-slot=button]{color:var(--button-fg)}
@keyframes tk-march{to{background-position:0 8px}}
@media(prefers-reduced-motion:reduce){.tk,.tk-d b,.tk-pic,.tk-pr b{transition:none}.tk:hover .tk-s{animation:none}}
/* the team pages set the strip in the team colour: the accent token becomes the team colour, so the button and its hover wash follow it */
.tk-team{--on-green:var(--on-t,var(--on-photo));--h-accent:var(--t);--h-accent-foreground:var(--on-t,var(--on-photo));--h-accent-hover:color-mix(in oklab,var(--t) 84%,var(--on-t,var(--on-photo)) 16%);--h-border:color-mix(in srgb,var(--t2) 55%,transparent);--h-default:color-mix(in oklab,var(--t) 14%,transparent);--h-default-hover:color-mix(in oklab,var(--t) 26%,transparent)}
`;
