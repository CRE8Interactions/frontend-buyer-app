"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import BrandedActionButton from "@/components/atoms/BrandedActionButton";
import MobileStickyFooter from "@/components/molecules/MobileStickyFooter";
import MarketingOptIn from "@/components/molecules/MarketingOptIn";
import PromoCodeForm, {
  type PromoRedeemResult,
} from "@/components/molecules/PromoCodeForm";
import { addonCustomerTotal, isAddonOnlyCheckout } from "@/lib/addonCatalog";
import type { CheckoutCart } from "@/lib/checkoutCart";
import { buildProcessOrderRequest } from "@/lib/checkoutPaymentIntent";
import {
  purchaseFailureDisplayMessage,
  stripeConfirmDisplayMessage,
  waitForPaymentIntentSucceeded,
} from "@/lib/checkoutPaymentErrors";
import { checkoutSuccessReturnUrl } from "@/lib/checkoutSuccess";
import { promoCodeRedeemDisplayMessage } from "@/lib/fieldValidation";
import { formatCurrency, isCartExpiredResponse, isRequestCanceled } from "@/lib/helpers";
import { processOrder, redeemPromoCode, removePromoCode } from "@/lib/api";
import { readTrackingCodeForCart } from "@/lib/trackingLink";
import { checkoutPaymentElementOptions } from "@/lib/stripePaymentElement";
import {
  isPackageProcessingFeeWaived,
  packageCartTickets,
  packageOrderSummary,
  resolveFlexPackCheckoutTotals,
  resolvePackageCheckoutTotals,
} from "@/lib/ticketSummary";
import {
  trackAddPaymentInfo,
  trackCheckoutStage,
  type TrackingOrganization,
} from "@/lib/tracking";

const muted = "text-[#6e7180]";

export type CheckoutPromoDiscount = { label: string; amount: number };

