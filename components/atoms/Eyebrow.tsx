import type { ReactNode } from "react";

/** Eyebrow — 12px uppercase tracked label above headings (`.eyebrow`). */
export default function Eyebrow({
  tracking,
  className = "",
  children,
}: {
  /** Override letter-spacing, e.g. "0.2em" (default 0.16em from CSS). */
  tracking?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`eyebrow ${className}`} style={tracking ? { letterSpacing: tracking } : undefined}>
      {children}
    </div>
  );
}
