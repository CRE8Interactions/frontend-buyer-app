"use client";

import { Suspense, useEffect, useLayoutEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import BrandedActionButton from "@/components/atoms/BrandedActionButton";
import RouteLoader from "@/components/molecules/RouteLoader";
import { useAuth } from "@/lib/auth";
import { BLOCKTICKETS_NAVY, type BrandingOrganization } from "@/lib/branding";
import {
  checkoutBrandingFromCart,
  type CheckoutCartBrandingSource,
} from "@/lib/checkoutBranding";
import {
  fetchCompletedOrder,
  type OrderData,
  type OrderEvent,
} from "@/lib/completedOrder";
import {
  eventDoorsIso,
  eventWhenWithDoors,
  formatCurrency,
  formatDoorsTime,
  formatEventWhen,
  imageUrl,
  isRequestCanceled,
} from "@/lib/helpers";
import { clearStoredCart, getStoredCart } from "@/lib/cart";
import { getGuestCheckoutEmail } from "@/lib/guestCheckout";
import { hideIntercomLauncher } from "@/lib/intercom";
import { cacheOrgBranding } from "@/lib/orgBrandingCache";
import {
  completedOrderPromoCode,
  promoSummaryLabel,
  resolveCompletedOrderFees,
  ticketSelectionSummary,
} from "@/lib/ticketSummary";
import {
  flexPackSeasonLine,
  flexPackVoucherCount,
} from "@/lib/flexPackDisplay";
import { walletSectionHref } from "@/lib/walletNav";
import {
  formatVenueLocationFromVenue,
  formatVenueStreetAddressFromVenue,
} from "@/lib/venueLocation";
import {
  formatOrderPaymentMethodSummary,
  orderPaymentDetailsPollOptions,
  orderPaymentDetailsReady,
  waitUntilOrderPaymentDetailsReady,
} from "@/lib/orderPayment";
import { downloadOrderReceipt } from "@/lib/orderReceipt";
import {
  clearStripePaymentSyncMark,
  msUntilStripePaymentSyncReady,
} from "@/lib/stripePaymentSync";
import {
  trackCheckoutCompleted,
  trackPurchase,
  type TrackingOrganization,
} from "@/lib/tracking";

const NAVY = "#051b35";
const MUTED = "#6e7180";
const CARD =
  "rounded-[18px] border border-[rgba(5,27,53,0.08)] bg-white shadow-[0_10px_30px_-20px_rgba(5,27,53,0.35)]";

function resolveOrderDisplayId(order: OrderData | null): string {
  if (order?.id == null) return "";
  return String(order.id);
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-[14px] text-[#4a5567]">
      <span>{label}</span>
      <span className="tabular-nums text-[#051b35]">{value}</span>
    </div>
  );
}

function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const intentId = searchParams.get("intentId") || "";
  const { ready: authReady, isAuthenticated, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [error, setError] = useState("");
  const [receiptMsg, setReceiptMsg] = useState("");
  const [downloadingReceipt, setDownloadingReceipt] = useState(false);
  const [allowCachedBranding, setAllowCachedBranding] = useState(false);

  useEffect(() => {
    hideIntercomLauncher();
  }, []);

  useLayoutEffect(() => {
    setAllowCachedBranding(true);
  }, []);

  useEffect(() => {
    if (!intentId) {
      setError("Missing payment reference.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    let delayTimer: ReturnType<typeof setTimeout> | null = null;
    const abort = new AbortController();
    const cartId = getStoredCart()?.cartId || null;

    const applyOrder = (orderData: OrderData) => {
      setOrder(orderData);
      setError("");
      clearStoredCart();
      if (orderPaymentDetailsReady(orderData)) {
        clearStripePaymentSyncMark();
      }

      const organization = (orderData?.event?.organization ||
        (orderData?.package as { organization?: TrackingOrganization } | null)
          ?.organization ||
        (orderData?.flex_pack as { organization?: TrackingOrganization } | null)
          ?.organization ||
        orderData?.access_pass_template?.organization) as
        | TrackingOrganization
        | undefined;
      cacheOrgBranding(organization as BrandingOrganization | undefined);
      trackPurchase({
        organization,
        order: orderData,
      });
      trackCheckoutCompleted(cartId);
    };

    const load = async () => {
      try {
        const waitMs = msUntilStripePaymentSyncReady();
        if (waitMs > 0) {
          await new Promise<void>((resolve) => {
            delayTimer = setTimeout(resolve, waitMs);
          });
        }
        if (cancelled) return;
        const orderData = await waitUntilOrderPaymentDetailsReady(
          () => fetchCompletedOrder(intentId),
          { ...orderPaymentDetailsPollOptions(), signal: abort.signal },
        );
        if (cancelled || !orderData) return;
        applyOrder(orderData);
      } catch (err) {
        if (cancelled) return;
        if (isRequestCanceled(err)) {
          try {
            const orderData = await waitUntilOrderPaymentDetailsReady(
              () => fetchCompletedOrder(intentId),
              { ...orderPaymentDetailsPollOptions(), signal: abort.signal },
            );
            if (cancelled || !orderData) return;
            applyOrder(orderData);
            return;
          } catch (retryErr) {
            if (cancelled || isRequestCanceled(retryErr)) return;
            setError("Unable to load your order.");
            return;
          }
        }
        setError("Unable to load your order.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
      abort.abort();
      if (delayTimer != null) clearTimeout(delayTimer);
    };
  }, [intentId]);

  const event = order?.package
    ? ([...(order.package.events || [])].sort((a, b) =>
        String(a.start || "").localeCompare(String(b.start || "")),
      )[0] as OrderEvent)
    : order?.access_pass_template
      ? ([...(order.access_pass_template.events || [])].sort((a, b) =>
          String(a.start || "").localeCompare(String(b.start || "")),
        )[0] as OrderEvent)
      : order?.event;

  const isAccessPass = Boolean(order?.access_pass_template);
  const ticketsHref = walletSectionHref("events");
  const accessPassHref = order?.access_pass?.uuid
    ? `${ticketsHref}access-passes/${order.access_pass.uuid}/`
    : ticketsHref;

  const branding = checkoutBrandingFromCart(
    order as CheckoutCartBrandingSource | null,
    allowCachedBranding ? undefined : null,
  );
  const accent = branding.theme.accent || BLOCKTICKETS_NAVY;

  const orderFees = resolveCompletedOrderFees(order);
  const flexVoucherCount = flexPackVoucherCount(
    order?.flex_pack?.gameTickets ?? order?.vouchers?.length,
  );
  const flexSeasonLine = order?.flex_pack
    ? flexPackSeasonLine(order.flex_pack)
    : "";

  const downloadReceipt = async () => {
    if (!order || !intentId) return;
    setReceiptMsg("");
    setDownloadingReceipt(true);
    try {
      await downloadOrderReceipt({
        order,
        purchaser: {
          firstName: user?.firstName || String(order.firstName || ""),
          lastName: user?.lastName || String(order.lastName || ""),
          email:
            user?.email ||
            (typeof order.email === "string" ? order.email : "") ||
            getGuestCheckoutEmail(),
        },
        sellerLogoUrl: branding.theme.brandLogoSrc,
      });
    } catch {
      setReceiptMsg("Could not download receipt.");
    } finally {
      setDownloadingReceipt(false);
    }
  };

  const awaitingAuth = !authReady;
  const shellLoading = awaitingAuth || loading;
  const loaderBranding = branding.organization
    ? {
        primaryColor: accent,
        logoSrc: branding.theme.brandLogoSrc,
        name: branding.orgLabel,
      }
    : null;

  const timezone =
    event?.venue?.timezone || order?.flex_pack?.venue?.timezone;
  const whenLine = order?.flex_pack
    ? flexSeasonLine
    : eventWhenWithDoors(
        event?.start,
        eventDoorsIso(event),
        timezone,
      );
  const doorsTime = formatDoorsTime(eventDoorsIso(event), timezone);
  const startTime = formatEventWhen(event?.start, timezone, "h:mm A");
  const venue =
    order?.flex_pack?.venue ||
    order?.access_pass_template?.venue ||
    event?.venue ||
    null;
  const venueName = venue?.name || "";
  const venueAddress = formatVenueStreetAddressFromVenue(venue);
  const venueLine = formatVenueLocationFromVenue(venue);
  const mapsQuery = [venueName, venueAddress].filter(Boolean).join(" ");

  const tickets = order?.tickets || [];
  const ticketSummary = ticketSelectionSummary(
    tickets,
    order?.package ? { defaultOffer: "Standard admission" } : undefined,
  );
  const thumbSrc = imageUrl(
    order?.flex_pack?.image || event?.image,
    branding.theme.logoSrc,
  );
  const title =
    order?.access_pass_template?.name ||
    order?.flex_pack?.name ||
    order?.package?.name ||
    event?.name ||
    "Your tickets";
  const orderDisplayId = resolveOrderDisplayId(order);
  const paymentMethod = formatOrderPaymentMethodSummary(order);
  const ticketEmail =
    user?.email ||
    (typeof order?.email === "string" ? order.email : "") ||
    (typeof order?.purchaserEmail === "string" ? order.purchaserEmail : "") ||
    getGuestCheckoutEmail();
  const mobileTicketMessage = ticketEmail
    ? `We've emailed it to ${ticketEmail} — add it to your wallet now.`
    : isAuthenticated
      ? "You will instantly receive your ticket and store it in your account."
      : "We've emailed your tickets. Create an account to manage them in your wallet.";
  const walletHref = isAuthenticated ? accessPassHref : ticketsHref;
  const walletLabel =
    isAuthenticated && isAccessPass ? "View access pass" : "Go to my wallet";

  if (shellLoading) {
    return <RouteLoader branding={loaderBranding} />;
  }

  return (
    <div className="min-h-screen overflow-y-auto bg-[#f7f8fc]" style={{ color: NAVY }}>
      <header
        className="sticky top-0 z-[2] flex items-center gap-3.5 px-5 py-3 text-white"
        style={{ background: accent }}
      >
        <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl bg-white p-[7px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={branding.theme.brandLogoSrc}
            alt=""
            className="max-h-full max-w-full object-contain"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="truncate text-[16px] font-semibold tracking-[-0.015em]">
            {branding.orgLabel}
          </div>
          {orderDisplayId ? (
            <div className="text-[12px] tabular-nums text-white/[0.78]">
              Order {orderDisplayId} · confirmed
            </div>
          ) : null}
        </div>
      </header>

      {error || !order ? (
        <div className={`${CARD} mx-auto mt-10 max-w-lg p-8 text-center`}>
          <h1 className="text-[22px] font-semibold">Order not found</h1>
          <p className="mt-2 text-[15px]" style={{ color: MUTED }}>
            {error}
          </p>
          <Link
            href={walletHref}
            className="mt-6 inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-[15px] font-semibold no-underline"
            style={{ background: accent, color: branding.theme.buttonTextColor }}
          >
            {walletLabel}
          </Link>
        </div>
      ) : (
        <div className="mx-auto grid max-w-[1140px] grid-cols-1 items-start gap-5 px-3.5 pb-10 pt-3.5 md:px-5 md:pt-6 lg:grid-cols-[minmax(0,1fr)_372px]">
          <div className="flex items-center gap-3.5 lg:col-span-2">
            <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-[#a6e773]">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke={NAVY}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
                aria-hidden
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <h1 className="text-[26px] font-semibold tracking-[-0.03em] md:text-[30px]">
              Order confirmation
            </h1>
          </div>

          <aside className="flex min-w-0 flex-col gap-3 lg:col-start-2 lg:row-start-2 lg:sticky lg:top-[88px]">
            <div className={`${CARD} flex flex-col gap-4 p-[18px]`}>
              <div className="text-[16px] font-semibold tracking-[-0.015em]">
                Order summary
              </div>
              <div className="flex flex-col gap-2.5">
                <SummaryRow
                  label="Subtotal"
                  value={formatCurrency(orderFees.subtotal)}
                />
                <SummaryRow label="Tax" value={formatCurrency(orderFees.tax)} />
                <SummaryRow
                  label="Processing Fee"
                  value={formatCurrency(orderFees.processingFee)}
                />
                <SummaryRow
                  label="Service Fee"
                  value={formatCurrency(orderFees.serviceFee)}
                />
                {orderFees.additionalFee > 0 ? (
                  <SummaryRow
                    label="Additional Fee"
                    value={formatCurrency(orderFees.additionalFee)}
                  />
                ) : null}
                {order.discountApplied ? (
                  <SummaryRow
                    label={promoSummaryLabel(completedOrderPromoCode(order))}
                    value={`-${formatCurrency(order.discountApplied)}`}
                  />
                ) : null}
              </div>
              <div className="h-px bg-[rgba(5,27,53,0.08)]" />
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[15px] font-semibold">Total paid</span>
                <span className="text-[26px] font-semibold tracking-[-0.03em] tabular-nums">
                  {formatCurrency(orderFees.total)}
                </span>
              </div>
              <div className="h-px bg-[rgba(5,27,53,0.08)]" />
              <div className="flex flex-col gap-2.5">
                <SummaryRow label="Payment method" value={paymentMethod} />
                {orderDisplayId ? (
                  <SummaryRow label="Order" value={orderDisplayId} />
                ) : null}
              </div>
              <BrandedActionButton
                tone="secondary"
                loading={downloadingReceipt}
                loadingLabel="Downloading…"
                onClick={downloadReceipt}
                className="w-full py-3.5"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                  aria-hidden
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download receipt
              </BrandedActionButton>
              {receiptMsg ? (
                <p className="text-[13px] text-[#b91c1c]">{receiptMsg}</p>
              ) : null}
            </div>
          </aside>

          <div className="flex min-w-0 flex-col gap-3 lg:col-start-1 lg:row-start-2">
            <div className={`${CARD} flex flex-col gap-[18px] p-5`}>
              <div className="flex items-start gap-4">
                <div className="h-[92px] w-[92px] shrink-0 overflow-hidden rounded-[14px] border border-[rgba(5,27,53,0.10)] bg-[#f1f3f8]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumbSrc}
                    alt=""
                    className="block h-full w-full object-cover"
                  />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  {ticketSummary.offerName ? (
                    <span
                      className="inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-semibold"
                      style={{
                        background: `color-mix(in srgb, ${accent} 16%, white)`,
                        color: accent,
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
                  <div className="text-[22px] font-semibold tracking-[-0.025em]">
                    {ticketSummary.count ? ticketSummary.seatLine : title}
                  </div>
                  <div className="text-[14px]" style={{ color: MUTED }}>
                    {ticketSummary.count
                      ? ticketSummary.subtitle
                      : isAccessPass
                        ? isAuthenticated
                          ? "Your access pass is in your wallet"
                          : "Your access pass is on the way"
                        : order?.flex_pack
                          ? `${flexVoucherCount} flex ${
                              flexVoucherCount === 1 ? "voucher" : "vouchers"
                            }${isAuthenticated ? " in your wallet" : " emailed to you"}`
                          : isAuthenticated
                            ? "Your tickets are in your wallet"
                            : "Your tickets have been emailed"}
                  </div>
                </div>
              </div>
              <div className="h-px bg-[rgba(5,27,53,0.08)]" />
              <div className="flex flex-col gap-1.5">
                <div className="text-[19px] font-semibold tracking-[-0.02em]">
                  {ticketSummary.count ? title : event?.name || title}
                </div>
                {whenLine ? (
                  <div className="text-[14px]" style={{ color: MUTED }}>
                    {whenLine}
                  </div>
                ) : null}
                {venueLine ? (
                  <div className="text-[14px]" style={{ color: MUTED }}>
                    {venueLine}
                  </div>
                ) : null}
              </div>
              <Link
                href={walletHref}
                className="flex w-full items-center justify-center gap-2.5 rounded-full px-[26px] py-4 text-[16px] font-semibold no-underline"
                style={{ background: accent, color: branding.theme.buttonTextColor }}
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
                  <path d="M20 12V8H6a2 2 0 0 1 0-4h12v4" />
                  <path d="M4 6v12a2 2 0 0 0 2 2h14v-4" />
                  <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
                </svg>
                {walletLabel}
              </Link>
            </div>

            <div className={`${CARD} flex flex-col gap-4 p-5`}>
              <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#8a93a3]">
                Know before you go
              </div>
              {doorsTime || startTime ? (
                <div className="flex gap-3.5">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={accent}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mt-0.5 h-[18px] w-[18px] shrink-0"
                    aria-hidden
                  >
                    <circle cx="12" cy="12" r="9" />
                    <polyline points="12 7 12 12 16 14" />
                  </svg>
                  <div className="text-[14px]" style={{ color: "#4a5567" }}>
                    <span className="font-semibold" style={{ color: NAVY }}>
                      {doorsTime ? `Doors open ${doorsTime}.` : "Arrive early."}
                    </span>
                    {startTime ? ` Event starts ${startTime}.` : ""}
                  </div>
                </div>
              ) : null}
              {venueName ? (
                <div className="flex gap-3.5">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={accent}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mt-0.5 h-[18px] w-[18px] shrink-0"
                    aria-hidden
                  >
                    <path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <div className="text-[14px]" style={{ color: "#4a5567" }}>
                    <span className="font-semibold" style={{ color: NAVY }}>
                      {venueName}.
                    </span>
                    {venueAddress ? ` ${venueAddress}. ` : " "}
                    {mapsQuery ? (
                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(mapsQuery)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold underline"
                        style={{ color: accent }}
                      >
                        Open in maps
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}
              <div className="flex gap-3.5">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={accent}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mt-0.5 h-[18px] w-[18px] shrink-0"
                  aria-hidden
                >
                  <rect x="5" y="2" width="14" height="20" rx="2" />
                  <line x1="12" y1="18" x2="12.01" y2="18" />
                </svg>
                <div className="text-[14px]" style={{ color: "#4a5567" }}>
                  <span className="font-semibold" style={{ color: NAVY }}>
                    Your phone is your ticket.
                  </span>
                  {` ${mobileTicketMessage}`}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CheckoutSuccessPageRoute() {
  return (
    <Suspense fallback={<RouteLoader />}>
      <CheckoutSuccessPage />
    </Suspense>
  );
}
