"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import BrandedCheckoutShell from "@/components/organisms/BrandedCheckoutShell";
import GuestContact from "@/components/organisms/GuestContact";
import BrandedActionButton from "@/components/atoms/BrandedActionButton";
import Button from "@/components/atoms/Button";
import Spinner from "@/components/atoms/Spinner";
import Modal from "@/components/molecules/Modal";
import { BrandedLoader } from "@/components/molecules/RouteLoader";
import SeatViewImage from "@/components/molecules/SeatViewImage";
import { BLOCKTICKETS_NAVY, type BrandingOrganization } from "@/lib/branding";
import {
  cachedBrandingForCheckout,
  checkoutBrandingFromCart,
  checkoutHoldSeconds,
  resolveCheckoutTax,
  type CheckoutCartBrandingSource,
} from "@/lib/checkoutBranding";
import { cacheOrgBranding, orgSlugFromPathname } from "@/lib/orgBrandingCache";
import { useClientReady } from "@/lib/useClientReady";
import { formString } from "@/lib/fieldValidation";
import {
  flexPackSeasonLine,
  flexPackVoucherCount,
} from "@/lib/flexPackDisplay";
import {
  packageCartTickets,
  packageOrderSummary,
  promoSummaryLabel,
  resolveFlexPackCheckoutTotals,
  resolvePackageCheckoutTotals,
  ticketSelectionSummary,
  withPackageCheckoutSeatPrices,
} from "@/lib/ticketSummary";
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
  imageUrl,
  isCartExpiredResponse,
  isCartGoneResponse,
  isRequestCanceled,
} from "@/lib/helpers";
import {
  isComplimentaryWebsiteCart,
  isGuestEligibleCart,
  setGuestCheckoutEmail,
  type GuestBuyer,
} from "@/lib/guestCheckout";
import { setLastKnown, useAuth } from "@/lib/auth";
import {
  captureCheckoutReferrer,
  clearStoredCart,
  countCartItems,
  getCheckoutReturnPath,
  getStoredCart,
  hadCheckoutLoginDetour,
  markCheckoutLoginDetour,
  setStoredCart,
} from "@/lib/cart";
import {
  checkoutLeavePath,
  dropUserCartPayload,
  resolveCheckoutReturnPath,
  shouldPopCheckoutHistory,
} from "@/lib/checkoutLeave";
import { hideIntercomLauncher } from "@/lib/intercom";
import { BACK_FALLBACK_HREF } from "@/lib/inAppBack";
import {
  checkoutSuccessReturnUrl,
  leaveCheckoutForSuccess,
  paymentIntentAlreadySucceeded,
  succeededStripeRedirectIntentId,
} from "@/lib/checkoutSuccess";
import { getSeatViewImageCandidates } from "@/lib/seatView";
import {
  injectMetaPixel,
  trackAddPaymentInfo,
  trackBeginCheckout,
  trackCheckoutStage,
  trackCheckoutStarted,
  type TrackingOrganization,
} from "@/lib/tracking";
import {
  STRIPE_PAYMENT_ELEMENT_FONTS,
  checkoutPaymentElementOptions,
  stripePaymentElementAppearance,
} from "@/lib/stripePaymentElement";

type CartData = {
  id: string | number;
  tickets?: Array<Record<string, unknown>>;
  package_tickets?: Array<Record<string, unknown>>;
  package?: {
    uuid?: string | number;
    id?: string | number;
    name?: string;
    price?: number;
    pricingTiers?: Array<{ price?: number } | null> | null;
    start?: string;
    image?: { url?: string };
    events?: Array<{
      uuid?: string;
      name?: string;
      start?: string;
      venue?: { name?: string; timezone?: string };
      [key: string]: unknown;
    }>;
    venue?: { name?: string; timezone?: string };
    organization?: Record<string, unknown>;
  } | null;
  flex_pack?: {
    name?: string;
    price?: number;
    gameTickets?: number;
    start?: string;
    end?: string;
    image?: { url?: string };
    venue?: { name?: string; timezone?: string };
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
      name?: string;
      branding?: BrandingOrganization["branding"];
    } & BrandingOrganization;
    venue?: { timezone?: string; name?: string };
    [key: string]: unknown;
  } | null;
  total?: number;
  totalTax?: number;
  serviceFee?: number;
  processingFee?: number;
  estimatedProcessingFee?: number;
  discountApplied?: number;
  salesTax?: number;
  remainingTime?: number;
  ipAddress?: string;
  [key: string]: unknown;
};

const lightCard =
  "rounded-[18px] border border-[rgba(5,27,53,0.08)] bg-white shadow-[0_10px_30px_-20px_rgba(5,27,53,0.35)]";
const muted = "text-[#6e7180]";

