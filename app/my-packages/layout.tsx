import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "My Packages — Blocktickets",
  description: "View your season packages on Blocktickets.",
  path: "/my-packages/",
  noIndex: true,
});

export default function MyPackagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
