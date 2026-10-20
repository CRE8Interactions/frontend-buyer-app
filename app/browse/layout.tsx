import type { Metadata } from "next";
import {
  BROWSE_PAGE_DESCRIPTION,
  BROWSE_PAGE_OG_TITLE,
  BROWSE_PAGE_TITLE,
  DEFAULT_OG_IMAGE,
  pageMetadata,
} from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: BROWSE_PAGE_TITLE,
  ogTitle: BROWSE_PAGE_OG_TITLE,
  description: BROWSE_PAGE_DESCRIPTION,
  path: "/browse/",
  image: DEFAULT_OG_IMAGE,
  keywords: BROWSE_PAGE_DESCRIPTION,
  exactCopy: true,
});

export default function BrowseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
