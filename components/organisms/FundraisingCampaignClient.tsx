"use client";

import { useEffect, useMemo, useState } from "react";
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
import { cardCls } from "@/components/molecules/Card";
import { Input, Label } from "@/components/atoms/form";
import EmailField from "@/components/molecules/EmailField";
import NameField from "@/components/molecules/NameField";
import {
  confirmLandingPageDonation,
  createLandingPageDonationIntent,
  getPublicFundraisingCampaign,
} from "@/lib/api";
import { formatCurrency, imageUrl } from "@/lib/helpers";
import {
  FIELD_COPY,
  emailLooksInvalid,
  isBlockedEmail,
  nameAllows,
  normalizeEmail,
} from "@/lib/fieldValidation";

type Campaign = {
  slug: string;
  title?: string;
  description?: string;
  heroImage?: unknown;
  enableLandingPageDonation?: boolean;
  organizationUUID?: string;
  accentColor?: string;
  suggestedAmounts?: Array<number | string>;
  participants?: Array<{ uuid: string; name: string }>;
  [key: string]: unknown;
};

function parseAmount(value: string | number) {
  const amount = Number(String(value || "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function DonationForm({
  donationAmount,
  platformFee,
  processingFee,
  totalCharge,
  onSuccess,
  onError,
}: {
  donationAmount: number;
  platformFee: number;
  processingFee: number;
  totalCharge: number;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    onError("");
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });
      if (error) {
        onError(error.message || "Payment failed.");
        return;
      }
      if (paymentIntent?.status === "succeeded") {
        await confirmLandingPageDonation(paymentIntent.id);
        onSuccess();
      }
    } catch {
      onError("Unable to complete your donation right now.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      <PaymentElement options={{ wallets: { link: "never" } }} />
      <div className={`${cardCls} space-y-2 p-4`}>
        <div className="flex justify-between text-[14px]">
          <span className="text-[#9DA2B3]">Donation</span>
          <span>{formatCurrency(donationAmount)}</span>
        </div>
        {platformFee > 0 ? (
          <div className="flex justify-between text-[14px]">
            <span className="text-[#9DA2B3]">Platform fee</span>
            <span>{formatCurrency(platformFee)}</span>
          </div>
        ) : null}
        {processingFee > 0 ? (
          <div className="flex justify-between text-[14px]">
            <span className="text-[#9DA2B3]">Processing fee</span>
            <span>{formatCurrency(processingFee)}</span>
          </div>
        ) : null}
        <div className="flex justify-between border-t border-white/10 pt-2 font-semibold">
          <span>Total</span>
          <span>{formatCurrency(totalCharge)}</span>
        </div>
      </div>
      <Button type="submit" className="w-full disabled:opacity-50" disabled={!stripe || submitting}>
        {submitting ? <Spinner size={18} /> : "Complete donation"}
      </Button>
    </form>
  );
}

