"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import InAppBackLink from "@/components/molecules/InAppBackLink";
import moment from "moment-timezone";
import Spinner from "@/components/atoms/Spinner";
import { WalletTicketsBlocksLoading } from "@/components/organisms/WalletTicketsLoader";
import { getBankAccount, getMyListings, getMyUpcomingOrders } from "@/lib/api";
import { formatCurrency, toIanaTimezone, type TimezoneLike } from "@/lib/helpers";
import { fluidSize } from "@/lib/shopperFluidType";
import { resolveBrandLogo, type BrandingOrganization } from "@/lib/branding";
import { downloadOrderReceipt } from "@/lib/orderReceipt";

type InvoiceBuyer = {
  firstName?: string;
  lastName?: string;
  email?: string;
};

type Invoice = {
  id?: string | number;
  orderId?: string;
  status?: string;
  createdAt?: string;
  processedAt?: string;
  total?: number | string;
  email?: string;
  firstName?: string;
  lastName?: string;
  timezone?: TimezoneLike;
  event?: {
    name?: string;
    start?: string;
    date_tbd?: boolean;
    venue?: { timezone?: TimezoneLike };
    organization?: BrandingOrganization | null;
    branding?: BrandingOrganization["branding"];
  } | null;
  package?: {
    name?: string;
    start?: string;
    venue?: { timezone?: TimezoneLike };
    organization?: BrandingOrganization | null;
    events?: Array<{ start?: string }>;
  } | null;
  tickets?: InvoiceTicket[];
  originalTickets?: InvoiceTicket[];
  package_tickets?: Array<{ id?: string | number }>;
  users_permissions_user?: InvoiceBuyer | null;
};

type InvoiceTicket = {
  on_sale_status?: string;
  transferred?: boolean;
  resale?: boolean;
};

function invoiceTimezone(invoice: Invoice) {
  return (
    invoice.timezone ||
    invoice.event?.venue?.timezone ||
    invoice.package?.venue?.timezone
  );
}

function zonedMoment(value: string | undefined, timezone?: TimezoneLike) {
  if (!value) return null;
  const tz = toIanaTimezone(timezone);
  const parsed = tz ? moment.tz(value, tz) : moment(value);
  return parsed.isValid() ? parsed : null;
}

function invoiceTitle(invoice: Invoice) {
  return invoice.event?.name?.trim() || invoice.package?.name?.trim() || "";
}

function orderedDate(invoice: Invoice) {
  return zonedMoment(invoice.createdAt, invoiceTimezone(invoice))?.format("MMM D, YYYY, h:mm A") || "";
}

function ticketLabel(count: number) {
  return `${count} ${count === 1 ? "ticket" : "tickets"}`;
}

function activityTickets(invoice: Invoice) {
  const current = invoice.tickets || [];
  const purchased = invoice.originalTickets || [];
  return purchased.length > current.length ? purchased : current;
}

function ticketCount(invoice: Invoice) {
  const count = activityTickets(invoice).length;
  if (count > 0) return count;
  return invoice.package_tickets?.length ?? 0;
}

function invoiceBadge(invoice: Invoice) {
  const status = invoice.status?.toLowerCase() || "";
  if (status === "refunded" || status === "released") return "Refunded";
  return "";
}

type OrderKind = "purchases" | "refunds";

function activityKind(invoice: Invoice): OrderKind {
  if (invoiceBadge(invoice)) return "refunds";
  return "purchases";
}

type SoldListing = {
  id?: string | number;
  status?: string;
  payout?: number | string;
  quantity?: number;
  fundsClaimed?: boolean;
  createdAt?: string;
  updatedAt?: string;
  soldAt?: string;
  tickets?: unknown[];
  event?: {
    name?: string;
    start?: string;
    end?: string;
    venue?: { timezone?: TimezoneLike };
  } | null;
};

function soldListings(value: unknown) {
  const data = (value as { data?: unknown } | null)?.data ?? value;
  return (Array.isArray(data) ? data : []).filter(
    (listing): listing is SoldListing =>
      (listing as SoldListing | null)?.status?.toLowerCase() === "complete",
  );
}

function saleAt(listing: SoldListing) {
  return listing.soldAt || listing.updatedAt || listing.createdAt || "";
}

function eventHasEnded(event?: SoldListing["event"]) {
  const end = event?.end || event?.start;
  if (!end) return false;
  return new Date(end).getTime() <= Date.now();
}

function saleProcessed(listing: SoldListing) {
  return Boolean(listing.fundsClaimed) || eventHasEnded(listing.event);
}

