"use client";

import { Suspense } from "react";
import SmsTicketsClient from "@/components/organisms/SmsTickets/SmsTicketsClient";

export default function SmsTicketsPage() {
  return (
    <Suspense fallback={<p>Loading your tickets</p>}>
      <SmsTicketsClient />
    </Suspense>
  );
}
