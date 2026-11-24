"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import CheckoutPaymentForm, {
  type CheckoutPromoDiscount,
} from "@/components/organisms/CheckoutPaymentForm";
import CheckoutAddOns from "@/components/organisms/CheckoutAddOns";
import CheckoutFundraisingDonation from "@/components/organisms/CheckoutFundraisingDonation";
import AddonPickupDetails from "@/components/molecules/AddonPickupDetails";
import BrandedCheckoutShell from "@/components/organisms/BrandedCheckoutShell";
import GuestContact from "@/components/organisms/GuestContact";
import BrandedActionButton from "@/components/atoms/BrandedActionButton";
import AccessibleSeatingBadge from "@/components/atoms/AccessibleSeatingBadge";
import VerifiedResaleBadge from "@/components/atoms/VerifiedResaleBadge";
import Button from "@/components/atoms/Button";
import Spinner from "@/components/atoms/Spinner";
import Modal from "@/components/molecules/Modal";
import { BrandedLoader } from "@/components/molecules/RouteLoader";
import SeatViewImage from "@/components/molecules/SeatViewImage";
import SectionLocatorThumb from "@/components/molecules/SectionLocatorThumb";
import { BLOCKTICKETS_NAVY, type BrandingOrganization } from "@/lib/branding";
import { holdDocumentTitle, purchaseTabTitle } from "@/lib/seo";
import {
  cachedBrandingForCheckout,
  checkoutBrandingFromCart,
  checkoutHoldSeconds,
  type CheckoutCartBrandingSource,
} from "@/lib/checkoutBranding";
import { cacheOrgBranding, orgSlugFromPathname } from "@/lib/orgBrandingCache";
import { beginRouteTransition } from "@/lib/routeTransition";
import { useClientReady } from "@/lib/useClientReady";
import {
  flexPackEachPrice,
  flexPackSeasonLine,
  flexPackVoucherCount,
} from "@/lib/flexPackDisplay";
import {
  alignPackageSeatPrices,
  checkoutTaxLine,
  getPrimaryTicketFeeBreakdown,
  packageCartTickets,
  packageOrderSummary,
  promoSummaryLabel,
  resolveFlexPackCheckoutTotals,
  resolvePackageCheckoutTotals,
  ticketSelectionSummary,
  withPackageCheckoutSeatPrices,
} from "@/lib/ticketSummary";
import { ticketsWithGaSections } from "@/lib/gaTicketSections";
import {
  dropUserCart,
  getCart,
  getPaymentIntent,
  getEventAddons,
  getSeatmapByShortCode,
  processFreeOrder,
  saveCartAddon,
  resolveFundraisingCampaign,
} from "@/lib/api";
import { readTrackingCodeForCart } from "@/lib/trackingLink";
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
  CHECKOUT_PAYMENT_COPY,
  paymentIntentLoadOutcome,
} from "@/lib/checkoutPaymentErrors";
import {
  formatCurrency,
  formatEventWhen,
  imageUrl,
  isCartExpiredResponse,
  isRequestCanceled,
} from "@/lib/helpers";
import {
  guestContactStartFailed,
  isComplimentaryWebsiteCart,
  isGuestEligibleCart,
  setGuestCheckoutBuyer,
  type GuestBuyer,
} from "@/lib/guestCheckout";
import { checkoutMarketingOrganization } from "@/lib/marketingOptIn";
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
  leaveCheckoutForSuccess,
  paymentIntentAlreadySucceeded,
  succeededStripeRedirectIntentId,
} from "@/lib/checkoutSuccess";
import {
  cartShowsGaTicketIcon,
  eventIsExplicitlyGaOnly,
  GA_TICKET_PLACEHOLDER,
  getSeatViewImageCandidates,
  seatLocationSection,
  showsSeatedGaTicketCount,
} from "@/lib/seatView";
import {
  normalizeSeatmapBackground,
  type SeatmapBackground,
  type SeatmapMapping,
} from "@/lib/seatmapLookups";
import {
  injectMetaPixel,
  trackBeginCheckout,
  trackCheckoutStarted,
  type TrackingOrganization,
} from "@/lib/tracking";
import {
  STRIPE_PAYMENT_ELEMENT_FONTS,
  stripePaymentElementAppearance,
} from "@/lib/stripePaymentElement";