function soldCount(listing: SoldListing) {
  const listed = Number(listing.quantity);
  if (Number.isFinite(listed) && listed > 0) return listed;
  return listing.tickets?.length ?? 0;
}

function saleLine(listing: SoldListing) {
  const when = zonedMoment(saleAt(listing), listing.event?.venue?.timezone)?.format("MMM D, YYYY") || "";
  return ["Resale", when, listing.event?.name?.trim() || ""].filter(Boolean).join(" · ");
}

function accountLast4(account: unknown) {
  const record = (account as { data?: unknown } | null)?.data ?? account;
  const bank = record as {
    last4?: string | number;
    external_accounts?: { data?: Array<{ last4?: string | number }> } | Array<{ last4?: string | number }> | null;
  } | null;
  const raw = bank?.external_accounts;
  const first = Array.isArray(raw) ? raw[0] : Array.isArray(raw?.data) ? raw.data[0] : undefined;
  const value = first?.last4 ?? bank?.last4;
  if (value == null || value === "") return "";
  return String(value);
}

type ActivitySnapshot = {
  invoices: Invoice[];
  sales: SoldListing[];
  last4: string;
};

let activitySnapshot: ActivitySnapshot | null = null;
let activityRequest: Promise<ActivitySnapshot> | null = null;

export function __resetActivitySnapshotForTests() {
  activitySnapshot = null;
  activityRequest = null;
}

function loadActivitySnapshot() {
  if (activitySnapshot) return Promise.resolve(activitySnapshot);
  if (!activityRequest) {
    activityRequest = Promise.all([
      Promise.resolve().then(() => getMyUpcomingOrders()).catch(() => ({ data: [] })),
      Promise.resolve().then(() => getMyListings()).catch(() => ({ data: [] })),
      Promise.resolve().then(() => getBankAccount()).catch(() => ({ data: null })),
    ]).then(([orders, listings, account]) => {
      const snapshot: ActivitySnapshot = {
        invoices: Array.isArray(orders.data) ? (orders.data as Invoice[]) : [],
        sales: soldListings(listings),
        last4: accountLast4(account),
      };
      activitySnapshot = snapshot;
      return snapshot;
    });
  }
  return activityRequest;
}

