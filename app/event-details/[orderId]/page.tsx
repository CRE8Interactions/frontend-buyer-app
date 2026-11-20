"use client";

import { useParams } from "next/navigation";
import EventTicketsClient from "@/components/organisms/EventTicketsClient";

export default function EventDetailsByOrderPage() {
  const params = useParams<{ orderId: string }>();
  return <EventTicketsClient orderId={params.orderId} />;
}
