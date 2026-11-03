export const PAYOUT_BUSINESS_TYPES = [
  { value: "individual", label: "Individual" },
  { value: "company", label: "Company" },
  { value: "non_profit", label: "Nonprofit" },
  { value: "government_entity", label: "Government entity" },
] as const;

export type PayoutBusinessType = (typeof PAYOUT_BUSINESS_TYPES)[number]["value"];

export function isPayoutBusinessType(value: unknown): value is PayoutBusinessType {
  return PAYOUT_BUSINESS_TYPES.some((option) => option.value === value);
}

export function payoutAccountPayload(
  businessType: PayoutBusinessType,
  currentBusinessType?: string | null,
) {
  const payload: {
    businessType: PayoutBusinessType;
    currentBusinessType?: PayoutBusinessType;
  } = { businessType };
  if (isPayoutBusinessType(currentBusinessType)) {
    payload.currentBusinessType = currentBusinessType;
  }
  return payload;
}