function useActivityData() {
  const cached = activitySnapshot;
  const [ready, setReady] = useState(Boolean(cached));
  const [invoices, setInvoices] = useState<Invoice[]>(cached?.invoices ?? []);
  const [sales, setSales] = useState<SoldListing[]>(cached?.sales ?? []);
  const [last4, setLast4] = useState(cached?.last4 ?? "");

  useEffect(() => {
    if (activitySnapshot) return;
    let cancelled = false;
    void loadActivitySnapshot().then((snapshot) => {
      if (cancelled) return;
      setInvoices(snapshot.invoices);
      setSales(snapshot.sales);
      setLast4(snapshot.last4);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { ready, invoices, sales, last4 };
}

function activityLine(invoice: Invoice) {
  return ["Purchase", orderedDate(invoice), ticketLabel(ticketCount(invoice))].filter(Boolean).join(" · ");
}

function monthLabel(invoice: Invoice) {
  return zonedMoment(invoice.createdAt, invoiceTimezone(invoice))?.format("MMMM YYYY").toUpperCase() || "";
}

const ACTIVITY_ROW_CSS = `
.bt-activity-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:start;column-gap:12px;padding:8px 22px;border-bottom:1px solid rgba(5,27,53,0.06)}
.bt-activity-row.has-mark{grid-template-columns:auto minmax(0,1fr) auto}
.bt-activity-row:has(.bt-activity-receipt){align-items:center}
.bt-activity-mark{align-self:center;display:inline-flex;align-items:center;justify-content:center}
.bt-activity-copy{display:grid;row-gap:4px;min-width:0}
.bt-activity-side{display:grid;justify-items:end;align-content:center;row-gap:4px}
.bt-activity-title{font-size:15px;font-weight:700;line-height:1.25;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bt-activity-amount{font-size:15px;font-weight:700;line-height:1.25;font-variant-numeric:tabular-nums;white-space:nowrap}
.bt-activity-amount.is-credit{color:#17803d}
.bt-activity-meta{font-size:13px;line-height:1.25;color:#667085}
.bt-activity-receipt{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;font-size:13px;font-weight:600;color:#051b35;background:#fff;border:1px solid rgba(5,27,53,0.16);border-radius:999px;cursor:pointer;text-decoration:none}
.bt-activity-receipt:disabled{cursor:default;opacity:.55}
@media (max-width:900px){
  .bt-activity-copy,.bt-activity-side{display:contents}
  .bt-activity-row,.bt-activity-row.has-mark,.bt-activity-row:has(.bt-activity-receipt){grid-template-columns:minmax(0,1fr) auto;grid-template-areas:"title amount" "meta meta" "receipt receipt";align-items:start;padding:8px 18px}
  .bt-activity-mark{display:none}
  .bt-activity-title{grid-area:title;white-space:normal;overflow:visible;text-overflow:unset}
  .bt-activity-amount{grid-area:amount;justify-self:end}
  .bt-activity-meta{grid-area:meta}
  .bt-activity-receipt{grid-area:receipt;justify-self:start;background:transparent;border:none;border-radius:0;padding:4px 0 0}
}
`;

function ReceiptIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ width: 14, height: 14 }}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function ActivityEntry({
  invoice,
  rowId,
  downloading,
  showMark,
  onDownload,
}: {
  invoice: Invoice;
  rowId: string;
  downloading: boolean;
  showMark?: boolean;
  onDownload: () => void;
}) {
  const badge = invoiceBadge(invoice);
  return (
    <div className={showMark ? "bt-activity-row has-mark" : "bt-activity-row"}>
      {showMark ? <span className="bt-activity-mark"><TicketMark /></span> : null}
      <div className="bt-activity-copy">
        <div className="bt-activity-title">{invoiceTitle(invoice)}</div>
        <div className="bt-activity-meta">
          <span>{activityLine(invoice)}</span>
          {badge ? (
            <>
              {" "}
              <span style={{ display: "inline-flex", padding: "2px 8px", borderRadius: 999, background: "#eef0f4", color: "#6e7180", fontSize: 12, fontWeight: 600 }}>
                {badge}
              </span>
            </>
          ) : null}
        </div>
      </div>
      <div className="bt-activity-side">
        <div className="bt-activity-amount">{formatCurrency(Number(invoice.total) || 0)}</div>
        <button type="button" className="bt-activity-receipt" disabled={downloading} aria-busy={downloading || undefined} onClick={onDownload}>
          {downloading ? "Downloading…" : <><ReceiptIcon />Receipt</>}
        </button>
      </div>
    </div>
  );
}

function SaleMark() {
  return (
    <span aria-hidden className="bt-activity-mark" style={{ width: 36, height: 36, borderRadius: 12, background: "#f1f3f8", color: "#051b35", flexShrink: 0 }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    </span>
  );
}

function ResaleEntry({ listing, last4, showMark }: { listing: SoldListing; last4: string; showMark?: boolean }) {
  const count = soldCount(listing);
  const processed = saleProcessed(listing);
  const amount = Number(listing.payout) || 0;
  return (
    <div className={showMark ? "bt-activity-row has-mark bt-activity-sale" : "bt-activity-row bt-activity-sale"}>
      {showMark ? <SaleMark /> : null}
      <div className="bt-activity-copy">
        <div className="bt-activity-title">{`${count} ${count === 1 ? "ticket" : "tickets"} sold`}</div>
        <div className="bt-activity-meta">
          <span>{saleLine(listing)}</span>
          {processed ? (
            <span>{last4 ? ` · To account ••${last4}` : " · To account"}</span>
          ) : (
            <>
              {" "}
              <span style={{ display: "inline-flex", padding: "2px 8px", borderRadius: 999, background: "#eef0f4", color: "#6e7180", fontSize: 12, fontWeight: 600 }}>
                Payout on hold
              </span>
            </>
          )}
        </div>
      </div>
      <div className="bt-activity-side">
        <div className="bt-activity-amount is-credit">{`+${formatCurrency(amount)}`}</div>
      </div>
    </div>
  );
}

function newestInvoices(invoices: Invoice[]) {
  return [...invoices].sort(
    (a, b) =>
      new Date(b.createdAt || 0).getTime() -
      new Date(a.createdAt || 0).getTime(),
  );
}

export default function WalletAccountActivity() {
  const { ready, invoices, sales, last4 } = useActivityData();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [receiptError, setReceiptError] = useState("");

  const downloadInvoice = async (invoice: Invoice, rowId: string) => {
    const buyer = invoice.users_permissions_user;
    const organization =
      invoice.event?.organization || invoice.package?.organization || null;
    setDownloadingId(rowId);
    setReceiptError("");
    try {
      await downloadOrderReceipt({
        order: {
          ...invoice,
          processedAt: invoice.processedAt || invoice.createdAt,
          ...(buyer
            ? {
                firstName: buyer.firstName,
                lastName: buyer.lastName,
                email: buyer.email || invoice.email,
                user: buyer,
              }
            : {}),
        },
        purchaser: buyer || undefined,
        sellerLogoUrl: resolveBrandLogo(invoice.event, organization),
        sellerName: organization?.name,
      });
    } catch {
      setReceiptError("Could not download receipt.");
    } finally {
      setDownloadingId(null);
    }
  };

  if (!ready) {
    return (
      <div style={{ minHeight: 140, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spinner size={28} variant="compact" label="Loading activity" />
      </div>
    );
  }
  const preview = feedEntries(invoices, sales, "all").slice(0, 4);
  if (preview.length === 0) {
    return (
      <div style={{ padding: "30px 22px", textAlign: "center", display: "flex", flexDirection: "column", gap: 5 }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>Nothing here yet</div>
        <div style={{ fontSize: 13, color: "#667085" }}>Purchases, payouts, and refunds will appear here.</div>
      </div>
    );
  }

  return (
    <div>
      <style>{ACTIVITY_ROW_CSS}</style>
      {preview.map((entry) =>
        entry.kind === "sale" ? (
          <ResaleEntry key={entry.id} listing={entry.listing} last4={last4} />
        ) : (
          <ActivityEntry
            key={entry.id}
            invoice={entry.invoice}
            rowId={entry.id}
            downloading={downloadingId === entry.id}
            onDownload={() => void downloadInvoice(entry.invoice, entry.id)}
          />
        ),
      )}
      <Link
        href="/wallet/my-profile/activity/"
        style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "12px 22px 16px", color: "#051b35", fontWeight: 700, textDecoration: "none" }}
      >
        View all activity
        <span aria-hidden>→</span>
      </Link>
      {receiptError ? (
        <p role="alert" style={{ color: "#b42318", margin: 0, padding: "0 22px 12px" }}>
          {receiptError}
        </p>
      ) : null}
    </div>
  );
}

const NAVY = "#051b35";
const MUTE = "#8a93a3";

function ActivityBackArrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ width: 16, height: 16 }}>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function TicketMark() {
  return (
    <span aria-hidden style={{ width: 36, height: 36, borderRadius: 12, background: "#f1f3f8", color: NAVY, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={{ width: 18, height: 18 }}>
        <path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8z" />
        <path d="M12 6v12" strokeDasharray="2 2" />
      </svg>
    </span>
  );
}

type ActivityFilter = "all" | OrderKind | "resale";

type FeedEntry =
  | { id: string; at: number; month: string; kind: "order"; invoice: Invoice }
  | { id: string; at: number; month: string; kind: "sale"; listing: SoldListing };

function emptyActivityCopy(filter: ActivityFilter) {
  if (filter === "purchases") {
    return { title: "No purchases yet", body: "Purchases you make will show up here." };
  }
  if (filter === "refunds") {
    return { title: "No refunds yet", body: "Refunds will show up here." };
  }
  if (filter === "resale") {
    return { title: "Nothing sold yet", body: "Listings that sell will move here." };
  }
  return { title: "No activity yet", body: "Purchases, refunds, and resale will show up here." };
}

function feedEntries(invoices: Invoice[], sales: SoldListing[], filter: ActivityFilter) {
  const entries: FeedEntry[] = [];
  if (filter !== "resale") {
    for (const invoice of invoices) {
      if (filter !== "all" && activityKind(invoice) !== filter) continue;
      entries.push({
        id: `order-${invoice.id ?? invoice.orderId ?? entries.length}`,
        at: new Date(invoice.createdAt || 0).getTime(),
        month: monthLabel(invoice),
        kind: "order",
        invoice,
      });
    }
  }
  if (filter === "all" || filter === "resale") {
    sales.forEach((listing, index) => {
      const at = saleAt(listing);
      entries.push({
        id: `sale-${listing.id ?? index}`,
        at: new Date(at || 0).getTime(),
        month: zonedMoment(at, listing.event?.venue?.timezone)?.format("MMMM YYYY").toUpperCase() || "",
        kind: "sale",
        listing,
      });
    });
  }
  return entries.sort((a, b) => b.at - a.at);
}

export function WalletActivityPage() {
  const { ready, invoices, sales, last4 } = useActivityData();
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [receiptError, setReceiptError] = useState("");

  const downloadInvoice = async (invoice: Invoice, rowId: string) => {
    const buyer = invoice.users_permissions_user;
    const organization = invoice.event?.organization || invoice.package?.organization || null;
    setDownloadingId(rowId);
    setReceiptError("");
    try {
      await downloadOrderReceipt({
        order: {
          ...invoice,
          processedAt: invoice.processedAt || invoice.createdAt,
          ...(buyer
            ? {
                firstName: buyer.firstName,
                lastName: buyer.lastName,
                email: buyer.email || invoice.email,
                user: buyer,
              }
            : {}),
        },
        purchaser: buyer || undefined,
        sellerLogoUrl: resolveBrandLogo(invoice.event, organization),
        sellerName: organization?.name,
      });
    } catch {
      setReceiptError("Could not download receipt.");
    } finally {
      setDownloadingId(null);
    }
  };

  const counts = { purchases: 0, refunds: 0, resale: sales.length };
  for (const invoice of invoices) counts[activityKind(invoice)] += 1;
  const visible = feedEntries(invoices, sales, filter);
  const groups: Array<{ label: string; rows: FeedEntry[] }> = [];
  for (const entry of visible) {
    const last = groups[groups.length - 1];
    if (last && last.label === entry.month) last.rows.push(entry);
    else groups.push({ label: entry.month, rows: [entry] });
  }
  const filters: Array<{ id: ActivityFilter; label: string; count: number }> = [
    { id: "all", label: "All", count: invoices.length + sales.length },
    { id: "purchases", label: "Purchases", count: counts.purchases },
    { id: "refunds", label: "Refunds", count: counts.refunds },
    { id: "resale", label: "Resale", count: counts.resale },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px 48px", display: "flex", flexDirection: "column", gap: 18, color: NAVY }}>
      <InAppBackLink href="/wallet/my-profile/" aria-label="Back to profile" style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, color: NAVY, background: "#fff", border: "1px solid rgba(5,27,53,0.16)", borderRadius: 999, padding: "9px 16px 9px 12px", textDecoration: "none" }}>
        <ActivityBackArrow />
        Back to profile
      </InAppBackLink>
      <div>
        <h1 style={{ margin: 0, fontSize: 36, fontWeight: 700, letterSpacing: "-0.03em" }}>Account activity</h1>
        <p style={{ margin: "6px 0 0", color: "#667085" }}>Purchases, payouts, and refunds on your account.</p>
      </div>
      {!ready ? <WalletTicketsBlocksLoading /> : (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {filters.map((item) => {
              const selected = filter === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={selected}
                  aria-label={`${item.label} ${item.count}`}
                  onClick={() => setFilter(item.id)}
                  style={{
                    fontFamily: "inherit",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: fluidSize(14),
                    fontWeight: 600,
                    lineHeight: 1.5,
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                    background: selected ? NAVY : "#fff",
                    color: selected ? "#fff" : NAVY,
                    border: `1px solid ${selected ? NAVY : "rgba(5,27,53,0.12)"}`,
                    borderRadius: 999,
                    padding: "10px 16px",
                  }}
                >
                  {item.label}
                  <span style={{ fontSize: fluidSize(12), fontWeight: 500, lineHeight: 1.5, fontVariantNumeric: "tabular-nums", color: selected ? "rgba(255,255,255,0.72)" : MUTE }}>
                    {item.count}
                  </span>
                </button>
              );
            })}
          </div>
          {visible.length === 0 ? (
            <div style={{ background: "#fff", borderRadius: 20, padding: "28px 22px", textAlign: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{emptyActivityCopy(filter).title}</div>
              <div style={{ marginTop: 6, fontSize: 13, color: "#6e7180" }}>{emptyActivityCopy(filter).body}</div>
            </div>
          ) : (
            <div style={{ background: "#fff", borderRadius: 20, overflow: "hidden" }}>
              <style>{ACTIVITY_ROW_CSS}</style>
              {groups.map((group) => (
                <div key={group.label}>
                  <div style={{ padding: "10px 18px", background: "#f6f7fb", color: "#8b919e", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em" }}>
                    {group.label}
                  </div>
                  {group.rows.map((entry) =>
                    entry.kind === "sale" ? (
                      <ResaleEntry key={entry.id} listing={entry.listing} last4={last4} showMark />
                    ) : (
                      <ActivityEntry
                        key={entry.id}
                        invoice={entry.invoice}
                        rowId={entry.id}
                        downloading={downloadingId === entry.id}
                        showMark
                        onDownload={() => void downloadInvoice(entry.invoice, entry.id)}
                      />
                    ),
                  )}
                </div>
              ))}
            </div>
          )}
          {receiptError ? <p role="alert" style={{ color: "#b42318", margin: 0 }}>{receiptError}</p> : null}
        </>
      )}
    </div>
  );
}
