import type { Metadata } from "next";
import { groupInvitePageMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ groupCode: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { groupCode } = await params;
  return groupInvitePageMetadata(groupCode);
}

export default function GroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
