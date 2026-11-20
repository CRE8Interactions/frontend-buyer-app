import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Log in — blocktickets",
  description: "Sign in to blocktickets to manage your tickets, transfers, and account.",
  path: "/login/",
  noIndex: true,
});

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
