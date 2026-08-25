import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_EVENTS } from "@/lib/demo/fixtures";
import {
  getWaitingRoomToken,
  setWaitingRoomToken,
} from "@/lib/waitingRoom";

vi.mock("@/lib/api", () => ({
  heartbeatWaitingRoom: vi.fn(),
  joinWaitingRoom: vi.fn(),
  beaconLeaveWaitingRoom: vi.fn(),
}));

import useWaitingRoomHeartbeat from "@/hooks/useWaitingRoomHeartbeat";
import {
  heartbeatWaitingRoom,
  joinWaitingRoom,
} from "@/lib/api";

const UUID = DEMO_EVENTS[0].uuid;
const mockedHeartbeat = vi.mocked(heartbeatWaitingRoom);
const mockedJoin = vi.mocked(joinWaitingRoom);

describe("waiting-room admission heartbeat", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    mockedHeartbeat.mockReset();
    mockedJoin.mockReset();
    setWaitingRoomToken(UUID, "old-token");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps admission alive every minute", async () => {
    mockedHeartbeat.mockResolvedValue({
      data: { status: "admitted" },
    } as never);

    renderHook(() => useWaitingRoomHeartbeat(UUID, true));

    expect(mockedHeartbeat).toHaveBeenCalledWith(UUID, "old-token");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(mockedHeartbeat).toHaveBeenCalledTimes(2);
  });

  it("rejoins and replaces a stale admission token", async () => {
    mockedHeartbeat.mockRejectedValue({
      response: { status: 403 },
    });
    mockedJoin.mockResolvedValue({
      data: { status: "admitted", token: "fresh-token" },
    } as never);

    renderHook(() => useWaitingRoomHeartbeat(UUID, true));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mockedJoin).toHaveBeenCalledWith(UUID);
    expect(getWaitingRoomToken(UUID)).toBe("fresh-token");
  });
});