import type { CheckoutCart as CartData } from "@/lib/checkoutCart";
import {
  addonApiErrorMessage,
  addonCustomerTotal,
  addonFeeRemainder,
  addonSummaryLines,
  normalizeAddonCatalogPayload,
  resolveAddonCatalogContext,
  type AddonProduct,
} from "@/lib/addonCatalog";

async function loadCheckoutSeatLocation(event: CartData["event"]) {
  const slug = event?.slug || event?.seoUrl;
  const code = event?.shortCode || event?.shortcode;
  if (!slug || !code) return null;
  try {
    const res = await getSeatmapByShortCode(String(code), String(slug));
    const raw = res?.data as
      | {
          ga_only?: boolean;
          background?: unknown;
          mapping?: SeatmapMapping;
        }
      | null
      | undefined;
    if (!raw || raw.ga_only) return { ga_only: true, background: null, mapping: null };
    return {
      ga_only: false,
      background: normalizeSeatmapBackground(raw.background),
      mapping: (raw.mapping || null) as SeatmapMapping | null,
    };
  } catch {
    return null;
  }
}

const lightCard =
  "rounded-[18px] border border-[rgba(5,27,53,0.08)] bg-white shadow-[0_10px_30px_-20px_rgba(5,27,53,0.35)]";
const muted = "text-[#6e7180]";


