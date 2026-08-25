"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import BrandedActionButton from "@/components/atoms/BrandedActionButton";
import InAppBackLink from "@/components/molecules/InAppBackLink";
import RouteLoader from "@/components/molecules/RouteLoader";
import { getFlexPack, placeFlexPackIntoCart } from "@/lib/api";
import {
  brandingToTicketingTheme,
  type BrandingOrganization,
} from "@/lib/branding";
import {
  checkoutHref,
  rememberCheckoutReturnPath,
  setStoredCart,
} from "@/lib/cart";
import { flexPackSeasonLabel, flexPackVoucherCount } from "@/lib/flexPackDisplay";
import {
  formatCurrency,
  getSingularOrPluralWord,
} from "@/lib/helpers";
import { cacheOrgBranding } from "@/lib/orgBrandingCache";
import { beginRouteTransition } from "@/lib/routeTransition";
import { TICKETING_STICKY_GAP_PX } from "@/lib/ticketingSticky";

const NAVY = "#051b35";
const MUTE = "#8a93a3";
const SUB = "#6e7180";
const FIELD = "#f7f8fc";

const STEPS = [
  {
    n: "1",
    title: "Buy the vouchers",
    body: "Pick how many you want. They land in your wallet right away.",
  },
  {
    n: "2",
    title: "Redeem when you know",
    body: "Choose a game any time before kickoff and pick your seat then.",
  },
  {
    n: "3",
    title: "Share what you skip",
    body: "Transfer a voucher to a friend if you cannot make a game.",
  },
];

type FlexPack = {
  id: number | string;
  uuid?: string;
  name?: string;
  description?: string;
  price?: number;
  gameTickets?: number;
  start?: string;
  end?: string;
  isSoldOut?: boolean;
  image?: { url?: string };
  venue?: { name?: string; slug?: string; timezone?: string };
  organization?: BrandingOrganization & { name?: string; slug?: string };
};

function unwrapFlexPack(data: unknown): FlexPack | null {
  if (!data) return null;
  if (Array.isArray(data)) return (data[0] as FlexPack) ?? null;
  if (typeof data === "object" && data && "name" in data) {
    return data as FlexPack;
  }
  const wrapped = data as { flexPack?: FlexPack; data?: FlexPack };
  return wrapped.flexPack ?? wrapped.data ?? null;
}

