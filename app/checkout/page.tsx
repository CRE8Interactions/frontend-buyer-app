"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import AppShell from "@/components/templates/AppShell";
import Button from "@/components/atoms/Button";
import Spinner from "@/components/atoms/Spinner";
import PageLoader from "@/components/molecules/PageLoader";
import Modal from "@/components/molecules/Modal";
import { cardCls } from "@/components/molecules/Card";
import { Input, Label } from "@/components/atoms/form";
import {
  dropUserCart,
  getCart,
  getPaymentIntent,
  processFreeOrder,
  processOrder,
  redeemPromoCode,
  removePromoCode,
  resolveFundraisingCampaign,
} from "@/lib/api";
import {
  buildFundraisingPayload,
  buildPaymentIntentRequest,
  createInitialFundraisingSelection,
  getCartFundraisingContext,
  isFundraisingDonationSatisfied,
  resolveCheckoutFundraisingPricing,
  type FundraisingSelection,
} from "@/lib/fundraisingCheckout";
import {
  formatCurrency,
  formatEventWhen,
  isCartExpiredResponse,
  isCartGoneResponse,
  isZeroFeeCompFlexPackCart,
} from "@/lib/helpers";
import { useAuth } from "@/lib/auth";
import { clearStoredCart, countCartItems, getStoredCart, setStoredCart } from "@/lib/cart";
import { hideIntercomLauncher } from "@/lib/intercom";
import {
  injectMetaPixel,
  trackAddPaymentInfo,
  trackBeginCheckout,
  trackCheckoutStage,
  trackCheckoutStarted,
  type TrackingOrganization,
} from "@/lib/tracking";

type CartData = {
  id: string | number;
  tickets?: Array<Record<string, unknown>>;
  package?: {
    name?: string;
    events?: Array<{
      uuid?: string;
      name?: string;
      start?: string;
      [key: string]: unknown;
    }>;
    organization?: Record<string, unknown>;
  } | null;
  flex_pack?: {
    name?: string;
    gameTickets?: number;
    organization?: Record<string, unknown>;
    [key: string]: unknown;
  } | null;
  access_pass_template?: {
    name?: string;
    price?: number;
    artwork?: { url?: string };
    events?: Array<{
      uuid?: string;
      name?: string;
      start?: string;
      [key: string]: unknown;
    }>;
    organization?: {
      connected_account_id?: string;
      test_connected_account_id?: string;
      uuid?: string;
      meta_pixel_id?: string;
      name?: string;
    };
    venue?: { timezone?: string; name?: string };
    [key: string]: unknown;
  } | null;
  event?: {
    name?: string;
    start?: string;
    organization?: {
      connected_account_id?: string;
      test_connected_account_id?: string;
      uuid?: string;
    };
    venue?: { timezone?: string; name?: string };
    [key: string]: unknown;
  } | null;
  total?: number;
  totalTax?: number;
  serviceFee?: number;
  processingFee?: number;
  salesTax?: number;
  remainingTime?: number;
  ipAddress?: string;
  [key: string]: unknown;
};

function isComplimentaryWebsiteCart(cart: CartData | null) {
  if (!cart) return false;
  if (cart.flex_pack && isZeroFeeCompFlexPackCart(cart.flex_pack)) return true;
  if (cart.flex_pack || cart.package || cart.access_pass_template) return false;
  const tickets = cart.tickets || [];
  if (!tickets.length) return false;
  return tickets.every((t) => {
    if (t.free === true) return true;
    const o = t.offer as { freeOffer?: boolean } | undefined;
    return Boolean(o && typeof o === "object" && o.freeOffer === true);
  });
}

const stripeAppearance = {
  theme: "night" as const,
  variables: {
    // Stripe's iframe cannot read CSS variables, so these are the brand v0.1 dark tokens as hex.
    fontFamily: "Geist, system-ui, sans-serif",
    fontSizeBase: "14px",
    borderRadius: "12px",
    colorPrimary: "#97DD62",
    colorBackground: "#151517",
    colorText: "#F2F2F0",
    colorTextSecondary: "#A6A6A8",
    colorDanger: "#E5645A",
  },
};

/** Stripe iframes can't use next/font; load Geist from Google Fonts. */
const stripeFonts = [
  {
    cssSrc:
      "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&display=swap",
  },
];

