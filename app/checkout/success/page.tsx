"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import BrandedActionButton, {
  ButtonBusyContents,
} from "@/components/atoms/BrandedActionButton";
import RouteLoader from "@/components/molecules/RouteLoader";
import MobileStickyFooter from "@/components/molecules/MobileStickyFooter";
import { ShopperFluidTypeStyles } from "@/components/templates/ShopperFluidType";
import { useAuth } from "@/lib/auth";
import { BLOCKTICKETS_NAVY, type BrandingOrganization } from "@/lib/branding";
import {
  checkoutBrandingFromCart,
  type CheckoutCartBrandingSource,
} from "@/lib/checkoutBranding";
import { getOrder } from "@/lib/api";
import {
  fetchCompletedOrder,
  normalizeOrderPayload,
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
import { getGuestCheckoutBuyer } from "@/lib/guestCheckout";
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
import {
  downloadOrderReceipt,
  receiptPurchaserFromSources,
} from "@/lib/orderReceipt";
import {
  clearStripePaymentSyncMark,
  msUntilStripePaymentSyncReady,
} from "@/lib/stripePaymentSync";
import {
  trackCheckoutCompleted,
  trackPurchase,
  type TrackingOrganization,
} from "@/lib/tracking";
import { useClientReady } from "@/lib/useClientReady";
import {
  addTicketToPhoneWallet,
  phoneWalletKind,
  phoneWalletLabel,
  type PhoneWalletKind,
} from "@/lib/phoneWallet";
import { isMobileDevice, seatLabel, type TicketLike } from "@/lib/wallet";

const NAVY = "#051b35";
const MUTED = "#6e7180";
const CARD =
  "rounded-[18px] border border-[rgba(5,27,53,0.08)] bg-white shadow-[0_10px_30px_-20px_rgba(5,27,53,0.35)]";

function walletableOrderTickets(
  tickets: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> {
  return tickets.filter((ticket) => String(ticket.checkInCode || "").trim());
}

function walletTicketKey(ticket: Record<string, unknown>): string {
  return String(ticket.id ?? ticket.uuid ?? ticket.checkInCode ?? "");
}

function WalletPassIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px]"
      aria-hidden
    >
      <rect x="2" y="6" width="20" height="13" rx="3" />
      <path d="M2 11h20" />
    </svg>
  );
}

function WalletAddedCheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px]"
      aria-hidden
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

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
  const [passWallet, setPassWallet] = useState<PhoneWalletKind | null>(null);
  const [walletSheetOpen, setWalletSheetOpen] = useState(false);
  const [selectedWalletTicket, setSelectedWalletTicket] = useState(0);
  const [walletSaving, setWalletSaving] = useState(false);
  const [walletError, setWalletError] = useState("");
  const [addedWalletKeys, setAddedWalletKeys] = useState<string[]>([]);
  const allowCachedBranding = useClientReady();

  useEffect(() => {
    hideIntercomLauncher();
  }, []);

  useEffect(() => {
    setPassWallet(isMobileDevice() ? phoneWalletKind() : null);
  }, []);

  useEffect(() => {
    if (!intentId) return;
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
      const guest = getGuestCheckoutBuyer();
      let purchaser = receiptPurchaserFromSources({ user, guest, order });
      if (!purchaser.firstName && !purchaser.lastName && order.orderId) {
        try {
          const res = await getOrder(String(order.orderId));
          purchaser = receiptPurchaserFromSources({
            user,
            guest,
            order: normalizeOrderPayload(res.data),
          });
        } catch {
          /* keep the page / guest / slim-order name */
        }
      }
      await downloadOrderReceipt({
        order,
        purchaser,
        sellerLogoUrl: branding.theme.brandLogoSrc,
        sellerName: branding.orgLabel,
      });
    } catch {
      setReceiptMsg("Could not download receipt.");
    } finally {
      setDownloadingReceipt(false);
    }
  };

  const awaitingAuth = !authReady;
  const displayError = intentId ? error : "Missing payment reference.";
  const shellLoading = awaitingAuth || (Boolean(intentId) && loading);
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
  const walletTickets = walletableOrderTickets(tickets);
  const addedWalletKeySet = new Set(addedWalletKeys);
  const firstUnaddedWalletIndex = walletTickets.findIndex(
    (ticket) => !addedWalletKeySet.has(walletTicketKey(ticket)),
  );
  const allWalletTicketsAdded =
    walletTickets.length > 0 && firstUnaddedWalletIndex < 0;
  const showWalletCta = Boolean(
    !isAuthenticated &&
      passWallet &&
      event &&
      walletTickets.length &&
      !order?.package &&
      !order?.flex_pack &&
      !order?.access_pass_template,
  );
  const selectedTicket =
    walletTickets[selectedWalletTicket] ||
    walletTickets[firstUnaddedWalletIndex] ||
    walletTickets[0];
  const selectedTicketAdded = selectedTicket
    ? addedWalletKeySet.has(walletTicketKey(selectedTicket))
    : true;
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
    getGuestCheckoutBuyer().email;
  const mobileTicketMessage = ticketEmail
    ? `We've emailed it to ${ticketEmail} — add it to your wallet now.`
    : isAuthenticated
      ? "You will instantly receive your ticket and store it in your account."
      : "We've emailed your tickets. Create an account to manage them in your wallet.";
  const walletHref = isAuthenticated ? accessPassHref : ticketsHref;
  const walletLabel =
    isAuthenticated && isAccessPass ? "View access pass" : "Go to my wallet";

  const openWalletSheet = () => {
    if (allWalletTicketsAdded) return;
    setSelectedWalletTicket(
      firstUnaddedWalletIndex >= 0 ? firstUnaddedWalletIndex : 0,
    );
    setWalletError("");
    setWalletSheetOpen(true);
  };

  const closeWalletSheet = () => {
    if (walletSaving) return;
    setWalletSheetOpen(false);
    setWalletError("");
  };

  const addSelectedTicketToWallet = async () => {
    if (!passWallet || !selectedTicket || !event || selectedTicketAdded) return;
    const addedKey = walletTicketKey(selectedTicket);
    setWalletSaving(true);
    setWalletError("");
    const orderOrganization =
      order && typeof order.organization === "object" && order.organization
        ? (order.organization as Record<string, unknown>)
        : null;
    try {
      const error = await addTicketToPhoneWallet(
        {
          ...event,
          organization: {
            ...orderOrganization,
            ...(typeof event.organization === "object" && event.organization
              ? event.organization
              : null),
          },
        },
        {
          ...selectedTicket,
          eventUUID:
            (typeof selectedTicket.eventUUID === "string" &&
              selectedTicket.eventUUID) ||
            event.uuid,
          organizationUUID:
            selectedTicket.organizationUUID ||
            event.organizationUUID ||
            orderOrganization?.uuid,
        },
        passWallet,
      );
      if (error) {
        setWalletError(error);
        return;
      }
      const nextAdded = [...addedWalletKeys, addedKey];
      setAddedWalletKeys(nextAdded);
      const nextIndex = walletTickets.findIndex(
        (ticket) => !nextAdded.includes(walletTicketKey(ticket)),
      );
      if (nextIndex < 0) {
        setWalletSheetOpen(false);
        return;
      }
      setSelectedWalletTicket(nextIndex);
    } catch {
      setWalletError("Could not add this pass to your wallet. Please try again.");
    } finally {
      setWalletSaving(false);
    }
  };

  if (shellLoading) {
    return <RouteLoader branding={loaderBranding} />;
  }

  return (
    <div className="shopper-page min-h-screen overflow-y-auto bg-[#f7f8fc]" style={{ color: NAVY }}>
      <ShopperFluidTypeStyles />
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

      {displayError || !order ? (
        <div className={`${CARD} mx-auto mt-10 max-w-lg p-8 text-center`}>
          <h1 className="text-[22px] font-semibold">Order not found</h1>
          <p className="mt-2 text-[15px]" style={{ color: MUTED }}>
            {displayError}
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
        <div className={`mx-auto grid max-w-[1140px] grid-cols-1 items-start gap-5 px-3.5 pt-3.5 md:px-5 md:pt-6 lg:grid-cols-[minmax(0,1fr)_372px] ${showWalletCta ? "pb-28" : "pb-10"}`}>
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
            <h1 className="text-[30px] font-semibold tracking-[-0.03em]">
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

      {showWalletCta && passWallet ? (
        <MobileStickyFooter zIndex={3} innerPadding="0" boxShadow="none">
          <div className="mx-auto max-w-[1140px] px-3.5 py-3">
            <button
              type="button"
              disabled={allWalletTicketsAdded}
              onClick={openWalletSheet}
              className="flex w-full items-center justify-center gap-2.5 rounded-full px-[26px] py-4 text-[16px] font-semibold disabled:opacity-80"
              style={{
                background: accent,
                color: branding.theme.buttonTextColor,
              }}
            >
              {allWalletTicketsAdded ? <WalletAddedCheckIcon /> : <WalletPassIcon />}
              {allWalletTicketsAdded
                ? `All tickets added to ${passWallet === "apple" ? "Apple" : "Google"} Wallet`
                : phoneWalletLabel(passWallet)}
            </button>
          </div>
        </MobileStickyFooter>
      ) : null}

      {showWalletCta && passWallet && walletSheetOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-[rgba(5,27,53,0.55)]"
          onClick={closeWalletSheet}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="wallet-ticket-title"
            className="flex max-h-[88vh] w-full flex-col rounded-t-[26px] bg-white"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex justify-center pt-3">
              <div className="h-1 w-10 rounded-full bg-[#d5d8e0]" />
            </div>
            <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-3">
              <div className="min-w-0">
                <h2
                  id="wallet-ticket-title"
                  className="text-[22px] font-semibold tracking-[-0.02em]"
                >
                  Add a ticket to your wallet.
                </h2>
                <p className="mt-1.5 text-[14px]" style={{ color: MUTED }}>
                  Passes are added one ticket at a time. Pick a seat, then
                  choose a wallet.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={closeWalletSheet}
                className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-[#f1f3f8]"
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
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div
              role="radiogroup"
              aria-label="Tickets"
              className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-5 py-3"
            >
              {walletTickets.map((ticket, index) => {
                const added = addedWalletKeySet.has(walletTicketKey(ticket));
                const selected = !added && index === selectedWalletTicket;
                const seat = seatLabel(ticket as TicketLike);
                return (
                  <button
                    key={walletTicketKey(ticket) || String(index)}
                    type="button"
                    role={added ? undefined : "radio"}
                    aria-checked={added ? undefined : selected}
                    disabled={added || walletSaving}
                    onClick={() => setSelectedWalletTicket(index)}
                    className="flex w-full items-center gap-3 rounded-[18px] border px-3.5 py-3.5 text-left disabled:opacity-100"
                    style={{
                      borderColor: added || selected ? accent : "rgba(5,27,53,0.12)",
                      background:
                        selected && !added
                          ? `color-mix(in srgb, ${accent} 8%, white)`
                          : "#fff",
                    }}
                  >
                    {added ? null : (
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2"
                        style={{ borderColor: selected ? accent : "rgba(5,27,53,0.22)" }}
                      >
                        {selected ? (
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ background: accent }}
                          />
                        ) : null}
                      </span>
                    )}
                    <span className="min-w-0 flex-1 text-[16px] font-semibold tracking-[-0.015em]">
                      {seat}
                    </span>
                    {added ? (
                      <span
                        className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.12em]"
                        style={{ color: accent }}
                      >
                        ADDED
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <div className="border-t border-[rgba(5,27,53,0.08)] px-5 pb-[max(18px,env(safe-area-inset-bottom))] pt-3">
              <button
                type="button"
                disabled={walletSaving || !selectedTicket || selectedTicketAdded}
                aria-busy={walletSaving || undefined}
                onClick={() => void addSelectedTicketToWallet()}
                className="flex w-full items-center justify-center gap-2.5 rounded-full px-[26px] py-4 text-[16px] font-semibold disabled:opacity-70"
                style={{
                  background: accent,
                  color: branding.theme.buttonTextColor,
                }}
              >
                <ButtonBusyContents
                  loading={walletSaving}
                  loadingLabel="Adding…"
                  spinnerColor={branding.theme.buttonTextColor}
                  trackColor="rgba(5,27,53,0.2)"
                >
                  <WalletPassIcon />
                  {phoneWalletLabel(passWallet)}
                </ButtonBusyContents>
              </button>
              {walletError ? (
                <p role="alert" className="mt-2 text-center text-[13px] text-[#b91c1c]">
                  {walletError}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
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
