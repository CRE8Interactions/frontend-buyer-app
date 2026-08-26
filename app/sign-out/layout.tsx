import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Signed out — Blocktickets",
  description: "You have been signed out of your Blocktickets wallet.",
  path: "/sign-out/",
  noIndex: true,
});

export default function SignOutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