export function FundraisingCampaignClient({
  campaignSlug,
  organizationUUID,
  organizationSlug,
}: {
  campaignSlug: string;
  organizationUUID?: string;
  organizationSlug?: string;
}) {
  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loadError, setLoadError] = useState("");
  const [amount, setAmount] = useState("");
  const [participantUuid, setParticipantUuid] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [donorMessage, setDonorMessage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loadingIntent, setLoadingIntent] = useState(false);
  const [clientSecret, setClientSecret] = useState("");
  const [stripePromise, setStripePromise] = useState<Stripe | null>(null);
  const [pricing, setPricing] = useState({
    donationAmount: 0,
    platformFee: 0,
    processingFee: 0,
    totalCharge: 0,
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getPublicFundraisingCampaign(campaignSlug, {
      organizationUUID,
      organizationSlug,
    })
      .then((res) => {
        if (cancelled) return;
        const c = res?.data?.campaign as Campaign | null;
        setCampaign(c);
        if (!c) setLoadError("This fundraiser is unavailable.");
        const presets = c?.suggestedAmounts || [];
        if (presets.length) {
          setAmount(String(presets[Math.floor(presets.length / 2)]));
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError("This fundraiser is unavailable or no longer active.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [campaignSlug, organizationUUID, organizationSlug]);

  const presets = useMemo(
    () => (campaign?.suggestedAmounts || []).map((a) => parseAmount(a)).filter(Boolean),
    [campaign],
  );

  const startDonation = async () => {
    if (!campaign) return;
    const donationAmount = parseAmount(amount);
    if (donationAmount <= 0) {
      setError("Select or enter a donation amount.");
      return;
    }
    if (!anonymous) {
      const address = normalizeEmail(donorEmail);
      if (!address || isBlockedEmail(address) || emailLooksInvalid(address)) {
        setError(FIELD_COPY.invalidEmail);
        return;
      }
      if (!nameAllows(donorName)) {
        setError(FIELD_COPY.namePattern);
        return;
      }
    }
    setError("");
    setLoadingIntent(true);
    setClientSecret("");
    setStripePromise(null);
    try {
      const response = await createLandingPageDonationIntent(campaign.slug, {
        organizationUUID: organizationUUID || campaign.organizationUUID,
        organizationSlug: organizationSlug || undefined,
        donationAmount,
        participantUuid,
        anonymous,
        donorMessage,
        donorName: anonymous ? "" : donorName,
        donorEmail: anonymous ? "" : normalizeEmail(donorEmail),
      });
      const data = response?.data || {};
      if (!data.clientSecret) throw new Error("Missing payment session");
      setPricing({
        donationAmount: Number(data.donationAmount || donationAmount),
        platformFee: Number(data.platformFee || 0),
        processingFee: Number(data.processingFee || 0),
        totalCharge: Number(data.totalCharge || donationAmount),
      });
      setClientSecret(data.clientSecret);
      const key = process.env.NEXT_PUBLIC_STRIPE_KEY;
      if (!key) throw new Error("Missing Stripe key");
      const stripe = data.connectedAccountId
        ? await loadStripe(key, { stripeAccount: data.connectedAccountId })
        : await loadStripe(key);
      setStripePromise(stripe);
    } catch {
      setError("Unable to start checkout. Please try again.");
    } finally {
      setLoadingIntent(false);
    }
  };

  if (loading) {
    return <PageLoader label="Loading fundraiser" className="min-h-[40vh]" />;
  }

  if (loadError || !campaign) {
    return (
      <div className={`${cardCls} mx-auto max-w-lg p-8 text-center`}>
        <h1 className="text-[22px] font-semibold">Fundraiser not found</h1>
        <p className="mt-2 text-[#9DA2B3]">{loadError}</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className={`${cardCls} mx-auto max-w-lg p-8 text-center`}>
        <h1 className="text-[28px] font-semibold">Thank you!</h1>
        <p className="mt-2 text-[#9DA2B3]">
          Your donation to {campaign.title} was successful.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl pb-16">
      <div className={`${cardCls} overflow-hidden`}>
        {campaign.heroImage ? (
          <div className="aspect-[21/9] bg-[#071f3a]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl(campaign.heroImage as never)}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        ) : null}
        <div className="p-6">
          <h1 className="text-[clamp(28px,4vw,36px)] font-semibold tracking-[-0.02em]">
            {campaign.title}
          </h1>
          {campaign.description ? (
            <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-[#9DA2B3]">
              {campaign.description}
            </p>
          ) : null}
        </div>
      </div>

      {campaign.enableLandingPageDonation ? (
        <div className={`${cardCls} mt-6 p-6`}>
          <h2 className="text-[16px] font-semibold">Donate</h2>
          {error ? (
            <p className="mt-3 text-[14px] text-red-400">{error}</p>
          ) : null}

          {!clientSecret ? (
            <div className="mt-4 space-y-4">
              {campaign.participants?.length ? (
                <div>
                  <Label htmlFor="participant">Support</Label>
                  <select
                    id="participant"
                    className="mt-2 h-12 w-full rounded-xl border border-white/15 bg-[#051B35] px-4 text-[15px] text-white outline-none focus:border-[#a6e773]"
                    value={participantUuid}
                    onChange={(e) => setParticipantUuid(e.target.value)}
                  >
                    <option value="">General campaign fund</option>
                    {campaign.participants.map((p) => (
                      <option key={p.uuid} value={p.uuid}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {presets.length ? (
                <div className="flex flex-wrap gap-2">
                  {presets.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setAmount(String(p))}
                      className={`rounded-full border px-4 py-2 text-[14px] font-semibold transition-colors ${
                        parseAmount(amount) === p
                          ? "border-[#A6E773] bg-[#A6E773]/15 text-white"
                          : "border-white/15 bg-white/[0.04] text-[#9DA2B3] hover:bg-white/[0.1]"
                      }`}
                    >
                      {formatCurrency(p)}
                    </button>
                  ))}
                </div>
              ) : null}

              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  className="mt-2"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="25"
                />
              </div>

              <label className="flex items-center gap-2 text-[14px] text-[#9DA2B3]">
                <input
                  type="checkbox"
                  checked={anonymous}
                  onChange={(e) => setAnonymous(e.target.checked)}
                />
                Donate anonymously
              </label>

              {!anonymous ? (
                <>
                  <NameField
                    id="donor-name"
                    label="Name"
                    variant="dark"
                    required={false}
                    value={donorName}
                    onChange={setDonorName}
                  />
                  <EmailField
                    id="donor-email"
                    label="Email"
                    variant="dark"
                    value={donorEmail}
                    onChange={setDonorEmail}
                  />
                </>
              ) : null}

              <div>
                <Label htmlFor="donor-msg">Message (optional)</Label>
                <Input
                  id="donor-msg"
                  className="mt-2"
                  value={donorMessage}
                  onChange={(e) => setDonorMessage(e.target.value)}
                />
              </div>

              <Button
                className="w-full disabled:opacity-50"
                disabled={loadingIntent}
                onClick={startDonation}
              >
                {loadingIntent ? <Spinner size={18} /> : "Continue to payment"}
              </Button>
            </div>
          ) : stripePromise ? (
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
                    colorTextSecondary: "#9DA2B3",
                    borderRadius: "12px",
                  },
                },
              }}
            >
              <DonationForm
                donationAmount={pricing.donationAmount}
                platformFee={pricing.platformFee}
                processingFee={pricing.processingFee}
                totalCharge={pricing.totalCharge}
                onSuccess={() => setSuccess(true)}
                onError={setError}
              />
            </Elements>
          ) : null}
        </div>
      ) : (
        <p className="mt-6 text-center text-[14px] text-[#9DA2B3]">
          Online donations are not enabled for this campaign.
        </p>
      )}
    </div>
  );
}
