"use client";

import PremiumTicketing, { NM_STATE_DATA } from "@/components/organisms/PremiumTicketing";

// Reference showcase of the Claude Design "NM State Ticketing" page.
export default function NMStateTicketingPage() {
  return <PremiumTicketing data={NM_STATE_DATA} />;
}