async function waitForPaymentIntentSucceeded(
  stripe: {
    retrievePaymentIntent: (clientSecret: string) => Promise<{
      error?: { message?: string } | null;
      paymentIntent?: { status?: string } | null;
    }>;
  },
  clientSecret: string,
  confirmed: {
    error?: { message?: string } | null;
    paymentIntent?: { status?: string } | null;
  },
) {
  if (confirmed.error) return confirmed.error;
  let status = confirmed.paymentIntent?.status;
  if (!status || status === "succeeded") return null;
  if (status === "requires_payment_method" || status === "canceled") {
    return { message: "Card declined" };
  }

  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const retrieved = await stripe.retrievePaymentIntent(clientSecret);
    if (retrieved.error) return retrieved.error;
    status = retrieved.paymentIntent?.status;
    if (status === "succeeded") return null;
    if (status === "requires_payment_method" || status === "canceled") {
      return { message: "Card declined" };
    }
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 400);
    });
  }
  return { message: "Payment is still processing. Please wait a moment." };
}

type CheckoutPromoDiscount = { code: string; amount: number };

function CheckoutPaymentForm({
  intentId,
  clientSecret,
  cart,
  donationChargeTotal = 0,
  donationRequirementMet,
  isRefreshingIntent,
  buttonColor,
  buttonTextColor,
  accent,
  orgLabel,
  onTotalChange,
  onPromoChange,
  onSuccess,
  onDeclined,
  onExpired,
}: {
  intentId: string;
  clientSecret: string;
  cart: CartData;
  donationChargeTotal?: number;
  donationRequirementMet: boolean;
  isRefreshingIntent: boolean;
  buttonColor: string;
  buttonTextColor: string;
  accent: string;
  orgLabel: string;
  onTotalChange?: (total: number) => void;
  onPromoChange?: (promo: CheckoutPromoDiscount | null) => void;
  onSuccess: () => void;
  onDeclined: (msg: string) => void;
  onExpired: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [promoCode, setPromoCode] = useState("");
  const [isDiscountApplied, setIsDiscountApplied] = useState(false);
  const [discountedPrice, setDiscountedPrice] = useState<number | null>(null);
  const [promoDetails, setPromoDetails] = useState<Record<string, unknown> | null>(
    null,
  );
  const [codeError, setCodeError] = useState("");
  const [submittingPromo, setSubmittingPromo] = useState(false);
  const [removingPromo, setRemovingPromo] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [paymentReady, setPaymentReady] = useState(false);
  const hasTrackedPaymentInfoRef = useRef(false);

  const flexPackTotals = cart.flex_pack
    ? resolveFlexPackCheckoutTotals(cart)
    : null;

  const accessPassChargeTotal =
    Number(cart.total ?? 0) +
    Number(cart.totalTax ?? cart.salesTax ?? 0) +
    Number(cart.serviceFee ?? 0) +
    Number(cart.processingFee ?? 0) +
    Number(donationChargeTotal || 0);

  const displayTotal = isDiscountApplied
    ? Number(discountedPrice ?? cart.total ?? 0) + Number(donationChargeTotal || 0)
    : cart.flex_pack
      ? (flexPackTotals?.total || 0) + Number(donationChargeTotal || 0)
      : cart.access_pass_template
        ? accessPassChargeTotal
        : cart.package
          ? resolvePackageCheckoutTotals(
              cart,
              packageOrderSummary(cart.package, packageCartTickets(cart)).subtotal,
            ).total + Number(donationChargeTotal || 0)
          : Number(cart.total ?? 0) + Number(donationChargeTotal || 0);

  useEffect(() => {
    onTotalChange?.(displayTotal);
  }, [displayTotal, onTotalChange]);

  const promoPricing = promoDetails?.promoPricingDetails as
    | {
        code?: string;
        amountDiscounted?: number;
        originalPrice?: number;
        discountedPrice?: number;
      }
    | undefined;
  // Blocktickets sends the discount as amountDiscounted; older payloads only
  // carry the before/after prices.
  const promoDiscountAmount = isDiscountApplied
    ? Number(promoPricing?.amountDiscounted) ||
      Math.max(
        0,
        Number(promoPricing?.originalPrice || 0) -
          Number(promoPricing?.discountedPrice || 0),
      )
    : 0;
  const promoDiscountCode = promoPricing?.code || promoCode.trim();

  useEffect(() => {
    onPromoChange?.(
      promoDiscountAmount > 0
        ? { code: promoDiscountCode, amount: promoDiscountAmount }
        : null,
    );
  }, [onPromoChange, promoDiscountAmount, promoDiscountCode]);

  const submitPromo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const code =
      formString(new FormData(e.currentTarget), "promo") || promoCode.trim();
    setPromoCode(code);
    if (!code) {
      setCodeError("Enter a promo code.");
      return;
    }
    setSubmittingPromo(true);
    setCodeError("");
    try {
      const res = await redeemPromoCode({
        code,
        paymentIntentId: intentId,
        cart,
      });
      setIsDiscountApplied(true);
      setDiscountedPrice(res.data?.promoPricingDetails?.discountedPrice);
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
      const submitted = await elements.submit();
      if (submitted?.error) {
        onDeclined(
          submitted.error.message || "Unable to complete purchase. Please try again.",
        );
        setPurchasing(false);
        return;
      }
      await processOrder({ cart, paymentIntentId: intentId });
      const confirmed = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: checkoutSuccessReturnUrl(intentId) },
        redirect: "if_required",
      });
      const confirmError = await waitForPaymentIntentSucceeded(
        stripe,
        clientSecret,
        confirmed,
      );
      if (confirmError) {
        onDeclined(confirmError.message || "Card declined");
        setPurchasing(false);
        return;
      }
      sessionStorage.setItem("order", JSON.stringify({ id: cart.id }));
      onSuccess();
    } catch (err: unknown) {
      setPurchasing(false);
      if (isRequestCanceled(err)) return;
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
        options={checkoutPaymentElementOptions}
      />

      {!cart.flex_pack && !cart.package && !cart.access_pass_template ? (
        <div className="mt-6">
          {isDiscountApplied ? (
            <div className="flex items-center justify-between gap-3 rounded-[14px] border border-[rgba(5,27,53,0.10)] bg-[#f7f8fc] p-4">
              <div>
                <p className="text-[14px] font-semibold">
                  {(promoDetails?.promoPricingDetails as { code?: string } | undefined)
                    ?.code || "Promo"}
                </p>
                <p className={`text-[13px] ${muted}`}>Promo code applied</p>
              </div>
              <BrandedActionButton
                tone="secondary"
                loading={removingPromo}
                loadingLabel="Removing…"
                onClick={handleRemovePromo}
                className="!w-auto px-[18px] py-2.5 text-[14px]"
              >
                Remove
              </BrandedActionButton>
            </div>
          ) : (
            <div>
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-[#8a93a3]">
                Promo code
              </p>
              <form noValidate onSubmit={submitPromo} className="flex gap-2.5">
                <input
                  id="promo"
                  name="promo"
                  aria-invalid={Boolean(codeError)}
                  aria-describedby={codeError ? "promo-error" : undefined}
                  className={`h-12 min-w-0 flex-1 rounded-[10px] border bg-white px-[18px] text-[15px] text-[#051b35] outline-none placeholder:text-[#8a93a3] ${
                    codeError
                      ? "border-[#c2394a]"
                      : "border-[rgba(5,27,53,0.16)]"
                  }`}
                  value={promoCode}
                  onChange={(e) => {
                    setPromoCode(e.target.value);
                    setCodeError("");
                  }}
                  placeholder="Enter promo code"
                  autoComplete="off"
                />
                <BrandedActionButton
                  type="submit"
                  tone="secondary"
                  loading={submittingPromo}
                  loadingLabel="Applying…"
                  className="!rounded-[10px] px-6"
                >
                  Apply
                </BrandedActionButton>
              </form>
            </div>
          )}
          {codeError ? (
            <p id="promo-error" className="mt-2 text-[13px] text-[#c2394a]">
              {codeError}
            </p>
          ) : null}
        </div>
      ) : null}

      <label className="mt-6 flex cursor-pointer items-start gap-2.5">
        <input
          type="checkbox"
          defaultChecked
          className="mt-0.5 h-[19px] w-[19px] shrink-0 rounded-[5px] border-[1.5px]"
          style={{ accentColor: accent }}
        />
        <span className="text-[13px] text-[#4a5567]">
          Save my info for one-click checkout with Link
          {orgLabel && orgLabel !== "Blocktickets"
            ? ` at ${orgLabel} venues`
            : ""}
          .
        </span>
      </label>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3.5">
        <p className="max-w-[380px] text-[12px] leading-relaxed text-[#8a93a3]">
          By paying you agree to the Blocktickets{" "}
          <Link href="/purchase-policy/" className="underline">
            Purchase Policy
          </Link>{" "}
          and{" "}
          <Link href="/terms-conditions/" className="underline">
            Terms &amp; Conditions
          </Link>
          . All prices are all-in.
        </p>
        <div className="flex items-center gap-1.5 whitespace-nowrap text-[12px] text-[#8a93a3]">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-[13px] w-[13px]"
            aria-hidden
          >
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Payments secured by Stripe
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-[3] border-t border-[rgba(5,27,53,0.10)] bg-white md:bg-white/94 md:backdrop-blur">
        <div className="mx-auto flex max-w-[1140px] px-3.5 py-3 md:justify-end md:px-5">
          <BrandedActionButton
            primaryColor={buttonColor}
            textColor={buttonTextColor}
            loading={purchasing}
            loadingLabel="Processing…"
            disabled={
              !paymentReady ||
              !donationRequirementMet ||
              isRefreshingIntent ||
              !stripe
            }
            onClick={completePurchase}
            className="w-full px-[34px] py-4 text-[17px] md:ml-auto md:w-[340px]"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-[17px] w-[17px]"
              aria-hidden
            >
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Pay {formatCurrency(displayTotal)}
          </BrandedActionButton>
        </div>
      </div>
    </div>
  );
}

