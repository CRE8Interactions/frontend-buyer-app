"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/templates/AppShell";
import Button from "@/components/atoms/Button";
import Spinner from "@/components/atoms/Spinner";
import PageLoader from "@/components/molecules/PageLoader";
import { cardCls } from "@/components/molecules/Card";
import {
  downloadApplePass,
  downloadGooglePass,
  getOrderByPaymentIntentId,
} from "@/lib/api";
import { formatCurrency, formatEventWhen } from "@/lib/helpers";
import { clearStoredCart, getStoredCart } from "@/lib/cart";
import { hideIntercomLauncher } from "@/lib/intercom";
import {
  trackCheckoutCompleted,
  trackPurchase,
  type TrackingOrganization,
} from "@/lib/tracking";

type OrderData = {
  id?: string | number;
  total?: number;
  serviceFee?: number;
  processingFee?: number;
  estimatedProcessingFee?: number;
  salesTax?: number;
  discountApplied?: number;
  last4?: string;
  paymentProcessor?: string;
  paymentMethodType?: string;
  tickets?: Array<Record<string, unknown>>;
  event?: {
    name?: string;
    start?: string;
    uuid?: string;
    venue?: { timezone?: string; name?: string };
    organization?: { setting?: { foodAndBeverage?: boolean }; uuid?: string };
    [key: string]: unknown;
  } | null;
  package?: { name?: string; events?: Array<Record<string, unknown>> } | null;
  flex_pack?: { name?: string } | null;
  access_pass_template?: {
    name?: string;
    organization?: TrackingOrganization & { name?: string };
    venue?: { name?: string; timezone?: string };
    events?: Array<Record<string, unknown>>;
  } | null;
  access_pass?: { uuid?: string } | null;
  priceObject?: Record<string, unknown>;
  [key: string]: unknown;
};

