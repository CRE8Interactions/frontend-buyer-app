export type InvoiceDonationLine = {
  name: string;
  amount: number;
};

function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function parseDetails(details: unknown): Record<string, unknown> {
  if (!details) return {};
  if (typeof details === "string") {
    try {
      const parsed = JSON.parse(details);
      return parsed && typeof parsed === "object"
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  if (typeof details === "object") return details as Record<string, unknown>;
  return {};
}

function unwrapRuleName(rule: unknown): string {
  if (!rule || typeof rule !== "object") return "";
  const record = rule as Record<string, unknown>;
  const attrs =
    record.attributes && typeof record.attributes === "object"
      ? (record.attributes as Record<string, unknown>)
      : record;
  return String(attrs.name || "").trim();
}

export function donationReceiptLineName(ruleName?: unknown): string {
  const name = String(ruleName || "").trim();
  if (!name) return "Donation";
  return /donation/i.test(name) ? name : `${name} Donation`;
}

function isGenericDonationLabel(name: string) {
  return name.trim().toLowerCase() === "donation";
}

function isPositiveDonationAmount(amount: unknown): boolean {
  const value = roundMoney(Number(amount));
  return Number.isFinite(value) && value > 0;
}

function readDonationEntry(entry: unknown): InvoiceDonationLine | null {
  if (!entry || typeof entry !== "object") return null;
  const record = entry as Record<string, unknown>;
  if (record.externalPending === true) return null;
  const amount = roundMoney(Number(record.amount));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return {
    name: donationReceiptLineName(record.ruleName),
    amount,
  };
}

function buildRuleNameById(order: Record<string, unknown>): Map<string, string> {
  const map = new Map<string, string>();
  const raw = order.donation_requirements ?? order.donationRequirements ?? [];
  if (!Array.isArray(raw)) return map;
  for (const requirement of raw) {
    if (!requirement || typeof requirement !== "object") continue;
    const record = requirement as Record<string, unknown>;
    const rule = record.donation_rule;
    if (!rule || typeof rule !== "object") continue;
    const ruleRecord = rule as Record<string, unknown>;
    const ruleId = String(ruleRecord.id ?? "").trim();
    const name = unwrapRuleName(rule);
    if (ruleId && name) map.set(ruleId, name);
  }
  return map;
}

function withResolvedRuleName(
  entry: unknown,
  ruleNameById?: Map<string, string>,
): Record<string, unknown> | null {
  if (!entry || typeof entry !== "object") return null;
  const record = { ...(entry as Record<string, unknown>) };
  if (!record.ruleName && ruleNameById?.size) {
    const ruleId = String(record.ruleId ?? "").trim();
    const resolved = ruleId ? ruleNameById.get(ruleId) : "";
    if (resolved) record.ruleName = resolved;
  }
  return record;
}

function linesFromAssignmentDetails(
  details: Record<string, unknown>,
  ruleNameById?: Map<string, string>,
) {
  const lines: InvoiceDonationLine[] = [];
  const multi = Array.isArray(details.donations) ? details.donations : [];
  for (const entry of multi) {
    const line = readDonationEntry(withResolvedRuleName(entry, ruleNameById));
    if (line) lines.push(line);
  }
  if (!lines.length) {
    const line = readDonationEntry(
      withResolvedRuleName(details.donation, ruleNameById),
    );
    if (line) lines.push(line);
  }
  return lines;
}

function linesFromCheckoutFundraising(
  details: Record<string, unknown>,
): InvoiceDonationLine[] {
  const fundraising = details.fundraising;
  if (!fundraising || typeof fundraising !== "object") return [];
  const record = fundraising as Record<string, unknown>;
  const amount = roundMoney(Number(record.donationAmount));
  if (!Number.isFinite(amount) || amount <= 0) return [];
  const title = String(
    record.donationTitle ?? record.campaignTitle ?? record.campaignName ?? "",
  ).trim();
  return [
    {
      name: donationReceiptLineName(title || "Community giving"),
      amount,
    },
  ];
}

function linesFromCheckoutFundraisingSupplement(
  order: Record<string, unknown>,
): InvoiceDonationLine[] {
  const raw =
    order.checkout_fundraising_donation_lines ??
    order.checkoutFundraisingDonationLines;
  if (!Array.isArray(raw)) return [];
  const lines: InvoiceDonationLine[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const amount = roundMoney(Number(record.amount));
    if (amount <= 0) continue;
    const name = String(record.name || "").trim();
    lines.push({ name: name || "Donation", amount });
  }
  return lines;
}

function linesFromIntentFundraisingMetadata(
  order: Record<string, unknown>,
): InvoiceDonationLine[] {
  const intent = order.intentDetails ?? order.intent_details;
  if (!intent || typeof intent !== "object") return [];
  const intentRecord = intent as Record<string, unknown>;
  const metadata =
    (intentRecord.metadata as Record<string, unknown> | undefined) ||
    (
      intentRecord.charges as
        | { data?: Array<{ metadata?: Record<string, unknown> }> }
        | undefined
    )?.data?.[0]?.metadata;
  if (!metadata) return [];
  const amount = roundMoney(Number(metadata.fundraisingDonationAmount));
  if (amount <= 0) return [];
  return [{ name: "Donation", amount }];
}

function appendUniqueDonationLines(
  base: InvoiceDonationLine[],
  extra: InvoiceDonationLine[],
): InvoiceDonationLine[] {
  if (!extra.length) return base;
  const merged = [...base];
  for (const line of extra) {
    const exactDuplicate = merged.some(
      (existing) => existing.name === line.name && existing.amount === line.amount,
    );
    if (exactDuplicate) continue;
    const sameAmount = merged.find((existing) => existing.amount === line.amount);
    if (sameAmount) {
      if (isGenericDonationLabel(line.name)) continue;
      if (isGenericDonationLabel(sameAmount.name)) {
        const index = merged.indexOf(sameAmount);
        if (index >= 0) merged[index] = line;
        continue;
      }
    }
    merged.push(line);
  }
  return merged;
}

function mergeCheckoutFundraisingSources(
  record: Record<string, unknown>,
): InvoiceDonationLine[] {
  const parsedDetails = parseDetails(record.details);
  const sources = [
    ...linesFromCheckoutFundraising(parsedDetails),
    ...linesFromCheckoutFundraisingSupplement(record),
    ...linesFromIntentFundraisingMetadata(record),
  ];
  const merged: InvoiceDonationLine[] = [];
  for (const line of sources) {
    const exactDuplicate = merged.some(
      (existing) => existing.name === line.name && existing.amount === line.amount,
    );
    if (exactDuplicate) continue;
    const sameAmount = merged.find((existing) => existing.amount === line.amount);
    if (sameAmount) {
      if (isGenericDonationLabel(line.name)) continue;
      if (isGenericDonationLabel(sameAmount.name)) {
        const index = merged.indexOf(sameAmount);
        if (index >= 0) merged[index] = line;
        continue;
      }
      continue;
    }
    merged.push(line);
  }
  return merged;
}

function linesFromRequirements(order: Record<string, unknown>) {
  const raw = order.donation_requirements ?? order.donationRequirements ?? [];
  if (!Array.isArray(raw)) return [];
  const lines: InvoiceDonationLine[] = [];
  for (const requirement of raw) {
    if (!requirement || typeof requirement !== "object") continue;
    const record = requirement as Record<string, unknown>;
    const meta =
      record.meta && typeof record.meta === "object"
        ? (record.meta as Record<string, unknown>)
        : {};
    if (meta.awaitingExternalPayment === true) continue;
    const amount = roundMoney(
      Number(meta.assignmentDonationAmount) || Number(record.recordedAmount) || 0,
    );
    if (amount <= 0) continue;
    lines.push({
      name: donationReceiptLineName(unwrapRuleName(record.donation_rule)),
      amount,
    });
  }
  return lines;
}

function filterPositiveDonationLines(lines: InvoiceDonationLine[]) {
  return lines.filter((line) => isPositiveDonationAmount(line.amount));
}

function estimatedCustomerMerchandiseSubtotal(record: Record<string, unknown>) {
  const total = Number(record.total) || 0;
  if (total <= 0) return 0;
  const service = Number(record.serviceFee ?? record.service_fee) || 0;
  const processing = Number(
    record.processingFee ??
      record.processing_fee ??
      record.estimatedProcessingFee ??
      record.estimated_processing_fee,
  );
  const totalFee = Number(record.totalFeeAmount ?? record.total_fee_amount) || 0;
  const salesTax = Number(record.salesTax ?? record.sales_tax) || 0;
  return roundMoney(total - service - processing - totalFee - salesTax);
}

function isPlausibleDonationTotalFallback(
  donationTotal: number,
  record: Record<string, unknown>,
) {
  if (!isPositiveDonationAmount(donationTotal)) return false;
  const merchandiseSubtotal = estimatedCustomerMerchandiseSubtotal(record);
  if (merchandiseSubtotal <= 0) return true;
  if (donationTotal >= merchandiseSubtotal * 0.9 - 0.01) return false;
  return true;
}

function finalizeDonationLines(
  record: Record<string, unknown>,
  base: InvoiceDonationLine[],
) {
  return appendUniqueDonationLines(base, mergeCheckoutFundraisingSources(record));
}

export function getInvoiceDonationLines(order: unknown): InvoiceDonationLine[] {
  if (!order || typeof order !== "object") return [];
  const record = order as Record<string, unknown>;
  const parsedDetails = parseDetails(record.details);
  const ruleNameById = buildRuleNameById(record);
  const fromRequirements = linesFromRequirements(record);
  if (fromRequirements.length) {
    return filterPositiveDonationLines(finalizeDonationLines(record, fromRequirements));
  }

  const fromDetails = linesFromAssignmentDetails(parsedDetails, ruleNameById);
  if (
    fromDetails.length &&
    !(fromDetails.length === 1 && isGenericDonationLabel(fromDetails[0].name))
  ) {
    return filterPositiveDonationLines(finalizeDonationLines(record, fromDetails));
  }

  const donationTotal = roundMoney(
    Number(record.donation_total ?? record.donationTotal) || 0,
  );
  const fallbackAmount = fromDetails.length === 1 ? fromDetails[0].amount : donationTotal;

  if (fallbackAmount > 0) {
    const raw = record.donation_requirements ?? record.donationRequirements ?? [];
    if (Array.isArray(raw) && raw.length === 1) {
      const rule = (raw[0] as Record<string, unknown>)?.donation_rule;
      return filterPositiveDonationLines(
        finalizeDonationLines(record, [
          {
            name: donationReceiptLineName(unwrapRuleName(rule)),
            amount: fallbackAmount,
          },
        ]),
      );
    }
    if (fromDetails.length === 1 && !isGenericDonationLabel(fromDetails[0].name)) {
      return filterPositiveDonationLines(finalizeDonationLines(record, fromDetails));
    }
    if (donationTotal > 0 && isPlausibleDonationTotalFallback(donationTotal, record)) {
      return filterPositiveDonationLines(
        finalizeDonationLines(record, [{ name: "Donation", amount: donationTotal }]),
      );
    }
  }

  return filterPositiveDonationLines(finalizeDonationLines(record, fromDetails));
}

/** Donation dollars shown as their own receipt rows, excluding fees and tax. */
export function getInvoiceDonationMerchandiseSubtotal(order: unknown): number {
  return roundMoney(
    getInvoiceDonationLines(order).reduce(
      (sum, line) => sum + (isPositiveDonationAmount(line.amount) ? line.amount : 0),
      0,
    ),
  );
}
