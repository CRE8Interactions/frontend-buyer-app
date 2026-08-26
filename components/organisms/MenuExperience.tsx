"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import Button from "@/components/atoms/Button";
import Spinner from "@/components/atoms/Spinner";
import PageLoader from "@/components/molecules/PageLoader";
import Modal from "@/components/molecules/Modal";
import { cardCls } from "@/components/molecules/Card";
import { Input, Label } from "@/components/atoms/form";
import {
  createPublicMenuPaymentIntent,
  getPublicMenu,
  getPublicMenuPricing,
  submitPublicMenuOrder,
} from "@/lib/api";
import { formatCurrency } from "@/lib/helpers";

type MenuItem = {
  id: string | number;
  name?: string;
  description?: string;
  price: number;
  categoryId?: string | number;
  available?: boolean;
};

type MenuCategory = {
  id: string | number;
  name?: string;
  displayOrder?: number;
};

function decodeMenuParam(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function visitKey(
  organizationUuid: string,
  menuKey: string,
  venueUuid: string,
  eventUuid: string,
) {
  return `menu-seat:${organizationUuid}:${venueUuid || "~"}:${eventUuid || "~"}:${menuKey}`;
}

function MenuPayForm({
  totalLabel,
  submitting,
  onSubmit,
}: {
  totalLabel: string;
  submitting: boolean;
  onSubmit: (intentId: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [ready, setReady] = useState(false);
  const [localError, setLocalError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || submitting) return;
    setLocalError("");
    const { error: submitError } = await elements.submit();
    if (submitError) {
      setLocalError(submitError.message || "Check your payment details.");
      return;
    }
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });
    if (error) {
      setLocalError(error.message || "Payment failed.");
      return;
    }
    if (paymentIntent?.status === "succeeded") onSubmit(paymentIntent.id);
    else setLocalError("Payment could not be completed.");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement onChange={(e) => setReady(Boolean(e.complete))} />
      {localError ? (
        <p className="text-[13px] text-red-400">{localError}</p>
      ) : null}
      <Button
        type="submit"
        className="w-full disabled:opacity-50"
        disabled={!stripe || !ready || submitting}
      >
        {submitting ? <Spinner size={18} /> : `Pay ${totalLabel}`}
      </Button>
    </form>
  );
}

