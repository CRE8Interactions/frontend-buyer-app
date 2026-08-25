"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import RouteLoader from "@/components/molecules/RouteLoader";
import {
  beaconLeaveWaitingRoom,
  getEventByShortCode,
  getWaitingRoomStatus,
  joinWaitingRoom,
} from "@/lib/api";
import { brandingToTicketingTheme, type OrgBranding } from "@/lib/branding";
import { cacheEventBranding } from "@/lib/orgBrandingCache";
import {
  getWaitingRoomPurchasePath,
  getWaitingRoomToken,
  setWaitingRoomToken,
} from "@/lib/waitingRoom";

const POLL_INTERVAL_MS = 6_000;

type EventData = {
  uuid?: string;
  name?: string;
  seoUrl?: string;
  slug?: string;
  shortCode?: string;
  waitingRoomEnabled?: boolean | null;
  branding?: OrgBranding | null;
  organization?: {
    name?: string;
    slug?: string;
    branding?: OrgBranding | null;
    primaryColor?: string;
    accentColor?: string;
    brandColor?: string;
    logo?: { url?: string };
    logoUrl?: string;
  };
};

type QueueStatus = "loading" | "waiting" | "admitted" | "error";
type QueueResponse = {
  status?: "not_required" | "admitted" | "waiting" | "not_joined";
  token?: string;
  position?: number | null;
  queueSize?: number | null;
  estimatedWaitSeconds?: number | null;
};

function formatWaitTime(seconds?: number | null) {
  if (!seconds || seconds <= 0) return "less than a minute";
  if (seconds < 60) return `about ${seconds} seconds`;
  const minutes = Math.ceil(seconds / 60);
  return `about ${minutes} minute${minutes === 1 ? "" : "s"}`;
}