function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const intentId = searchParams.get("intentId") || "";

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [error, setError] = useState("");
  const [passMsg, setPassMsg] = useState("");

  useEffect(() => {
    hideIntercomLauncher();
  }, []);

  useEffect(() => {
    if (!intentId) {
      setError("Missing payment reference.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    const cartId = getStoredCart()?.cartId || null;
    getOrderByPaymentIntentId(intentId)
      .then((res) => {
        if (cancelled) return;
        const orderData = res.data as OrderData;
        setOrder(orderData);
        clearStoredCart();

        const organization = (orderData?.event?.organization ||
          (orderData?.package as { organization?: TrackingOrganization } | null)
            ?.organization ||
          (orderData?.flex_pack as { organization?: TrackingOrganization } | null)
            ?.organization ||
          orderData?.access_pass_template?.organization) as
          | TrackingOrganization
          | undefined;
        trackPurchase({
          organization,
          order: orderData,
        });
        trackCheckoutCompleted(cartId);
      })
      .catch(() => {
        if (!cancelled) setError("Unable to load your order.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [intentId]);

  const event = order?.package
    ? ([...(order.package.events || [])].sort((a, b) =>
        String(a.start || "").localeCompare(String(b.start || "")),
      )[0] as OrderData["event"])
    : order?.access_pass_template
      ? ([...(order.access_pass_template.events || [])].sort((a, b) =>
          String(a.start || "").localeCompare(String(b.start || "")),
        )[0] as OrderData["event"])
      : order?.event;

  const isAccessPass = Boolean(order?.access_pass_template);
  const accessPassHref = order?.access_pass?.uuid
    ? `/my-events/access-passes/${order.access_pass.uuid}/`
    : "/my-events/";

  const processingFee =
    Number(
      order?.estimatedProcessingFee ??
        order?.processingFee ??
        (order?.priceObject as { estimatedProcessingFee?: number } | undefined)
          ?.estimatedProcessingFee ??
        0,
    ) || 0;

  const subtotal =
    Number(order?.total || 0) -
    processingFee -
    Number(order?.serviceFee || 0) -
    Number(order?.salesTax || 0) -
    Number(order?.discountApplied || 0);

  const isIphone =
    typeof navigator !== "undefined" &&
    /iPhone/i.test(navigator.userAgent || "");

  const downloadApple = async () => {
    if (!event || !order || isAccessPass) return;
    setPassMsg("");
    try {
      const ticket = order.tickets?.[0];
      const response = await downloadApplePass({ event, obj: ticket || order });
      const blob = new Blob([response.data], {
        type: String(
          response.headers["content-type"] ||
            "application/vnd.apple.pkpass",
        ),
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "event.pkpass";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setPassMsg("Could not download Apple Wallet pass.");
    }
  };

  const downloadGoogle = async () => {
    if (!event || !order || isAccessPass) return;
    setPassMsg("");
    try {
      const ticket = order.tickets?.[0];
      const response = await downloadGooglePass({ event, obj: ticket || order });
      const url =
        response.data?.url ||
        response.data?.saveUrl ||
        response.data?.googlePassUrl;
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      else setPassMsg("Google Wallet link unavailable.");
    } catch {
      setPassMsg("Could not download Google Wallet pass.");
    }
  };

  return (
    <AppShell requireAuth search={false}>
      {loading ? (
        <PageLoader message="Confirming your order…" label="Confirming order" />
      ) : error || !order ? (
        <div className={`${cardCls} mx-auto max-w-lg p-8 text-center`}>
          <h1 className="text-[22px] font-semibold">Order not found</h1>
          <p className="mt-2 text-ink2">{error}</p>
          <Button href="/my-events/" className="mt-6">
            Go to my wallet
          </Button>
        </div>
      ) : (
        <div className="mx-auto max-w-xl pb-16">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary">
              <svg
                viewBox="0 0 24 24"
                width="22"
                height="22"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M5 12.5 10 17.5 19 7" />
              </svg>
            </span>
            <h1 className="text-[clamp(28px,4vw,36px)] font-semibold tracking-[-0.02em]">
              Payment successful
            </h1>
          </div>
          <p className="mt-3 text-[15px] text-ink2">
            {isAccessPass
              ? "Your access pass is in your wallet. Your phone is your ticket."
              : "Your tickets are in your wallet. Your phone is your ticket."}
          </p>

          <div className={`${cardCls} mt-8 p-5`}>
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ink2">
              {isAccessPass ? "Access pass" : "Event"}
            </p>
            <p className="mt-2 text-[18px] font-semibold">
              {order.access_pass_template?.name ||
                order.flex_pack?.name ||
                order.package?.name ||
                event?.name ||
                "Your tickets"}
            </p>
            <p className="mt-1 text-[14px] text-ink2">
              {isAccessPass
                ? [
                    order.access_pass_template?.organization?.name,
                    order.access_pass_template?.venue?.name ||
                      event?.venue?.name,
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : [
                    formatEventWhen(
                      event?.start as string | undefined,
                      event?.venue?.timezone,
                    ),
                    event?.venue?.name,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
            </p>
          </div>

          <div className={`${cardCls} mt-4 space-y-2 p-5`}>
            <h2 className="mb-3 text-[16px] font-semibold">Order summary</h2>
            <div className="flex justify-between text-[14px]">
              <span className="text-ink2">Payment method</span>
              <span>
                {order.paymentProcessor === "free" ||
                order.paymentMethodType === "complimentary"
                  ? "Complimentary"
                  : `****${order.last4 || order.paymentMethodType || ""}`}
              </span>
            </div>
            <div className="flex justify-between text-[14px]">
              <span className="text-ink2">Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-[14px]">
              <span className="text-ink2">Tax</span>
              <span>{formatCurrency(order.salesTax)}</span>
            </div>
            <div className="flex justify-between text-[14px]">
              <span className="text-ink2">Processing fee</span>
              <span>{formatCurrency(processingFee)}</span>
            </div>
            <div className="flex justify-between text-[14px]">
              <span className="text-ink2">Service fee</span>
              <span>{formatCurrency(order.serviceFee)}</span>
            </div>
            {order.discountApplied ? (
              <div className="flex justify-between text-[14px]">
                <span className="text-ink2">Promo</span>
                <span>-{formatCurrency(order.discountApplied)}</span>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-white/10 pt-3 text-[18px] font-semibold">
              <span>Total</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {!isAccessPass ? (
              isIphone ? (
                <Button variant="outline" className="flex-1" onClick={downloadApple}>
                  Add to Apple Wallet
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={downloadGoogle}
                >
                  Add to Google Wallet
                </Button>
              )
            ) : null}
            <Button href={accessPassHref} className="flex-1">
              {isAccessPass ? "View access pass" : "Go to my wallet"}
            </Button>
          </div>
          {passMsg ? (
            <p className="mt-3 text-center text-[13px] text-red-400">{passMsg}</p>
          ) : null}
        </div>
      )}
    </AppShell>
  );
}


export default function CheckoutSuccessPageRoute() {
  return (
    <Suspense
      fallback={
        <AppShell requireAuth search={false}>
          <PageLoader label="Loading order" />
        </AppShell>
      }
    >
      <CheckoutSuccessPage />
    </Suspense>
  );
}
