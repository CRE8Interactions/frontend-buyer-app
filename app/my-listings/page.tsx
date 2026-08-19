"use client";

import { useEffect, useState } from "react";
import WalletShell from "@/components/templates/WalletShell";
import Modal from "@/components/molecules/Modal";
import EmptyState from "@/components/molecules/EmptyState";
import PageLoader from "@/components/molecules/PageLoader";
import { cardCls } from "@/components/molecules/Card";
import Button from "@/components/atoms/Button";
import Pill from "@/components/atoms/Pill";
import { Input, Label } from "@/components/atoms/form";
import { Ticket } from "@/components/atoms/icons";
import {
  getMyListings,
  removeMyListings,
  updateMyListings,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatCurrency, formatEventWhen } from "@/lib/helpers";
import { type EventLike, seatLabel, unwrapList } from "@/lib/wallet";

type Listing = {
  id: number | string;
  uuid?: string;
  status?: string;
  askingPrice?: number;
  payout?: number;
  quantity?: number;
  event?: EventLike | null;
  tickets?: { sectionNumber?: string; rowNumber?: string; seatNumber?: string; generalAdmission?: boolean }[];
};

const TABS = [
  { key: "active", label: "Active", statuses: ["new"] },
  { key: "sold", label: "Sold", statuses: ["complete"] },
  { key: "expired", label: "Expired", statuses: ["expired"] },
] as const;

export default function MyListingsPage() {
  const { ready, isAuthenticated } = useAuth();
  const [tab, setTab] = useState(0);
  const [listings, setListings] = useState<Record<string, Listing[]>>({
    active: [],
    sold: [],
    expired: [],
  });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | number | null>(null);
  const [editListing, setEditListing] = useState<Listing | null>(null);
  const [editPrice, setEditPrice] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await getMyListings();
      const all = unwrapList<Listing>(res.data);
      const types: Record<string, Listing[]> = { active: [], sold: [], expired: [] };
      for (const listing of all) {
        if (listing.status === "new" && listing.event) types.active.push(listing);
        if (listing.status === "complete") types.sold.push(listing);
        if (listing.status === "expired") types.expired.push(listing);
      }
      setListings(types);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!ready || !isAuthenticated) return;
    void load();
  }, [ready, isAuthenticated]);

  const removeListing = async (id: string | number) => {
    setBusyId(id);
    try {
      await removeMyListings(id);
      await load();
    } catch (err) {
      console.error(err);
    } finally {
      setBusyId(null);
    }
  };

  const saveEdit = async () => {
    if (!editListing) return;
    const price = parseFloat(editPrice);
    if (!(price > 0)) return;
    setBusyId(editListing.id);
    try {
      await updateMyListings(editListing.id, { askingPrice: price });
      setEditListing(null);
      await load();
    } catch (err) {
      console.error(err);
    } finally {
      setBusyId(null);
    }
  };

  const key = TABS[tab].key;
  const rows = listings[key] || [];
  const label = TABS[tab].label.toLowerCase();

  return (
    <WalletShell>
      <div className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/[0.04] p-1">
        {TABS.map((t, i) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(i)}
            className={`rounded-full px-5 py-2 text-[14px] font-semibold transition-colors ${
              i === tab ? "bg-[#A6E773] text-[#051B35]" : "text-[#9DA2B3] hover:text-white"
            }`}
          >
            {t.label}
            {listings[t.key]?.length ? (
              <span className={`ml-1.5 ${i === tab ? "text-[#051B35]/60" : "text-[#6E7180]"}`}>
                {listings[t.key].length}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {loading ? (
        <PageLoader message="Loading listings…" label="Loading listings" className="mt-6 min-h-[30vh]" />
      ) : rows.length === 0 ? (
        <div className="mx-auto mt-14 max-w-[520px] pb-6 text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[#A6E773]/15">
            <Ticket className="h-10 w-10 text-[#A6E773]" strokeWidth={1.6} />
          </div>
          <h2 className="mt-6 text-[22px] font-semibold tracking-[-0.01em]">No {label} listings</h2>
          <p className="mx-auto mt-2 max-w-[400px] text-[14.5px] leading-relaxed text-[#9DA2B3]">
            {tab === 0
              ? "Can't make a game? List your tickets for sale from your events and they'll show up here."
              : tab === 1
                ? "Tickets you've sold will show up here with the payout details."
                : "Listings that ended without selling will show up here."}
          </p>
          {tab === 0 && (
            <Button href="/my-events/" className="mt-7">
              Sell tickets from My events
            </Button>
          )}
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {rows.map((listing) => (
            <div key={String(listing.id)} className={`${cardCls} flex flex-wrap items-center gap-5 p-5 sm:p-6`}>
              <div className="min-w-0 flex-1">
                <p className="text-[16px] font-semibold">{listing.event?.name || "Listing"}</p>
                <p className="mt-1 text-[13px] text-[#9DA2B3]">
                  {listing.event?.start
                    ? formatEventWhen(listing.event.start, listing.event.venue?.timezone)
                    : ""}
                  {(listing.tickets?.length ?? listing.quantity)
                    ? ` · ${listing.tickets?.length ?? listing.quantity} ticket(s)`
                    : ""}
                </p>
                {listing.tickets?.[0] && (
                  <p className="mt-0.5 text-[13px] text-[#BCBFCC]">
                    {listing.tickets.map((t) => seatLabel(t)).join(", ")}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  <Pill size="sm">
                    {formatCurrency(listing.askingPrice)} / ticket
                  </Pill>
                  {listing.payout != null && (
                    <Pill size="sm" variant="neutral">
                      Payout {formatCurrency(listing.payout)}
                    </Pill>
                  )}
                </div>
              </div>
              {key === "active" && (
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditListing(listing);
                      setEditPrice(String(listing.askingPrice ?? ""));
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busyId === listing.id}
                    onClick={() => void removeListing(listing.id)}
                    className="text-[#ff7a72]"
                  >
                    {busyId === listing.id ? "Removing…" : "Remove"}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editListing && (
        <Modal title="Update listing" onClose={() => setEditListing(null)}>
          <div className="mt-5">
            <Label htmlFor="listing-price">Asking price per ticket</Label>
            <Input
              id="listing-price"
              type="number"
              min="1"
              step="0.01"
              className="mt-2.5"
              value={editPrice}
              onChange={(e) => setEditPrice(e.target.value)}
            />
          </div>
          <Button
            className="mt-6 w-full"
            disabled={busyId === editListing.id || !(parseFloat(editPrice) > 0)}
            onClick={() => void saveEdit()}
          >
            {busyId === editListing.id ? "Saving…" : "Save"}
          </Button>
        </Modal>
      )}
    </WalletShell>
  );
}
