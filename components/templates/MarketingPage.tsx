import type { ReactNode } from "react";
import Nav from "@/components/organisms/Nav";
import SiteFooter from "@/components/organisms/SiteFooter";

/** MarketingPage — chrome for every marketing page: Nav on top, slim SiteFooter below. */
export default function MarketingPage({ children }: { children: ReactNode }) {
  return (
    <>
      <Nav variant="marketing" />
      <main>{children}</main>
      <SiteFooter />
    </>
  );
}
