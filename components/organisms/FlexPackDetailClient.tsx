"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import AppShell from "@/components/templates/AppShell";
import BackChip from "@/components/molecules/BackChip";
import EmptyState from "@/components/molecules/EmptyState";
import PageSkeleton from "@/components/molecules/PageSkeleton";
import { cardCls } from "@/components/molecules/Card";
import { deckColour } from "@/lib/flex-deck";
import Button from "@/components/atoms/Button";
import { ArrowRight } from "@/components/atoms/icons";
import { getFlexPack, placeFlexPackIntoCart } from "@/lib/api";
import { useAuth, setLastKnown } from "@/lib/auth";
import { setStoredCart } from "@/lib/cart";
import {
  formatCurrency,
  formatEventWhen,
  getSingularOrPluralWord,
  imageUrl,
} from "@/lib/helpers";

type FlexPack = {
  id: number | string;
  uuid?: string;
  name?: string;
  description?: string;
  price?: number;
  gameTickets?: number;
  start?: string;
  end?: string;
  isSoldOut?: boolean;
  image?: { url?: string };
  venue?: { name?: string; slug?: string; timezone?: string };
  organization?: { name?: string; slug?: string };
};

/** Shared flex pack detail + add-to-cart for org and venue routes. */
export default function FlexPackDetailClient({
  uuid,
  backHref,
}: {
  uuid: string;
  backHref: string;
}) {
  const { isAuthenticated, ready } = useAuth();
  const [flexPack, setFlexPack] = useState<FlexPack | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getFlexPack(uuid)
      .then((res) => {
        if (cancelled) return;
        const data = res.data;
        const pack = Array.isArray(data) ? data[0] : data;
        setFlexPack((pack as FlexPack) ?? null);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load this flex pack.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [uuid]);

  const goLogin = () => {
    const from = window.location.pathname + window.location.search;
    setLastKnown(from);
    window.location.href = `/login/?from=${encodeURIComponent(from)}`;
  };

  const buy = async () => {
    if (!flexPack) return;
    if (!ready) return;
    if (!isAuthenticated) {
      goLogin();
      return;
    }
    if (flexPack.isSoldOut) return;

    setBuying(true);
    setError("");
    try {
      const res = await placeFlexPackIntoCart(flexPack.id);
      const cartId =
        (res.data as { id?: string | number; cartId?: string | number })?.id ??
        (res.data as { cartId?: string | number })?.cartId;
      if (cartId != null) {
        setStoredCart(cartId, Number(flexPack.gameTickets || 0) || 1);
        window.location.href = `/checkout/?cartId=${encodeURIComponent(String(cartId))}`;
        return;
      }
      setError("Cart could not be created. Please try again.");
    } catch {
      setError("Unable to add flex pack to cart.");
    } finally {
      setBuying(false);
    }
  };

  const reduce = !!useReducedMotion();
  const timezone = flexPack?.venue?.timezone;
  const windowLabel =
    flexPack?.start && flexPack?.end
      ? `${formatEventWhen(flexPack.start, timezone, "MMM D, YYYY")} – ${formatEventWhen(flexPack.end, timezone, "MMM D, YYYY")}`
      : "";
  const count = Number(flexPack?.gameTickets ?? 0);
  const each = flexPack?.price && count ? flexPack.price / count : 0;
  /* the deck takes the colour the pack names (description first, then its name); otherwise the brand red of the team pages */
  const tint = flexPack ? deckColour(flexPack.description, flexPack.name) ?? { t: "#b3202a", t2: "#e8584f", on: "#fff" } : { t: "#b3202a", t2: "#e8584f", on: "#fff" };
  const shown = Math.min(Math.max(count, 2), 8);
  const description = flexPack?.description && flexPack.description !== "None" ? flexPack.description : "";
  const label = flexPack?.isSoldOut ? "Sold out" : buying ? "Adding…" : isAuthenticated ? "Add to cart" : "Log in to buy";
  const steps = [
    ["Buy the pack", "One purchase, one price, and every voucher is yours to use."],
    ["Pick the games later", "Choose any game in the window when you know your plans."],
    ["Spend them your way", "One a night, or all of them on the same night."],
  ];

  return (
    <AppShell>
      <div className="mx-auto max-w-[1040px] pb-20">
        <BackChip href={backHref} />

        {loading ? (
          <PageSkeleton variant="detail" message="Loading flex pack…" label="Loading flex pack" className="mt-10 min-h-[30vh]" />
        ) : !flexPack ? (
          <div className="mt-10">
            <EmptyState
              icon={
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <path d="M4 8h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z" />
                  <path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              }
            >
              Flex pack not found.
            </EmptyState>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-6">
            <div className="grid gap-5">
              {/* the stage: the deck of vouchers in the pack's colour, its name and what it covers */}
              <section className={`${cardCls} overflow-hidden`} aria-labelledby="fp-title">
                <motion.div
                  className="group relative grid h-[230px] items-end justify-items-center overflow-hidden sm:h-[280px]"
                  style={{ background: `radial-gradient(70% 90% at 50% 105%, ${tint.t}55, transparent 70%), linear-gradient(180deg, ${tint.t}1f, transparent)` }}
                  initial="rest"
                  animate="rest"
                  whileHover="hover"
                >
                  <div className="relative mb-10 h-[150px] w-[104px] sm:mb-12 sm:h-[176px] sm:w-[122px]" aria-hidden>
                    {Array.from({ length: shown }, (_, k) => {
                      const a = (k - (shown - 1) / 2) * (shown > 5 ? 5.5 : 8);
                      return (
                        <motion.i
                          key={k}
                          className="absolute inset-0 rounded-[18px]"
                          style={{
                            transformOrigin: "50% 135%",
                            background: `linear-gradient(170deg, ${tint.t2}, ${tint.t})`,
                            boxShadow: "0 0 0 1px rgba(0,0,0,.22), 0 10px 24px rgba(0,0,0,.28)",
                          }}
                          variants={{ rest: { rotate: a, y: 0 }, hover: { rotate: a * 1.5, y: -6 } }}
                          initial={reduce ? false : { rotate: 0, y: 18, opacity: 0 }}
                          animate={{ rotate: a, y: 0, opacity: 1 }}
                          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 26, delay: k * 0.03 }}
                        >
                          <span className="absolute inset-[9px] rounded-[11px] border-[1.5px] border-dashed" style={{ borderColor: `${tint.on}66` }} />
                          <span className="absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ boxShadow: `inset 0 0 0 2px ${tint.on}99, inset 0 0 0 11px transparent, inset 0 0 0 17px ${tint.on}99` }} />
                        </motion.i>
                      );
                    })}
                  </div>
                </motion.div>

                <div className="p-5 sm:p-7">
                  {flexPack.organization?.name && (
                    <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink2">{flexPack.organization.name.trim()}</p>
                  )}
                  <h1 id="fp-title" className="mt-1.5 text-[clamp(28px,4vw,42px)] font-semibold leading-[1.05] tracking-[-0.03em]">
                    {flexPack.name}
                  </h1>
                  <ul className="mt-4 flex flex-wrap gap-2 text-[13.5px] text-foreground/90">
                    {[
                      `${count} ${getSingularOrPluralWord(count, "voucher")}`,
                      windowLabel && `Valid ${windowLabel}`,
                      flexPack.venue?.name,
                    ].filter(Boolean).map((t) => (
                      <li key={String(t)} className="rounded-full bg-foreground/[0.07] px-3.5 py-1.5 font-medium">{t}</li>
                    ))}
                  </ul>
                  {description && (
                    <p className="mt-5 max-w-[60ch] text-[15.5px] leading-relaxed text-ink3">{description}</p>
                  )}
                </div>
              </section>

              <section className={`${cardCls} p-5 sm:p-7`} aria-labelledby="fp-how">
                <h2 id="fp-how" className="text-[18px] font-semibold tracking-[-0.02em]">How flex packs work</h2>
                <ol className="mt-4 grid gap-4 sm:grid-cols-3 sm:gap-5">
                  {steps.map(([t, d], i) => (
                    <li key={t} className="flex gap-3 sm:block">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-foreground/[0.08] text-[13px] font-semibold tabular-nums">{i + 1}</span>
                      <div>
                        <p className="font-semibold sm:mt-3">{t}</p>
                        <p className="mt-1 text-[14px] leading-snug text-ink2">{d}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            </div>

            {/* the purchase: price first, then the one action */}
            <aside className={`${cardCls} p-5 sm:p-6 lg:sticky lg:top-6`} aria-label="Buy this pack">
              <p className="text-[13px] text-ink2">Pack price</p>
              <p className="mt-1 text-[44px] font-semibold leading-none tracking-[-0.04em] tabular-nums">{formatCurrency(flexPack.price)}</p>
              {each > 0 && <p className="mt-2 text-[14px] text-ink2 tabular-nums">{formatCurrency(each)} per voucher</p>}
              <dl className="mt-5 grid gap-3 border-t border-dashed border-foreground/15 pt-5 text-[14px]">
                <div className="flex justify-between gap-4"><dt className="text-ink2">Vouchers</dt><dd className="font-semibold tabular-nums">{count}</dd></div>
                {windowLabel && <div className="flex justify-between gap-4"><dt className="text-ink2">Valid</dt><dd className="text-right font-semibold">{windowLabel}</dd></div>}
              </dl>
              <Button onClick={buy} disabled={buying || flexPack.isSoldOut} className="mt-6 w-full disabled:cursor-not-allowed disabled:opacity-40">
                {label} {!flexPack.isSoldOut && <ArrowRight />}
              </Button>
              {error && (
                <p className="mt-4 text-[14px] text-destructive" role="alert">
                  {error}
                </p>
              )}
            </aside>
          </div>
        )}
      </div>
    </AppShell>
  );
}
