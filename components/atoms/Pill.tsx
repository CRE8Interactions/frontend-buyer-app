import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

/**
 * Pill: small rounded-full status/label chip, a thin wrapper over the shadcn Badge (components/ui/badge.tsx).
 * `accent` (green) counts against the green budget: actives, live states, ticket counts.
 * `neutral` is the quiet informational chip.
 */
export default function Pill({
  variant = "accent",
  size = "md",
  className,
  children,
}: {
  variant?: "accent" | "success" | "warning" | "neutral";
  size?: "sm" | "md";
  className?: string;
  children: ReactNode;
}) {
  return (
    <Badge variant={variant} size={size === "sm" ? "sm" : "default"} className={className}>
      {children}
    </Badge>
  );
}
