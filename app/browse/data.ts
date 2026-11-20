/* the site-wide index of events, teams and venues, shared by Browse and the search in the top bar */
export type Kind = "seated" | "ga";
export type Cat = "Football" | "Hockey" | "Baseball" | "Soccer" | "Volleyball" | "Basketball" | "MMA" | "Music" | "Comedy" | "Other";
export type Status = "On sale" | "Few left" | "Resale only" | "Presale";
export type Ev = { m: number; d: number; dow: string; time: string; title: string; venue: string; city: string; p: number; status: Status; kind: Kind; slug: string; cat: Cat; href?: string; id?: string; img?: string };

export const ALL: Ev[] = [
  { m: 8, d: 14, dow: "Fri", time: "6:30 PM", title: "Ogden Raptors vs. Long Beach Coast", venue: "Lindquist Field", city: "Ogden, UT", p: 18, status: "On sale", kind: "seated", slug: "ogden-raptors", cat: "Baseball" },
  { m: 8, d: 29, dow: "Sat", time: "6:00 PM", title: "NM State Aggies vs. UTEP Miners", venue: "Aggie Memorial Stadium", city: "Las Cruces, NM", p: 28, status: "Few left", kind: "seated", slug: "nm-state", cat: "Football" },
  { m: 9, d: 3, dow: "Thu", time: "7:00 PM", title: "NM State Soccer vs. Grand Canyon", venue: "NMSU Soccer Field", city: "Las Cruces, NM", p: 12, status: "On sale", kind: "ga", slug: "nm-state", cat: "Soccer" },
  { m: 9, d: 5, dow: "Sat", time: "7:00 PM", title: "Niagara IceDogs vs. Barrie Colts", venue: "Meridian Centre", city: "St. Catharines, ON", p: 24, status: "On sale", kind: "seated", slug: "niagara-icedogs", cat: "Hockey" },
  { m: 9, d: 13, dow: "Sun", time: "8:00 PM", title: "Desert Sessions — Live at the Pan Am", venue: "Pan American Center", city: "Las Cruces, NM", p: 45, status: "Resale only", kind: "ga", slug: "nm-state", cat: "Music" },
  { m: 9, d: 18, dow: "Fri", time: "9:00 PM", title: "Late Set: Southwest Comedy Showcase", venue: "Rio Grande Theatre", city: "Las Cruces, NM", p: 22, status: "On sale", kind: "ga", slug: "nm-state", cat: "Comedy" },
  { m: 10, d: 3, dow: "Sat", time: "2:00 PM", title: "NM State Aggies vs. Liberty Flames", venue: "Aggie Memorial Stadium", city: "Las Cruces, NM", p: 32, status: "Presale", kind: "seated", slug: "nm-state", cat: "Football" },
  { m: 10, d: 9, dow: "Fri", time: "8:00 PM", title: "Generic Event", venue: "The Fillmore Denver", city: "Denver, CO", p: 13, status: "On sale", kind: "seated", slug: "concert", cat: "Music", href: "/concert" },
  { m: 10, d: 10, dow: "Sat", time: "8:00 PM", title: "Generic GA Event", venue: "The Fillmore Denver", city: "Denver, CO", p: 10, status: "On sale", kind: "ga", slug: "concert", cat: "Music", href: "/concert?type=ga" },
  { m: 10, d: 11, dow: "Sun", time: "5:00 PM", title: "NM State Volleyball vs. Tarleton State", venue: "Pan American Center", city: "Las Cruces, NM", p: 10, status: "On sale", kind: "ga", slug: "nm-state", cat: "Volleyball" },
];

export type Org = { name: string; count: number; kind: "team" | "venue"; logo?: string; href?: string; match?: string; accent?: string; fresh?: number };
/* `fresh` is the number of games added lately (demo values; the demo events do not carry an added date). */
/* Teams carry the logos the live browse page uses (the files are in /public/clients). The live page has no venue logos, so venues keep a monogram.
   `accent` is each team's own colour, sampled from its logo (lightened a little to read on a dark card), and themes the tile background. These are third-party brand colours, not Blocktickets tokens. */
export const VENUES: Org[] = [
  { name: "NM State Athletics", count: 29, kind: "team", logo: "/nmstate/nmstate-logo-nowordmark.png", accent: "#a01f56", href: "/nm-state", match: "NM State", fresh: 3 },
  { name: "Niagara IceDogs Hockey Club", count: 26, kind: "team", logo: "/clients/icedogs.svg", accent: "#bf0c26", href: "/niagara-icedogs", match: "IceDogs", fresh: 2 },
  { name: "Des Moines Buccaneers", count: 23, kind: "team", logo: "/clients/buccaneers.svg", accent: "#2a55b8", href: "/des-moines-buccaneers", fresh: 1 },
  { name: "Houston Bulls", count: 24, kind: "team", logo: "/clients/houston-bulls.png", accent: "#1b5a96", href: "/houston-bulls", fresh: 2 },
  { name: "North Iowa Bulls Hockey Club", count: 14, kind: "team", logo: "/clients/iowa-bulls.png", accent: "#1c7f66", href: "/north-iowa-bulls" },
  { name: "Ogden Raptors", count: 21, kind: "team", logo: "/clients/raptors.svg", accent: "#007b85", href: "/ogden-raptors", match: "Raptors", fresh: 1 },
  { name: "Aggie Memorial Stadium", count: 7, kind: "venue" },
  { name: "Pan American Center", count: 14, kind: "venue" },
  { name: "NMSU Soccer Field", count: 9, kind: "venue" },
  { name: "Meridian Centre", count: 12, kind: "venue" },
  { name: "Lindquist Field", count: 6, kind: "venue" },
  { name: "Rio Grande Theatre", count: 5, kind: "venue" },
  { name: "Presley Askew Field", count: 8, kind: "venue" },
];



export const hrefFor = (kind: Kind, slug: string) => (kind === "seated" ? `/e/${slug}/W50prW0I/tickets` : `/e/${slug}/KpIeUYbz`);
