import { Suspense } from "react";
import SeasonTickets from "@/components/organisms/SeasonTickets";
import MyTicketsAuthGuard from "@/components/templates/MyTicketsAuthGuard";

/**
 * Keep one wallet instance across every section route under /wallet — tickets
 * and their event / package / flex-pack detail pages, transfers, listings,
 * giving, and profile — so switching sections changes the URL without remounting
 * the wallet or refetching orders.
 */
export default function WalletLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MyTicketsAuthGuard>
      <Suspense>
        <SeasonTickets />
      </Suspense>
      {children}
    </MyTicketsAuthGuard>
  );
}
