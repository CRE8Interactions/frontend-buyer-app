"use client";

import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import AppShell from "@/components/templates/AppShell";
import BackChip from "@/components/molecules/BackChip";
import Modal from "@/components/molecules/Modal";
import EmptyState from "@/components/molecules/EmptyState";
import PageLoader from "@/components/molecules/PageLoader";
import { cardCls, chipBtnSmCls } from "@/components/molecules/Card";
import { Input, Label } from "@/components/atoms/form";
import Button from "@/components/atoms/Button";
import Pill from "@/components/atoms/Pill";
import {
  createListing,
  createTicketTransfer,
  downloadApplePass,
  downloadGooglePass,
  getOrder,
  getTicketsByEvent,
  getMyEvents,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { emailPatternMatch, getSingularOrPluralWord } from "@/lib/helpers";
import {
  type EventLike,
  type OrderLike,
  type TicketLike,
  downloadBlobPass,
  eventImage,
  eventWhenLabel,
  isAndroid,
  isIos,
  seatLabel,
  unwrapList,
} from "@/lib/wallet";

type Props = {
  orderId?: string;
  eventUUID?: string;
  backHref?: string;
  backLabel?: string;
};

export default function EventTicketsClient({
  orderId,
  eventUUID,
  backHref = "/my-events/",
  backLabel = "My events",
}: Props) {
  const { user, ready, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderLike | null>(null);
  const [event, setEvent] = useState<EventLike | null>(null);
  const [tickets, setTickets] = useState<TicketLike[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [eTicket, setETicket] = useState<TicketLike | null>(null);
  const [xferStep, setXferStep] = useState<null | "select" | "email" | "confirm" | "done">(null);
  const [xferIds, setXferIds] = useState<(string | number)[]>([]);
  const [xferEmail, setXferEmail] = useState("");
  const [xferSaving, setXferSaving] = useState(false);
  const [sellStep, setSellStep] = useState<null | "select" | "price" | "done">(null);
  const [sellIds, setSellIds] = useState<(string | number)[]>([]);
  const [sellPrice, setSellPrice] = useState("");
  const [sellSaving, setSellSaving] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      if (orderId) {
        const res = await getOrder(orderId);
        const data = res.data as OrderLike;
        const uuid = eventUUID || data?.event?.uuid;
        const filtered = (data.tickets || []).filter(
          (t) => !uuid || (t.eventUUID || t.eventId) === uuid,
        );
        const ev =
          data.event ||
          data.package?.events?.find((e) => e.uuid === uuid) ||
          null;
        setOrder(data);
        setEvent(ev);
        setTickets(filtered);
      } else if (eventUUID) {
        try {
          const res = await getTicketsByEvent(eventUUID);
          const data = res.data as { event?: EventLike; tickets?: TicketLike[]; order?: OrderLike };
          setEvent(data.event || null);
          setTickets(data.tickets || unwrapList(data));
          setOrder(data.order || null);
        } catch {
          const eventsRes = await getMyEvents();
          const orders = unwrapList<OrderLike>(eventsRes.data);
          const matching = orders.filter(
            (o) =>
              o.event?.uuid === eventUUID ||
              o.package?.events?.some((e) => e.uuid === eventUUID) ||
              o.tickets?.some((t) => (t.eventUUID || t.eventId) === eventUUID),
          );
          const first = matching[0];
          if (!first) throw new Error("Event not found");
          const ev =
            first.event?.uuid === eventUUID
              ? first.event
              : first.package?.events?.find((e) => e.uuid === eventUUID) || first.event || null;
          const allTickets = matching.flatMap((o) =>
            (o.tickets || []).filter((t) => (t.eventUUID || t.eventId) === eventUUID),
          );
          setOrder(first);
          setEvent(ev);
          setTickets(allTickets);
        }
      }
    } catch (err) {
      console.error(err);
      setError("Could not load tickets for this event.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!ready || !isAuthenticated) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, isAuthenticated, orderId, eventUUID]);

  const validXferEmail = emailPatternMatch(xferEmail) && Boolean(xferEmail);
  const xferSelected = useMemo(
    () => tickets.filter((t) => t.id != null && xferIds.includes(t.id)),
    [tickets, xferIds],
  );
  const sellSelected = useMemo(
    () => tickets.filter((t) => t.id != null && sellIds.includes(t.id)),
    [tickets, sellIds],
  );

  const toggleId = (
    id: string | number,
    list: (string | number)[],
    setList: (v: (string | number)[]) => void,
  ) => setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const submitTransfer = async () => {
    if (!order?.id || !event) return;
    setXferSaving(true);
    try {
      await createTicketTransfer({
        email: xferEmail,
        orderId: order.id,
        event,
        ticketIds: xferIds,
        eventUUID: event.uuid,
      });
      setXferStep("done");
      await load();
    } catch (err) {
      console.error(err);
    } finally {
      setXferSaving(false);
    }
  };

  const submitSell = async () => {
    if (!order || !event) return;
    const price = parseFloat(sellPrice);
    if (!price || price <= 0) return;
    setSellSaving(true);
    try {
      const selected = tickets.filter((t) => t.id != null && sellIds.includes(t.id));
      const first = selected[0];
      await createListing({
        tickets: selected,
        quantity: selected.length,
        askingPrice: price,
        event,
        fromOrder: order.id,
        type: first?.generalAdmission ? "GA" : "SEATED",
        ...(first?.rowId && first?.sectionId
          ? {
              rowId: first.rowId,
              sectionId: first.sectionId,
              sectionNumber: first.sectionNumber,
              rowNumber: first.rowNumber,
            }
          : {}),
      });
      setSellStep("done");
      await load();
    } catch (err) {
      console.error(err);
    } finally {
      setSellSaving(false);
    }
  };

  const addApple = async (ticket: TicketLike) => {
    if (!event) return;
    try {
      const res = await downloadApplePass({ event, obj: ticket });
      await downloadBlobPass(res.data as Blob, "event.pkpass");
    } catch (err) {
      console.error(err);
      setWalletError("Could not download your Apple Wallet pass.");
    }
  };

  const addGoogle = async (ticket: TicketLike) => {
    if (!event) return;
    try {
      const res = await downloadGooglePass({ event, ticket });
      const link =
        typeof res.data === "string"
          ? res.data
          : (res.data as { url?: string; data?: { url?: string } })?.url ||
            (res.data as { data?: { url?: string } })?.data?.url;
      if (link) window.open(link, "_blank", "noopener,noreferrer");
      else setWalletError("Could not open Google Wallet.");
    } catch (err) {
      console.error(err);
      setWalletError("Could not add this pass to Google Wallet.");
    }
  };

  return (
    <AppShell requireAuth>
      <BackChip href={backHref} label={backLabel} />

      {loading ? (
        <PageLoader message="Loading tickets…" label="Loading tickets" className="mt-8 min-h-[30vh]" />
      ) : error || !event ? (
        <div className="mt-8">
          <EmptyState
            icon={
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" />
              </svg>
            }
          >
            {error || "Event not found."}
          </EmptyState>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-9 lg:flex-row lg:gap-12">
          <aside className="shrink-0 self-start lg:sticky lg:top-8 lg:w-[300px]">
            <div className="relative flex aspect-square w-full max-w-[300px] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#06203c]">
              <span className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[#A6E773]/15 blur-3xl" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={eventImage(event)}
                alt=""
                className="relative h-full w-full object-cover"
              />
            </div>
            <h1 className="mt-5 text-[24px] font-semibold leading-snug tracking-[-0.01em]">
              {event.name}
            </h1>
            <p className="mt-2 text-[14px] text-[#9DA2B3]">
              {eventWhenLabel(event)}
              {event.venue?.name ? ` · ${event.venue.name}` : ""}
            </p>
          </aside>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-[24px] font-bold tracking-[-0.01em]">
                  {tickets.length} {getSingularOrPluralWord(tickets.length)}
                </h2>
                <p className="mt-0.5 text-[14px] text-[#9DA2B3]">View and manage your tickets</p>
              </div>
              <div className="flex gap-2.5">
                {event.enableTransfers !== false && (
                  <button
                    type="button"
                    disabled={!tickets.length}
                    onClick={() => {
                      setXferIds([]);
                      setXferEmail("");
                      setXferStep("select");
                    }}
                    className={`${chipBtnSmCls} disabled:opacity-40`}
                  >
                    Transfer
                  </button>
                )}
                {event.enableResale !== false && (
                  <button
                    type="button"
                    disabled={!tickets.length}
                    onClick={() => {
                      setSellIds([]);
                      setSellPrice("");
                      setSellStep("select");
                    }}
                    className={`${chipBtnSmCls} disabled:opacity-40`}
                  >
                    Sell
                  </button>
                )}
              </div>
            </div>

            <div className="my-6 border-t border-white/10" />

            {tickets.length === 0 ? (
              <EmptyState
                icon={
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
                  </svg>
                }
              >
                No tickets available for this event.
              </EmptyState>
            ) : (
              <div className="space-y-3">
                {tickets.map((ticket) => (
                  <div key={String(ticket.id || ticket.checkInCode)} className={`${cardCls} p-5 sm:p-6`}>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-[16px] font-semibold">{seatLabel(ticket)}</p>
                        {ticket.checkInCode && (
                          <p className="mt-1 text-[13px] text-[#9DA2B3]">
                            Code {ticket.checkInCode}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className={chipBtnSmCls}
                          onClick={() => setETicket(ticket)}
                        >
                          View e-ticket
                        </button>
                        {isIos() && (
                          <button type="button" className={chipBtnSmCls} onClick={() => void addApple(ticket)}>
                            Apple Wallet
                          </button>
                        )}
                        {isAndroid() && (
                          <button type="button" className={chipBtnSmCls} onClick={() => void addGoogle(ticket)}>
                            Google Wallet
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {eTicket && (
        <Modal title="E-ticket" onClose={() => setETicket(null)}>
          <div className="mt-6 flex flex-col items-center text-center">
            {eTicket.checkInCode ? (
              <div className="rounded-2xl bg-white p-4">
                <QRCodeSVG value={String(eTicket.checkInCode)} size={200} />
              </div>
            ) : (
              <p className="text-[#9DA2B3]">QR code unavailable</p>
            )}
            <p className="mt-4 text-[16px] font-semibold">{event?.name}</p>
            <p className="mt-1 text-[14px] text-[#9DA2B3]">{seatLabel(eTicket)}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {isIos() && (
                <Button size="sm" variant="outline" onClick={() => void addApple(eTicket)}>
                  Add to Apple Wallet
                </Button>
              )}
              {isAndroid() && (
                <Button size="sm" variant="outline" onClick={() => void addGoogle(eTicket)}>
                  Add to Google Wallet
                </Button>
              )}
            </div>
            <Button className="mt-6 w-full" onClick={() => setETicket(null)}>
              Close
            </Button>
          </div>
        </Modal>
      )}

      {xferStep && (
        <Modal
          title={xferStep === "done" ? "Transfer sent" : "Transfer tickets"}
          onClose={() => setXferStep(null)}
        >
          {xferStep === "select" && (
            <>
              <p className="mt-4 text-[14px] text-[#9DA2B3]">Select tickets to transfer.</p>
              <div className="mt-4 space-y-2">
                {tickets.map((t) => {
                  const id = t.id!;
                  const on = xferIds.includes(id);
                  return (
                    <button
                      key={String(id)}
                      type="button"
                      onClick={() => toggleId(id, xferIds, setXferIds)}
                      className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
                        on ? "border-[#A6E773] bg-[#A6E773]/10" : "border-white/12 bg-[#051B35]"
                      }`}
                    >
                      <span className="font-semibold">{seatLabel(t)}</span>
                      {on && <Pill size="sm">Selected</Pill>}
                    </button>
                  );
                })}
              </div>
              <Button
                className="mt-6 w-full"
                disabled={!xferIds.length}
                onClick={() => setXferStep("email")}
              >
                Continue
              </Button>
            </>
          )}
          {xferStep === "email" && (
            <>
              <p className="mt-4 text-[14px] text-[#9DA2B3]">
                Sending {xferSelected.length}{" "}
                {getSingularOrPluralWord(xferSelected.length).toLowerCase()}.
              </p>
              <div className="mt-5">
                <Label htmlFor="xfer-email">Recipient email</Label>
                <Input
                  id="xfer-email"
                  type="email"
                  className="mt-2.5"
                  value={xferEmail}
                  onChange={(e) => setXferEmail(e.target.value)}
                  placeholder="friend@email.com"
                />
              </div>
              <Button
                className="mt-6 w-full"
                disabled={
                  !validXferEmail ||
                  xferEmail.toLowerCase() === user?.email?.toLowerCase()
                }
                onClick={() => setXferStep("confirm")}
              >
                Continue
              </Button>
            </>
          )}
          {xferStep === "confirm" && (
            <>
              <p className="mt-4 text-[14px] leading-relaxed text-[#BCBFCC]">
                Transfer {xferSelected.length}{" "}
                {getSingularOrPluralWord(xferSelected.length).toLowerCase()} to{" "}
                <span className="font-semibold text-white">{xferEmail}</span>?
              </p>
              <Button className="mt-6 w-full" disabled={xferSaving} onClick={() => void submitTransfer()}>
                {xferSaving ? "Sending…" : "Confirm transfer"}
              </Button>
            </>
          )}
          {xferStep === "done" && (
            <>
              <p className="mt-4 text-[14px] text-[#BCBFCC]">
                Transfer sent. The recipient can claim the tickets from their wallet.
              </p>
              <Button className="mt-6 w-full" onClick={() => setXferStep(null)}>
                Done
              </Button>
            </>
          )}
        </Modal>
      )}

      {sellStep && (
        <Modal title={sellStep === "done" ? "Listed" : "Sell tickets"} onClose={() => setSellStep(null)}>
          {sellStep === "select" && (
            <>
              <p className="mt-4 text-[14px] text-[#9DA2B3]">Select tickets to list for resale.</p>
              <div className="mt-4 space-y-2">
                {tickets.map((t) => {
                  const id = t.id!;
                  const on = sellIds.includes(id);
                  return (
                    <button
                      key={String(id)}
                      type="button"
                      onClick={() => toggleId(id, sellIds, setSellIds)}
                      className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
                        on ? "border-[#A6E773] bg-[#A6E773]/10" : "border-white/12 bg-[#051B35]"
                      }`}
                    >
                      <span className="font-semibold">{seatLabel(t)}</span>
                      {on && <Pill size="sm">Selected</Pill>}
                    </button>
                  );
                })}
              </div>
              <Button
                className="mt-6 w-full"
                disabled={!sellIds.length}
                onClick={() => setSellStep("price")}
              >
                Continue
              </Button>
            </>
          )}
          {sellStep === "price" && (
            <>
              <p className="mt-4 text-[14px] text-[#9DA2B3]">
                Asking price per ticket for {sellSelected.length}{" "}
                {getSingularOrPluralWord(sellSelected.length).toLowerCase()}.
              </p>
              <div className="mt-5">
                <Label htmlFor="sell-price">Price (USD)</Label>
                <Input
                  id="sell-price"
                  type="number"
                  min="1"
                  step="0.01"
                  className="mt-2.5"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <Button
                className="mt-6 w-full"
                disabled={sellSaving || !(parseFloat(sellPrice) > 0)}
                onClick={() => void submitSell()}
              >
                {sellSaving ? "Listing…" : "List tickets"}
              </Button>
            </>
          )}
          {sellStep === "done" && (
            <>
              <p className="mt-4 text-[14px] text-[#BCBFCC]">
                Your listing is live. Manage it from My listings.
              </p>
              <div className="mt-6 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setSellStep(null)}>
                  Close
                </Button>
                <Button href="/my-listings/" className="flex-1">
                  View listings
                </Button>
              </div>
            </>
          )}
        </Modal>
      )}

      {walletError && (
        <Modal title="Wallet" onClose={() => setWalletError(null)}>
          <p className="mt-4 text-[14px] text-[#BCBFCC]">{walletError}</p>
          <Button className="mt-6 w-full" onClick={() => setWalletError(null)}>
            OK
          </Button>
        </Modal>
      )}
    </AppShell>
  );
}
