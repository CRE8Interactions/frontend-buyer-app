import {
  buildPaymentIntentRequest as buildBasePaymentIntentRequest,
  paymentEventFromCart,
  type PaymentIntentGuest,
} from "@/lib/checkoutPaymentIntent";

export { paymentEventFromCart };
export type { PaymentIntentGuest };

const EMPTY_FUNDRAISING_DONATION_PRICING = {
  donationAmount: 0,
  platformFee: 0,
  processingFee: 0,
  totalCharge: 0,
};

type CartLike = {
  id?: string | number;
  ipAddress?: string;
  tickets?: Array<Record<string, unknown>>;
  package_tickets?: Array<Record<string, unknown>>;
  total?: number;
  totalTax?: number;
  flex_pack?: Record<string, unknown> | null;
  package?: Record<string, unknown> | null;
  access_pass_template?: Record<string, unknown> | null;
  event?: Record<string, unknown> | null;
  eventUUID?: string;
};

type CampaignLike = {
  campaignUuid?: string;
  participantUuid?: string;
  donationRequirements?: {
    minimumAmount?: number;
    mandatory?: boolean;
  };
  pricingPreview?: {
    platformFee?: number;
    processingFee?: number;
  };
} | null;

export type FundraisingSelection = {
  donationAmount: number;
  anonymous: boolean;
  donorMessage: string;
  participantUuid: string;
};

export const getCartSectionIds = (cart: CartLike) => {
  const sectionIds = new Set<string>();
  const ticketLists = [
    ...(Array.isArray(cart?.tickets) ? cart.tickets : []),
    ...(Array.isArray(cart?.package_tickets) ? cart.package_tickets : []),
  ];

  ticketLists.forEach((ticket) => {
    const sectionId = String(
      ticket?.sectionId || ticket?.section_id || "",
    ).trim();
    if (sectionId) sectionIds.add(sectionId);
  });

  return [...sectionIds];
};

export const getCartFundraisingContext = (cart: CartLike) => {
  const search =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
  const sessionParticipantUuid =
    typeof window !== "undefined"
      ? sessionStorage.getItem("fundraisingParticipantUuid")
      : null;
  const sectionIds = getCartSectionIds(cart);

  return {
    organizationUUID:
      (cart?.event?.organization as { uuid?: string } | undefined)?.uuid ||
      (cart?.event?.organizationUUID as string | undefined) ||
      (cart?.package?.organization as { uuid?: string } | undefined)?.uuid ||
      (cart?.package?.organizationUUID as string | undefined) ||
      (cart?.flex_pack?.organization as { uuid?: string } | undefined)?.uuid ||
      (cart?.flex_pack?.organizationUUID as string | undefined) ||
      (cart?.access_pass_template?.organization as { uuid?: string } | undefined)
        ?.uuid ||
      (cart?.access_pass_template?.organizationUUID as string | undefined),
    eventUUID: (cart?.event?.uuid as string | undefined) || cart?.eventUUID,
    packageUUID: cart?.package?.uuid as string | undefined,
    flexPackUUID: cart?.flex_pack?.uuid as string | undefined,
    accessPassTemplateUUID: cart?.access_pass_template?.uuid as
      | string
      | undefined,
    sectionIds: sectionIds.length ? sectionIds.join(",") : undefined,
    participantUuid:
      search.get("participantUuid") ||
      search.get("participant") ||
      sessionParticipantUuid ||
      undefined,
  };
};

export const buildFundraisingPayload = (
  campaign: CampaignLike,
  selection: FundraisingSelection | null | undefined,
) => {
  const donationAmount = Number(selection?.donationAmount || 0);
  if (!campaign?.campaignUuid || donationAmount <= 0) return null;

  const minimumAmount = Number(
    campaign?.donationRequirements?.minimumAmount || 0,
  );
  if (
    campaign?.donationRequirements?.mandatory &&
    minimumAmount > 0 &&
    donationAmount < minimumAmount
  ) {
    return null;
  }

  return {
    campaignUuid: campaign.campaignUuid,
    participantUuid: selection?.participantUuid || "",
    donationAmount,
    anonymous: Boolean(selection?.anonymous),
    donorMessage: selection?.donorMessage || "",
  };
};

export const buildPaymentIntentRequest = (
  cart: CartLike,
  event: unknown,
  fundraisingPayload: ReturnType<typeof buildFundraisingPayload>,
  guest?: PaymentIntentGuest | null,
) => ({
  ...buildBasePaymentIntentRequest(cart, event, guest),
  ...(fundraisingPayload ? { fundraising: fundraisingPayload } : {}),
});

export const createInitialFundraisingSelection = (
  campaign?: CampaignLike,
): FundraisingSelection => {
  const minimumAmount = Number(
    campaign?.donationRequirements?.minimumAmount || 0,
  );
  const mandatory = Boolean(campaign?.donationRequirements?.mandatory);

  return {
    donationAmount: mandatory && minimumAmount > 0 ? minimumAmount : 0,
    anonymous: false,
    donorMessage: "",
    participantUuid: campaign?.participantUuid || "",
  };
};

export const isFundraisingDonationSatisfied = (
  campaign: CampaignLike,
  selection: FundraisingSelection | null | undefined,
) => {
  const donationAmount = Number(selection?.donationAmount || 0);
  const requirements = campaign?.donationRequirements || {};
  if (!requirements.mandatory) return true;
  const minimumAmount = Number(requirements.minimumAmount || 0);
  return donationAmount >= minimumAmount;
};

export const resolveCheckoutFundraisingPricing = (
  campaign: CampaignLike,
  selection: FundraisingSelection | null | undefined,
) => {
  const donationAmount = Number(selection?.donationAmount || 0);
  if (!campaign || donationAmount <= 0) {
    return { ...EMPTY_FUNDRAISING_DONATION_PRICING };
  }
  const platformFee = Number(campaign.pricingPreview?.platformFee || 0);
  const processingFee = Number(campaign.pricingPreview?.processingFee || 0);
  return {
    donationAmount,
    platformFee,
    processingFee,
    totalCharge: donationAmount + platformFee + processingFee,
  };
};
