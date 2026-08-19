import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Browse Events — Blocktickets",
  description:
    "Find tickets to upcoming events, organizations, and experiences on Blocktickets.",
  path: "/browse/",
  ogHeadline: "Browse upcoming events",
  subtitle: "Find tickets near you",
  cta: "Browse Tickets",
});

export default function BrowseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
