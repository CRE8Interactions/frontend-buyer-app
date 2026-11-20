import TeamShell from "../[slug]/shell";
import FlexStudio from "../[slug]/FlexStudio";
import { TEAMS, DEFAULT_TEAM } from "../[slug]/teams";

export const metadata = {
  title: "Flex Pack — NM State Athletics | Blocktickets",
};

export default function FlexPackPage() {
  const team = TEAMS[DEFAULT_TEAM];
  return (
    <TeamShell team={team}>
      <FlexStudio team={team} />
    </TeamShell>
  );
}
