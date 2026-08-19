"use client";

import { useEffect, useState } from "react";
import WalletShell from "@/components/templates/WalletShell";
import EmptyState from "@/components/molecules/EmptyState";
import PageLoader from "@/components/molecules/PageLoader";
import { cardCls } from "@/components/molecules/Card";
import Pill from "@/components/atoms/Pill";
import Button from "@/components/atoms/Button";
import {
  acceptIncomingTransfers,
  cancelMyTransfers,
  getIncomingTransfers,
  getMyReceivedTransfers,
  getMySentTransfers,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatEventWhen, getSingularOrPluralWord } from "@/lib/helpers";
import {
  type IncomingTransfer,
  seatLabel,
  strapiAttr,
  strapiRel,
  unwrapList,
} from "@/lib/wallet";

type TransferRow = {
  id: number | string;
  to?: string;
  from?: string;
  eventName?: string;
  eventStart?: string;
  seats: string;
  when?: string;
  status: string;
};

function StatusIcon({ status }: { status: string }) {
  const pending = status === "pending" || status === "new";
  if (pending) {
    return (
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#fe9a00]/15 text-[#ffc266]">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
        </svg>
      </span>
    );
  }
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#4caf50]/15 text-[#86e29b]">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="m5 12.5 4.5 4.5L19 7.5" />
      </svg>
    </span>
  );
}

function normalizeStrapiTransfer(raw: unknown): TransferRow {
  const t = strapiAttr<Record<string, unknown>>(raw);
  const event = strapiRel<{ name?: string; start?: string }>(t.event);
  const tickets = strapiRel<{ sectionNumber?: string; rowNumber?: string; seatNumber?: string; generalAdmission?: boolean }[]>(t.tickets);
  const ticketList = Array.isArray(tickets) ? tickets : [];
  return {
    id: t.id!,
    to: String(t.emailAddressToUser || ""),
    from: String(t.fromUserEmail || ""),
    eventName: event?.name,
    eventStart: event?.start,
    seats: ticketList.map((tk) => seatLabel(tk)).join(", ") || `${ticketList.length} tickets`,
    when: t.createdAt ? String(t.createdAt) : undefined,
    status: String(t.status || "pending"),
  };
}

function normalizeIncoming(t: IncomingTransfer): TransferRow {
  return {
    id: t.id,
    from: t.fromUserEmail,
    to: t.emailAddressToUser,
    eventName: t.event?.name,
    eventStart: t.event?.start,
    seats: (t.tickets || []).map((tk) => seatLabel(tk)).join(", ") ||
      `${t.tickets?.length ?? 0} ${getSingularOrPluralWord(t.tickets?.length ?? 0).toLowerCase()}`,
    status: t.status || "pending",
  };
}

