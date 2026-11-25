"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import AddonPickupDetails from "@/components/molecules/AddonPickupDetails";
import BrandedCheckoutShell from "@/components/organisms/BrandedCheckoutShell";
import CheckoutPaymentForm from "@/components/organisms/CheckoutPaymentForm";
import { BLOCKTICKETS_NAVY } from "@/lib/branding";
import {
  addonCustomerTotal,
  addonSummaryLines,
} from "@/lib/addonCatalog";
import type { CheckoutCart } from "@/lib/checkoutCart";
import { checkoutHoldSeconds } from "@/lib/checkoutBranding";
import { setLastKnown, useAuth } from "@/lib/auth";
import { getCart, getPaymentIntent } from "@/lib/api";
import { buildPaymentIntentRequest } from "@/lib/fundraisingCheckout";
import {
  paymentIntentAlreadySucceeded,
  leaveCheckoutForSuccess,
} from "@/lib/checkoutSuccess";
import { formatCurrency, isCartExpiredResponse } from "@/lib/helpers";
import { markCheckoutLoginDetour } from "@/lib/cart";
import { beginRouteTransition } from "@/lib/routeTransition";
import {
  STRIPE_PAYMENT_ELEMENT_FONTS,
  stripePaymentElementAppearance,
} from "@/lib/stripePaymentElement";

const lightCard =
  "rounded-[18px] border border-[rgba(5,27,53,0.08)] bg-white shadow-[0_10px_30px_-20px_rgba(5,27,53,0.35)]";
const muted = "text-[#6e7180]";

const EMPTY_CART = "Your add-on cart is empty or has expired.";

function PostPurchaseCheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cartId = searchParams.get("cartId");
  const { ready: authReady, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [cart, setCart] = useState<CheckoutCart | null>(null);
  const [clientSecret, setClientSecret] = useState("");
  const [intentId, setIntentId] = useState("");
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [declineMsg, setDeclineMsg] = useState("");
  const leavingRef = useRef(false);

  const sendToLogin = useCallback(() => {
    const returnTo = `${window.location.pathname}${window.location.search}`;
    setLastKnown(returnTo);
    markCheckoutLoginDetour();
    const href = `/login/?from=${encodeURIComponent(returnTo)}`;
    beginRouteTransition(href, { replace: true });
    router.replace(href);
  }, [router]);

  const goToSuccess = useCallback(
    (id: string) => {
      if (leavingRef.current) return;
      leavingRef.current = true;
      leaveCheckoutForSuccess(id, (href) => router.replace(href));
    },
    [router],
  );

  useEffect(() => {
    if (!authReady) return;
    if (!isAuthenticated) {
      sendToLogin();
      return;
    }
    const parsed = Number(cartId);
    if (!cartId || !Number.isFinite(parsed) || parsed <= 0) {
      setLoadError("This checkout link is invalid.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setLoadError("");
      try {
        const res = await getCart(String(parsed));
        if (cancelled) return;
        const cartData = res.data as CheckoutCart | null;
        if (!cartData?.addonItems?.length) {
          setLoadError(EMPTY_CART);
          return;
        }
        setCart(cartData);
        const eventData = cartData.event;
        const isProd =
          process.env.NEXT_PUBLIC_CLIENT_ENV === "production" ||
          process.env.NODE_ENV === "production";
        const connectedAccountId = isProd
          ? eventData?.organization?.connected_account_id
          : eventData?.organization?.test_connected_account_id;
        const key = process.env.NEXT_PUBLIC_STRIPE_KEY;
        if (key) {
          const stripeObj = connectedAccountId
            ? await loadStripe(key, { stripeAccount: connectedAccountId })
            : await loadStripe(key);
          if (!cancelled) setStripe(stripeObj);
        }
        const response = await getPaymentIntent(
          buildPaymentIntentRequest(cartData, eventData, null),
        );
        if (cancelled) return;
        setClientSecret(response.data.client_secret);
        setIntentId(response.data.id);
        if (paymentIntentAlreadySucceeded(response.data?.status)) {
          goToSuccess(String(response.data.id || ""));
        }
      } catch (err) {
        if (cancelled) return;
        setLoadError(
          isCartExpiredResponse(err)
            ? EMPTY_CART
            : "Unable to load add-on checkout.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [authReady, isAuthenticated, cartId, sendToLogin, goToSuccess]);

  const addonTotal = addonCustomerTotal(cart);
  const lines = addonSummaryLines(cart);
  const elementsOptions = useMemo(
    () =>
      clientSecret
        ? {
            clientSecret,
            appearance: stripePaymentElementAppearance(BLOCKTICKETS_NAVY, "#ffffff"),
            fonts: STRIPE_PAYMENT_ELEMENT_FONTS,
            loader: "always" as const,
          }
        : undefined,
    [clientSecret],
  );

  return (
    <BrandedCheckoutShell
      accent={BLOCKTICKETS_NAVY}
      remainingSeconds={cart ? checkoutHoldSeconds(cart.remainingTime) : null}
      onBack={() => router.push("/wallet/my-tickets/")}
      loading={loading || !authReady}
    >
      {loadError ? (
        <div className={`${lightCard} mx-auto mt-10 max-w-lg p-8 text-center`}>
          <h1 className="text-[16px] font-semibold">Checkout unavailable</h1>
          <p className={`mt-2 ${muted}`}>{loadError}</p>
        </div>
      ) : cart ? (
        <div className="mx-auto grid max-w-[1140px] grid-cols-1 gap-5 px-3.5 pb-28 pt-6 min-[900px]:grid-cols-[minmax(0,1fr)_372px]">
          <div className={`${lightCard} flex flex-col gap-4 p-[22px]`}>
            <div>
              <h1 className="font-semibold tracking-[-0.03em] [font-size:24px]">
                Pay for add-ons
              </h1>
              <p className={`mt-1 text-[14px] ${muted}`}>
                This is a separate charge from your ticket order.
              </p>
            </div>
            {clientSecret && stripe && elementsOptions ? (
              <Elements stripe={stripe} options={elementsOptions}>
                <CheckoutPaymentForm
                  intentId={intentId}
                  clientSecret={clientSecret}
                  cart={cart}
                  donationRequirementMet
                  isRefreshingIntent={false}
                  buttonColor={BLOCKTICKETS_NAVY}
                  buttonTextColor="#ffffff"
                  accent={BLOCKTICKETS_NAVY}
                  orgLabel="Blocktickets"
                  onSuccess={() => goToSuccess(intentId)}
                  onDeclined={setDeclineMsg}
                  onExpired={() => setLoadError(EMPTY_CART)}
                />
              </Elements>
            ) : null}
            {declineMsg ? (
              <p role="alert" className="text-[14px] text-[var(--bt-error,#c0374a)]">
                {declineMsg}
              </p>
            ) : null}
          </div>
          <aside className={`${lightCard} flex flex-col gap-3 p-[18px]`}>
            {addonTotal > 0 ? (
              <p className="text-[16px] font-semibold">
                Total due now: {formatCurrency(addonTotal)}
              </p>
            ) : null}
            <ul className="flex flex-col gap-3">
              {lines.map((line) => (
                <li key={line.key}>
                  <div className="flex justify-between gap-3 text-[14px]">
                    <span>
                      {line.quantity} × {line.name}
                    </span>
                    <span className="tabular-nums">
                      {formatCurrency(line.subtotal)}
                    </span>
                  </div>
                  {line.pickup ? <AddonPickupDetails product={line.pickup} /> : null}
                </li>
              ))}
            </ul>
          </aside>
        </div>
      ) : null}
    </BrandedCheckoutShell>
  );
}

export default function PostPurchaseCheckoutRoute() {
  return (
    <Suspense
      fallback={
        <BrandedCheckoutShell
          accent={BLOCKTICKETS_NAVY}
          onBack={() => undefined}
          loading
        >
          {null}
        </BrandedCheckoutShell>
      }
    >
      <PostPurchaseCheckoutPage />
    </Suspense>
  );
}
