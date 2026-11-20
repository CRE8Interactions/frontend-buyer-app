import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "My Transfers — Blocktickets",
  description: "View and manage ticket transfers on Blocktickets.",
  path: "/my-transfers/",
  noIndex: true,
});

export default function MyTransfersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
