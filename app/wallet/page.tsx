import type { Viewport } from "next";
import { Geist } from "next/font/google";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Nav from "../concept/Nav";
import { CSS } from "../concept/styles";
import { TICKET_STRIP_CSS } from "@/components/organisms/ticket-strip-styles";
import { EVENT_TILE_CSS } from "@/components/organisms/event-tile-styles";
import { PACK_CARDS_CSS } from "@/components/organisms/pack-cards-styles";
import Wallet from "@/components/organisms/Wallet";
import { BUYER_EMAIL } from "@/lib/walletDemo";

/* Phone baseline: viewport-fit=cover lets the page run under the notch (the dock pads itself with env(safe-area-inset-bottom), which is 0 without it),
   interactive-widget keeps bottom-pinned UI above the keyboard, and the bar colour follows the scheme. Zoom stays on. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#ffffff" }, { media: "(prefers-color-scheme: dark)", color: "#0b0b0c" }],
};

export const metadata = {
  title: "My Wallet | Blocktickets",
};

const sans = Geist({ subsets: ["latin"], display: "swap" });

/* /wallet: the site's ticket-buyer bar (palette search, theme, account menu) over the wallet. The wallet is a demo, so the account
   menu is given the sample buyer; the login screens show the bar signed out. */
export default async function WalletPage({
  searchParams,
}: {
  searchParams: Promise<{ login?: string }>;
}) {
  const sp = await searchParams;
  const signedIn = (await cookies()).get("bt-session")?.value === "1";
  /* No demo session (or an old ?login link) sends the visitor to the redesigned /login page, which brings them back here. */
  if (sp?.login !== undefined || !signedIn) redirect("/login?from=%2Fwallet");
  const login = false;
  return (
    <div className={`n ${sans.className}`}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      {/* the same ticket row as Browse and the team pages, with the motion curves it expects, and a mark for the chosen row. */}
      <style dangerouslySetInnerHTML={{ __html: `.n{--land:cubic-bezier(.34,1.3,.64,1);--out:cubic-bezier(.23,1,.32,1)}${TICKET_STRIP_CSS}${EVENT_TILE_CSS}${PACK_CARDS_CSS}.tk[data-on="1"]{box-shadow:inset 0 0 0 2px rgb(var(--ink-rgb) / .55)}.wl-list{display:grid;gap:12px;list-style:none;margin:0;padding:0}.n button,.n [role=button],.n a,.n summary{-webkit-tap-highlight-color:transparent;touch-action:manipulation}.n{-webkit-text-size-adjust:100%}@media(pointer:coarse){.n input,.n textarea,.n select{font-size:16px}}` }} />
      <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('concept-theme');if(t==='light'||t==='dark')document.documentElement.dataset.nt=t}catch(e){}" }} />
      <Nav variant="user" account={login ? undefined : { name: "Jordan Reyes", email: BUYER_EMAIL }} />
      <Wallet initialScreen={login ? "login" : "events"} />
    </div>
  );
}
