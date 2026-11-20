/**
 * Memberships: the shape the wallet expects from the backend, plus demo data until it is connected.
 *
 * The backend call (not wired yet, there is no live API in the wallet demo) is one read for the signed-in buyer:
 *
 *   GET /buyer/memberships   ->   { memberships: Membership[] }
 *
 * One entry per club the buyer belongs to, in the order the club should appear (the first is shown first). Nothing here is
 * computed in the page that the backend should own: points, the level ladder, what earns points and the club's boost all
 * arrive with the membership, so each club can run its own programme. `tier` is optional: when the backend names the buyer's
 * tier (or sends a colour) it wins over the level the points would put them in (see lib/cardTheme).
 */

export type RewardLevel = {
  name: string;
  /** points needed to reach this level; the first level is 0 */
  at: number;
  color?: string;
  perks?: string[];
  /** the one-line reason to want this step, shown on the timeline */
  teaser?: string;
};

export type EarnRule = { label: string; value: string };

/** One change to the points balance: what happened, how many points, when. Newest first from the backend. */
export type PointsActivity = { id: string; label: string; points: number; on: string };

export type Membership = {
  /** stable id from the backend, used as the React key and the selected tab */
  id: string;
  /** the club's display name */
  club: string;
  /** printed on the card */
  memberId: string;
  /** year the buyer joined, as text */
  since: string;
  points: number;
  /** what the backend says this member's tier is: a name and/or a colour */
  tier?: { name?: string; color?: string };
  /** the club's ladder, any order; the wallet sorts it */
  levels: RewardLevel[];
  earn: EarnRule[];
  /** one line on a club's boost, e.g. "2× points at home games"; omitted when there is none */
  boost?: string;
  /** recent points changes, newest first (the wallet shows the first few) */
  activity: PointsActivity[];
};

/** Where a member stands on their club's ladder. Computed from the membership, never stored. */
export function standing(m: Membership) {
  const sorted = [...m.levels].sort((a, b) => a.at - b.at);
  const current = [...sorted].reverse().find((l) => m.points >= l.at) ?? sorted[0];
  const next = sorted.find((l) => l.at > m.points);
  const share = next ? Math.min(1, Math.max(0, (m.points - current.at) / (next.at - current.at))) : 1;
  return { sorted, current, next, toNext: next ? next.at - m.points : 0, share };
}

export type MembershipsResponse = { memberships: Membership[] };

const STANDARD_EARN: EarnRule[] = [
  { label: "Buy tickets", value: "1 point per $1" },
  { label: "Attend an event (scanned at the gate)", value: "+50" },
  { label: "A friend buys with your link", value: "+100" },
  { label: "Renew your season seats", value: "+250" },
];

const AGGIE_CLUB: Membership = {
  id: "aggie-club", club: "Aggie Club", memberId: "4407 0862", since: "2023", points: 2140, boost: "2× points at home games",
  levels: [
    { name: "Basic", at: 0, perks: ["Your tickets, transfers and resale in one wallet"] },
    { name: "Bronze", at: 500, teaser: "Points on every ticket", perks: ["Points on every ticket you buy"] },
    { name: "Silver", at: 1500, teaser: "Early presales", perks: ["Early access to presales"] },
    { name: "Gold", at: 3000, teaser: "No resale fees", perks: ["Presales 24 hours before everyone else", "No service fees when you resell", "Seat upgrades when a better seat opens up"] },
    { name: "Platinum", at: 6000, teaser: "First pick on season seats", perks: ["Everything in Gold", "A member host for every home game", "First pick when season seats renew"] },
  ],
  earn: STANDARD_EARN,
  activity: [
    { id: "a1", label: "Attended vs. Sam Houston", points: 50, on: "Sep 5" },
    { id: "a2", label: "Season seats, 2 tickets", points: 340, on: "Aug 28" },
    { id: "a3", label: "A friend bought with your link", points: 100, on: "Aug 19" },
    { id: "a4", label: "Renewed season seats", points: 250, on: "Jul 2" },
  ],
};

/** A second club with its own thresholds, perks and earn rules, so nothing in the UI can assume the first club's numbers. */
const RAPTORS_INSIDERS: Membership = {
  id: "raptors-insiders", club: "Raptors Insiders", memberId: "9120 3375", since: "2025", points: 380, boost: "Double points on Friday nights",
  levels: [
    { name: "Basic", at: 0, perks: ["Member pricing on concessions"] },
    { name: "Bronze", at: 400, teaser: "Free parking, once a month", perks: ["Free parking at one home game a month"] },
    { name: "Silver", at: 1000, teaser: "Pre-game field access", perks: ["Pre-game field access for kids", "Early access to promo nights"] },
    { name: "Gold", at: 2500, teaser: "Dugout tour", perks: ["Everything in Silver", "A dugout tour once a season"] },
  ],
  earn: [
    { label: "Buy tickets", value: "1 point per $1" },
    { label: "Attend a game (scanned at the gate)", value: "+25" },
    { label: "Bring a first-time guest", value: "+75" },
  ],
  activity: [
    { id: "r1", label: "Bought 2 tickets, Ogden Raptors", points: 64, on: "Aug 14" },
    { id: "r2", label: "Attended vs. Missoula", points: 25, on: "Jun 16" },
    { id: "r3", label: "Redeemed: free parking", points: -100, on: "Jun 16" },
  ],
};

export type ClubsDemo = "none" | "one" | "two";

/** Demo stand-in for the backend read. `state` is only the demo switch; the real call takes nothing but the session. */
export const demoMemberships = (state: ClubsDemo): Membership[] =>
  state === "none" ? [] : state === "one" ? [AGGIE_CLUB] : [AGGIE_CLUB, RAPTORS_INSIDERS];
