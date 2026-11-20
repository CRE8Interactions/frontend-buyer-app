/* the colour of a flex pack's deck of vouchers: a colour named in the description wins, else one in the name ("6 - Gold Flex Pack"); none leaves the caller's default */
/* a colour named in a pack's description tints the deck: the earliest colour word wins; no colour word leaves the deck in the team's colours */
export const DECK: [RegExp, { t: string; t2: string; on: string }][] = [
  [/\bgold(en)?\b/i, { t: "#c98a0a", t2: "#f2c14e", on: "#3b2600" }],
  [/\byellow\b/i, { t: "#d9a400", t2: "#ffd84a", on: "#3b2e00" }],
  [/\b(silver|platinum)\b/i, { t: "#8a93a0", t2: "#d3d8df", on: "#26303b" }],
  [/\b(bronze|copper)\b/i, { t: "#8f4f24", t2: "#d08a56", on: "#fff" }],
  [/\b(orange)\b/i, { t: "#d9560f", t2: "#ff8a3d", on: "#fff" }],
  [/\b(red|crimson|maroon)\b/i, { t: "#b3202a", t2: "#e8584f", on: "#fff" }],
  [/\b(pink|magenta)\b/i, { t: "#c2447f", t2: "#f07fb0", on: "#fff" }],
  [/\b(purple|violet)\b/i, { t: "#5b3fb0", t2: "#9a7ee6", on: "#fff" }],
  [/\b(navy)\b/i, { t: "#10284a", t2: "#2f568f", on: "#fff" }],
  [/\b(blue)\b/i, { t: "#1f5fd1", t2: "#5b9bff", on: "#fff" }],
  [/\b(teal|turquoise|aqua)\b/i, { t: "#0b7f7a", t2: "#34c1b6", on: "#fff" }],
  [/\b(green)\b/i, { t: "#1d7f45", t2: "#52c17c", on: "#fff" }],
  [/\b(black)\b/i, { t: "#0d0f12", t2: "#3a3f47", on: "#fff" }],
  [/\b(white)\b/i, { t: "#d7dbe0", t2: "#ffffff", on: "#3a4350" }],
  [/\b(gr[ae]y)\b/i, { t: "#5f6772", t2: "#a3abb5", on: "#fff" }],
];
export function deckColour(desc?: string, name?: string) {
  /* the name is read first ("Silver Package"): it is the pack's own tier, while a description can mention other tiers; a name with no colour falls back to the description */
  return pick(name) ?? pick(desc);
}
function pick(text?: string) {
  if (!text) return undefined;
  let best: { at: number; c: (typeof DECK)[number][1] } | undefined;
  for (const [re, c] of DECK) { const m = re.exec(text); if (m && (!best || m.index < best.at)) best = { at: m.index, c }; }
  return best?.c;
}