export default function MenuExperience({
  organizationUuid,
  venueUuid = "",
  menuKey,
}: {
  organizationUuid: string;
  venueUuid?: string;
  menuKey: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventUuid =
    searchParams.get("event")?.trim() ||
    searchParams.get("eventUuid")?.trim() ||
    "";
  const menuKeyLabel = decodeMenuParam(menuKey);
  const rowFromQuery = searchParams.get("row")?.trim() ?? "";
  const seatFromQuery = searchParams.get("seat")?.trim() ?? "";

  const [rowName, setRowName] = useState(rowFromQuery);
  const [seatName, setSeatName] = useState(seatFromQuery);
  const [showGate, setShowGate] = useState(false);
  const [ready, setReady] = useState(false);
  const [accessMode, setAccessMode] = useState<"seat_delivery" | "pickup">(
    "seat_delivery",
  );
  const [gateRow, setGateRow] = useState(rowFromQuery);
  const [gateSeat, setGateSeat] = useState(seatFromQuery);
  const [gateError, setGateError] = useState("");
  const [rememberSeat, setRememberSeat] = useState(true);

  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState("");
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [pricing, setPricing] = useState<{ total?: number } | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<"review" | "payment">(
    "review",
  );
  const [clientSecret, setClientSecret] = useState("");
  const [paymentIntentId, setPaymentIntentId] = useState("");
  const [stripePromise, setStripePromise] = useState<Stripe | null>(null);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<{
    orderNumber?: string;
  } | null>(null);

  const isPickup = accessMode === "pickup";

  const buildMenuPath = useCallback(
    (row: string, seat: string) => {
      const params = new URLSearchParams();
      if (row) params.set("row", row);
      if (seat) params.set("seat", seat);
      if (eventUuid) params.set("event", eventUuid);
      const q = params.toString();
      const encoded = encodeURIComponent(menuKey);
      const base = venueUuid
        ? `/menu/${organizationUuid}/${encodeURIComponent(venueUuid)}/${encoded}/`
        : `/menu/${organizationUuid}/${encoded}/`;
      return q ? `${base}?${q}` : base;
    },
    [organizationUuid, venueUuid, menuKey, eventUuid],
  );

  useEffect(() => {
    if (!organizationUuid || !menuKey) return;
    let cancelled = false;
    getPublicMenu(organizationUuid, menuKey, "-", "-", {
      venueUuid: venueUuid || undefined,
      eventUuid: eventUuid || undefined,
    })
      .then((res) => {
        if (cancelled) return;
        setAccessMode(
          res?.data?.accessMode === "pickup" ? "pickup" : "seat_delivery",
        );
        setLocationName(res?.data?.location?.name || null);
      })
      .catch(() => {
        if (!cancelled) setAccessMode("seat_delivery");
      });
    return () => {
      cancelled = true;
    };
  }, [organizationUuid, menuKey, venueUuid, eventUuid]);

  useEffect(() => {
    if (!organizationUuid || !menuKey) return;

    if (accessMode === "pickup") {
      setShowGate(false);
      setReady(true);
      return;
    }

    if (rowFromQuery && seatFromQuery) {
      setRowName(rowFromQuery);
      setSeatName(seatFromQuery);
      setShowGate(false);
      setReady(true);
      return;
    }

    const remembered = sessionStorage.getItem(
      visitKey(organizationUuid, menuKey, venueUuid, eventUuid),
    );
    if (remembered) {
      try {
        const { row, seat } = JSON.parse(remembered);
        if (row && seat) {
          router.replace(buildMenuPath(row, seat));
          return;
        }
      } catch {
        sessionStorage.removeItem(
          visitKey(organizationUuid, menuKey, venueUuid, eventUuid),
        );
      }
    }

    setShowGate(true);
    setReady(true);
  }, [
    accessMode,
    organizationUuid,
    menuKey,
    venueUuid,
    eventUuid,
    rowFromQuery,
    seatFromQuery,
    router,
    buildMenuPath,
  ]);

  useEffect(() => {
    if (!ready || showGate) return;
    if (!isPickup && (!rowName || !seatName)) return;
    let cancelled = false;
    setMenuLoading(true);
    setMenuError("");
    getPublicMenu(
      organizationUuid,
      menuKey,
      isPickup ? "-" : rowName,
      isPickup ? "-" : seatName,
      { venueUuid: venueUuid || undefined, eventUuid: eventUuid || undefined },
    )
      .then((res) => {
        if (cancelled) return;
        setCategories(res.data?.categories || []);
        setItems(res.data?.items || []);
        setLocationName(res.data?.location?.name || null);
      })
      .catch(() => {
        if (!cancelled) setMenuError("Unable to load this menu.");
      })
      .finally(() => {
        if (!cancelled) setMenuLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    ready,
    showGate,
    isPickup,
    organizationUuid,
    menuKey,
    rowName,
    seatName,
    venueUuid,
    eventUuid,
  ]);

  const cartLines = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, quantity]) => {
          const item = items.find((row) => String(row.id) === id);
          if (!item) return null;
          return { item, quantity };
        })
        .filter(Boolean) as Array<{ item: MenuItem; quantity: number }>,
    [cart, items],
  );

  const cartCount = cartLines.reduce((s, l) => s + l.quantity, 0);
  const cartSubtotal = cartLines.reduce(
    (s, l) => s + l.item.price * l.quantity,
    0,
  );

  const buildOrderPayload = () => ({
    organizationUuid,
    sectionName: menuKey,
    venueUuid: venueUuid || undefined,
    eventUuid: eventUuid || undefined,
    fulfillmentType: isPickup ? "pickup" : "seat_delivery",
    rowName: isPickup ? undefined : rowName,
    seatName: isPickup ? undefined : seatName,
    items: cartLines.map(({ item, quantity }) => ({
      itemId: item.id,
      quantity,
    })),
  });

  useEffect(() => {
    if (!cartOpen || !cartLines.length) {
      setPricing(null);
      return;
    }
    let cancelled = false;
    getPublicMenuPricing(buildOrderPayload())
      .then((res) => {
        if (!cancelled) setPricing(res.data?.pricing ?? null);
      })
      .catch(() => {
        if (!cancelled) setPricing(null);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartOpen, cartLines, isPickup, rowName, seatName]);

  const visibleItems =
    activeCategory === "all"
      ? items
      : items.filter((i) => String(i.categoryId) === activeCategory);

  const sortedCategories = [...categories].sort(
    (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
  );

  const continueGate = (rowValue = gateRow, seatValue = gateSeat) => {
    const row = rowValue.trim();
    const seat = seatValue.trim();
    if (!row || !seat) {
      setGateError("Enter your row and seat.");
      return;
    }
    setGateError("");
    if (rememberSeat) {
      sessionStorage.setItem(
        visitKey(organizationUuid, menuKey, venueUuid, eventUuid),
        JSON.stringify({ row, seat }),
      );
    }
    router.push(buildMenuPath(row, seat));
  };

  const finalizeOrder = async (intentId?: string) => {
    const res = await submitPublicMenuOrder({
      ...buildOrderPayload(),
      paymentIntentId: intentId || undefined,
    });
    setConfirmation(res.data);
    setCart({});
    setCartOpen(false);
    setCheckoutStep("review");
    setClientSecret("");
    setPaymentIntentId("");
    setStripePromise(null);
  };

  const continueToPayment = async () => {
    if (!cartLines.length || loadingPayment || submitting) return;
    setLoadingPayment(true);
    setError("");
    try {
      const res = await createPublicMenuPaymentIntent(buildOrderPayload());
      const payment = res.data;
      if (payment.skipPayment) {
        setSubmitting(true);
        try {
          await finalizeOrder();
        } catch (err: unknown) {
          setError(
            (err as { response?: { data?: { error?: { message?: string } } } })
              ?.response?.data?.error?.message ||
              "We could not place your order.",
          );
        } finally {
          setSubmitting(false);
        }
        return;
      }
      const key = process.env.NEXT_PUBLIC_STRIPE_KEY;
      if (!key) throw new Error("Missing Stripe key");
      const stripe = payment.stripeAccount
        ? await loadStripe(key, { stripeAccount: payment.stripeAccount })
        : await loadStripe(key);
      setStripePromise(stripe);
      setClientSecret(payment.clientSecret);
      setPaymentIntentId(payment.paymentIntentId);
      if (payment.pricing) setPricing(payment.pricing);
      setCheckoutStep("payment");
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ||
          "Unable to start checkout.",
      );
    } finally {
      setLoadingPayment(false);
    }
  };

  const displayTotal = pricing?.total ?? cartSubtotal;

  if (!ready) {
    return <PageLoader label="Loading menu" className="min-h-[40vh]" />;
  }

  if (showGate) {
    return (
      <div className="mx-auto max-w-md pb-16">
        <h1 className="text-[clamp(28px,4vw,36px)] font-semibold tracking-[-0.02em]">
          Where are you sitting?
        </h1>
        <p className="mt-2 text-[15px] text-[#9DA2B3]">
          Enter your seat for {menuKeyLabel}
          {locationName ? ` at ${locationName}` : ""} so we can deliver your
          order.
        </p>
        <form
          noValidate
          className={`${cardCls} mt-8 space-y-4 p-5`}
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            const row = String(data.get("row") || "");
            const seat = String(data.get("seat") || "");
            setGateRow(row);
            setGateSeat(seat);
            continueGate(row, seat);
          }}
        >
          <div>
            <Label htmlFor="row">Row</Label>
            <Input
              id="row"
              name="row"
              className="mt-2"
              value={gateRow}
              onChange={(e) => {
                setGateRow(e.target.value);
                setGateError("");
              }}
            />
          </div>
          <div>
            <Label htmlFor="seat">Seat</Label>
            <Input
              id="seat"
              name="seat"
              className="mt-2"
              value={gateSeat}
              onChange={(e) => {
                setGateSeat(e.target.value);
                setGateError("");
              }}
            />
          </div>
          <label className="flex items-center gap-2 text-[14px] text-[#9DA2B3]">
            <input
              type="checkbox"
              checked={rememberSeat}
              onChange={(e) => setRememberSeat(e.target.checked)}
            />
            Remember this seat
          </label>
          {gateError ? (
            <p className="text-[13px] text-[#ff7a72]">{gateError}</p>
          ) : null}
          <Button type="submit" className="w-full">
            Continue
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl pb-28">
      <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#9DA2B3]">
        {isPickup ? "Pickup menu" : "Seat delivery"}
      </p>
      <h1 className="mt-2 text-[clamp(28px,4vw,36px)] font-semibold tracking-[-0.02em]">
        {locationName || menuKeyLabel}
      </h1>
      {!isPickup ? (
        <p className="mt-1 text-[14px] text-[#9DA2B3]">
          Section {menuKeyLabel} · Row {rowName} · Seat {seatName}
        </p>
      ) : null}

      {confirmation ? (
        <div className={`${cardCls} mt-8 p-6 text-center`}>
          <h2 className="text-[22px] font-semibold">Order received</h2>
          <p className="mt-2 text-[#9DA2B3]">
            Order #{confirmation.orderNumber}
          </p>
          <Button className="mt-5" onClick={() => setConfirmation(null)}>
            Order more
          </Button>
        </div>
      ) : null}

      {menuLoading ? (
        <div className="mt-12 flex justify-center">
          <Spinner />
        </div>
      ) : menuError ? (
        <p className="mt-8 text-[#9DA2B3]">{menuError}</p>
      ) : (
        <>
          <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
            <button
              type="button"
              onClick={() => setActiveCategory("all")}
              className={`shrink-0 rounded-full border px-4 py-2 text-[13px] font-semibold ${
                activeCategory === "all"
                  ? "border-[#A6E773] bg-[#A6E773]/15"
                  : "border-white/15 text-[#9DA2B3]"
              }`}
            >
              All
            </button>
            {sortedCategories.map((c) => (
              <button
                key={String(c.id)}
                type="button"
                onClick={() => setActiveCategory(String(c.id))}
                className={`shrink-0 rounded-full border px-4 py-2 text-[13px] font-semibold ${
                  activeCategory === String(c.id)
                    ? "border-[#A6E773] bg-[#A6E773]/15"
                    : "border-white/15 text-[#9DA2B3]"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          <ul className="mt-4 space-y-3">
            {visibleItems.map((item) => (
              <li
                key={String(item.id)}
                className={`${cardCls} flex items-start justify-between gap-4 p-4`}
              >
                <div className="min-w-0">
                  <p className="font-semibold">{item.name}</p>
                  {item.description ? (
                    <p className="mt-1 text-[13px] text-[#9DA2B3]">
                      {item.description}
                    </p>
                  ) : null}
                  <p className="mt-2 text-[14px]">
                    {formatCurrency(item.price)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setCart((cur) => ({
                      ...cur,
                      [String(item.id)]: (cur[String(item.id)] || 0) + 1,
                    }))
                  }
                >
                  Add
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}

      {cartCount > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#071f3a]/95 p-4 backdrop-blur">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
            <div>
              <p className="text-[14px] font-semibold">
                {cartCount} item{cartCount === 1 ? "" : "s"}
              </p>
              <p className="text-[13px] text-[#9DA2B3]">
                {formatCurrency(cartSubtotal)}
              </p>
            </div>
            <Button onClick={() => setCartOpen(true)}>View cart</Button>
          </div>
        </div>
      ) : null}

      {cartOpen ? (
        <Modal
          title="Your order"
          onClose={() => {
            if (submitting) return;
            setCartOpen(false);
            setCheckoutStep("review");
            setClientSecret("");
            setError("");
          }}
        >
          {error ? (
            <p className="mt-3 text-[14px] text-red-400">{error}</p>
          ) : null}
          {checkoutStep === "review" ? (
            <>
              <ul className="mt-4 space-y-3">
                {cartLines.map(({ item, quantity }) => (
                  <li
                    key={String(item.id)}
                    className="flex items-center justify-between gap-3 text-[14px]"
                  >
                    <span>
                      {item.name} × {quantity}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="h-8 w-8 rounded-full border border-white/15"
                        onClick={() =>
                          setCart((cur) => {
                            const next = (cur[String(item.id)] || 0) - 1;
                            if (next <= 0) {
                              const { [String(item.id)]: _, ...rest } = cur;
                              return rest;
                            }
                            return { ...cur, [String(item.id)]: next };
                          })
                        }
                      >
                        −
                      </button>
                      <span>{formatCurrency(item.price * quantity)}</span>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex justify-between border-t border-white/10 pt-3 font-semibold">
                <span>Total</span>
                <span>{formatCurrency(displayTotal)}</span>
              </div>
              <Button
                className="mt-5 w-full disabled:opacity-50"
                disabled={!cartLines.length || loadingPayment}
                onClick={continueToPayment}
              >
                {loadingPayment ? <Spinner size={18} /> : "Continue to payment"}
              </Button>
            </>
          ) : clientSecret && stripePromise ? (
            <div className="mt-4">
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: "night",
                    variables: {
                      colorPrimary: "#A6E773",
                      colorBackground: "#051B35",
                      colorText: "#ffffff",
                      borderRadius: "12px",
                    },
                  },
                }}
              >
                <MenuPayForm
                  totalLabel={formatCurrency(displayTotal)}
                  submitting={submitting}
                  onSubmit={async (intentId) => {
                    setSubmitting(true);
                    try {
                      await finalizeOrder(intentId || paymentIntentId);
                    } catch (err: unknown) {
                      setError(
                        (
                          err as {
                            response?: {
                              data?: { error?: { message?: string } };
                            };
                          }
                        )?.response?.data?.error?.message ||
                          "Could not place order after payment.",
                      );
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                />
              </Elements>
            </div>
          ) : (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          )}
        </Modal>
      ) : null}
    </div>
  );
}

export { decodeMenuParam };
