/** Split GET /listings/available-funds into the two payout totals. */
export function payoutTotals(data: unknown): { available: number; onHold: number } {
  const sum = (rows: unknown) =>
    (Array.isArray(rows) ? rows : []).reduce((total: number, row: unknown) => {
      const payout = Number((row as { payout?: unknown } | null)?.payout || 0);
      return total + (Number.isFinite(payout) ? payout : 0);
    }, 0);

  if (Array.isArray(data)) return { available: 0, onHold: sum(data) };
  const record = (data && typeof data === "object" ? data : {}) as {
    available?: unknown;
    onHold?: unknown;
  };
  return { available: sum(record.available), onHold: sum(record.onHold) };
}