function CheckoutPaymentForm({
  intentId,
  cart,
  donationChargeTotal = 0,
  donationRequirementMet,
  isRefreshingIntent,
  onSuccess,
  onDeclined,
  onExpired,
}: {
  intentId: string;
  cart: CartData;
  donationChargeTotal?: number;
  donationRequirementMet: boolean;
  isRefreshingIntent: boolean;
  onSuccess: () => void;
  onDeclined: (msg: string) => void;
  onExpired: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [promoCode, setPromoCode] = useState("");
  const [isDiscountApplied, setIsDiscountApplied] = useState(false);
  const [discountedPrice, setDiscountedPrice] = useState<number | null>(null);
  const [originalTotal, setOriginalTotal] = useState<number | null>(null);
  const [promoDetails, setPromoDetails] = useState<Record<string, unknown> | null>(
    null,
  );
  const [codeError, setCodeError] = useState("");
  const [submittingPromo, setSubmittingPromo] = useState(false);
  const [removingPromo, setRemovingPromo] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [paymentReady, setPaymentReady] = useState(false);
  const hasTrackedPaymentInfoRef = useRef(false);

  const ticketCount = cart.access_pass_template
    ? 1
    : cart.flex_pack
      ? Number(cart.flex_pack.gameTickets || 0)
      : cart.package
        ? (cart.package.events?.length || 0)
        : (cart.tickets?.length || 0);

  const itemLabel = cart.access_pass_template
    ? ticketCount === 1
      ? "Pass"
      : "Passes"
    : cart.flex_pack
      ? ticketCount === 1
        ? "Voucher"
        : "Vouchers"
      : ticketCount === 1
        ? "item"
        : "items";

  // Flex pack cart.total includes voucher service fees; access pass keeps face
  // value in total and stores platform fee on serviceFee.
  const flexPackChargeTotal =
    Number(cart.total ?? 0) +
    Number(cart.totalTax ?? cart.salesTax ?? 0) +
    Number(cart.processingFee ?? 0) +
    Number(donationChargeTotal || 0);

  const accessPassChargeTotal =
    Number(cart.total ?? 0) +
    Number(cart.totalTax ?? cart.salesTax ?? 0) +
    Number(cart.serviceFee ?? 0) +
    Number(cart.processingFee ?? 0) +
    Number(donationChargeTotal || 0);

  const displayTotal = isDiscountApplied
    ? Number(discountedPrice ?? cart.total ?? 0) + Number(donationChargeTotal || 0)
    : cart.flex_pack
      ? flexPackChargeTotal
      : cart.access_pass_template
        ? accessPassChargeTotal
        : Number(cart.total ?? 0) + Number(donationChargeTotal || 0);

  const submitPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCode.trim()) return;
    setSubmittingPromo(true);
    setCodeError("");
    try {
      const res = await redeemPromoCode({
        code: promoCode.trim(),
        paymentIntentId: intentId,
        cart,
      });
      setIsDiscountApplied(true);
      setDiscountedPrice(res.data?.promoPricingDetails?.discountedPrice);
      setOriginalTotal(res.data?.promoPricingDetails?.originalPrice);
      setPromoDetails(res.data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message || "Promo code could not be applied.";
      setCodeError(`${msg}${/[.!?]$/.test(msg.trim()) ? " " : ". "}Please try again.`);
    } finally {
      setSubmittingPromo(false);
    }
  };

  const handleRemovePromo = async () => {
    setRemovingPromo(true);
    try {
      await removePromoCode({ paymentIntentId: intentId, cart });
      setIsDiscountApplied(false);
      setDiscountedPrice(null);
      setOriginalTotal(null);
      setPromoDetails(null);
      setPromoCode("");
    } catch {
      /* ignore */
    } finally {
      setRemovingPromo(false);
    }
  };

  const completePurchase = async () => {
    if (!donationRequirementMet || isRefreshingIntent || purchasing) return;
    if (!stripe || !elements) return;
    setPurchasing(true);
    try {
      await processOrder({ cart, paymentIntentId: intentId });
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: window.location.href },
        redirect: "if_required",
      });
      if (error) {
        onDeclined(error.message || "Card declined");
        setPurchasing(false);
        return;
      }
      sessionStorage.setItem("order", JSON.stringify({ id: cart.id }));
      onSuccess();
    } catch (err: unknown) {
      setPurchasing(false);
      if (isCartExpiredResponse(err)) {
        onExpired();
        return;
      }
      onDeclined("Unable to complete purchase. Please try again.");
    }
  };

  return (
    <div>
      <PaymentElement
        onChange={(e) => {
          setPaymentReady(Boolean(e.complete));
          if (e.complete && !hasTrackedPaymentInfoRef.current) {
            const organization = (cart?.event?.organization ||
              cart?.package?.organization ||
              cart?.flex_pack?.organization ||
              cart?.access_pass_template?.organization) as
              | TrackingOrganization
              | undefined;
            trackAddPaymentInfo({ organization, cart });
            trackCheckoutStage(
              "payment",
              { payment_info_entered: true },
              cart?.id,
            );
            hasTrackedPaymentInfoRef.current = true;
          }
        }}
        options={{ wallets: { applePay: "auto", googlePay: "auto" } }}
      />

      {!cart.flex_pack && !cart.access_pass_template ? (
        <div className="mt-6">
          {isDiscountApplied ? (
            <div className={`${cardCls} flex items-center justify-between gap-3 p-4`}>
              <div>
                <p className="text-[14px] font-semibold">
                  {(promoDetails?.promoPricingDetails as { code?: string } | undefined)
                    ?.code || "Promo"}
                </p>
                <p className="text-[13px] text-ink2">Promo code applied</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={removingPromo}
                onClick={handleRemovePromo}
              >
                {removingPromo ? <Spinner size={16} /> : "Remove"}
              </Button>
            </div>
          ) : (
            <form onSubmit={submitPromo} className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="promo">Promo code</Label>
                <Input
                  id="promo"
                  className="mt-2"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="Enter code"
                />
              </div>
              <Button
                type="submit"
                variant="outline"
                className="mt-7 self-end disabled:opacity-50"
                disabled={!promoCode.trim() || submittingPromo}
              >
                {submittingPromo ? <Spinner size={16} /> : "Apply"}
              </Button>
            </form>
          )}
          {codeError ? (
            <p className="mt-2 text-[13px] text-red-400">{codeError}</p>
          ) : null}
        </div>
      ) : null}

      <div className={`${cardCls} mt-6 space-y-2 p-4`}>
        <div className="flex justify-between text-[14px] text-ink2">
          <span>
            {ticketCount} {itemLabel}
          </span>
          {isDiscountApplied && originalTotal != null ? (
            <span className="line-through">{formatCurrency(originalTotal)}</span>
          ) : null}
        </div>
        {Number(cart.serviceFee || 0) > 0 ? (
          <div className="flex justify-between text-[14px]">
            <span className="text-ink2">Service fee</span>
            <span>{formatCurrency(cart.serviceFee)}</span>
          </div>
        ) : null}
        {Number(cart.processingFee || cart.salesTax || cart.totalTax || 0) >
        0 ? (
          <>
            {Number(cart.processingFee || 0) > 0 ? (
              <div className="flex justify-between text-[14px]">
                <span className="text-ink2">Processing fee</span>
                <span>{formatCurrency(cart.processingFee)}</span>
              </div>
            ) : null}
            {Number(cart.salesTax || cart.totalTax || 0) > 0 ? (
              <div className="flex justify-between text-[14px]">
                <span className="text-ink2">Tax</span>
                <span>
                  {formatCurrency(cart.salesTax ?? cart.totalTax)}
                </span>
              </div>
            ) : null}
          </>
        ) : null}
        <div className="flex justify-between border-t border-white/10 pt-3 text-[18px] font-semibold">
          <span>Total</span>
          <span>{formatCurrency(displayTotal)}</span>
        </div>
      </div>

      <Button
        className="mt-5 w-full disabled:opacity-50"
        disabled={
          !paymentReady ||
          !donationRequirementMet ||
          isRefreshingIntent ||
          purchasing ||
          !stripe
        }
        onClick={completePurchase}
      >
        {purchasing ? <Spinner size={18} /> : `Pay ${formatCurrency(displayTotal)}`}
      </Button>
    </div>
  );
}

