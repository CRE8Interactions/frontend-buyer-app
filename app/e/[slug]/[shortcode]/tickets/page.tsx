import { notFound } from "next/navigation";
import TeamShell from "@/app/[slug]/shell";
import { EV_CSS } from "./styles";
import EventStudio from "./EventStudio";
import { loadEvent, teamOf } from "./event";

/* The ticket page for one game. It is filled on the server, so the first HTML already holds the game and there is nothing to wait behind: the
   branded full-screen loader this page used to show is gone. The previous page (PremiumTicketing, with the loader) is still used by the
   general-admission page at /e/<slug>/<code>. */
export default async function EventTicketsPage({ params, searchParams }: { params: Promise<{ slug: string; shortcode: string }>; searchParams: Promise<{ code?: string | string[] }> }) {
  const { slug, shortcode } = await params;
  const { code } = await searchParams;
  const info = await loadEvent(slug, shortcode, typeof code === "string" ? code : "0");
  if (!info) notFound();
  const team = teamOf(info);
  return (
    <TeamShell team={team} gate="none">
      <style dangerouslySetInnerHTML={{ __html: EV_CSS }} />
      <EventStudio info={info} team={team} />
    </TeamShell>
  );
}
