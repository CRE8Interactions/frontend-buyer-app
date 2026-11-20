"use client";

import { useParams } from "next/navigation";
import EventTicketsClient from "@/components/organisms/EventTicketsClient";

/** Alias used by bulk/scalper wallet flows — loads by event UUID. */
export default function MyEventsEventDetailsPage() {
  const params = useParams<{ eventUUID: string }>();
  return <EventTicketsClient eventUUID={params.eventUUID} />;
}
