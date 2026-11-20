import TeamShell from "../[slug]/shell";
import SeasonStudio from "../[slug]/SeasonStudio";
import { loadTeam } from "../[slug]/live-team";
import { TEAMS, DEFAULT_TEAM } from "../[slug]/teams";

export const metadata = {
  title: "Season Tickets — NM State Athletics | Blocktickets",
};

export default async function SeasonTicketsPage() {
  /* the team and its games come from the storefront API (the design file is the fallback when it does not answer) */
  const team = (await loadTeam("nm-state-athletics")) ?? TEAMS[DEFAULT_TEAM];
  return (
    <TeamShell team={team} gate="season">
      <SeasonStudio team={team} />
    </TeamShell>
  );
}