export default function CheckoutPaymentForm({
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
  showMarketingOptIn = false,
  organizationName,
  optInMessage,
}: {
  intentId: string;
  clientSecret: string;
  cart: CheckoutCart;
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
  showMarketingOptIn?: boolean;
  organizationName?: string | null;
  optInMessage?: string | null;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [promoCode, setPromoCode] = useState("");
  const [isDiscountApplied, setIsDiscountApplied] = useState(false);
  const [discountedPrice, setDiscountedPrice] = useState<number | null>(null);
  const [promoDetails, setPromoDetails] = useState<Record<string, unknown> | null>(
    null,
  );
  const [removingPromo, setRemovingPromo] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [paymentReady, setPaymentReady] = useState(false);
  const [marketingEmailOptIn, setMarketingEmailOptIn] = useState(false);
  const hasTrackedPaymentInfoRef = useRef(false);
  const addonTotal = addonCustomerTotal(cart);

  const flexPackTotals = cart.flex_pack
    ? resolveFlexPackCheckoutTotals(cart)
    : null;

  const accessPassProcessingFee = isPackageProcessingFeeWaived(
    cart.packageWebsiteFeeSnapshot,
  )
    ? 0
    : Number(cart.processingFee ?? 0);
  const accessPassChargeTotal =
    Number(cart.total ?? 0) +
    Number(cart.totalTax ?? cart.salesTax ?? 0) +
    Number(cart.serviceFee ?? 0) +
    accessPassProcessingFee +
    Number(donationChargeTotal || 0);

  const merchandiseTotal = isDiscountApplied
    ? Number(discountedPrice ?? cart.total ?? 0) + Number(donationChargeTotal || 0)
    : cart.flex_pack
      ? (flexPackTotals?.total || 0) + Number(donationChargeTotal || 0)
      : cart.access_pass_template
        ? accessPassChargeTotal
        : cart.package
          ? resolvePackageCheckoutTotals(
              cart,
              packageOrderSummary(
                cart.package,
                packageCartTickets(cart),
                cart.package_tickets?.length || 0,
              ).subtotal,
            ).total + Number(donationChargeTotal || 0)
          : Number(cart.total ?? 0) + Number(donationChargeTotal || 0);
  const displayTotal = merchandiseTotal + addonTotal;

  useEffect(() => {
    onTotalChange?.(displayTotal);
  }, [displayTotal, onTotalChange]);

  const promoPricing = promoDetails?.promoPricingDetails as
    | {
        code?: string;
        name?: string;
        amountDiscounted?: number;
        originalPrice?: number;
        discountedPrice?: number;
      }
    | undefined;
  const promoDiscountAmount = isDiscountApplied
    ? Number(promoPricing?.amountDiscounted) ||
      Math.max(
        0,
        Number(promoPricing?.originalPrice || 0) -
          Number(promoPricing?.discountedPrice || 0),
      )
    : 0;
  const promoDiscountCode = promoPricing?.code || promoCode.trim();
  const promoDiscountLabel =
    String(promoPricing?.name || "").trim() || promoDiscountCode;

  useEffect(() => {
    onPromoChange?.(
      promoDiscountAmount > 0
        ? { label: promoDiscountLabel, amount: promoDiscountAmount }
        : null,
    );
  }, [onPromoChange, promoDiscountAmount, promoDiscountLabel]);

  const redeemPromo = async (code: string): Promise<PromoRedeemResult> => {
    try {
      const res = await redeemPromoCode({
        code: code.trim(),
        paymentIntentId: intentId,
        cart,
      });
      setPromoCode(code);
      setIsDiscountApplied(true);
      setDiscountedPrice(res.data?.promoPricingDetails?.discountedPrice);
      setPromoDetails(res.data);
      return null;
    } catch (err: unknown) {
      return { rejectedMessage: promoCodeRedeemDisplayMessage(err) };
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

  const completePurchase = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!donationRequirementMet || isRefreshingIntent || purchasing) return;
    if (!stripe || !elements) return;
    setPurchasing(true);
    try {
      await processOrder(
        buildProcessOrderRequest(
          cart,
          intentId,
          readTrackingCodeForCart(cart),
          showMarketingOptIn ? marketingEmailOptIn : undefined,
        ),
      );
      const confirmed = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: checkoutSuccessReturnUrl(intentId),
        },
        redirect: "if_required",
      });
      const confirmError = await waitForPaymentIntentSucceeded(
        stripe,
        clientSecret,
        confirmed,
      );
      if (confirmError) {
        onDeclined(stripeConfirmDisplayMessage(confirmError.message));
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
      onDeclined(purchaseFailureDisplayMessage(err));
    }
  };

  const showPromo =
    !cart.flex_pack &&
    !cart.package &&
    !cart.access_pass_template &&
    !isAddonOnlyCheckout(cart);

  return (
    <div>
      <form id="checkout-payment" noValidate onSubmit={completePurchase}>
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
      </form>

      {showPromo ? (
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
              <PromoCodeForm onRedeem={redeemPromo} />
            </div>
          )}
        </div>
      ) : null}

      {showMarketingOptIn ? (
        <MarketingOptIn
          className="mt-6"
          checked={marketingEmailOptIn}
          onChange={setMarketingEmailOptIn}
          organizationName={organizationName}
          optInMessage={optInMessage}
          disabled={purchasing || isRefreshingIntent}
        />
      ) : null}
      <label className="mt-6">
        <input type="checkbox" defaultChecked />
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

      <MobileStickyFooter
        accentColor={accent}
        zIndex={3}
        innerPadding="0"
        boxShadow="none"
        shellClassName="md:bg-white/94 md:backdrop-blur"
      >
        <div className="mx-auto flex max-w-[1140px] px-3.5 py-3 md:justify-end md:px-5">
          <BrandedActionButton
            type="submit"
            form="checkout-payment"
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
      </MobileStickyFooter>
    </div>
  );
}