function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cartIdFromQuery = searchParams.get("cartId");
  const stripeRedirectIntentId = succeededStripeRedirectIntentId(searchParams);
  const { ready: authReady, isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartData | null>(null);
  const [addonProducts, setAddonProducts] = useState<AddonProduct[]>([]);
  const [addonError, setAddonError] = useState("");

  useEffect(() => {
    const title = purchaseTabTitle(cart);
    if (!title) return;
    return holdDocumentTitle(title);
  }, [cart]);
  const [event, setEvent] = useState<CartData["event"]>(null);
  const [seatLocation, setSeatLocation] = useState<{
    ga_only?: boolean;
    background: SeatmapBackground | null;
    mapping: SeatmapMapping | null;
  } | null>(null);
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
  const [cancelError, setCancelError] = useState("");
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
  const seatLocationRef = useRef(seatLocation);
  seatLocationRef.current = seatLocation;
  const leavingForSuccessRef = useRef(false);
  const leavingForLoginRef = useRef(false);
  const paymentContextRef = useRef<{
    connectedAccountId?: string | null;
  } | null>(null);
  const guestBuyerRef = useRef<GuestBuyer | null>(null);

  useEffect(() => {
    const { eventUUID, packageUUID } = resolveAddonCatalogContext(cart);
    if (!eventUUID) {
      setAddonProducts([]);
      return undefined;
    }
    let cancelled = false;
    getEventAddons(eventUUID, packageUUID, { requireCheckoutAddons: true })
      .then((res) => {
        if (!cancelled) {
          setAddonProducts(
            normalizeAddonCatalogPayload(res.data) as AddonProduct[],
          );
        }
      })
      .catch(() => {
        if (!cancelled) setAddonProducts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [
    cart,
    cart?.event?.uuid,
    cart?.eventUUID,
    cart?.event_uuid,
    cart?.package?.uuid,
    cart?.access_pass_template?.uuid,
    cart?.resaleListing,
  ]);

  const goToSuccess = useCallback(
    (id: string) => {
      if (leavingForSuccessRef.current) return;
      leavingForSuccessRef.current = true;
      leaveCheckoutForSuccess(id, (href) => router.replace(href));
    },
    [router],
  );

  useEffect(() => {
    hideIntercomLauncher();
    captureCheckoutReferrer();
  }, []);

  // Hold the loader until the router commits to /login/ so checkout never
  // paints behind the redirect.
  const sendToLogin = useCallback(() => {
    if (leavingForLoginRef.current) return;
    leavingForLoginRef.current = true;
    setLeavingForLogin(true);
    const returnTo = `${window.location.pathname}${window.location.search}`;
    setLastKnown(returnTo);
    markCheckoutLoginDetour();
    const href = `/login/?from=${encodeURIComponent(returnTo)}`;
    beginRouteTransition(href, { replace: true });
    router.replace(href);
  }, [router]);

  const expiredRef = useRef(false);
  const [restarting, setRestarting] = useState(false);
  const [restartError, setRestartError] = useState("");
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
    setRestartError("");
    const eventData = eventRef.current || cartRef.current?.event;
    const dest =
      checkoutLeavePath(
        cartRef.current,
        eventData,
        leaveOrgSlug(),
        seatLocationRef.current,
      ) ||
      BACK_FALLBACK_HREF;
    const returnPath = getCheckoutReturnPath();
    const loginDetour = hadCheckoutLoginDetour();
    try {
      await dropUserCart(
        dropUserCartPayload(cartRef.current, eventData, getStoredCart()),
      );
    } catch {
      setRestarting(false);
      setRestartError("We couldn't release your tickets. Please try again.");
      return;
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
        seatLocationRef.current,
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
    setCancelError("");
    const eventData = eventRef.current || cartRef.current?.event;
    const dest = resolveCheckoutReturnPath(
      cartRef.current,
      eventData,
      leaveOrgSlug(),
      seatLocationRef.current,
    );
    const returnPath = getCheckoutReturnPath();
    const loginDetour = hadCheckoutLoginDetour();
    try {
      await dropUserCart(
        dropUserCartPayload(cartRef.current, eventData, getStoredCart()),
      );
    } catch {
      setCancelling(false);
      setCancelError(
        "We couldn't release your tickets. Please try cancelling again.",
      );
      return;
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
      setSeatLocation(null);
      let cartId = cartIdFromQuery;
      if (!cartId) {
        cartId = getStoredCart()?.cartId ?? null;
      }
      if (!cartId) {
        setLoadError(CHECKOUT_PAYMENT_COPY.noCart);
        setLoading(false);
        return;
      }

      try {
        const res = await getCart(cartId);
        if (cancelled) return;
        const cartData = res.data as CartData | null;
        if (!cartData?.id) {
          clearStoredCart();
          setLoadError(CHECKOUT_PAYMENT_COPY.noCart);
          return;
        }
        cartData.tickets = await ticketsWithGaSections(
          cartData.tickets || [],
          cartData.event,
        );
        // The listing image does not need the venue map. Loading that map
        // first kept the thumbnail on a spinner after the summary was ready.
        if (
          (cartData.tickets?.length ?? 0) > 0 &&
          !eventIsExplicitlyGaOnly(cartData.event)
        ) {
          void loadCheckoutSeatLocation(cartData.event).then((location) => {
            if (!cancelled) setSeatLocation(location);
          });
        }
        if (cancelled) return;
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
          const processRes = await processFreeOrder({
            cartId: cartData.id,
            trackingCode: readTrackingCodeForCart(cartData),
          });
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
          if (resolveContext.organizationUUID && !cartData?.resaleListing) {
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
          setLoadError(CHECKOUT_PAYMENT_COPY.loadFailed);
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
        if (paymentIntentLoadOutcome(err) === "gone") {
          abandonGoneCart(cartRef.current?.event);
        } else {
          // Keep sessionStorage.cart so login/redirect races and transient
          // API failures don't force the shopper to rebuild their cart.
          setLoadError(CHECKOUT_PAYMENT_COPY.loadFailed);
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

  const handleAddonChange = async (selection: {
    productUuid: string;
    variantUuid: string | null;
    quantity: number;
  }) => {
    if (!cartRef.current?.id) return;
    setAddonError("");
    try {
      await saveCartAddon(cartRef.current.id, selection);
    } catch (err) {
      setAddonError(
        addonApiErrorMessage(
          err,
          "This add-on could not be updated. Please try again.",
        ),
      );
      return;
    }
    let cartData: CartData;
    try {
      const res = await getCart(String(cartRef.current.id));
      cartData = res.data as CartData;
      cartData.tickets = await ticketsWithGaSections(
        cartData.tickets || [],
        cartData.event,
      );
      setCart(cartData);
      cartRef.current = cartData;
    } catch (err) {
      if (
        isCartExpiredResponse(err) ||
        paymentIntentLoadOutcome(err) === "gone"
      ) {
        handleHoldExpired();
      }
      return;
    }
    if (!isAuthenticated && !guestBuyerRef.current) return;
    setIsRefreshingIntent(true);
    try {
      await loadPaymentIntent(
        cartData,
        eventRef.current,
        buildFundraisingPayload(
          fundraisingCampaign as never,
          fundraisingSelection,
        ),
        guestBuyerRef.current,
      );
    } catch (err) {
      if (paymentIntentLoadOutcome(err) === "gone") handleHoldExpired();
    } finally {
      setIsRefreshingIntent(false);
    }
  };

  const checkoutOrderSubtotal = useMemo(() => {
    if (!cart) return 0;
    if (cart.flex_pack || cart.access_pass_template) {
      return (
        (Number(cart.total) || 0) +
        (Number(cart.totalTax) || 0) +
        (Number(cart.processingFee) || 0) +
        (Number(cart.serviceFee) || 0)
      );
    }
    return Number(cart.total) || 0;
  }, [cart]);

  const handleFundraisingChange = async (next: FundraisingSelection) => {
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
      if (paymentIntentLoadOutcome(err) === "gone") abandonGoneCart();
      else setLoadError(CHECKOUT_PAYMENT_COPY.loadFailed);
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
    if (!cartRef.current) return;
    guestBuyerRef.current = buyer;
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
      setGuestBuyer(buyer);
      setGuestCheckoutBuyer(buyer);
    } catch (err) {
      guestBuyerRef.current = null;
      if (isRequestCanceled(err)) return;
      if (paymentIntentLoadOutcome(err) === "gone") {
        handleHoldExpired();
        return;
      }
      if (guestContactStartFailed(err)) {
        throw err;
      }
      setLoadError(CHECKOUT_PAYMENT_COPY.loadFailed);
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
  const ticketSummary = ticketSelectionSummary(cart?.tickets || [], {
    seatedGaSection: showsSeatedGaTicketCount(
      cart?.tickets,
      event,
      seatLocation,
    ),
  });
  const packageSummary = cart?.package
    ? packageOrderSummary(
        cart.package,
        packageCartTickets(cart),
        cart.package_tickets?.length || 0,
      )
    : null;
  const packageTotals = resolvePackageCheckoutTotals(
    cart,
    packageSummary?.subtotal || 0,
  );
  const packageSeats = alignPackageSeatPrices(
    withPackageCheckoutSeatPrices(
      packageSummary?.seats || [],
      packageTotals.subtotal,
    ),
    packageTotals.subtotal,
  );
  const flexTotals = cart?.flex_pack
    ? resolveFlexPackCheckoutTotals(cart)
    : null;
  const flexVoucherCount = flexPackVoucherCount(cart?.flex_pack?.gameTickets);
  // The voucher price is the amount due. A waived processing fee is already
  // out of that total, so the per-voucher figure matches the pack card.
  const flexLineAmount = flexTotals?.total || 0;
  const flexEach = flexPackEachPrice(flexLineAmount, flexVoucherCount);
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
  const gaTicketIcon = cartShowsGaTicketIcon(cart?.tickets, event, seatLocation);
  const locatedSection = seatLocationSection(summaryTicket);
  const venueMapReady = Boolean(
    !gaTicketIcon &&
      seatLocation &&
      !seatLocation.ga_only &&
      seatLocation.background?.url &&
      seatLocation.mapping,
  );
  // Same highlights image the tickets listing uses, then the venue map.
  const seatLocationCandidates =
    !gaTicketIcon && locatedSection.sectionNumber
      ? getSeatViewImageCandidates(
          venueSlug,
          locatedSection.sectionNumber,
          locatedSection.sectionNumber,
          ["highlights", "thumbnail"],
        )
      : [];
  const showSeatLocationThumb =
    seatLocationCandidates.length > 0 || venueMapReady;
  const seatViewCandidates =
    gaTicketIcon || showSeatLocationThumb
      ? []
      : getSeatViewImageCandidates(
          venueSlug,
          summaryTicket?.sectionNumber as string | number | undefined,
          summaryTicket?.sectionName as string | number | undefined,
        );
  const addonTotal = addonCustomerTotal(cart);
  const addonLines = addonSummaryLines(cart);
  const addonFees = addonFeeRemainder(cart);
  const merchandiseDue = cart?.package
    ? packageTotals.total
    : cart?.flex_pack
      ? flexTotals?.total || 0
      : Number(cart?.total || 0);
  const dueAmount = dueTotal || merchandiseDue + addonTotal;
  const taxLine = checkoutTaxLine(cart);
  const singleEvent =
    Boolean(cart?.tickets?.length) &&
    !cart?.package &&
    !cart?.flex_pack &&
    !cart?.access_pass_template;
  const primaryFeeBreakdown = singleEvent
    ? getPrimaryTicketFeeBreakdown(cart?.tickets, cart?.am_pricing_objects)
    : null;
  const primaryFeeRows = primaryFeeBreakdown
    ? (
        [
          ["Processing Fee", primaryFeeBreakdown.processingFee],
          ["Service Fee", primaryFeeBreakdown.serviceFee],
          ["Facility Fee", primaryFeeBreakdown.facilityFee],
          ["Chargeback protection", primaryFeeBreakdown.chargeBackProtection],
        ] as const
      ).filter(([, amount]) => amount > 0)
    : [];
  const resaleServiceFee = Number(cart?.serviceFee || 0);
  const estimatedProcessingFee = Number(cart?.estimatedProcessingFee);
  const resaleProcessingFee =
    estimatedProcessingFee > 0
      ? estimatedProcessingFee
      : Number(cart?.processingFee || 0);

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
  const marketingOrg = checkoutMarketingOrganization(cart, event);
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
  if (leavingForLogin) {
    return <BrandedLoader fallback="blocktickets" routeDestination />;
  }

  if (leaving) {
    return <BrandedLoader branding={loaderBranding} routeDestination />;
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
      onBack={() => {
        setCancelError("");
        setLeaveOpen(true);
      }}
      onExpire={handleHoldExpired}
      loading={shellLoading}
      loaderBranding={loaderBranding}
    >
      {expiredOpen ? null : loadError ? (
        <div className={`${lightCard} mx-auto mt-10 max-w-lg p-8 text-center`}>
          <h1 className="text-[16px] font-semibold">Checkout unavailable</h1>
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
        <div className="mx-auto grid max-w-[1140px] grid-cols-1 gap-5 px-3.5 pb-28 pt-3.5 min-[900px]:grid-cols-[minmax(0,1fr)_372px] min-[900px]:px-5 min-[900px]:pt-6">
          <div className="order-2 flex min-w-0 flex-col gap-3.5 min-[900px]:order-1 min-[900px]:col-start-1 min-[900px]:row-start-1">
            <div className={`${lightCard} flex flex-col gap-5 p-[22px]`}>
              {needsGuestContact ? null : (
              <div>
                <h1 className="font-semibold tracking-[-0.03em] [font-size:24px]">
                  Payment
                </h1>
                <p className={`mt-1 text-[14px] ${muted}`}>
                  Complete your purchase to lock in these seats.
                </p>
              </div>
              )}
              {fundraisingCampaign && !needsGuestContact && !cart?.resaleListing ? (
                <div className="rounded-[14px] border border-[rgba(5,27,53,0.08)] bg-[#f7f8fc] p-4">
                  <CheckoutFundraisingDonation
                    campaign={fundraisingCampaign}
                    selection={fundraisingSelection}
                    orderSubtotal={checkoutOrderSubtotal}
                    disabled={isRefreshingIntent}
                    onChange={(next) => void handleFundraisingChange(next)}
                  />
                  {donationPricing.donationAmount > 0 ? (
                    <p className={`text-[13px] ${muted}`}>
                      Donation total {formatCurrency(donationPricing.totalCharge)}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {!needsGuestContact && !cart?.resaleListing ? (
                <>
                  {addonError ? (
                    <p role="alert" className="text-[14px] text-[var(--bt-error,#c0374a)]">
                      {addonError}
                    </p>
                  ) : null}
                  <CheckoutAddOns
                    products={addonProducts}
                    items={cart?.addonItems || []}
                    disabled={isRefreshingIntent}
                    onChange={handleAddonChange}
                    onSkip={() =>
                      document
                        .getElementById("checkout-payment")
                        ?.scrollIntoView({ behavior: "smooth" })
                    }
                  />
                </>
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
                    onContinue={confirmGuestBuyer}
                    buttonColor={branding.theme.buttonColor}
                    buttonTextColor={branding.theme.buttonTextColor}
                    organizationName={marketingOrg?.name}
                    optInMessage={marketingOrg?.opt_in_message}
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
                      onExpired={handleHoldExpired}
                      showMarketingOptIn={isAuthenticated}
                      organizationName={marketingOrg?.name}
                      optInMessage={marketingOrg?.opt_in_message}
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

          <div className="order-1 flex min-w-0 flex-col gap-3 min-[900px]:order-none min-[900px]:col-start-2 min-[900px]:row-start-1">
            <div className="min-[900px]:sticky min-[900px]:top-[84px]">
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
                              {seat.accessibleLabel ? (
                                <AccessibleSeatingBadge
                                  label={seat.accessibleLabel}
                                  style={{ marginTop: 4 }}
                                />
                              ) : null}
                              {seat.additionalLabel ? (
                                <div className={`text-[13px] ${muted}`}>
                                  {seat.additionalLabel}
                                </div>
                              ) : null}
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
                    {packageTotals.customFeeLines.map((line) => (
                      <div
                        key={`${line.name}-${line.amount}`}
                        className="flex justify-between gap-3"
                      >
                        <span>{line.name}</span>
                        <span className="tabular-nums text-[#051b35]">
                          {formatCurrency(line.amount)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between gap-3">
                      <span>{taxLine.label}</span>
                      <span className="tabular-nums text-[#051b35]">
                        {formatCurrency(taxLine.amount)}
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
                      {flexVoucherCount > 0 && flexEach != null ? (
                        <div className={`min-w-0 text-[12px] ${muted}`}>
                          {formatCurrency(flexEach)} each
                        </div>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-[14px] font-semibold tabular-nums">
                      {formatCurrency(flexLineAmount)}
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
                    <div className="flex justify-between gap-3">
                      <span>{taxLine.label}</span>
                      <span className="tabular-nums text-[#051b35]">
                        {formatCurrency(taxLine.amount)}
                      </span>
                    </div>
                    {flexTotals?.customFeeLines.map((line) => (
                      <div
                        key={`${line.name}-${line.amount}`}
                        className="flex justify-between gap-3"
                      >
                        <span>{line.name}</span>
                        <span className="tabular-nums text-[#051b35]">
                          {formatCurrency(line.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : cart?.tickets?.length ? (
                <>
                  <div className="h-px bg-[rgba(5,27,53,0.08)]" />
                  <div className="flex items-start gap-3.5">
                    <div className="h-[84px] w-[84px] shrink-0 overflow-hidden rounded-xl border border-[rgba(5,27,53,0.10)] bg-[#f1f3f8]">
                      {gaTicketIcon ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={GA_TICKET_PLACEHOLDER}
                          alt="General admission"
                          className="h-full w-full object-cover"
                        />
                      ) : showSeatLocationThumb ? (
                        <SectionLocatorThumb
                          background={seatLocation?.background}
                          mapping={seatLocation?.mapping}
                          sectionId={locatedSection.sectionId}
                          sectionNumber={locatedSection.sectionNumber}
                          thumbnailCandidates={seatLocationCandidates}
                          spinnerColor={branding.theme.accent}
                          priority
                          className="h-full w-full"
                        />
                      ) : (
                        <SeatViewImage
                          candidates={seatViewCandidates}
                          alt="Seat view for this ticket"
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      {ticketSummary.offerName || ticketSummary.resale ? (
                        <span className="flex flex-wrap items-center gap-2">
                          {ticketSummary.offerName ? (
                            <span
                              className="inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-[13px] font-semibold"
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
                          {ticketSummary.resale ? <VerifiedResaleBadge /> : null}
                        </span>
                      ) : null}
                      <div className="text-[16px] font-semibold tracking-[-0.015em]">
                        {ticketSummary.seatLine}
                      </div>
                      <div className={`text-[13px] ${muted}`}>
                        {ticketSummary.subtitle}
                      </div>
                      {ticketSummary.accessibleLabel ? (
                        <AccessibleSeatingBadge
                          label={ticketSummary.accessibleLabel}
                          style={{ marginTop: 4 }}
                        />
                      ) : null}
                      {ticketSummary.additionalLabel ? (
                        <div className={`text-[13px] ${muted}`}>
                          {ticketSummary.additionalLabel}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="h-px bg-[rgba(5,27,53,0.08)]" />
                  <div className="flex flex-col gap-2.5 text-[14px] text-[#4a5567]">
                    {ticketSummary.resale ? (
                      <>
                        <div className="flex justify-between gap-3">
                          <span>
                            Tickets: {formatCurrency(ticketSummary.unit)} x{" "}
                            {ticketSummary.count}
                          </span>
                          <span className="tabular-nums text-[#051b35]">
                            {formatCurrency(ticketSummary.subtotal)}
                          </span>
                        </div>
                        {resaleProcessingFee > 0 ? (
                          <div className="flex justify-between gap-3">
                            <span>Processing Fee</span>
                            <span className="tabular-nums text-[#051b35]">
                              {formatCurrency(resaleProcessingFee)}
                            </span>
                          </div>
                        ) : null}
                        {resaleServiceFee > 0 ? (
                          <div className="flex justify-between gap-3">
                            <span>Service Fee</span>
                            <span className="tabular-nums text-[#051b35]">
                              {formatCurrency(resaleServiceFee)}
                            </span>
                          </div>
                        ) : null}
                        <div className="flex justify-between gap-3">
                          <span>Tax</span>
                          <span className="tabular-nums text-[#051b35]">
                            {formatCurrency(taxLine.amount)}
                          </span>
                        </div>
                      </>
                    ) : (
                    <>
                    <div className="flex flex-col gap-0.5">
                      {primaryFeeBreakdown ? (
                        primaryFeeBreakdown.groups.length > 1 ? (
                          primaryFeeBreakdown.groups.map((group) => (
                            <div
                              key={`${group.label}-${group.unitPrice}`}
                              className="flex justify-between gap-3"
                            >
                              <span>
                                {group.label} x {group.quantity} (
                                {formatCurrency(group.unitPrice)})
                              </span>
                              <span className="tabular-nums text-[#051b35]">
                                {formatCurrency(group.subtotal)}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="flex justify-between gap-3">
                            <span className="text-[14px] text-[#4a5567]">
                              Tickets:{" "}
                              {formatCurrency(
                                primaryFeeBreakdown.groups[0]?.unitPrice,
                              )}{" "}
                              × {primaryFeeBreakdown.groups[0]?.quantity ?? 0}
                            </span>
                            <span className="tabular-nums text-[#051b35]">
                              {formatCurrency(
                                primaryFeeBreakdown.groups[0]?.subtotal,
                              )}
                            </span>
                          </div>
                        )
                      ) : ticketSummary.offerLines.length > 1 ? (
                        ticketSummary.offerLines.map((line) => (
                            <div
                              key={`${line.offerName}-${line.unit}`}
                              className="flex justify-between gap-3"
                            >
                              <span>
                                {line.offerName} x {line.count} (
                                {formatCurrency(line.unit)})
                              </span>
                              <span className="tabular-nums text-[#051b35]">
                                {formatCurrency(line.subtotal)}
                              </span>
                            </div>
                          ))
                        ) : (
                            <div className="flex justify-between gap-3">
                              <span className="text-[14px] text-[#4a5567]">
                                Tickets: {formatCurrency(ticketSummary.unit)} ×{" "}
                                {ticketSummary.count}
                              </span>
                              <span className="tabular-nums text-[#051b35]">
                                {formatCurrency(ticketSummary.subtotal)}
                              </span>
                            </div>
                          )}
                    </div>
                    {primaryFeeBreakdown ? (
                      <>
                        {primaryFeeRows.map(([label, amount]) => (
                          <div
                            key={label}
                            className="flex justify-between gap-3"
                          >
                            <span>{label}</span>
                            <span className="tabular-nums text-[#051b35]">
                              {formatCurrency(amount)}
                            </span>
                          </div>
                        ))}
                        <div className="flex justify-between gap-3">
                          <span>Tax</span>
                          <span className="tabular-nums text-[#051b35]">
                            {formatCurrency(primaryFeeBreakdown.salesTax)}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between gap-3">
                        <span>{taxLine.label}</span>
                        <span className="tabular-nums text-[#051b35]">
                          {formatCurrency(taxLine.amount)}
                        </span>
                      </div>
                    )}
                    </>
                    )}
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
                  <span>{taxLine.label}</span>
                  <span className="tabular-nums text-[#051b35]">
                    {formatCurrency(taxLine.amount)}
                  </span>
                </div>
              ) : null}
              {addonLines.map((line) => (
                <div key={line.key} className="flex flex-col gap-1 text-[14px] text-[#4a5567]">
                  <div className="flex justify-between gap-3">
                    <span>
                      {line.name}: {formatCurrency(line.unitPrice)} x {line.quantity}
                    </span>
                    <span className="tabular-nums text-[#051b35]">
                      {formatCurrency(line.subtotal)}
                    </span>
                  </div>
                  {line.pickup ? <AddonPickupDetails product={line.pickup} /> : null}
                </div>
              ))}
              {addonFees > 0 ? (
                <div className="flex justify-between gap-3 text-[14px] text-[#4a5567]">
                  <span>Add-on fees</span>
                  <span className="tabular-nums text-[#051b35]">
                    {formatCurrency(addonFees)}
                  </span>
                </div>
              ) : null}
              {promoDiscount ? (
                <div className="flex justify-between gap-3 text-[14px] text-[#4a5567]">
                  <span>{promoSummaryLabel(promoDiscount.label)}</span>
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
              {addonTotal > 0 ? (
                <p className={`text-[13px] ${muted}`}>
                  Includes {formatCurrency(addonTotal)} in add-ons
                </p>
              ) : null}
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
          hideClose
          closeOnBackdrop
        >
          <p className="mt-4 text-[15px] text-[#6e7180]">
            Your reserved tickets were released. Please select tickets again.
          </p>
          {restartError ? (
            <p role="alert" className="mt-3 text-[14px] text-[#b42318]">
              {restartError}
            </p>
          ) : null}
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
          hideClose
        >
          <p className="mt-4 text-[15px] text-[#6e7180]">
            Cancelling releases these tickets so another shopper can purchase
            them.
          </p>
          {cancelError ? (
            <p role="alert" className="mt-3 text-[14px] text-[var(--bt-error)]">
              {cancelError}
            </p>
          ) : null}
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
              onClick={() => {
                setCancelError("");
                setLeaveOpen(false);
              }}
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
          hideClose
          closeOnBackdrop
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
