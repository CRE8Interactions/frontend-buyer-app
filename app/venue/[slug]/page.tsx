"use client";

import { useParams } from "next/navigation";
import VenueProfile from "@/components/organisms/VenueProfile";

export default function VenuePage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  return <VenueProfile key={slug} slug={slug} />;
}
