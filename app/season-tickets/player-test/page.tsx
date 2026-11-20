import TeamShell from "../../[slug]/shell";
import { loadTeam } from "../../[slug]/live-team";
import { TEAMS, DEFAULT_TEAM } from "../../[slug]/teams";
import PlayerTest from "./PlayerTest";

export const metadata = { title: "WebGL seat map test — Niagara IceDogs | Blocktickets", robots: { index: false } };

/* A hardcoded test of the WebGL map player (public/maps-2d) inside the season seat scene. The live season page is untouched. */
export default async function Page() {
  const base = (await loadTeam("niagara-icedogs")) ?? TEAMS[DEFAULT_TEAM];
  const team = { ...base, name: "Niagara IceDogs" };
  return (
    <TeamShell team={team}>
      <PlayerTest team={team} />
    </TeamShell>
  );
}
