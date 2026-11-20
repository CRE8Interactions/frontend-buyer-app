"use client";

import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Button: the brand button as a component, built on the shadcn Button variants (components/ui/button.tsx).
 * Renders an <a> when `href` is given, otherwise a <button>.
 * Green (`primary`) is the one-per-viewport CTA, see DESIGN-SYSTEM.md section 2.
 */

type Variant = "primary" | "secondary" | "tertiary" | "outline" | "ghost" | "danger" | "danger-soft" | "glass";
type Size = "md" | "sm" | "lg";

type CommonProps = {
  variant?: Variant;
  size?: Size;
  /** Square (round) icon-only button at the same size. Give it an aria-label. */
  iconOnly?: boolean;
  className?: string;
};

type AnchorProps = CommonProps & AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };
type NativeProps = CommonProps & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

export type ButtonProps = AnchorProps | NativeProps;

const SIZE = { md: "md", sm: "sm", lg: "lg" } as const;
const ICON_SIZE = { md: "icon", sm: "icon-sm", lg: "icon-lg" } as const;

export default function Button({ variant = "primary", size = "md", iconOnly = false, className, ...rest }: ButtonProps) {
  const cls = cn(buttonVariants({ variant, size: iconOnly ? ICON_SIZE[size] : SIZE[size] }), className);
  if (rest.href !== undefined) {
    const { children, ...a } = rest as AnchorProps;
    return <a data-slot="button" data-variant={variant} {...a} className={cls}>{children}</a>;
  }
  const { type = "button", ...btn } = rest as NativeProps;
  const { children, ...b } = btn;
  return <button data-slot="button" type={type} {...b} className={cls}>{children}</button>;
}
