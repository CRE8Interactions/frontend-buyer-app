"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import WalletShell from "@/components/templates/WalletShell";
import Modal from "@/components/molecules/Modal";
import DateChip from "@/components/molecules/DateChip";
import LogoTile from "@/components/molecules/LogoTile";
import EmptyState from "@/components/molecules/EmptyState";
import PageLoader from "@/components/molecules/PageLoader";
import { cardCls } from "@/components/molecules/Card";
import Button from "@/components/atoms/Button";
import Pill from "@/components/atoms/Pill";
import { ArrowRight, Ticket } from "@/components/atoms/icons";
import {
  acceptIncomingTransfers,
  getGuestList,
  getIncomingTransfers,
  getMyAccessPasses,
  getMyEvents,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { getSingularOrPluralWord, imageUrl } from "@/lib/helpers";
import {
  type AccessPassLike,
  type IncomingTransfer,
  type OrderLike,
  eventChip,
  eventImage,
  eventWhenLabel,
  isToday,
  isUpcomingEvent,
  unwrapList,
  venueImage,
} from "@/lib/wallet";

type FlexPackRow = {
  key: string;
  flex_pack: NonNullable<NonNullable<OrderLike["vouchers"]>[number]["flex_pack"]>;
  vouchers: NonNullable<OrderLike["vouchers"]>;
};

type GuestListRow = {
  eventId?: string;
  event?: OrderLike["event"];
  guest_passes?: unknown[];
};

export default function MyEventsPage() {
  const { user, ready, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [eventOrders, setEventOrders] = useState<OrderLike[]>([]);
  const [packageOrders, setPackageOrders] = useState<OrderLike[]>([]);
  const [flexPacks, setFlexPacks] = useState<FlexPackRow[]>([]);
  const [accessPasses, setAccessPasses] = useState<AccessPassLike[]>([]);
  const [transfers, setTransfers] = useState<IncomingTransfer[]>([]);
  const [guestLists, setGuestLists] = useState<GuestListRow[]>([]);
  const [acceptingId, setAcceptingId] = useState<string | number | null>(null);
  const [vouchersOpen, setVouchersOpen] = useState<FlexPackRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async (options?: { fresh?: boolean }) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [eventsRes, transfersRes, guestRes, passesRes] = await Promise.all([
        getMyEvents(options),
        getIncomingTransfers(),
        user.phoneNumber
          ? getGuestList(encodeURIComponent(String(user.phoneNumber)))
          : Promise.resolve({ data: [] }),
        getMyAccessPasses("organizer"),
      ]);

      const orders = unwrapList<OrderLike>(eventsRes.data);
      const upcoming = orders.filter(
        (o) => o?.event && isUpcomingEvent(o.event) && (o.tickets?.length ?? 0) > 0,
      );
      const packages = orders.filter((o) => o?.package);

      const byFlex = new Map<string, FlexPackRow>();
      for (const order of orders) {
        for (const voucher of order.vouchers ?? []) {
          const pack = voucher.flex_pack;
          if (!pack) continue;
          const key = String(pack.uuid ?? pack.id);
          if (!byFlex.has(key)) byFlex.set(key, { key, flex_pack: pack, vouchers: [] });
          byFlex.get(key)!.vouchers.push(voucher);
        }
      }

      setEventOrders(upcoming);
      setPackageOrders(packages);
      setFlexPacks(Array.from(byFlex.values()));
      setTransfers(unwrapList<IncomingTransfer>(transfersRes.data));
      setGuestLists(unwrapList<GuestListRow>(guestRes.data));
      setAccessPasses(unwrapList<AccessPassLike>((passesRes.data as { data?: unknown })?.data ?? passesRes.data));
    } catch (err) {
      console.error(err);
      setError("Could not load your events. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!ready || !isAuthenticated) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, isAuthenticated]);

  const sortedEvents = useMemo(
    () =>
      [...eventOrders].sort(
        (a, b) =>
          new Date(a.event?.start || 0).getTime() - new Date(b.event?.start || 0).getTime(),
      ),
    [eventOrders],
  );

  const nextUp = sortedEvents[0];
  const later = sortedEvents.slice(1);

  const acceptTransfer = async (transfer: IncomingTransfer) => {
    setAcceptingId(transfer.id);
    try {
      await acceptIncomingTransfers({ transferId: transfer.id });
      await load({ fresh: true });
    } catch (err) {
      console.error(err);
      setAcceptingId(null);
    }
  };

  return (
    <WalletShell>
      {loading ? (
        <PageLoader message="Loading your events…" label="Loading events" />
      ) : error ? (
        <EmptyState
          icon={
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" />
            </svg>
          }
        >
          {error}
        </EmptyState>
      ) : (
        <>
          {transfers.length > 0 && (
            <div className="mb-8 space-y-3">
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#9DA2B3]">
                Incoming transfers
              </h2>
              {transfers.map((t) => (
                <div key={String(t.id)} className={`${cardCls} flex flex-wrap items-center gap-4 p-5`}>
                  <div className="min-w-0 flex-1">
                    <p className="text-[16px] font-semibold">{t.event?.name || "Incoming tickets"}</p>
                    <p className="mt-1 text-[13px] text-[#9DA2B3]">
                      {t.tickets?.length ?? 0}{" "}
                      {getSingularOrPluralWord(t.tickets?.length ?? 0).toLowerCase()}
                      {t.event?.start ? ` · ${eventWhenLabel(t.event)}` : ""}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    disabled={acceptingId === t.id}
                    onClick={() => void acceptTransfer(t)}
                  >
                    {acceptingId === t.id ? "Accepting…" : "Accept transfer"}
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#9DA2B3]">
              Next up
            </h2>
            {nextUp?.event && isToday(nextUp.event.start, nextUp.timezone || nextUp.event.venue?.timezone) && (
              <Pill>Today</Pill>
            )}
          </div>

          {nextUp?.event ? (
            <Link
              href={`/event-details/${nextUp.orderId}/`}
              className={`${cardCls} card-glow group mt-4 block max-w-[860px] overflow-hidden transition-transform hover:-translate-y-0.5`}
            >
              <div className="absolute inset-0" aria-hidden>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={venueImage(nextUp.event.venue) || eventImage(nextUp.event)}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(5,27,53,0.95) 0%, rgba(5,27,53,0.85) 50%, rgba(5,27,53,0.6) 100%)",
                  }}
                />
              </div>
              <div className="relative flex items-center gap-4 p-5 sm:gap-5 sm:p-6">
                <DateChip
                  month={eventChip(nextUp.event, nextUp.timezone).m}
                  day={eventChip(nextUp.event, nextUp.timezone).d}
                />
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-2 text-[16px] font-semibold leading-snug tracking-[-0.01em] sm:text-[19px]">
                    {nextUp.event.name}
                  </h3>
                  <p className="mt-1 truncate text-[13.5px] text-[#c3c9d6]">
                    {eventWhenLabel(nextUp.event, nextUp.timezone)}
                    {nextUp.event.venue?.name ? ` · ${nextUp.event.venue.name}` : ""}
                  </p>
                  <Pill size="sm" className="mt-2">
                    <Ticket className="h-[12px] w-[12px]" />
                    {nextUp.tickets?.length ?? 0}{" "}
                    {getSingularOrPluralWord(nextUp.tickets?.length ?? 0).toLowerCase()}
                  </Pill>
                </div>
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 bg-[#051B35]/50 text-white transition-transform group-hover:translate-x-0.5 sm:h-9 sm:w-9"
                  aria-hidden
                >
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </Link>
          ) : (
            <div className="mt-4">
              <EmptyState
                icon={
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                    <rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" />
                  </svg>
                }
              >
                You don&rsquo;t have any upcoming events yet. Grab tickets and they&rsquo;ll show up here.
              </EmptyState>
            </div>
          )}

          {(later.length > 0 || guestLists.length > 0) && (
            <>
              <div className="mt-12 flex items-baseline justify-between gap-4">
                <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#9DA2B3]">
                  Later this season
                </h2>
              </div>
              <div className="mt-4 space-y-3">
                {later.map((order) => {
                  const chip = eventChip(order.event, order.timezone);
                  return (
                    <Link
                      key={String(order.orderId || order.id)}
                      href={`/event-details/${order.orderId}/`}
                      className={`${cardCls} flex items-center gap-4 p-4 transition-transform hover:-translate-y-0.5 sm:p-5`}
                    >
                      <DateChip month={chip.m} day={chip.d} variant="navy" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-semibold">{order.event?.name}</p>
                        <p className="mt-0.5 truncate text-[13px] text-[#9DA2B3]">
                          {eventWhenLabel(order.event, order.timezone)}
                          {order.event?.venue?.name ? ` · ${order.event.venue.name}` : ""}
                        </p>
                      </div>
                      <Pill size="sm" variant="neutral">
                        {order.tickets?.length ?? 0} tix
                      </Pill>
                    </Link>
                  );
                })}
                {guestLists.map((gl) => {
                  const chip = eventChip(gl.event);
                  return (
                    <Link
                      key={String(gl.eventId || gl.event?.uuid)}
                      href={`/guest-passes/${gl.event?.uuid || gl.eventId}/`}
                      className={`${cardCls} flex items-center gap-4 p-4 transition-transform hover:-translate-y-0.5 sm:p-5`}
                    >
                      <DateChip month={chip.m} day={chip.d} variant="navy" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-semibold">{gl.event?.name}</p>
                        <p className="mt-0.5 text-[13px] text-[#9DA2B3]">Guest pass</p>
                      </div>
                      <Pill size="sm" variant="neutral">
                        {gl.guest_passes?.length ?? 0} passes
                      </Pill>
                    </Link>
                  );
                })}
              </div>
            </>
          )}

          {(packageOrders.length > 0 || flexPacks.length > 0 || accessPasses.length > 0) && (
            <div className="mt-12">
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#9DA2B3]">
                Packages &amp; passes
              </h2>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {packageOrders.map((order) => {
                  const pkg = order.package!;
                  return (
                    <div
                      key={`pkg-${order.orderId}`}
                      className={`${cardCls} flex flex-col gap-5 p-5 sm:flex-row sm:items-center`}
                    >
                      <LogoTile src={imageUrl(pkg.image)} />
                      <div className="min-w-0 flex-1">
                        <h3 className="text-[16px] font-semibold leading-snug">{pkg.name}</h3>
                        <p className="mt-1 text-[13px] text-[#9DA2B3]">
                          {pkg.organization?.name || pkg.venue?.name || "Season package"}
                        </p>
                        <Pill className="mt-2.5">{pkg.events?.length ?? 0} events</Pill>
                      </div>
                      <Button
                        href={`/my-packages/${pkg.uuid}/package-details/${order.orderId}/`}
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                      >
                        View package
                      </Button>
                    </div>
                  );
                })}

                {flexPacks.map((row) => (
                  <div
                    key={row.key}
                    className={`${cardCls} flex flex-col gap-5 p-5 sm:flex-row sm:items-center`}
                  >
                    <LogoTile src={imageUrl(row.flex_pack.image)} />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[16px] font-semibold leading-snug">{row.flex_pack.name}</h3>
                      <p className="mt-1 text-[13px] text-[#9DA2B3]">
                        {row.flex_pack.organization?.name || "Flex pack"}
                      </p>
                      <Pill variant="neutral" className="mt-2.5">
                        {row.vouchers.length} voucher{row.vouchers.length === 1 ? "" : "s"}
                      </Pill>
                    </div>
                    <Button
                      onClick={() => setVouchersOpen(row)}
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                    >
                      View vouchers
                    </Button>
                  </div>
                ))}

                {accessPasses.map((pass) => (
                  <div
                    key={pass.uuid}
                    className={`${cardCls} flex flex-col gap-5 p-5 sm:flex-row sm:items-center`}
                  >
                    <LogoTile src={imageUrl(pass.artwork)} />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[16px] font-semibold leading-snug">
                        {pass.name || "Access pass"}
                      </h3>
                      <p className="mt-1 text-[13px] text-[#9DA2B3]">
                        {pass.type === "organizer" ? "All-access pass" : "Season pass"}
                      </p>
                      <Pill className="mt-2.5">{pass.events?.length ?? 0} events</Pill>
                    </div>
                    <Button
                      href={`/my-events/access-passes/${pass.uuid}/`}
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                    >
                      View pass
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {vouchersOpen && (
        <Modal title="Your vouchers" onClose={() => setVouchersOpen(null)}>
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-[#A6E773]/25 bg-[#A6E773]/[0.08] p-4">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#A6E773" strokeWidth="1.8" aria-hidden className="mt-0.5 shrink-0">
              <circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" />
            </svg>
            <p className="text-[14px] leading-relaxed text-[#BCBFCC]">
              Redeem vouchers at the box office for any available game included in this flex pack.
            </p>
          </div>
          <div className="mt-4 space-y-2.5">
            {vouchersOpen.vouchers.map((v, i) => (
              <div
                key={v.code || i}
                className="flex items-center justify-between rounded-xl border border-white/12 bg-[#051B35] px-5 py-4"
              >
                <span className="text-[17px] font-bold tabular-nums tracking-[0.04em]">
                  {v.code || "Voucher"}
                </span>
                <Pill variant="success" className="gap-2">
                  {v.status || "available"}
                  <span className="h-2 w-2 rounded-full bg-[#86e29b]" />
                </Pill>
              </div>
            ))}
          </div>
          <Button onClick={() => setVouchersOpen(null)} className="mt-6 w-full">
            Close
          </Button>
        </Modal>
      )}
    </WalletShell>
  );
}
