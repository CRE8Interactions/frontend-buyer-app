import SeasonTickets from "@/components/organisms/SeasonTickets";

export const metadata = {
  title: "My Tickets — NM State Season Tickets | Blocktickets",
};

export default async function MyTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ login?: string }>;
}) {
  const sp = await searchParams;
  return <SeasonTickets initialScreen={sp?.login !== undefined ? "login" : "events"} />;
}
