"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import BrandedActionButton from "@/components/atoms/BrandedActionButton";
import EmailField from "@/components/molecules/EmailField";
import NameField from "@/components/molecules/NameField";
import {
  confirmLandingPageDonation,
  createLandingPageDonationIntent,
  getPublicFundraisingCampaign,
} from "@/lib/api";
import AppShell from "@/components/templates/AppShell";
import ShopperFluidPage from "@/components/templates/ShopperFluidType";
import { BrandedLoader } from "@/components/molecules/RouteLoader";
import useAutoFocus from "@/hooks/useAutoFocus";
import useOrgBranding from "@/hooks/useOrgBranding";
import {
  BLOCKTICKETS_NAVY,
  resolveBrandLogo,
  type BrandingOrganization,
} from "@/lib/branding";
import { formatCurrency, imageUrl } from "@/lib/helpers";
import { cacheOrgBranding } from "@/lib/orgBrandingCache";
import {
  FIELD_COPY,
  emailBlurInvalid,
  emailSubmitError,
  fieldClass,
  fieldErrorTextClass,
  formString,
  nameAllows,
  normalizeEmail,
  submittedEmail,
} from "@/lib/fieldValidation";
import {
  stripePaymentElementAppearance,
  STRIPE_PAYMENT_ELEMENT_FONTS,
} from "@/lib/stripePaymentElement";
import { FUNDRAISER_LOADER_MESSAGE } from "@/lib/loaderMessages";

const lightCard =
  "rounded-[20px] border border-[rgba(5,27,53,0.08)] bg-white text-[#051b35]";
const muted = "text-[#6e7180]";

