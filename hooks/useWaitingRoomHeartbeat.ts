"use client";

import { useEffect } from "react";
import {
  beaconLeaveWaitingRoom,
  heartbeatWaitingRoom,
  joinWaitingRoom,
} from "@/lib/api";
import {
  clearWaitingRoomToken,
  getWaitingRoomToken,
  setWaitingRoomToken,
} from "@/lib/waitingRoom";

const HEARTBEAT_INTERVAL_MS = 60_000;

/**
 * Keeps an admitted shopping slot alive and recovers a slot after refresh or a
 * backgrounded tab. The backend remains authoritative: a stale token is
 * cleared so its next gated request returns the shopper to the queue.
 */
export default function useWaitingRoomHeartbeat(
  eventUuid?: string | null,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled || !eventUuid) return;
    const initialToken = getWaitingRoomToken(eventUuid);
    if (!initialToken) return;

    let cancelled = false;
    let token: string | null = initialToken;
    let rejoinInFlight: Promise<unknown> | null = null;

    const rejoin = () => {
      if (rejoinInFlight) return rejoinInFlight;
      rejoinInFlight = joinWaitingRoom(eventUuid)
        .then((res) => {
          if (cancelled) return;
          const data = res.data as { status?: string; token?: string };
          if (data.status === "admitted" && data.token) {
            token = data.token;
            setWaitingRoomToken(eventUuid, data.token);
            return;
          }
          token = null;
          clearWaitingRoomToken(eventUuid);
        })
        .catch(() => {
          if (!cancelled) {
            token = null;
            clearWaitingRoomToken(eventUuid);
          }
        })
        .finally(() => {
          rejoinInFlight = null;
        });
      return rejoinInFlight;
    };

    const heartbeat = () => {
      if (!token) return;
      heartbeatWaitingRoom(eventUuid, token).catch((error: unknown) => {
        const response = (
          error as { response?: { status?: number; data?: { code?: string } } }
        ).response;
        if (
          response?.status === 403 ||
          response?.data?.code === "WAITING_ROOM_REQUIRED"
        ) {
          token = null;
          void rejoin();
        }
      });
    };

    heartbeat();
    const interval = window.setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);

    const releaseSoftly = (event?: PageTransitionEvent) => {
      if (event?.persisted || !token) return;
      beaconLeaveWaitingRoom(eventUuid, token, { soft: true });
    };
    const resume = () => {
      if (document.visibilityState !== "visible") return;
      if (token) heartbeat();
      else void rejoin();
    };

    window.addEventListener("pagehide", releaseSoftly);
    window.addEventListener("pageshow", resume);
    document.addEventListener("visibilitychange", resume);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("pagehide", releaseSoftly);
      window.removeEventListener("pageshow", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [enabled, eventUuid]);
}
