import type { ReactNode } from "react";
import MarketingPage from "@/components/templates/MarketingPage";

/** LegalPage — MarketingPage chrome + narrow prose column for policy docs. */
export default function LegalPage({
  title,
  updated = "May 25, 2022",
  children,
}: {
  title: string;
  updated?: string;
  children: ReactNode;
}) {
  return (
    <MarketingPage>
      <article className="container-x legal-doc max-w-[760px] py-16 sm:py-20 lg:py-24">
        <p className="eyebrow">{`Last updated: ${updated}`}</p>
        <h1 className="mt-4 text-[clamp(32px,4.5vw,48px)] font-semibold leading-[1.08] tracking-[-0.025em] text-white">
          {title}
        </h1>
        <div className="mt-8">{children}</div>
      </article>
    </MarketingPage>
  );
}
