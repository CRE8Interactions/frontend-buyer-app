import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";
import Link from "next/link";

/**
 * Button — the `.btn` system (globals.css) as a component.
 * Renders Next.js Link for in-app hrefs, an <a> for external URLs, otherwise a <button>.
 * Green (`primary`) is the one-per-viewport CTA — see DESIGN-SYSTEM.md §2.
 */

type Variant = "primary" | "outline" | "ghost";
type Size = "md" | "sm";

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
};

type AnchorProps = CommonProps & AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };
type NativeProps = CommonProps & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

export type ButtonProps = AnchorProps | NativeProps;

export default function Button({ variant = "primary", size = "md", className = "", ...rest }: ButtonProps) {
  const cls = ["btn", `btn-${variant}`, size === "sm" ? "btn-sm" : "", className].filter(Boolean).join(" ");
  if (rest.href !== undefined) {
    const { href, ...anchorRest } = rest as AnchorProps;
    if (href.startsWith("/") || href.startsWith("#")) {
      return <Link href={href} {...anchorRest} className={cls} />;
    }
    return <a href={href} {...anchorRest} className={cls} />;
  }
  const { type = "button", ...btn } = rest as NativeProps;
  return <button type={type} {...btn} className={cls} />;
}
