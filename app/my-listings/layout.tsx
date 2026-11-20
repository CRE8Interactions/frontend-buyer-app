import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "My Listings — Blocktickets",
  description: "Manage your ticket listings on Blocktickets.",
  path: "/my-listings/",
  noIndex: true,
});

export default function MyListingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