function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cartIdFromQuery = searchParams.get("cartId");
  const { ready: authReady, isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartData | null>(null);
  const [event, setEvent] = useState<CartData["event"]>(null);
  const [clientSecret, setClientSecret] = useState("");
  const [intentId, setIntentId] = useState("");
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [stripeAccountContext, setStripeAccountContext] = useState<
    string | null | undefined
  >(undefined);
  const [fundraisingCampaign, setFundraisingCampaign] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [fundraisingSelection, setFundraisingSelection] =
    useState<FundraisingSelection>(createInitialFundraisingSelection());
  const [isRefreshingIntent, setIsRefreshingIntent] = useState(false);
  const [expiredOpen, setExpiredOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [declineMsg, setDeclineMsg] = useState("");
  const [loadError, setLoadError] = useState("");

  const cartRef = useRef<CartData | null>(null);
  const eventRef = useRef<CartData["event"]>(null);
  const paymentContextRef = useRef<{
    connectedAccountId?: string | null;
  } | null>(null);

  useEffect(() => {
    hideIntercomLauncher();
  }, []);

  const handleCartExpired = useCallback(() => {
    setExpiredOpen(true);
    const cartId = getStoredCart()?.cartId ?? cart?.id;
    if (cartId) dropUserCart({ cartId }).catch(() => undefined);
    clearStoredCart();
  }, [cart?.id]);

  const cancelOrder = useCallback(async () => {
    if (cancelling) return;
    setCancelling(true);
    const eventUUID = (eventRef.current as { uuid?: string } | null)?.uuid;
    const cartId = cartRef.current?.id ?? getStoredCart()?.cartId;
    try {
      await dropUserCart({ eventUUID, cartId });
    } catch {
      /* release best-effort — still leave checkout */
    }
    clearStoredCart();
    setLeaveOpen(false);
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  }, [cancelling, router]);

  const buildStripe = async (connectedAccountID: string | null) => {
    const key = process.env.NEXT_PUBLIC_STRIPE_KEY;
    if (!key) return;
    const stripeObj = connectedAccountID
      ? await loadStripe(key, { stripeAccount: connectedAccountID })
      : await loadStripe(key);
    setStripe(stripeObj);
  };

  const loadPaymentIntent = useCallback(
    async (
      cartData: CartData,
      eventData: CartData["event"],
      fundraisingPayload: ReturnType<typeof buildFundraisingPayload>,
    ) => {
      const request = buildPaymentIntentRequest(
        cartData,
        eventData,
        fundraisingPayload,
      );
      const response = await getPaymentIntent(request);
      const isDestinationCharge = Boolean(
        response?.data?.transfer_data?.destination,
      );
      const connectedAccountId =
        paymentContextRef.current?.connectedAccountId || null;
      setStripeAccountContext(isDestinationCharge ? null : connectedAccountId);
      setClientSecret(response.data.client_secret);
      setIntentId(response.data.id);
      return response;
    },
    [],
  );

  useEffect(() => {
    // Cart load lives above AppShell's auth gate — wait for login so we don't
    // race the redirect and wipe sessionStorage.cart on aborted/failed requests.
    if (!authReady || !isAuthenticated) return;

    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setLoadError("");
      let cartId = cartIdFromQuery;
      if (!cartId) {
        cartId = getStoredCart()?.cartId ?? null;
      }
      if (!cartId) {
        setLoadError("No cart found. Please select tickets again.");
        setLoading(false);
        return;
      }

      try {
        const res = await getCart(cartId);
        if (cancelled) return;
        const cartData = res.data as CartData | null;
        if (!cartData?.id) {
          clearStoredCart();
          setLoadError("No cart found. Please select tickets again.");
          return;
        }
        setCart(cartData);
        cartRef.current = cartData;
        const itemCount = countCartItems(cartData);
        if (itemCount > 0) {
          setStoredCart(cartData.id || cartId, itemCount);
        } else {
          clearStoredCart();
        }

        if (isComplimentaryWebsiteCart(cartData)) {
          const processRes = await processFreeOrder({ cartId: cartData.id });
          sessionStorage.setItem(
            "order",
            JSON.stringify({ id: processRes.data?.id }),
          );
          router.replace(
            `/checkout/checkout-success/?intentId=${encodeURIComponent(processRes.data?.paymentIntentId)}`,
          );
          return;
        }

        const eventData = cartData.package
          ? ([...(cartData.package.events || [])].sort((a, b) =>
              String(a.start || "").localeCompare(String(b.start || "")),
            )[0] as CartData["event"])
          : cartData.access_pass_template
            ? ([...(cartData.access_pass_template.events || [])].sort((a, b) =>
                String(a.start || "").localeCompare(String(b.start || "")),
              )[0] as CartData["event"])
            : cartData.event;
        setEvent(eventData ?? null);
        eventRef.current = eventData ?? null;

        const organization = (cartData?.event?.organization ||
          cartData?.package?.organization ||
          cartData?.flex_pack?.organization ||
          cartData?.access_pass_template?.organization ||
          eventData?.organization) as TrackingOrganization | undefined;
        const pixelId = cartData?.flex_pack
          ? (cartData.flex_pack.organization as { meta_pixel_id?: string } | undefined)
              ?.meta_pixel_id
          : cartData?.access_pass_template
            ? cartData.access_pass_template.organization?.meta_pixel_id
            : (eventData?.organization as { meta_pixel_id?: string } | undefined)
                ?.meta_pixel_id;
        if (pixelId) injectMetaPixel(pixelId);
        trackBeginCheckout({ organization, cart: cartData });
        trackCheckoutStarted(cartData.id);

        const isProd =
          process.env.NEXT_PUBLIC_CLIENT_ENV === "production" ||
          process.env.NODE_ENV === "production";
        const connectedAccountId = cartData.flex_pack
          ? isProd
            ? (cartData.flex_pack.organization as { connected_account_id?: string })
                ?.connected_account_id
            : (cartData.flex_pack.organization as {
                test_connected_account_id?: string;
              })?.test_connected_account_id
          : cartData.access_pass_template
            ? isProd
              ? cartData.access_pass_template.organization?.connected_account_id
              : cartData.access_pass_template.organization
                  ?.test_connected_account_id
            : isProd
              ? eventData?.organization?.connected_account_id
              : eventData?.organization?.test_connected_account_id;

        paymentContextRef.current = { connectedAccountId };

        let resolvedCampaign: Record<string, unknown> | null = null;
        try {
          const resolveContext = getCartFundraisingContext(cartData);
          if (resolveContext.organizationUUID) {
            const resolveRes = await resolveFundraisingCampaign(resolveContext);
            resolvedCampaign =
              (resolveRes.data?.campaign as Record<string, unknown>) || null;
          }
        } catch {
          /* optional */
        }
        setFundraisingCampaign(resolvedCampaign);
        const initial = createInitialFundraisingSelection(
          resolvedCampaign as never,
        );
        setFundraisingSelection(initial);

        // Flex pack / access pass checkout has no required event; payment
        // intent creation uses the cart product relation.
        if (
          !cartData.flex_pack &&
          !cartData.access_pass_template &&
          !eventData
        ) {
          setLoadError("Unable to load checkout. Please try again.");
          return;
        }

        await loadPaymentIntent(
          cartData,
          eventData ?? null,
          buildFundraisingPayload(resolvedCampaign as never, initial),
        );
      } catch (err: unknown) {
        if (cancelled) return;
        if (isCartGoneResponse(err)) {
          // 410 timed out, or 404 missing for this session/IP — drop ghost badge.
          handleCartExpired();
        } else {
          // Keep sessionStorage.cart so login/redirect races and transient
          // API failures don't force the shopper to rebuild their cart.
          setLoadError("Unable to load checkout. Please try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [
    authReady,
    isAuthenticated,
    cartIdFromQuery,
    handleCartExpired,
    loadPaymentIntent,
    router,
  ]);

  useEffect(() => {
    if (stripeAccountContext !== undefined) {
      buildStripe(stripeAccountContext);
    }
  }, [stripeAccountContext]);

  const fundraisingPayload = buildFundraisingPayload(
    fundraisingCampaign as never,
    fundraisingSelection,
  );
  const checkoutCart = fundraisingPayload
    ? ({ ...cart, fundraising: fundraisingPayload } as CartData)
    : cart;
  const donationRequirementMet = isFundraisingDonationSatisfied(
    fundraisingCampaign as never,
    fundraisingSelection,
  );
  const donationPricing = resolveCheckoutFundraisingPricing(
    fundraisingCampaign as never,
    fundraisingSelection,
  );

  const handleFundraisingAmount = async (amount: number) => {
    const next = { ...fundraisingSelection, donationAmount: amount };
    setFundraisingSelection(next);
    if (!cartRef.current) return;
    setIsRefreshingIntent(true);
    try {
      await loadPaymentIntent(
        cartRef.current,
        eventRef.current,
        buildFundraisingPayload(fundraisingCampaign as never, next),
      );
    } catch (err) {
      if (isCartGoneResponse(err)) handleCartExpired();
    } finally {
      setIsRefreshingIntent(false);
    }
  };

  const eventTitle =
    cart?.access_pass_template?.name ||
    cart?.flex_pack?.name ||
    cart?.package?.name ||
    event?.name ||
    "Your order";
  const when = cart?.access_pass_template
    ? cart.access_pass_template.venue?.name ||
      cart.access_pass_template.organization?.name ||
      ""
    : formatEventWhen(
        event?.start as string | undefined,
        event?.venue?.timezone,
      );

  const packageEventNameByUuid = useMemo(() => {
    const map = new Map<string, string>();
    for (const ev of cart?.package?.events || []) {
      const uuid = ev?.uuid != null ? String(ev.uuid) : "";
      const name = typeof ev?.name === "string" ? ev.name.trim() : "";
      if (uuid && name) map.set(uuid, name);
    }
    return map;
  }, [cart?.package?.events]);

  const ticketEventLabel = (ticket: Record<string, unknown>) => {
    const uuid =
      ticket.eventUUID != null
        ? String(ticket.eventUUID)
        : ticket.eventId != null
          ? String(ticket.eventId)
          : "";
    if (uuid && packageEventNameByUuid.has(uuid)) {
      return packageEventNameByUuid.get(uuid) || "";
    }
    const nested = ticket.event as { name?: string } | undefined;
    return typeof nested?.name === "string" ? nested.name.trim() : "";
  };

  const elementsOptions = useMemo(
    () =>
      clientSecret
        ? {
            clientSecret,
            appearance: stripeAppearance,
            fonts: stripeFonts,
            loader: "auto" as const,
          }
        : undefined,
    [clientSecret],
  );

  return (
    <AppShell requireAuth search={false}>
      {loading ? (
        <PageLoader message="Securing your tickets…" label="Loading checkout" />
      ) : expiredOpen ? null : loadError ? (
        <div className={`${cardCls} mx-auto max-w-lg p-8 text-center`}>
          <h1 className="text-[22px] font-semibold">Checkout unavailable</h1>
          <p className="mt-2 text-ink2">{loadError}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button
              variant="outline"
              disabled={cancelling}
              onClick={cancelOrder}
            >
              {cancelling ? <Spinner size={16} /> : "Cancel order"}
            </Button>
            <Button href="/">Back home</Button>
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-xl pb-16">
          <button
            type="button"
            onClick={() => setLeaveOpen(true)}
            className="text-[14px] text-ink2 hover:text-white"
          >
            ← Back
          </button>
          <h1 className="mt-4 text-[clamp(28px,4vw,36px)] font-semibold tracking-[-0.02em]">
            You&apos;re so close!
          </h1>
          <p className="mt-2 text-[15px] text-ink2">
            Select your payment method and complete your purchase.
          </p>

          <div className={`${cardCls} mt-8 p-5`}>
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ink2">
              Buying
            </p>
            <p className="mt-2 text-[18px] font-semibold">{eventTitle}</p>
            {when ? (
              <p className="mt-1 text-[14px] text-ink2">{when}</p>
            ) : null}
            {cart?.access_pass_template ? (
              <ul className="mt-4 space-y-2 border-t border-white/10 pt-4">
                <li className="flex justify-between gap-3 text-[14px]">
                  <span className="min-w-0 truncate">Access pass</span>
                  <span className="shrink-0 text-ink2">
                    {formatCurrency(
                      Number(cart.access_pass_template.price || cart.total || 0),
                    )}
                  </span>
                </li>
              </ul>
            ) : cart?.tickets?.length ? (
              <ul className="mt-4 space-y-2 border-t border-white/10 pt-4">
                {cart.tickets.map((t, i) => {
                  const eventLabel = ticketEventLabel(t);
                  const seatLabel = t.generalAdmission
                    ? String(t.sectionName || t.offerName || "GA")
                    : `Sec ${t.sectionName || t.sectionNumber} · Row ${t.rowNumber} · Seat ${t.seatNumber}`;
                  return (
                    <li
                      key={i}
                      className="flex justify-between gap-3 text-[14px]"
                    >
                      <span className="min-w-0">
                        {eventLabel ? (
                          <span className="block truncate text-[12px] text-ink2">
                            {eventLabel}
                          </span>
                        ) : null}
                        <span className="block truncate">{seatLabel}</span>
                      </span>
                      <span className="shrink-0 text-ink2">
                        {formatCurrency(Number(t.cost || t.price || 0))}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>

          {fundraisingCampaign ? (
            <div className={`${cardCls} mt-4 p-5`}>
              <p className="text-[14px] font-semibold">
                {(fundraisingCampaign.title as string) || "Support the campaign"}
              </p>
              <p className="mt-1 text-[13px] text-ink2">
                Optional donation added to your checkout.
              </p>
              <Input
                className="mt-3"
                type="number"
                min={0}
                step="1"
                value={fundraisingSelection.donationAmount || ""}
                onChange={(e) =>
                  handleFundraisingAmount(Number(e.target.value) || 0)
                }
                placeholder="Donation amount"
              />
              {donationPricing.donationAmount > 0 ? (
                <p className="mt-2 text-[13px] text-ink2">
                  Donation total {formatCurrency(donationPricing.totalCharge)}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className={`${cardCls} mt-4 p-5`}>
            <h2 className="text-[16px] font-semibold">Payment</h2>
            <div className="mt-4">
              {clientSecret && stripe && elementsOptions && checkoutCart ? (
                <Elements
                  key={clientSecret}
                  stripe={stripe}
                  options={elementsOptions}
                >
                  <CheckoutPaymentForm
                    intentId={intentId}
                    cart={checkoutCart}
                    donationChargeTotal={donationPricing.totalCharge}
                    donationRequirementMet={donationRequirementMet}
                    isRefreshingIntent={isRefreshingIntent}
                    onSuccess={() =>
                      router.push(
                        `/checkout/checkout-success/?intentId=${encodeURIComponent(intentId)}`,
                      )
                    }
                    onDeclined={setDeclineMsg}
                    onExpired={handleCartExpired}
                  />
                </Elements>
              ) : (
                <div className="flex justify-center py-8">
                  <Spinner />
                </div>
              )}
            </div>
          </div>

          <p className="mt-6 text-center text-[12px] text-ink2">
            By completing this purchase you agree to our purchase policy and
            terms.
          </p>
        </div>
      )}

      {expiredOpen && (
        <Modal title="Cart expired" onClose={() => router.push("/")}>
          <p className="mt-4 text-[15px] text-ink2">
            Your reserved tickets were released. Please select tickets again.
          </p>
          <Button className="mt-5 w-full" href="/">
            Start over
          </Button>
        </Modal>
      )}

      {leaveOpen && (
        <Modal title="Are you sure?" onClose={() => setLeaveOpen(false)}>
          <p className="mt-4 text-[15px] text-ink2">
            If you leave this page, you&apos;ll lose your chance to purchase
            these tickets.
          </p>
          <div className="mt-5 flex flex-col gap-3">
            <Button
              variant="outline"
              className="w-full"
              disabled={cancelling}
              onClick={cancelOrder}
            >
              {cancelling ? <Spinner size={16} /> : "Cancel order"}
            </Button>
            <Button
              className="w-full"
              disabled={cancelling}
              onClick={() => setLeaveOpen(false)}
            >
              Continue with checkout
            </Button>
          </div>
        </Modal>
      )}

      {declineMsg && (
        <Modal title="Card declined" onClose={() => setDeclineMsg("")}>
          <p className="mt-4 text-[15px] text-ink2">{declineMsg}</p>
          <Button className="mt-5 w-full" onClick={() => setDeclineMsg("")}>
            Try again
          </Button>
        </Modal>
      )}
    </AppShell>
  );
}


export default function CheckoutPageRoute() {
  return (
    <Suspense
      fallback={
        <AppShell requireAuth search={false}>
          <PageLoader label="Loading checkout" />
        </AppShell>
      }
    >
      <CheckoutPage />
    </Suspense>
  );
}
