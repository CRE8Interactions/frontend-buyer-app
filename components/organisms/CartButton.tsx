"use client";

import Link from "next/link";
import { useCartBadge } from "@/lib/cart";

function CartIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="18" cy="20" r="1.5" />
      <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.5L21 8H7" />
    </svg>
  );
}

/**
 * Header cart control — sits beside My wallet when the session cart has tickets.
 */
export default function CartButton({ className = "" }: { className?: string }) {
  const { hasCart, itemCount, href } = useCartBadge();

  if (!hasCart) return null;

  const label = `Cart, ${itemCount} item${itemCount === 1 ? "" : "s"}`;

  return (
    <Link
      href={href}
      aria-label={label}
      className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/15 text-[#F4F4F5] transition-colors hover:bg-white/5 ${className}`}
    >
      <CartIcon />
      <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#A6E773] px-1 text-[10px] font-bold leading-none text-[#051B35]">
        {itemCount > 99 ? "99+" : itemCount}
      </span>
    </Link>
  );
}
