import type { ReactNode } from "react";

/**
 * Section — standard marketing section: hairline top border, contained
 * content, section rhythm padding, optional ambient Glow behind (pass a
 * positioned <Glow /> via `glow`). See DESIGN-SYSTEM.md §4.
 */
export default function Section({
  id,
  glow,
  pad = "py-20 lg:py-24",
  borderTop = true,
  overflowHidden = true,
  className = "",
  children,
}: {
  id?: string;
  glow?: ReactNode;
  pad?: string;
  borderTop?: boolean;
  /** Disable for sections with sticky scroll-scrub content (breaks sticky). */
  overflowHidden?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={`relative ${overflowHidden ? "overflow-hidden" : ""} ${borderTop ? "border-t border-white/10" : ""} ${className}`}
    >
      {glow}
      <div className={`container-x relative ${pad}`}>{children}</div>
    </section>
  );
}
