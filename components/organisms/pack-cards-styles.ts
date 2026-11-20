// Generated from the team page: the single source of the season pass and flex pack card look (browse purchase flow and the wallet). See app/[slug]/Packages.tsx.
export const PACK_CARDS_CSS = `
/* the price block under a card: a small label over the figure */
.tm-pr{display:grid;justify-items:start;gap:4px;line-height:1}
.tm-pr small{font-size:13px;color:var(--ink2)}
.tm-pr b{font-size:22px;font-weight:600;letter-spacing:-.03em;font-variant-numeric:tabular-nums;transition:transform .35s var(--land)}
/* season seats: lanyard passes that tilt under the pointer, with a sheen where it lands */
.tm-passes{display:grid;gap:14px;perspective:1200px}
/* at most two to a row; a lone pass (or the last of an odd count) keeps the width of one column instead of stretching across the row */
@media(min-width:720px){.tm-passes{grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}}
/* a pass: a square (1:1) plate on the left, the title and dates beside it, the price and Select along the bottom. A plain rounded card, no ticket cut-outs */
.tm-pass{--pw:clamp(116px,38%,188px);position:relative;display:grid;grid-template-columns:var(--pw) minmax(0,1fr);grid-template-rows:1fr auto;gap:0 20px;padding:12px;border-radius:28px;background:var(--paper2);color:var(--ink);overflow:hidden;isolation:isolate;transform:rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg));transition:transform .5s var(--out);will-change:transform}
.tm-pass::after{content:"";position:absolute;inset:0;z-index:3;pointer-events:none;border-radius:inherit;background:radial-gradient(340px circle at var(--px,50%) var(--py,0%),color-mix(in srgb,var(--on-photo) 20%,transparent),transparent 65%);opacity:0;transition:opacity .4s var(--out);mix-blend-mode:soft-light}
@media(hover:hover) and (pointer:fine){.tm-pass:hover::after{opacity:1}}
.tm-pass-top{position:relative;display:grid;align-content:end;grid-row:1/3;aspect-ratio:1;align-self:start;padding:14px;border-radius:20px;color:var(--on-t,var(--on-photo));overflow:hidden;background:radial-gradient(120% 120% at 100% 0,var(--t2),transparent 60%),linear-gradient(160deg,var(--t),color-mix(in srgb,var(--t) 60%,var(--shade)))}
/* the punched slot the lanyard clips through */
.tm-pass-top::before{content:"";position:absolute;left:50%;top:14px;width:56px;height:12px;translate:-50% 0;border-radius:999px;background:var(--paper2);box-shadow:inset 0 1px 2px color-mix(in srgb,var(--shade) 35%,transparent)}
.tm-pass-top img{position:absolute;right:-18px;bottom:-14px;width:150px;opacity:.16;filter:grayscale(1) brightness(4)}
.tm-pass-n{font-size:clamp(44px,5vw,60px);font-weight:500;line-height:.85;letter-spacing:-.065em;font-variant-numeric:tabular-nums}
.tm-pass-top small{margin-top:6px;font-size:14px;font-weight:500;opacity:.85}
.tm-pass-b{display:grid;gap:8px;padding:6px 8px 0 0;align-content:start;justify-items:start}
.tm-pass-b h3{font-size:clamp(19px,1.8vw,22px);font-weight:600;letter-spacing:-.03em;line-height:1.15;text-wrap:balance}
.tm-pass-b p{font-size:14px;line-height:1.5;color:var(--ink2);display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;line-clamp:3;overflow:hidden}
.tm-pass-b h3 .tm-pass-a{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;line-clamp:2;overflow:hidden}
.tm-pass-f{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 4px 2px 0}
.tm-pass-f .tm-pr b{font-size:26px}
/* both kinds of pass fill the same square (the maroon lanyard with the count, or the pass's own 1:1 picture), so a pass with a picture and one without are the same size and the footers line up. */
.tm-pass-top.pg-cover{padding:0;background:color-mix(in srgb,var(--t) 10%,var(--paper));color:inherit}
.tm-pass-top.pg-cover::before{display:none}
.tm-pass-top.pg-cover img{position:absolute;inset:0;width:100%;height:100%;right:auto;bottom:auto;object-fit:cover;opacity:1;filter:none}
.tm-pass-top::before{top:10px;width:40px;height:9px}
.tm-pass-meta{font-size:14px;font-weight:500;color:var(--ink2);font-variant-numeric:tabular-nums}
.tm-pass-f .tm-pr b{font-size:22px}
.tm-pass-f [data-slot=button]{color:var(--ink)}
/* the whole card is the link: the title's link is stretched over it, and Select (the same destination) stays above it */
.tm-pass{cursor:pointer}
.tm-pass-a::after{content:"";position:absolute;inset:0;z-index:2;border-radius:inherit}
.tm-pass-a:focus-visible{outline:none}
.tm-pass-a:focus-visible::after{outline:2px solid var(--ink);outline-offset:-3px}
.tm-pass-f [data-slot=button]{position:relative;z-index:4}

/* flex packs: a stack of vouchers that fans out when you point at it */
.tm-flex{display:grid;gap:14px}
@media(min-width:760px){.tm-flex{grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}}
.tm-fx{position:relative;display:grid;gap:16px;padding:22px;border-radius:30px;background:var(--paper2);color:var(--ink);transition:transform .4s var(--land)}
.tm-fx-a::after{content:"";position:absolute;inset:0;z-index:2;border-radius:inherit}
.tm-fx-a:focus-visible{outline:none}
.tm-fx-a:focus-visible::after{outline:2px solid var(--ink);outline-offset:-3px}
/* Vouchers are coupons, not tickets: a plain slip with a dashed clip line inside its edge and a round stamp, and no notches,
   so a stack reads as clean card edges. The fan keeps a clear band below it: at full spread the lowest corner stays above the title. */
.tm-fan{position:relative;height:148px}
.tm-fan i{--a:calc((var(--k) - (var(--n) - 1) / 2) * var(--sp,4deg));position:absolute;left:50%;bottom:22px;width:72px;height:102px;margin-left:-36px;border-radius:14px;transform-origin:50% 130%;transform:rotate(var(--a));transition:transform .55s var(--land);transition-delay:calc(var(--k) * 12ms);
  background:linear-gradient(170deg,var(--t2),var(--t));box-shadow:0 0 0 1px color-mix(in srgb,var(--shade) 22%,transparent),0 6px 14px color-mix(in srgb,var(--shade) 20%,transparent)}
.tm-fan i::before{content:"";position:absolute;inset:7px;border-radius:8px;border:1.5px dashed color-mix(in srgb,var(--on-t,var(--on-photo)) 42%,transparent)}
.tm-fan i::after{content:"";position:absolute;left:50%;top:50%;width:30px;height:30px;translate:-50% -50%;border-radius:50%;box-shadow:inset 0 0 0 2px color-mix(in srgb,var(--on-t,var(--on-photo)) 60%,transparent),inset 0 0 0 9px transparent,inset 0 0 0 15px color-mix(in srgb,var(--on-t,var(--on-photo)) 60%,transparent)}
@media(hover:hover) and (pointer:fine){.tm-fx:hover{transform:translateY(-4px)}.tm-fx:hover .tm-fan i{transform:rotate(calc(var(--a) * 3)) translateY(-6px)}}
.tm-fx-t{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
.tm-fx-t h3{font-size:24px;font-weight:600;letter-spacing:-.03em;line-height:1.1;text-wrap:balance}
.tm-fx-h{display:grid;gap:8px;align-content:start}
/* the saving sits in the card's top corner, so the name has the whole width */
.tm-fx-sv{position:absolute;top:18px;left:18px;z-index:3}
/* cards in a row share a height: the fan and the title start at the same place and the price row sits on the bottom edge, whether or not a card has a description */
@media(min-width:760px){.tm-fx{grid-template-rows:auto minmax(0,1fr) auto;align-content:stretch}}
.tm-fx-m{font-size:14px;font-weight:500;color:rgb(var(--ink-rgb) / .82);font-variant-numeric:tabular-nums}
.tm-fx-f{display:flex;align-items:end;justify-content:space-between;gap:12px;padding-top:16px;border-top:2px dashed rgb(var(--ink-rgb) / .16)}
.tm-fx-f .tm-pr b{font-size:30px;letter-spacing:-.04em}
.tm-fx-e{font-size:14px;color:var(--ink2);font-variant-numeric:tabular-nums}

/* phone: a flex pack is one compact row: a small plate with the fan, then the title and badge over the price. No dividers or labels, so each pack is about 116px tall. */
@media(max-width:759px){
  .tm-fx{grid-template-columns:96px minmax(0,1fr);grid-template-areas:"fan t" "fan f";align-items:center;gap:4px 14px;padding:10px 16px 10px 10px;border-radius:24px}
  .tm-fan{grid-area:fan;align-self:stretch;height:auto;min-height:96px;overflow:hidden;border-radius:16px;background:radial-gradient(90% 70% at 50% 100%,color-mix(in srgb,var(--t) 24%,transparent),transparent 75%),color-mix(in srgb,var(--t) 10%,var(--paper))}
  .tm-fan i{bottom:10px;width:48px;height:68px;margin-left:-24px;border-radius:9px;box-shadow:0 0 0 1px color-mix(in srgb,var(--shade) 22%,transparent),0 3px 8px color-mix(in srgb,var(--shade) 20%,transparent)}
  .tm-fan i::before{inset:4px;border-radius:5px;border-width:1px}
  .tm-fan i::after{width:16px;height:16px;box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--on-t,var(--on-photo)) 60%,transparent),inset 0 0 0 5px transparent,inset 0 0 0 8px color-mix(in srgb,var(--on-t,var(--on-photo)) 60%,transparent)}
  .tm-fx:hover .tm-fan i{transform:rotate(calc(var(--a) * 1.3)) translateY(-2px)}
  .tm-fx-sv{top:8px;left:8px}
  .tm-fx-h{grid-area:t;align-self:end;gap:2px}
  .tm-fx-t{flex-wrap:wrap;align-items:center;justify-content:flex-start;gap:4px 10px}
  .tm-fx-t h3{font-size:18px;letter-spacing:-.02em}
  .tm-fx-m{font-size:13px}
  .tm-fx-f{grid-area:f;flex-wrap:wrap;align-items:baseline;justify-content:flex-start;gap:2px 10px;padding-top:0;border-top:0;align-self:start}
  .tm-fx-f .tm-pr small{display:none}
  .tm-fx-f .tm-pr b{font-size:24px;letter-spacing:-.03em}
  .tm-fx-e{font-size:13px}
}

/* tile layout (the wallet's tile view): the same pass, stacked: its picture across the top, then the name, then the figure and the button. Tiles in a row share one height. */
.tm-pass[data-tile]{grid-template-columns:minmax(0,1fr);grid-template-rows:auto minmax(0,1fr) auto;gap:14px 0;height:100%}
.tm-pass[data-tile] .tm-pass-top{grid-row:auto;width:100%;aspect-ratio:16/10}
.tm-pass[data-tile] .tm-pass-b{padding:0 8px}
.tm-pass[data-tile] .tm-pass-f{padding:4px 8px 4px}
`