export default function MyTransfersPage() {
  const { user, ready, isAuthenticated } = useAuth();
  const [tab, setTab] = useState<"sent" | "received">("sent");
  const [sent, setSent] = useState<TransferRow[]>([]);
  const [received, setReceived] = useState<TransferRow[]>([]);
  const [incoming, setIncoming] = useState<TransferRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | number | null>(null);

  const load = async () => {
    if (!user?.email) return;
    setLoading(true);
    try {
      const [sentRes, receivedRes, incomingRes] = await Promise.all([
        getMySentTransfers(user.email, 1),
        getMyReceivedTransfers(user.email, 1),
        getIncomingTransfers(),
      ]);
      setSent(unwrapList(sentRes.data?.data ?? sentRes.data).map(normalizeStrapiTransfer));
      setReceived(unwrapList(receivedRes.data?.data ?? receivedRes.data).map(normalizeStrapiTransfer));
      setIncoming(unwrapList<IncomingTransfer>(incomingRes.data).map(normalizeIncoming));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!ready || !isAuthenticated) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, isAuthenticated, user?.email]);

  const cancelTransfer = async (id: string | number) => {
    setBusyId(id);
    try {
      await cancelMyTransfers({ data: { transferId: id } });
      await load();
    } catch (err) {
      console.error(err);
    } finally {
      setBusyId(null);
    }
  };

  const acceptTransfer = async (id: string | number) => {
    setBusyId(id);
    try {
      await acceptIncomingTransfers({ transferId: id });
      await load();
    } catch (err) {
      console.error(err);
    } finally {
      setBusyId(null);
    }
  };

  const receivedCombined = [
    ...incoming,
    ...received.filter((r) => !incoming.some((i) => String(i.id) === String(r.id))),
  ];

  const rows = tab === "sent" ? sent : receivedCombined;

  return (
    <WalletShell>
      <div className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/[0.04] p-1">
        {(["sent", "received"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full px-5 py-2 text-[14px] font-semibold capitalize transition-colors ${
              tab === t ? "bg-[#A6E773] text-[#051B35]" : "text-[#9DA2B3] hover:text-white"
            }`}
          >
            {t}
            {t === "sent" && sent.length > 0 && (
              <span className={`ml-1.5 ${tab === t ? "text-[#051B35]/60" : "text-[#6E7180]"}`}>
                {sent.length}
              </span>
            )}
            {t === "received" && incoming.length > 0 && (
              <span className={`ml-1.5 ${tab === t ? "text-[#051B35]/60" : "text-[#6E7180]"}`}>
                {incoming.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <PageLoader message="Loading transfers…" label="Loading transfers" className="mt-6 min-h-[30vh]" />
      ) : rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            }
          >
            {tab === "sent"
              ? "No sent transfers yet."
              : "No received transfers — when someone sends you tickets, they’ll show up here to claim."}
          </EmptyState>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {rows.map((row) => {
            const pending = row.status === "pending" || row.status === "new";
            const claimed = row.status === "claimed" || row.status === "complete";
            return (
              <div key={String(row.id)} className={`${cardCls} flex flex-wrap items-center gap-5 p-5 sm:p-6`}>
                <StatusIcon status={row.status} />
                <div className="min-w-0 flex-1">
                  <p className="text-[16px] font-semibold leading-snug">
                    {row.eventName || "Transfer"}
                  </p>
                  <p className="mt-1 text-[13.5px] text-[#BCBFCC]">{row.seats}</p>
                  <p className="mt-0.5 text-[13px] text-[#9DA2B3]">
                    {tab === "sent" ? (
                      <>
                        To <span className="font-medium text-[#BCBFCC]">{row.to}</span>
                      </>
                    ) : (
                      <>
                        From <span className="font-medium text-[#BCBFCC]">{row.from || "a fan"}</span>
                      </>
                    )}
                    {row.when || row.eventStart
                      ? ` · ${formatEventWhen(row.when || row.eventStart, undefined, "MMM D, YYYY")}`
                      : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2.5">
                  {pending ? (
                    <>
                      <Pill variant="warning">
                        {tab === "sent" ? "Waiting to be claimed" : "Ready to claim"}
                      </Pill>
                      {tab === "sent" ? (
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => void cancelTransfer(row.id)}
                          className="text-[13px] font-semibold text-[#ff7a72] transition-colors hover:text-[#ff9a93] disabled:opacity-50"
                        >
                          {busyId === row.id ? "Cancelling…" : "Cancel transfer"}
                        </button>
                      ) : (
                        <Button size="sm" disabled={busyId === row.id} onClick={() => void acceptTransfer(row.id)}>
                          {busyId === row.id ? "Accepting…" : "Accept"}
                        </Button>
                      )}
                    </>
                  ) : claimed ? (
                    <Pill variant="success">Claimed</Pill>
                  ) : (
                    <Pill variant="neutral">{row.status}</Pill>
                  )}
                </div>
              </div>
            );
          })}
          {tab === "sent" && (
            <p className="pt-1 text-[13px] text-[#9DA2B3]">
              Pending transfers can be cancelled any time before the recipient claims them.
            </p>
          )}
        </div>
      )}
    </WalletShell>
  );
}