export default function WaitingRoomPage() {
  const params = useParams<{ slug: string; shortcode: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<EventData | null>(null);
  const [status, setStatus] = useState<QueueStatus>("loading");
  const [position, setPosition] = useState<number | null>(null);
  const [queueSize, setQueueSize] = useState<number | null>(null);
  const [estimatedWaitSeconds, setEstimatedWaitSeconds] = useState<
    number | null
  >(null);
  const [error, setError] = useState("");
  const eventUuidRef = useRef("");
  const statusRef = useRef<QueueStatus>("loading");
  const skipLeaveRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let poll: number | null = null;
    skipLeaveRef.current = false;
    statusRef.current = "loading";

    const redirectToTickets = (eventUuid: string, token?: string) => {
      skipLeaveRef.current = true;
      statusRef.current = "admitted";
      setStatus("admitted");
      if (token) setWaitingRoomToken(eventUuid, token);
      router.replace(
        getWaitingRoomPurchasePath({
          eventUuid,
          slug: params.slug,
          shortcode: params.shortcode,
        }),
      );
    };

    const handleQueueResponse = (
      data: QueueResponse,
      eventUuid: string,
    ) => {
      if (cancelled) return;
      if (data.status === "not_required") {
        redirectToTickets(eventUuid);
        return;
      }
      if (data.status === "admitted") {
        redirectToTickets(eventUuid, data.token);
        return;
      }
      if (data.status === "waiting" || data.status === "not_joined") {
        statusRef.current = "waiting";
        setStatus("waiting");
        setPosition(data.position ?? null);
        setQueueSize(data.queueSize ?? null);
        setEstimatedWaitSeconds(data.estimatedWaitSeconds ?? null);
        setError("");
      }
    };

    const pollStatus = async (eventUuid: string) => {
      try {
        const response = await getWaitingRoomStatus(eventUuid);
        handleQueueResponse(response.data as QueueResponse, eventUuid);
      } catch {
        if (!cancelled) {
          setError("Unable to refresh queue status. Retrying...");
        }
      }
    };

    getEventByShortCode(params.shortcode, params.slug, "0")
      .then(async (response) => {
        if (cancelled) return;
        const loadedEvent = response.data?.event as EventData | undefined;
        if (response.data?.status === 404 || !loadedEvent?.uuid) {
          statusRef.current = "error";
          setStatus("error");
          setError("Event not found.");
          return;
        }

        setEvent(loadedEvent);
        eventUuidRef.current = loadedEvent.uuid;
        cacheEventBranding(loadedEvent, loadedEvent.organization);

        if (!loadedEvent.waitingRoomEnabled) {
          redirectToTickets(loadedEvent.uuid);
          return;
        }

        const joined = await joinWaitingRoom(loadedEvent.uuid);
        handleQueueResponse(joined.data as QueueResponse, loadedEvent.uuid);
        poll = window.setInterval(
          () => void pollStatus(loadedEvent.uuid as string),
          POLL_INTERVAL_MS,
        );
      })
      .catch(() => {
        if (!cancelled) {
          statusRef.current = "error";
          setStatus("error");
          setError("Something went wrong loading the waiting room.");
        }
      });

    const leaveQueue = ({ soft = false }: { soft?: boolean } = {}) => {
      if (
        skipLeaveRef.current ||
        !["loading", "waiting"].includes(statusRef.current)
      ) {
        return;
      }
      const eventUuid = eventUuidRef.current;
      if (!eventUuid) return;
      beaconLeaveWaitingRoom(eventUuid, getWaitingRoomToken(eventUuid), {
        soft,
      });
    };
    const onPageHide = (pageEvent: PageTransitionEvent) => {
      if (!pageEvent.persisted) leaveQueue({ soft: true });
    };
    window.addEventListener("pagehide", onPageHide);

    return () => {
      cancelled = true;
      if (poll) window.clearInterval(poll);
      window.removeEventListener("pagehide", onPageHide);
      leaveQueue();
    };
  }, [params.shortcode, params.slug, router]);

  const theme = event
    ? brandingToTicketingTheme(event, event.organization)
    : null;
  if (status === "loading") {
    return (
      <RouteLoader
        branding={
          theme
            ? {
                primaryColor: theme.accent,
                logoSrc: theme.brandLogoSrc,
                name: event?.organization?.name,
              }
            : undefined
        }
      />
    );
  }

  const accent = theme?.accent || "#3b82f6";
  const logo = theme?.brandLogoSrc;

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background: "#f5f7fb",
        color: "#051b35",
      }}
    >
      <section
        aria-live="polite"
        style={{
          width: "100%",
          maxWidth: 560,
          padding: "36px 30px",
          borderRadius: 20,
          border: "1px solid rgba(5,27,53,0.10)",
          background: "#fff",
          boxShadow: "0 24px 64px -34px rgba(5,27,53,0.38)",
          textAlign: "center",
        }}
      >
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logo}
            alt={event?.organization?.name || ""}
            style={{
              width: 64,
              height: 64,
              objectFit: "contain",
              margin: "0 auto 22px",
            }}
          />
        ) : null}

        {status === "waiting" ? (
          <>
            <p
              style={{
                margin: "0 0 8px",
                color: "#6e7180",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              High demand event
            </p>
            <h1
              style={{
                margin: "0 0 12px",
                fontSize: 26,
                letterSpacing: "-0.025em",
              }}
            >
              {event?.name || "You are in line"}
            </h1>
            <p style={{ margin: "0 0 28px", color: "#6e7180" }}>
              Please stay on this page. Closing or leaving this page removes you
              from the queue.
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                marginBottom: 18,
              }}
            >
              <span style={{ color: "#6e7180", fontSize: 14 }}>
                Your position
              </span>
              <strong
                style={{
                  fontSize: 52,
                  lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {position ?? "—"}
              </strong>
            </div>
            {queueSize != null ? (
              <p style={{ margin: "0 0 6px", color: "#6e7180" }}>
                {queueSize} fans currently in the queue
              </p>
            ) : null}
            {estimatedWaitSeconds != null ? (
              <p style={{ margin: 0, color: "#6e7180" }}>
                Estimated wait: {formatWaitTime(estimatedWaitSeconds)}
              </p>
            ) : null}
            <div
              role="progressbar"
              aria-label="Waiting for admission"
              style={{
                height: 6,
                margin: "26px 0 16px",
                overflow: "hidden",
                borderRadius: 999,
                background: "#e2e8f0",
              }}
            >
              <div
                style={{
                  width: "35%",
                  height: "100%",
                  borderRadius: 999,
                  background: accent,
                  animation: "bt-waiting-room-progress 1.8s ease-in-out infinite",
                }}
              />
            </div>
            <p style={{ margin: 0, color: "#6e7180", fontSize: 14 }}>
              You will be redirected automatically when it is your turn to
              shop.
            </p>
            {error ? (
              <p role="status" style={{ margin: "14px 0 0", color: "#b45309" }}>
                {error}
              </p>
            ) : null}
          </>
        ) : status === "admitted" ? (
          <>
            <h1 style={{ margin: "0 0 10px", fontSize: 26 }}>You are in!</h1>
            <p style={{ margin: 0, color: "#6e7180" }}>
              Redirecting to tickets...
            </p>
          </>
        ) : (
          <>
            <h1 style={{ margin: "0 0 10px", fontSize: 26 }}>
              Unable to join the waiting room
            </h1>
            <p role="alert" style={{ margin: 0, color: "#6e7180" }}>
              {error}
            </p>
          </>
        )}
      </section>
      <style>{`
        @keyframes bt-waiting-room-progress {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(320%); }
        }
      `}</style>
    </main>
  );
}