function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cartIdFromQuery = searchParams.get("cartId");
  const stripeRedirectIntentId = succeededStripeRedirectIntentId(searchParams);
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
  const [dueTotal, setDueTotal] = useState(0);
  const [promoDiscount, setPromoDiscount] =
    useState<CheckoutPromoDiscount | null>(null);
  const [loadError, setLoadError] = useState("");
  const allowCachedBranding = useClientReady();
  const [guestBuyer, setGuestBuyer] = useState<GuestBuyer | null>(null);

  const [leavingForLogin, setLeavingForLogin] = useState(false);

  const cartRef = useRef<CartData | null>(null);
  const eventRef = useRef<CartData["event"]>(null);
  const leavingForSuccessRef = useRef(false);
  const leavingForLoginRef = useRef(false);
  const paymentContextRef = useRef<{
    connectedAccountId?: string | null;
  } | null>(null);
  const guestBuyerRef = useRef<GuestBuyer | null>(null);

  const goToSuccess = useCallback((id: string) => {
    if (leavingForSuccessRef.current) return;
    leavingForSuccessRef.current = true;
    leaveCheckoutForSuccess(id);
  }, []);

  useEffect(() => {
    hideIntercomLauncher();
    captureCheckoutReferrer();
  }, []);

  // Hold the loader until the browser commits to /login/ so checkout never
  // paints behind the redirect.
  const sendToLogin = useCallback(() => {
    if (leavingForLoginRef.current) return;
    leavingForLoginRef.current = true;
    setLeavingForLogin(true);
    const returnTo = `${window.location.pathname}${window.location.search}`;
    setLastKnown(returnTo);
    markCheckoutLoginDetour();
    window.location.href = `/login/?from=${encodeURIComponent(returnTo)}`;
  }, []);

  const expiredRef = useRef(false);
  const [restarting, setRestarting] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const handleHoldExpired = useCallback(() => {
    if (expiredRef.current || leaveOpen || cancelling) return;
    expiredRef.current = true;
    setExpiredOpen(true);
  }, [leaveOpen, cancelling]);

  /**
   * Package/flex carts often omit the org slug, which would send the shopper to
   * the venue copy of the product page. The page they came from names the team.
   */
  const leaveOrgSlug = useCallback(() => {
    const source = cartRef.current as CheckoutCartBrandingSource | null;
    const returnPath = (getCheckoutReturnPath() || "").split("?")[0];
    return (
      orgSlugFromPathname(returnPath) ||
      checkoutBrandingFromCart(source).organization?.slug ||
      cachedBrandingForCheckout(source)?.slug ||
      null
    );
  }, []);

  const startOver = useCallback(async () => {
    if (restarting) return;
    setRestarting(true);
    const eventData = eventRef.current || cartRef.current?.event;
    const dest =
      checkoutLeavePath(cartRef.current, eventData, leaveOrgSlug()) ||
      BACK_FALLBACK_HREF;
    const returnPath = getCheckoutReturnPath();
    const loginDetour = hadCheckoutLoginDetour();
    try {
      await dropUserCart(
        dropUserCartPayload(cartRef.current, eventData, getStoredCart()),
      );
    } catch {
      /* release best-effort — still leave checkout */
    }
    clearStoredCart();
    // Swap to the loader only once the release is done — the dialog keeps its
    // in-flight state until then.
    setLeaving(true);
    if (shouldPopCheckoutHistory(dest, returnPath, loginDetour)) router.back();
    else router.replace(dest);
  }, [leaveOrgSlug, restarting, router]);

  const abandonGoneCart = useCallback(
    (eventData?: CartData["event"] | null) => {
      const dest = resolveCheckoutReturnPath(
        cartRef.current,
        eventData ?? cartRef.current?.event,
        leaveOrgSlug(),
      );
      const payload = dropUserCartPayload(
        cartRef.current,
        eventData ?? cartRef.current?.event,
        getStoredCart(),
      );
      if (payload.cartId) dropUserCart(payload).catch(() => undefined);
      clearStoredCart();
      router.replace(dest);
    },
    [leaveOrgSlug, router],
  );

  const cancelOrder = useCallback(async () => {
    if (cancelling) return;
    setCancelling(true);
    const eventData = eventRef.current || cartRef.current?.event;
    const dest = resolveCheckoutReturnPath(
      cartRef.current,
      eventData,
      leaveOrgSlug(),
    );
    const returnPath = getCheckoutReturnPath();
    const loginDetour = hadCheckoutLoginDetour();
    try {
      await dropUserCart(
        dropUserCartPayload(cartRef.current, eventData, getStoredCart()),
      );
    } catch {
      /* release best-effort — still leave checkout */
    }
    clearStoredCart();
    setLeaving(true);
    if (shouldPopCheckoutHistory(dest, returnPath, loginDetour)) router.back();
    else router.replace(dest);
  }, [cancelling, leaveOrgSlug, router]);

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
      guest?: GuestBuyer | null,
    ) => {
      const request = buildPaymentIntentRequest(
        cartData,
        eventData,
        fundraisingPayload,
        guest,
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
      if (paymentIntentAlreadySucceeded(response.data?.status)) {
        goToSuccess(String(response.data.id || ""));
      }
      return response;
    },
    [goToSuccess],
  );

  useEffect(() => {
    if (!authReady) return;

    if (leavingForSuccessRef.current) return;

    if (stripeRedirectIntentId) {
      goToSuccess(stripeRedirectIntentId);
      return;
    }

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

        if (!isAuthenticated && !isGuestEligibleCart(cartData)) {
          sendToLogin();
          return;
        }

        if (isComplimentaryWebsiteCart(cartData)) {
          if (!isAuthenticated) {
            sendToLogin();
            return;
          }
          const processRes = await processFreeOrder({ cartId: cartData.id });
          sessionStorage.setItem(
            "order",
            JSON.stringify({ id: processRes.data?.id }),
          );
          goToSuccess(String(processRes.data?.paymentIntentId || ""));
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
        cacheOrgBranding(organization as BrandingOrganization | undefined);
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

        if (!isAuthenticated) {
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
          abandonGoneCart(cartRef.current?.event);
        } else {
          // Keep sessionStorage.cart so login/redirect races and transient
          // API failures don't force the shopper to rebuild their cart.
          setLoadError("Unable to load checkout. Please try again.");
        }
      } finally {
        if (
          !cancelled &&
          !leavingForSuccessRef.current &&
          !leavingForLoginRef.current
        ) {
          setLoading(false);
        }
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
    stripeRedirectIntentId,
    abandonGoneCart,
    loadPaymentIntent,
    goToSuccess,
    sendToLogin,
    router,
  ]);

  useEffect(() => {
    if (stripeAccountContext !== undefined) {
      buildStripe(stripeAccountContext);
    }
  }, [stripeAccountContext]);

  useEffect(() => {
    if (leavingForSuccessRef.current || !stripe || !clientSecret || !intentId) {
      return;
    }
    let cancelled = false;
    stripe.retrievePaymentIntent(clientSecret).then((retrieved) => {
      if (cancelled) return;
      if (paymentIntentAlreadySucceeded(retrieved.paymentIntent?.status)) {
        goToSuccess(retrieved.paymentIntent?.id || intentId);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [stripe, clientSecret, intentId, goToSuccess]);

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
    if (!isAuthenticated && !guestBuyerRef.current) return;
    setIsRefreshingIntent(true);
    try {
      await loadPaymentIntent(
        cartRef.current,
        eventRef.current,
        buildFundraisingPayload(fundraisingCampaign as never, next),
        guestBuyerRef.current,
      );
    } catch (err) {
      if (isCartGoneResponse(err)) abandonGoneCart();
    } finally {
      setIsRefreshingIntent(false);
    }
  };

  const checkoutLoginHref = `/login/?from=${encodeURIComponent(
    `${typeof window !== "undefined" ? window.location.pathname : "/checkout/"}${
      typeof window !== "undefined" ? window.location.search : ""
    }`,
  )}`;

  const confirmGuestBuyer = async (buyer: GuestBuyer) => {
    guestBuyerRef.current = buyer;
    setGuestBuyer(buyer);
    setGuestCheckoutEmail(buyer.email);
    if (!cartRef.current) return;
    setIsRefreshingIntent(true);
    try {
      await loadPaymentIntent(
        cartRef.current,
        eventRef.current,
        buildFundraisingPayload(
          fundraisingCampaign as never,
          fundraisingSelection,
        ),
        buyer,
      );
    } catch (err) {
      if (isCartGoneResponse(err)) abandonGoneCart();
      else setLoadError("Unable to load checkout. Please try again.");
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

  const branding = checkoutBrandingFromCart(
    cart as CheckoutCartBrandingSource | null,
    allowCachedBranding ? undefined : null,
  );
  const eventVenue =
    cart?.access_pass_template?.venue ||
    (event?.venue as
      | {
          name?: string;
          city?: string;
          state?: string;
          address?: Array<{ city?: string; state?: string; country?: string }>;
        }
      | undefined);
  const ticketSummary = ticketSelectionSummary(cart?.tickets || []);
  const packageSummary = cart?.package
    ? packageOrderSummary(cart.package, packageCartTickets(cart))
    : null;
  const packageTotals = resolvePackageCheckoutTotals(
    cart,
    packageSummary?.subtotal || 0,
  );
  const packageSeats = withPackageCheckoutSeatPrices(
    packageSummary?.seats || [],
    packageTotals.subtotal,
  );
  const flexTotals = cart?.flex_pack
    ? resolveFlexPackCheckoutTotals(cart)
    : null;
  const flexVoucherCount = flexPackVoucherCount(cart?.flex_pack?.gameTickets);
  const summaryWhen =
    packageSummary?.seasonLine ||
    (cart?.flex_pack ? flexPackSeasonLine(cart.flex_pack) : when);
  const summaryVenue =
    packageSummary?.venueName ||
    cart?.flex_pack?.venue?.name ||
    eventVenue?.name ||
    "";
  // A package or flex pack is the thing being bought, so its artwork wins over
  // the poster of whichever event the cart happens to be anchored to.
  const eventPosterSrc = imageUrl(
    cart?.package?.image ||
      cart?.flex_pack?.image ||
      (event?.image as { url?: string } | undefined) ||
      (cart?.event as { image?: { url?: string } } | undefined)?.image,
  );
  const venueSlug =
    (event?.venue as { slug?: string } | undefined)?.slug ||
    (cart?.event as { venue?: { slug?: string } } | undefined)?.venue?.slug;
  const summaryTicket = cart?.tickets?.[0];
  const seatViewCandidates = getSeatViewImageCandidates(
    venueSlug,
    summaryTicket?.sectionNumber as string | number | undefined,
    summaryTicket?.sectionName as string | number | undefined,
  );
  const dueAmount =
    dueTotal ||
    (cart?.package
      ? packageTotals.total
      : cart?.flex_pack
        ? flexTotals?.total || 0
        : Number(cart?.total || 0));

  const elementsOptions = useMemo(
    () =>
      clientSecret
        ? {
            clientSecret,
            appearance: stripePaymentElementAppearance(
              branding.theme.accent,
              branding.theme.buttonTextColor,
            ),
            fonts: STRIPE_PAYMENT_ELEMENT_FONTS,
            loader: "always" as const,
          }
        : undefined,
    [clientSecret, branding],
  );

  const needsGuestContact =
    Boolean(cart) &&
    !isAuthenticated &&
    !guestBuyer &&
    isGuestEligibleCart(cart);
  const awaitingAuth = !authReady;
  const shellLoading = awaitingAuth || (loading && !expiredOpen);
  const loaderBranding = branding.organization
    ? {
        primaryColor: branding.theme.accent,
        logoSrc: branding.theme.brandLogoSrc,
        name: branding.orgLabel,
      }
    : null;

  // Hold the tenant loader here until the destination route commits, so leaving
  // checkout never flashes an empty page.
  if (leaving || leavingForLogin) {
    return <BrandedLoader branding={loaderBranding} />;
  }

  return (
    <BrandedCheckoutShell
      accent={branding.theme.accent || BLOCKTICKETS_NAVY}
      remainingSeconds={
        cart && !cancelling
          ? checkoutHoldSeconds(cart.remainingTime)
          : null
      }
      holdPaused={leaveOpen || cancelling}
      onBack={() => setLeaveOpen(true)}
      onExpire={handleHoldExpired}
      loading={shellLoading}
      loaderBranding={loaderBranding}
    >
      {expiredOpen ? null : loadError ? (
        <div className={`${lightCard} mx-auto mt-10 max-w-lg p-8 text-center`}>
          <h1 className="text-[22px] font-semibold">Checkout unavailable</h1>
          <p className={`mt-2 ${muted}`}>{loadError}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <BrandedActionButton
              tone="secondary"
              loading={cancelling}
              loadingLabel="Cancelling…"
              onClick={cancelOrder}
              className="w-full px-5 py-2.5 text-[14px] sm:w-auto"
            >
              Cancel order
            </BrandedActionButton>
            <Button href="/">Back home</Button>
          </div>
        </div>
      ) : (
        <div className="mx-auto grid max-w-[1140px] grid-cols-1 gap-5 px-3.5 pb-28 pt-3.5 md:grid-cols-[minmax(0,1fr)_372px] md:px-5 md:pt-6">
          <div className="order-2 flex min-w-0 flex-col gap-3.5 md:order-1 md:col-start-1 md:row-start-1">
            <div className={`${lightCard} flex flex-col gap-5 p-[22px]`}>
              {needsGuestContact ? null : (
              <div>
                <h1 className="text-[24px] font-semibold tracking-[-0.03em]">
                  Payment
                </h1>
                <p className={`mt-1 text-[14px] ${muted}`}>
                  Complete your purchase to lock in these seats.
                </p>
              </div>
              )}
              {fundraisingCampaign && !needsGuestContact ? (
                <div className="rounded-[14px] border border-[rgba(5,27,53,0.08)] bg-[#f7f8fc] p-4">
                  <p className="text-[14px] font-semibold">
                    {(fundraisingCampaign.title as string) ||
                      "Support the campaign"}
                  </p>
                  <p className={`mt-1 text-[13px] ${muted}`}>
                    Optional donation added to your checkout.
                  </p>
                  <input
                    className="mt-3 h-12 w-full rounded-full border border-[rgba(5,27,53,0.16)] bg-white px-[18px] text-[15px] text-[#051b35] outline-none"
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
                    <p className={`mt-2 text-[13px] ${muted}`}>
                      Donation total {formatCurrency(donationPricing.totalCharge)}
                    </p>
                  ) : null}
                </div>
              ) : null}
              <div>
                {needsGuestContact ? (
                  <GuestContact
                    loginHref={checkoutLoginHref}
                    onSignIn={() => {
                      setLastKnown(
                        `${window.location.pathname}${window.location.search}`,
                      );
                      markCheckoutLoginDetour();
                    }}
                    onContinue={(buyer) => void confirmGuestBuyer(buyer)}
                    buttonColor={branding.theme.buttonColor}
                    buttonTextColor={branding.theme.buttonTextColor}
                  />
                ) : clientSecret && stripe && elementsOptions && checkoutCart ? (
                  <Elements
                    key={clientSecret}
                    stripe={stripe}
                    options={elementsOptions}
                  >
                    <CheckoutPaymentForm
                      intentId={intentId}
                      clientSecret={clientSecret}
                      cart={checkoutCart}
                      donationChargeTotal={donationPricing.totalCharge}
                      donationRequirementMet={donationRequirementMet}
                      isRefreshingIntent={isRefreshingIntent}
                      buttonColor={branding.theme.buttonColor}
                      buttonTextColor={branding.theme.buttonTextColor}
                      accent={branding.theme.accent}
                      orgLabel={branding.orgLabel}
                      onTotalChange={setDueTotal}
                      onPromoChange={setPromoDiscount}
                      onSuccess={() => goToSuccess(intentId)}
                      onDeclined={setDeclineMsg}
                      onExpired={() =>
                        setDeclineMsg(
                          "Your seat hold expired. Please select tickets again.",
                        )
                      }
                    />
                  </Elements>
                ) : (
                  <div className="flex justify-center py-8">
                    <Spinner />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="order-1 flex min-w-0 flex-col gap-3 md:order-none md:col-start-2 md:row-start-1">
            <div className="md:sticky md:top-[84px]">
            <div className={`${lightCard} flex flex-col gap-4 p-[18px]`}>
              <div className="flex items-center gap-3.5">
                <div className="h-[52px] w-[52px] shrink-0 overflow-hidden rounded-xl border border-[rgba(5,27,53,0.08)] bg-[#f1f3f8]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={eventPosterSrc}
                    alt={eventTitle}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <div className="text-[16px] font-semibold tracking-[-0.02em]">
                    {eventTitle}
                  </div>
                  {summaryWhen ? (
                    <div className={`text-[13px] ${muted}`}>{summaryWhen}</div>
                  ) : null}
                  {summaryVenue ? (
                    <div className={`text-[13px] ${muted}`}>{summaryVenue}</div>
                  ) : null}
                </div>
              </div>
              {cart?.access_pass_template ? (
                <>
                  <div className="h-px bg-[rgba(5,27,53,0.08)]" />
                  <div className="flex justify-between gap-3 text-[14px]">
                    <span className="min-w-0 truncate">Access pass</span>
                    <span className="shrink-0 tabular-nums">
                      {formatCurrency(
                        Number(
                          cart.access_pass_template.price || cart.total || 0,
                        ),
                      )}
                    </span>
                  </div>
                </>
              ) : cart?.package ? (
                <>
                  {packageSeats.length ? (
                    <>
                      <div className="h-px bg-[rgba(5,27,53,0.08)]" />
                      <div className="flex flex-col gap-2.5">
                        {packageSeats.map((seat, index) => (
                          <div
                            key={`${seat.seatLine}-${index}`}
                            className="flex items-start justify-between gap-3"
                          >
                            <div className="flex min-w-0 flex-col gap-0.5">
                              <div className="text-[14px] font-semibold">
                                {seat.seatLine}
                              </div>
                              <div className={`min-w-0 text-[12px] ${muted}`}>
                                {seat.context}
                              </div>
                            </div>
                            <div className="shrink-0 text-[14px] font-semibold tabular-nums">
                              {formatCurrency(seat.price)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : cart.package.name ? (
                    <>
                      <div className="h-px bg-[rgba(5,27,53,0.08)]" />
                      <div className={`text-[14px] ${muted}`}>
                        {cart.package.name}
                      </div>
                    </>
                  ) : null}
                  <div className="h-px bg-[rgba(5,27,53,0.08)]" />
                  <div className="flex flex-col gap-2.5 text-[14px] text-[#4a5567]">
                    <div className="flex justify-between gap-3">
                      <span>Subtotal</span>
                      <span className="tabular-nums text-[#051b35]">
                        {formatCurrency(packageTotals.subtotal)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span>Tax</span>
                      <span className="tabular-nums text-[#051b35]">
                        {formatCurrency(resolveCheckoutTax(cart))}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span>Processing Fee</span>
                      <span className="tabular-nums text-[#051b35]">
                        {formatCurrency(packageTotals.processingFee)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span>Service Fee</span>
                      <span className="tabular-nums text-[#051b35]">
                        {formatCurrency(packageTotals.serviceFee)}
                      </span>
                    </div>
                  </div>
                </>
              ) : cart?.flex_pack ? (
                <>
                  <div className="h-px bg-[rgba(5,27,53,0.08)]" />
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <div className="text-[14px] font-semibold">
                        {flexVoucherCount} flex{" "}
                        {flexVoucherCount === 1 ? "voucher" : "vouchers"}
                      </div>
                      {flexVoucherCount > 0 && cart.flex_pack.price != null ? (
                        <div className={`min-w-0 text-[12px] ${muted}`}>
                          {formatCurrency(
                            Number(cart.flex_pack.price) / flexVoucherCount,
                          )}{" "}
                          each
                        </div>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-[14px] font-semibold tabular-nums">
                      {formatCurrency(flexTotals?.subtotal || 0)}
                    </div>
                  </div>
                  <div className="h-px bg-[rgba(5,27,53,0.08)]" />
                  <div className="flex flex-col gap-2.5 text-[14px] text-[#4a5567]">
                    <div className="flex justify-between gap-3">
                      <span>Subtotal</span>
                      <span className="tabular-nums text-[#051b35]">
                        {formatCurrency(flexTotals?.subtotal || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span>Tax</span>
                      <span className="tabular-nums text-[#051b35]">
                        {formatCurrency(resolveCheckoutTax(cart))}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span>Processing Fee</span>
                      <span className="tabular-nums text-[#051b35]">
                        {formatCurrency(flexTotals?.processingFee || 0)}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <span>Service Fee</span>
                      <span className="tabular-nums text-[#051b35]">
                        {formatCurrency(flexTotals?.serviceFee || 0)}
                      </span>
                    </div>
                  </div>
                </>
              ) : cart?.tickets?.length ? (
                <>
                  <div className="h-px bg-[rgba(5,27,53,0.08)]" />
                  <div className="flex items-start gap-3.5">
                    <div className="h-[84px] w-[84px] shrink-0 overflow-hidden rounded-xl border border-[rgba(5,27,53,0.10)] bg-[#f1f3f8]">
                      <SeatViewImage
                        candidates={seatViewCandidates}
                        alt="Seat view for this ticket"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      {ticketSummary.offerName ? (
                        <span
                          className="inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold"
                          style={{
                            background: branding.theme.accentSoft,
                            color: branding.theme.accent,
                          }}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="h-3 w-3"
                            aria-hidden
                          >
                            <path d="M12 2.5l2.6 6.3 6.9.6-5.2 4.5 1.6 6.7L12 16.9 6.1 20.6l1.6-6.7L2.5 9.4l6.9-.6L12 2.5z" />
                          </svg>
                          {ticketSummary.offerName}
                        </span>
                      ) : null}
                      <div className="text-[16px] font-semibold tracking-[-0.015em]">
                        {ticketSummary.seatLine}
                      </div>
                      <div className={`text-[13px] ${muted}`}>
                        {ticketSummary.subtitle}
                      </div>
                    </div>
                  </div>
                  <div className="h-px bg-[rgba(5,27,53,0.08)]" />
                  <div className="flex flex-col gap-2.5 text-[14px] text-[#4a5567]">
                    <div className="flex justify-between gap-3">
                      <span>
                        Tickets: {formatCurrency(ticketSummary.unit)} x{" "}
                        {ticketSummary.count}
                      </span>
                      <span className="tabular-nums text-[#051b35]">
                        {formatCurrency(ticketSummary.subtotal)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span>Tax</span>
                      <span className="tabular-nums text-[#051b35]">
                        {formatCurrency(resolveCheckoutTax(cart))}
                      </span>
                    </div>
                  </div>
                </>
              ) : cart?.package?.name ? (
                <>
                  <div className="h-px bg-[rgba(5,27,53,0.08)]" />
                  <div className={`text-[14px] ${muted}`}>
                    {cart.package.name}
                  </div>
                </>
              ) : null}
              <div className="h-px bg-[rgba(5,27,53,0.08)]" />
              {!cart?.tickets?.length &&
              !cart?.package &&
              !cart?.flex_pack &&
              cart?.access_pass_template ? (
                <div className="flex justify-between gap-3 text-[14px] text-[#4a5567]">
                  <span>Tax</span>
                  <span className="tabular-nums text-[#051b35]">
                    {formatCurrency(resolveCheckoutTax(cart))}
                  </span>
                </div>
              ) : null}
              {promoDiscount ? (
                <div className="flex justify-between gap-3 text-[14px] text-[#4a5567]">
                  <span>{promoSummaryLabel(promoDiscount.code)}</span>
                  <span className="tabular-nums text-[#051b35]">
                    -{formatCurrency(promoDiscount.amount)}
                  </span>
                </div>
              ) : null}
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[15px] font-semibold">
                  Total
                </span>
                <span className="text-[26px] font-semibold tracking-[-0.03em] tabular-nums">
                  {formatCurrency(dueAmount)}
                </span>
              </div>
            </div>
            </div>
          </div>
        </div>
      )}

      {expiredOpen && (
        <Modal
          variant="light"
          title="Cart expired"
          onClose={() => void startOver()}
          busy={restarting}
        >
          <p className="mt-4 text-[15px] text-[#6e7180]">
            Your reserved tickets were released. Please select tickets again.
          </p>
          <BrandedActionButton
            primaryColor={branding.theme.accent}
            textColor={branding.theme.buttonTextColor}
            loading={restarting}
            loadingLabel="Starting over…"
            onClick={() => void startOver()}
            className="mt-5 w-full"
          >
            Start over
          </BrandedActionButton>
        </Modal>
      )}

      {leaveOpen && (
        <Modal
          variant="light"
          title="Are you sure?"
          onClose={() => setLeaveOpen(false)}
          busy={cancelling}
        >
          <p className="mt-4 text-[15px] text-[#6e7180]">
            If you leave this page, you&apos;ll lose your chance to purchase
            these tickets.
          </p>
          <div className="mt-5 flex flex-col gap-3">
            <BrandedActionButton
              tone="secondary"
              loading={cancelling}
              loadingLabel="Cancelling…"
              onClick={cancelOrder}
              className="w-full"
            >
              Cancel order
            </BrandedActionButton>
            <BrandedActionButton
              primaryColor={branding.theme.accent}
              textColor={branding.theme.buttonTextColor}
              disabled={cancelling}
              onClick={() => setLeaveOpen(false)}
              className="w-full"
            >
              Continue with checkout
            </BrandedActionButton>
          </div>
        </Modal>
      )}

      {declineMsg && (
        <Modal
          variant="light"
          title="Card declined"
          onClose={() => setDeclineMsg("")}
        >
          <p className="mt-4 text-[15px] text-[#6e7180]">{declineMsg}</p>
          <BrandedActionButton
            primaryColor={branding.theme.accent}
            textColor={branding.theme.buttonTextColor}
            onClick={() => setDeclineMsg("")}
            className="mt-5 w-full"
          >
            Try again
          </BrandedActionButton>
        </Modal>
      )}
    </BrandedCheckoutShell>
  );
}


export default function CheckoutPageRoute() {
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
      <CheckoutPage />
    </Suspense>
  );
}
