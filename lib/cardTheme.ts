/**
 * How a membership card is coloured. One rule, in this order:
 *  1. The backend sends a colour for the tier: the card is that colour (a light tint of it, with a dark ink made from it).
 *  2. The backend sends a tier name we recognise (basic, bronze, silver, gold, platinum, or a known alias such as "titanium"):
 *     the card takes that step's colours.
 *  3. Otherwise the card is Basic.
 * Steps run Basic, Bronze, Silver, Gold, Platinum. A backend can rename or reorder them: send `levels` to the Rewards
 * component and each level still resolves its colours by the same rule.
 */

export type TierKey = "basic" | "bronze" | "silver" | "gold" | "platinum";
export const TIER_ORDER: TierKey[] = ["basic", "bronze", "silver", "gold", "platinum"];

export type CardTheme = {
  key: TierKey | "custom";
  /** what the card says: the backend's own word when it sent one, else the step's name */
  label: string;
  /** the four stops of the card's base, light to dark across the diagonal */
  stops: [string, string, string, string];
  /** text colour on the card */
  ink: string;
  /** a dark card: the foil blends with screen instead of multiply */
  dark: boolean;
  /** 0 to 1.5: how strong the hologram is for this step */
  foil: number;
};

const TIERS: Record<TierKey, Omit<CardTheme, "key" | "label">> = {
  basic: { stops: ["#d7d8db", "#c3c5c9", "#cfd0d4", "#b4b6bb"], ink: "#26272a", dark: false, foil: 0.22 },
  bronze: { stops: ["#fbeadb", "#ecc6a0", "#fbefe3", "#d3a075"], ink: "#3b2310", dark: false, foil: 0.85 },
  silver: { stops: ["#fdfdfe", "#ececf1", "#f8f8fa", "#e2e2e8"], ink: "#1d1d1f", dark: false, foil: 1 },
  gold: { stops: ["#fdf4cf", "#f0d273", "#fdf6da", "#dcb44d"], ink: "#3a2d07", dark: false, foil: 1 },
  platinum: { stops: ["#4a5360", "#272c34", "#3a414c", "#14171c"], ink: "#f4f6f8", dark: true, foil: 1.15 },
};

/** Words a backend might use for a step, mapped to ours. */
const ALIASES: [TierKey, string[]][] = [
  ["platinum", ["platinum", "titanium", "diamond", "elite"]],
  ["gold", ["gold", "golden"]],
  ["silver", ["silver"]],
  ["bronze", ["bronze", "copper"]],
  ["basic", ["basic", "base", "standard", "member", "free", "starter", "entry", "regular"]],
];

/** The step a backend word means, or null if we do not know it. */
export function tierKeyFor(name?: string | null): TierKey | null {
  if (!name) return null;
  const words = name.toLowerCase().replace(/[^a-z]+/g, " ").trim().split(" ");
  for (const [key, list] of ALIASES) if (list.some((a) => words.includes(a))) return key;
  return null;
}

/** The card's colours for a tier name and/or colour from the backend. */
export function resolveCardTheme(input: { name?: string | null; color?: string | null }): CardTheme {
  const { name, color } = input;
  if (color && color.trim()) {
    const c = color.trim();
    /* any CSS colour works: the card is a light tint of it, the ink a dark shade of it */
    return {
      key: "custom",
      label: name?.trim() || "",
      stops: [`color-mix(in oklab, ${c} 8%, white)`, `color-mix(in oklab, ${c} 30%, white)`, `color-mix(in oklab, ${c} 14%, white)`, `color-mix(in oklab, ${c} 46%, white)`],
      ink: `color-mix(in oklab, ${c} 28%, #101012)`,
      dark: false,
      foil: 1,
    };
  }
  const key = tierKeyFor(name) ?? "basic";
  const label = name?.trim() || key[0].toUpperCase() + key.slice(1);
  return { key, label, ...TIERS[key] };
}

/* ---------- options to compare: several looks for each step, for choosing the one we ship ---------- */
export type TierOption = { id: string; name: string; theme: CardTheme };
const opt = (key: TierKey, id: string, name: string, p: Partial<Omit<CardTheme, "key" | "label">>): TierOption => ({
  id, name, theme: { key, label: key[0].toUpperCase() + key.slice(1), ...TIERS[key], ...p },
});
export const TIER_OPTIONS: Record<TierKey, TierOption[]> = {
  basic: [
    opt("basic", "A", "Soft grey (current)", {}),
    opt("basic", "A2", "Pearl white", { stops: ["#fbfbfc", "#eeeff2", "#f7f7f9", "#e4e5ea"], foil: 0.55 }),
    opt("basic", "B", "Warm paper", { stops: ["#fbf8f2", "#efe9dd", "#f8f4ec", "#e4ddcd"], ink: "#2a2418" }),
    opt("basic", "C", "Cool slate", { stops: ["#e9edf2", "#cfd6df", "#e4e9ef", "#bcc5d1"], ink: "#18202b" }),
  ],
  bronze: [
    opt("bronze", "A", "Copper (current)", {}),
    opt("bronze", "B", "Burnished", { stops: ["#f1cfae", "#cf9367", "#f3d8bd", "#a8683a"], ink: "#2e1a0b", foil: 0.95 }),
    opt("bronze", "C", "Dark bronze", { stops: ["#7a5236", "#4a2f1c", "#6a4429", "#2a180c"], ink: "#f7e4d2", dark: true, foil: 1.1 }),
  ],
  silver: [
    opt("silver", "A", "Pearl titanium (current)", {}),
    opt("silver", "B", "Cool steel", { stops: ["#e9edf3", "#c5ced9", "#e2e7ee", "#a9b4c2"], ink: "#141b25" }),
    opt("silver", "C", "Smoke", { stops: ["#9aa1ab", "#5d636c", "#868d97", "#3d424a"], ink: "#f6f7f9", dark: true, foil: 1.1 }),
  ],
  gold: [
    opt("gold", "A", "Champagne (current)", {}),
    opt("gold", "B", "Rich gold", { stops: ["#f8de82", "#e0b13a", "#fbe7a0", "#b98a1f"], ink: "#2b1f02", foil: 0.95 }),
    opt("gold", "C", "Black and gold", { stops: ["#2e2718", "#17120a", "#262012", "#0d0a05"], ink: "#f2d88a", dark: true, foil: 1.2 }),
  ],
  platinum: [
    opt("platinum", "A", "Graphite (current)", {}),
    opt("platinum", "B", "Icy platinum", { stops: ["#f5f9fd", "#d3dde9", "#eef3f9", "#bccadb"], ink: "#0e1a2b", dark: false, foil: 1.4 }),
    opt("platinum", "C", "Obsidian", { stops: ["#1b2330", "#0a0e14", "#141b26", "#04060a"], ink: "#e9f1ff", dark: true, foil: 1.35 }),
    opt("platinum", "D", "Midnight blue", { stops: ["#27456f", "#10233f", "#1d3a62", "#081426"], ink: "#eaf2ff", dark: true, foil: 1.25 }),
  ],
};