type Campaign = {
  slug: string;
  title?: string;
  description?: string;
  heroImage?: unknown;
  enableLandingPageDonation?: boolean;
  organizationUUID?: string;
  accentColor?: string;
  organization?: BrandingOrganization;
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
  primaryColor,
  textColor,
  onSuccess,
  onError,
}: {
  donationAmount: number;
  platformFee: number;
  processingFee: number;
  totalCharge: number;
  primaryColor?: string;
  textColor?: string;
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
      <div className={`${lightCard} space-y-2 p-4`}>
        <div className="flex justify-between text-[14px]">
          <span className={muted}>Donation</span>
          <span>{formatCurrency(donationAmount)}</span>
        </div>
        {platformFee > 0 ? (
          <div className="flex justify-between text-[14px]">
            <span className={muted}>Platform fee</span>
            <span>{formatCurrency(platformFee)}</span>
          </div>
        ) : null}
        {processingFee > 0 ? (
          <div className="flex justify-between text-[14px]">
            <span className={muted}>Processing fee</span>
            <span>{formatCurrency(processingFee)}</span>
          </div>
        ) : null}
        <div className="flex justify-between border-t border-[rgba(5,27,53,0.08)] pt-2 font-semibold">
          <span>Total</span>
          <span>{formatCurrency(totalCharge)}</span>
        </div>
      </div>
      <BrandedActionButton
        type="submit"
        className="w-full"
        primaryColor={primaryColor}
        textColor={textColor}
        loading={submitting}
        loadingLabel="Processing…"
        disabled={!stripe || submitting}
      >
        Complete donation
      </BrandedActionButton>
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
  const autoFocusField = useAutoFocus<HTMLInputElement>(true);
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
        const org = (c?.organization || c) as BrandingOrganization | undefined;
        if (org && (org.slug || org.branding || org.primaryColor)) {
          cacheOrgBranding(org);
        }
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

  const startDonation = async (data?: FormData) => {
    if (!campaign) return;
    const donationAmount = parseAmount(
      data ? formString(data, "amount") || amount : amount,
    );
    const nextName = data ? formString(data, "donorName") || donorName : donorName;
    const nextEmail = data
      ? submittedEmail(data, "email") || normalizeEmail(donorEmail)
      : normalizeEmail(donorEmail);
    const nextMessage = data
      ? formString(data, "donorMessage") || donorMessage
      : donorMessage;
    if (data) {
      setAmount(String(donationAmount || formString(data, "amount") || amount));
      setDonorName(nextName);
      setDonorEmail(nextEmail);
      setDonorMessage(nextMessage);
    }
    if (donationAmount <= 0) {
      setError("Select or enter a donation amount.");
      return;
    }
    if (!anonymous) {
      const emailKind = emailSubmitError(nextEmail);
      if (emailKind === "required") {
        setError(FIELD_COPY.emailRequired);
        return;
      }
      if (emailKind === "invalid") {
        setError(FIELD_COPY.invalidEmail);
        return;
      }
      if (!nameAllows(nextName)) {
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
        donorMessage: nextMessage,
        donorName: anonymous ? "" : nextName,
        donorEmail: anonymous ? "" : nextEmail,
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

  const { organization: brandedOrg, theme } = useOrgBranding({
    slug: organizationSlug,
    uuid: organizationUUID,
    organization: campaign?.organization,
  });

  const shell = (body: ReactNode) => (
    <AppShell
      variant="light"
      search={false}
      accent={organizationSlug ? theme.accent : undefined}
      brandLogoSrc={
        organizationSlug && brandedOrg ? theme.brandLogoSrc : undefined
      }
      brandName={organizationSlug ? brandedOrg?.name || null : undefined}
    >
      <ShopperFluidPage className="min-h-0">{body}</ShopperFluidPage>
    </AppShell>
  );

  if (loading) {
    // The org route holds its tenant loader (never the Blocktickets one); the
    // platform /fundraise route holds the Blocktickets loader.
    return (
      <BrandedLoader
        branding={
          organizationSlug && brandedOrg
            ? {
                primaryColor: theme.accent,
                logoSrc: resolveBrandLogo(null, brandedOrg)
                  ? theme.brandLogoSrc
                  : null,
                name: brandedOrg.name || null,
              }
            : null
        }
        fallback={organizationSlug ? "none" : "blocktickets"}
        message={FUNDRAISER_LOADER_MESSAGE}
      />
    );
  }

  if (loadError || !campaign) {
    return shell(
      <div className={`${lightCard} mx-auto max-w-lg p-8 text-center`}>
        <h1 className="text-[22px] font-semibold">Fundraiser not found</h1>
        <p className={`mt-2 ${muted}`}>{loadError}</p>
      </div>,
    );
  }

  if (success) {
    return shell(
      <div className={`${lightCard} mx-auto max-w-lg p-8 text-center`}>
        <h1 className="text-[28px] font-semibold">Thank you!</h1>
        <p className={`mt-2 ${muted}`}>
          Your donation to {campaign.title} was successful.
        </p>
      </div>,
    );
  }

  return shell(
    <div className="mx-auto max-w-xl pb-16 text-[#051b35]">
      <div className={`${lightCard} overflow-hidden`}>
        {campaign.heroImage ? (
          <div className="aspect-[21/9] bg-[#f1f3f8]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl(campaign.heroImage as never)}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        ) : null}
        <div className="p-6">
          <h1 className="text-[36px] font-semibold tracking-[-0.03em]">
            {campaign.title}
          </h1>
          {campaign.description ? (
            <p className={`mt-3 whitespace-pre-wrap text-[15px] leading-relaxed ${muted}`}>
              {campaign.description}
            </p>
          ) : null}
        </div>
      </div>

      {campaign.enableLandingPageDonation ? (
        <div className={`${lightCard} mt-6 p-6`}>
          <h2 className="text-[16px] font-semibold">Donate</h2>
          {error &&
          error !== FIELD_COPY.emailRequired &&
          error !== FIELD_COPY.invalidEmail ? (
            <p className={`mt-3 text-[14px] ${fieldErrorTextClass("light")}`}>{error}</p>
          ) : null}

          {!clientSecret ? (
            <form
              noValidate
              className="mt-4 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void startDonation(new FormData(e.currentTarget));
              }}
            >
              {campaign.participants?.length ? (
                <div>
                  <label
                    htmlFor="participant"
                    className="text-[12px] font-semibold text-[#4a5567]"
                  >
                    Support
                  </label>
                  <select
                    id="participant"
                    className={`mt-2 ${fieldClass("light", false)}`}
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
                      className="rounded-full border px-4 py-2 text-[14px] font-semibold transition-colors"
                      style={
                        parseAmount(amount) === p
                          ? {
                              borderColor: theme.buttonColor || BLOCKTICKETS_NAVY,
                              background: theme.buttonColor || BLOCKTICKETS_NAVY,
                              color: theme.buttonTextColor,
                            }
                          : undefined
                      }
                    >
                      {formatCurrency(p)}
                    </button>
                  ))}
                </div>
              ) : null}

              <div>
                <label
                  htmlFor="amount"
                  className="text-[12px] font-semibold text-[#4a5567]"
                >
                  Amount
                </label>
                <input
                  ref={autoFocusField}
                  id="amount"
                  name="amount"
                  className={`mt-2 ${fieldClass("light", false)}`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="25"
                />
              </div>

              <label className={`flex items-center gap-2 text-[14px] ${muted}`}>
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
                    name="donorName"
                    label="Name"
                    required={false}
                    value={donorName}
                    onChange={setDonorName}
                  />
                  <EmailField
                    id="donor-email"
                    name="email"
                    label="Email address"
                    value={donorEmail}
                    error={
                      error === FIELD_COPY.emailRequired
                        ? "required"
                        : error === FIELD_COPY.invalidEmail
                          ? "invalid"
                          : null
                    }
                    onChange={(value) => {
                      setDonorEmail(value);
                      if (
                        error === FIELD_COPY.invalidEmail ||
                        error === FIELD_COPY.emailRequired
                      ) {
                        setError("");
                      }
                    }}
                    onBlur={(value) => {
                      if (emailBlurInvalid(value)) setError(FIELD_COPY.invalidEmail);
                      else if (
                        error === FIELD_COPY.invalidEmail ||
                        error === FIELD_COPY.emailRequired
                      ) {
                        setError("");
                      }
                    }}
                  />
                </>
              ) : null}

              <div>
                <label
                  htmlFor="donor-msg"
                  className="text-[12px] font-semibold text-[#4a5567]"
                >
                  Message (optional)
                </label>
                <input
                  id="donor-msg"
                  className={`mt-2 ${fieldClass("light", false)}`}
                  value={donorMessage}
                  name="donorMessage"
                  onChange={(e) => setDonorMessage(e.target.value)}
                />
              </div>

              <BrandedActionButton
                type="submit"
                className="w-full"
                primaryColor={theme.buttonColor || BLOCKTICKETS_NAVY}
                textColor={theme.buttonTextColor}
                loading={loadingIntent}
                loadingLabel="Loading…"
                disabled={loadingIntent}
              >
                Continue to payment
              </BrandedActionButton>
            </form>
          ) : stripePromise ? (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: stripePaymentElementAppearance(
                  theme.accent,
                  theme.buttonTextColor,
                ),
                fonts: STRIPE_PAYMENT_ELEMENT_FONTS,
              }}
            >
              <DonationForm
                donationAmount={pricing.donationAmount}
                platformFee={pricing.platformFee}
                processingFee={pricing.processingFee}
                totalCharge={pricing.totalCharge}
                primaryColor={theme.buttonColor || BLOCKTICKETS_NAVY}
                textColor={theme.buttonTextColor}
                onSuccess={() => setSuccess(true)}
                onError={setError}
              />
            </Elements>
          ) : null}
        </div>
      ) : (
        <p className={`mt-6 text-center text-[14px] ${muted}`}>
          Online donations are not enabled for this campaign.
        </p>
      )}
    </div>,
  );
}