/** Shared flex pack detail + add-to-cart for org and venue routes. */
export default function FlexPackDetailClient({
  uuid,
  backHref,
}: {
  uuid: string;
  backHref: string;
}) {
  const router = useRouter();
  const [flexPack, setFlexPack] = useState<FlexPack | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [buying, setBuying] = useState(false);
  const [vw, setVw] = useState(1440);
  const [heroH, setHeroH] = useState(0);
  const heroRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onR = () => setVw(window.innerWidth);
    onR();
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);

  useEffect(() => {
    const el = heroRef.current;
    if (!el || loading) return;
    const update = () => setHeroH(el.offsetHeight);
    update();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [loading, flexPack, vw]);

  useEffect(() => {
    let cancelled = false;
    getFlexPack(uuid)
      .then((res) => {
        if (cancelled) return;
        const pack = unwrapFlexPack(res.data);
        setFlexPack(pack);
        if (pack?.organization) cacheOrgBranding(pack.organization);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load this flex pack.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [uuid]);

  // Guests are not gated here: checkout owns the login redirect so the shopper
  // comes back to their cart instead of this page.
  const buy = async () => {
    if (!flexPack) return;
    if (flexPack.isSoldOut) return;

    setBuying(true);
    setError("");
    try {
      const res = await placeFlexPackIntoCart(flexPack.id);
      const cartId =
        (res.data as { id?: string | number; cartId?: string | number })?.id ??
        (res.data as { cartId?: string | number })?.cartId;
      if (cartId != null) {
        rememberCheckoutReturnPath();
        setStoredCart(cartId, flexPackVoucherCount(flexPack.gameTickets) || 1);
        const href = checkoutHref(cartId);
        beginRouteTransition(href);
        router.push(href);
        return;
      }
      setError("Cart could not be created. Please try again.");
    } catch {
      setError("Unable to add flex pack to cart.");
    } finally {
      setBuying(false);
    }
  };

  const mobile = vw < 900;
  const theme = brandingToTicketingTheme(null, flexPack?.organization);
  const voucherCount = flexPackVoucherCount(flexPack?.gameTickets);
  const season = flexPackSeasonLabel(
    flexPack?.start,
    flexPack?.end,
    flexPack?.venue?.timezone,
  );
  const buyLabel = flexPack?.isSoldOut
    ? "Sold out"
    : buying
      ? "Adding…"
      : `Get ${voucherCount} ${getSingularOrPluralWord(voucherCount, "voucher").toLowerCase()}`;
  const pills = [
    flexPack?.organization?.name || flexPack?.venue?.name,
    "Any home game",
    "Redeem any time",
  ].filter((value): value is string => Boolean(value));

  if (loading) {
    return <RouteLoader />;
  }

  if (!flexPack) {
    return (
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px" }}>
        <InAppBackLink
          href={backHref}
          aria-label="Back"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 14,
            fontWeight: 600,
            color: NAVY,
            textDecoration: "none",
          }}
        >
          Back
        </InAppBackLink>
        <p style={{ marginTop: 24, fontSize: 16, color: SUB }} role="status">
          {error || "Flex pack not found."}
        </p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: FIELD, color: NAVY }}>
      <div
        ref={heroRef}
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          overflow: "hidden",
          background: `linear-gradient(115deg, ${theme.accentDark} 0%, ${theme.accent} 52%, ${theme.accent} 100%)`,
          color: "#fff",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -70,
            right: -40,
            width: 320,
            height: 320,
            borderRadius: 999,
            background: "rgba(255,255,255,0.06)",
          }}
        />
        <div
          style={{
            position: "relative",
            maxWidth: 1180,
            margin: "0 auto",
            padding: mobile ? "16px 18px 20px" : "22px 32px 26px",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <InAppBackLink
              href={backHref}
              aria-label="Back"
              style={{
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 40,
                height: 40,
                color: "#fff",
                background: "rgba(255,255,255,0.14)",
                borderRadius: 999,
                textDecoration: "none",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ width: 18, height: 18 }}
              >
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
            </InAppBackLink>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                color: "rgba(255,255,255,0.75)",
              }}
            >
              Flex pack
              {season ? ` · ${season} season` : ""}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              gap: 20,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                width: 104,
                height: 104,
                flexShrink: 0,
                borderRadius: 22,
                background: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 14,
                boxSizing: "border-box",
                boxShadow: "0 12px 24px -12px rgba(0,0,0,0.5)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={theme.brandLogoSrc || theme.logoSrc}
                alt={flexPack.organization?.name || "Organization"}
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  display: "block",
                  objectFit: "contain",
                }}
              />
            </div>
            <div
              style={{
                flex: "1 1 300px",
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <h1
                style={{
                  margin: 0,
                  fontSize: mobile ? 30 : 42,
                  fontWeight: 600,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.06,
                }}
              >
                {flexPack.name}
              </h1>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {pills.map((label) => (
                  <span
                    key={label}
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#fff",
                      background: "rgba(255,255,255,0.14)",
                      borderRadius: 999,
                      padding: "7px 12px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            padding: mobile
              ? "20px 18px 120px"
              : `${TICKETING_STICKY_GAP_PX}px 32px 120px`,
            boxSizing: "border-box",
            display: "grid",
            gridTemplateColumns: mobile
              ? "minmax(0, 1fr)"
              : "minmax(0, 1fr) 360px",
            gap: 32,
          }}
        >
          <div
            style={{
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: MUTE,
              }}
            >
              How the flex pack works
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: mobile
                  ? "minmax(0, 1fr)"
                  : "repeat(3, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              {STEPS.map((st) => (
                <div
                  key={st.n}
                  style={{
                    background: FIELD,
                    borderRadius: 16,
                    padding: 16,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    backgroundColor: "#fff",
                    border: "1px solid rgba(5,27,53,0.08)",
                  }}
                >
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 999,
                      background: theme.accent,
                      color: "#fff",
                      fontSize: 13,
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {st.n}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{st.title}</div>
                  <div style={{ fontSize: 13, color: SUB, lineHeight: 1.55 }}>
                    {st.body}
                  </div>
                </div>
              ))}
            </div>
            {flexPack.description ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  paddingTop: 12,
                  borderTop: "1px solid rgba(5,27,53,0.08)",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    color: MUTE,
                  }}
                >
                  More info
                </div>
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: "#4a5567" }}>
                  {flexPack.description}
                </p>
              </div>
            ) : null}
            {error ? (
              <p style={{ margin: 0, fontSize: 14, color: "#b91c1c" }} role="alert">
                {error}
              </p>
            ) : null}
          </div>

          {!mobile && (
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  background: "#fff",
                  borderRadius: 22,
                  padding: 22,
                  boxSizing: "border-box",
                  position: "sticky",
                  top: heroH + TICKETING_STICKY_GAP_PX,
                  maxHeight: `calc(100vh - ${heroH + TICKETING_STICKY_GAP_PX + 24}px)`,
                  overflowY: "auto",
                  boxShadow: "0 18px 40px -26px rgba(5,27,53,0.45)",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 13, color: MUTE }}>
                    Flex pack · {voucherCount}{" "}
                    {getSingularOrPluralWord(voucherCount, "voucher").toLowerCase()}
                  </span>
                  <span
                    style={{
                      fontSize: 34,
                      fontWeight: 600,
                      letterSpacing: "-0.03em",
                      lineHeight: 1,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {formatCurrency(flexPack.price)}
                  </span>
                </div>
                <BrandedActionButton
                  primaryColor={theme.buttonColor}
                  textColor={theme.buttonTextColor}
                  onClick={() => void buy()}
                  disabled={buying || flexPack.isSoldOut}
                  loading={buying}
                  loadingLabel="Adding…"
                  className="w-full text-[16px]"
                  style={{ minHeight: 52, padding: 16, borderRadius: 999 }}
                >
                  {buyLabel}
                </BrandedActionButton>
                <div style={{ fontSize: 13, color: SUB }}>
                  One voucher, one ticket to any home game. Pick your seat when
                  you redeem.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {mobile && (
        <div
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 40,
            background: "rgba(255,255,255,0.96)",
            backdropFilter: "blur(10px)",
            borderTop: "1px solid rgba(5,27,53,0.10)",
            boxShadow: "0 -12px 30px -24px rgba(5,27,53,0.6)",
            padding: "12px 16px calc(14px + env(safe-area-inset-bottom))",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <span
              style={{
                fontSize: 18,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {formatCurrency(flexPack.price)}
            </span>
          </div>
          <BrandedActionButton
            primaryColor={theme.buttonColor}
            textColor={theme.buttonTextColor}
            onClick={() => void buy()}
            disabled={buying || flexPack.isSoldOut}
            loading={buying}
            loadingLabel="Adding…"
            className="text-[15px]"
            style={{
              flexShrink: 0,
              minHeight: 48,
              padding: "14px 22px",
              borderRadius: 999,
            }}
          >
            {buyLabel}
          </BrandedActionButton>
        </div>
      )}
    </div>
  );
}
