import { beforeEach, describe, expect, it } from "vitest";
import {
  clearWaitingRoomToken,
  getCurrentWaitingRoomEventUuid,
  getQueueSessionId,
  getWaitingRoomPath,
  getWaitingRoomPurchasePath,
  getWaitingRoomToken,
  hasValidWaitingRoomToken,
  isWaitingRoomRequired,
  rememberWaitingRoomEntry,
  setWaitingRoomToken,
} from "@/lib/waitingRoom";
import { DEMO_EVENTS, demoEventDetail } from "@/lib/demo/fixtures";

const EVENT = DEMO_EVENTS[0];
const UUID = EVENT.uuid;

describe("waiting-room browser state", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("keeps one queue identity per tab and stores an admission per event", () => {
    const first = getQueueSessionId();
    expect(first).toBeTruthy();
    expect(getQueueSessionId()).toBe(first);

    setWaitingRoomToken(UUID, "admission-token");
    expect(getWaitingRoomToken(UUID)).toBe("admission-token");
    expect(getCurrentWaitingRoomEventUuid()).toBe(UUID);
    expect(hasValidWaitingRoomToken(UUID)).toBe(true);

    clearWaitingRoomToken(UUID);
    expect(hasValidWaitingRoomToken(UUID)).toBe(false);
    expect(getCurrentWaitingRoomEventUuid()).toBeNull();
  });

  it("returns admitted GA and seated shoppers to the route they entered from", () => {
    const gaPath = `/e/${EVENT.seoUrl}/${EVENT.shortCode}/?code=VIP`;
    rememberWaitingRoomEntry({
      eventUuid: UUID,
      destination: "ga",
      returnPath: gaPath,
    });
    expect(
      getWaitingRoomPurchasePath({
        eventUuid: UUID,
        slug: EVENT.seoUrl,
        shortcode: EVENT.shortCode,
      }),
    ).toBe(gaPath);

    clearWaitingRoomToken(UUID);
    rememberWaitingRoomEntry({ eventUuid: UUID, destination: "seated" });
    expect(
      getWaitingRoomPurchasePath({
        eventUuid: UUID,
        slug: EVENT.seoUrl,
        shortcode: EVENT.shortCode,
      }),
    ).toBe(`/e/${EVENT.seoUrl}/${EVENT.shortCode}/tickets/`);
    expect(getWaitingRoomPath(EVENT.seoUrl, EVENT.shortCode)).toBe(
      `/e/${EVENT.seoUrl}/${EVENT.shortCode}/waiting-room/`,
    );
  });

  it("only gates events explicitly enabled by the backend", () => {
    const detail = demoEventDetail(EVENT.shortCode);
    expect(isWaitingRoomRequired(detail.event)).toBe(false);
    expect(
      isWaitingRoomRequired({
        ...detail.event,
        waitingRoomEnabled: true,
      }),
    ).toBe(true);
  });
});
