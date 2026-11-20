import { Geist } from "next/font/google";
import Nav from "../../concept/Nav";
import { CSS } from "../../concept/styles";
import TierColorOptions from "@/components/organisms/TierColorOptions";
import { BUYER_EMAIL } from "@/lib/walletDemo";

export const metadata = { title: "Card colours | Blocktickets" };

const sans = Geist({ subsets: ["latin"], display: "swap" });

/* A review page for the membership card colours: every option for each step, side by side. */
export default function TierColorsPage() {
  return (
    <div className={`n ${sans.className}`}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <Nav variant="user" account={{ name: "Jordan Reyes", email: BUYER_EMAIL }} />
      <TierColorOptions />
    </div>
  );
}
