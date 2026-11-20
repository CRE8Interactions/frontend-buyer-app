import TeamShell from "../../[slug]/shell";
import TeamStudio from "../../[slug]/TeamStudio";
import { getVenue } from "../../[slug]/teams";

type Props = { params: Promise<{ slug: string }> };

export default async function VenuePage({ params }: Props) {
  const { slug } = await params;
  const v = getVenue(slug);
  return (
    <TeamShell team={v.team}>
      <TeamStudio key={slug} team={v.team} venue={{ name: v.name, info: v.info, events: v.events }} />
    </TeamShell>
  );
}
