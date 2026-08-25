import { Suspense } from "react";
import SeasonTickets from "@/components/organisms/SeasonTickets";
import MyTicketsAuthGuard from "@/components/templates/MyTicketsAuthGuard";

export const metadata = {
  title: "My Tickets — NM State Season Tickets | Blocktickets",
};

/**
 * Keep one wallet instance across /my-tickets, /my-tickets/event/:id, and
 * /my-tickets/flex-pack/:id so Back does not remount the list or refetch orders.
 */
export default function MyTicketsLayout({
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
