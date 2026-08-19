import type { ReactNode } from "react";
import Eyebrow from "@/components/atoms/Eyebrow";

/**
 * SectionHeader — eyebrow + section heading + lede, with the standard
 * spacing rhythm. Max-widths are inline styles so they stay prop-driven.
 */
export default function SectionHeader({
  eyebrow,
  eyebrowTracking,
  title,
  titleMax,
  lede,
  ledeMax,
}: {
  eyebrow?: ReactNode;
  eyebrowTracking?: string;
  title: ReactNode;
  /** e.g. "760px" */
  titleMax?: string;
  lede?: ReactNode;
  /** e.g. "660px" */
  ledeMax?: string;
}) {
  return (
    <>
      {eyebrow && <Eyebrow tracking={eyebrowTracking}>{eyebrow}</Eyebrow>}
      <h2 className={`h2 ${eyebrow ? "mt-3" : ""}`} style={titleMax ? { maxWidth: titleMax } : undefined}>
        {title}
      </h2>
      {lede && (
        <p className="lede mt-4" style={ledeMax ? { maxWidth: ledeMax } : undefined}>
          {lede}
        </p>
      )}
    </>
  );
}
