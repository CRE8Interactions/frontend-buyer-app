"use client";

import { useEffect, useState } from "react";
import { getCart } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { isCartGoneResponse } from "@/lib/helpers";

export const CART_KEY = "cart";
export const CART_EVENT = "blocktickets:cart";

export type StoredCart = {
  cartId: string;
  itemCount?: number;
};

type CartLike = {
  id?: string | number;
  tickets?: unknown[];
  package?: { events?: unknown[] } | null;
  flex_pack?: { gameTickets?: number } | null;
  access_pass_template?: unknown | null;
};

export function countCartItems(cart: CartLike | null | undefined): number {
  if (!cart) return 0;
  if (cart.access_pass_template) return 1;
  if (cart.flex_pack) return Number(cart.flex_pack.gameTickets || 0) || 1;
  if (cart.package) return cart.package.events?.length || 1;
  return cart.tickets?.length || 0;
}

export function getStoredCart(): StoredCart | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CART_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { cartId?: string | number; itemCount?: number };
    if (parsed?.cartId == null || parsed.cartId === "") return null;
    const itemCount =
      typeof parsed.itemCount === "number" && parsed.itemCount > 0
        ? parsed.itemCount
        : undefined;
    return { cartId: String(parsed.cartId), itemCount };
  } catch {
    return null;
  }
}

function emitCartChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CART_EVENT));
}

export function setStoredCart(cartId: string | number, itemCount?: number) {
  const next: StoredCart = { cartId: String(cartId) };
  if (typeof itemCount === "number" && itemCount > 0) next.itemCount = itemCount;
  const prev = getStoredCart();
  if (
    prev?.cartId === next.cartId &&
    (prev.itemCount ?? 0) === (next.itemCount ?? 0)
  ) {
    return;
  }
  sessionStorage.setItem(CART_KEY, JSON.stringify(next));
  emitCartChange();
}

export function clearStoredCart() {
  sessionStorage.removeItem(CART_KEY);
  emitCartChange();
}

/** Live cart badge state for header chrome. */
export function useCartBadge() {
  const { ready: authReady, isAuthenticated } = useAuth();
  const [cart, setCart] = useState<StoredCart | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const syncLocal = () => setCart(getStoredCart());
    syncLocal();
    setReady(true);

    const onStorage = (e: StorageEvent) => {
      if (e.key === CART_KEY || e.key === null) syncLocal();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(CART_EVENT, syncLocal);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(CART_EVENT, syncLocal);
    };
  }, []);

  useEffect(() => {
    const cartId = cart?.cartId;
    if (!authReady || !isAuthenticated || !cartId) return;

    let cancelled = false;
    getCart(cartId)
      .then((res) => {
        if (cancelled) return;
        const data = res.data as CartLike | null;
        if (!data?.id) {
          clearStoredCart();
          return;
        }
        const itemCount = countCartItems(data);
        if (itemCount <= 0) {
          clearStoredCart();
          return;
        }
        setStoredCart(data.id, itemCount);
      })
      .catch((err) => {
        if (cancelled) return;
        // 404/410: cart is gone — drop the ghost badge. Other failures keep
        // the cached count so transient API blips don't hide a live cart.
        if (isCartGoneResponse(err)) clearStoredCart();
      });

    return () => {
      cancelled = true;
    };
  }, [authReady, isAuthenticated, cart?.cartId]);

  const itemCount = cart?.itemCount ?? 0;
  const href = cart?.cartId
    ? `/checkout/?cartId=${encodeURIComponent(cart.cartId)}`
    : "/checkout/";

  return {
    ready,
    cartId: cart?.cartId ?? null,
    itemCount,
    href,
    hasCart: Boolean(
      authReady && isAuthenticated && cart?.cartId && itemCount > 0,
    ),
  };
}
