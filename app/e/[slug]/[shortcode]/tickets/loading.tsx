import TeamShell from "@/app/[slug]/shell";
import { EV_CSS } from "./styles";
import type { Team } from "@/app/[slug]/teams";

/* While the game is on its way, the page already stands: the same navigation, the same footer and the stage's own shape in the stage's own colours.
   There is no spinner, no logo and no message, so nothing here has to be taken away when the game arrives. It replaces the app-wide launch loader
   for this route only. */
const QUIET: Team = { slug: "event", name: "Blocktickets", city: "", color: "#1f419c", logo: "/blocktickets-logo.svg", crest: "/blocktickets-logo.svg", photo: "", venueHref: "", months: {}, featured: [], events: [], passes: [], flex: [] };

export default function Loading() {
  return (
    <TeamShell team={QUIET} gate="none">
      <style dangerouslySetInnerHTML={{ __html: EV_CSS }} />
      <div className="ev">
        <div className="ev-wrap">
          <div className="tm-hero ev-stage" aria-hidden>
            <div className="tm-bg"><span className="tm-a" /><span className="tm-scrim" /></div>
          </div>
        </div>
      </div>
    </TeamShell>
  );
}
