import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_EVENTS, demoEventDetail } from "@/lib/demo/fixtures";
import {
  getWaitingRoomToken,
  rememberWaitingRoomEntry,
} from "@/lib/waitingRoom";

const EVENT = DEMO_EVENTS[0];
const router = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useParams: () => ({
    slug: EVENT.seoUrl,
    shortcode: EVENT.shortCode,
  }),
  useRouter: () => router,
}));

vi.mock("@/components/molecules/RouteLoader", () => ({
  default: () => <div role="status">Joining the queue...</div>,
}));

vi.mock("@/lib/api", () => ({
  getEventByShortCode: vi.fn(),
  joinWaitingRoom: vi.fn(),
  getWaitingRoomStatus: vi.fn(),
  beaconLeaveWaitingRoom: vi.fn(),
}));

import WaitingRoomPage from "@/app/e/[slug]/[shortcode]/waiting-room/page";
import {
  beaconLeaveWaitingRoom,
  getEventByShortCode,
  getWaitingRoomStatus,
  joinWaitingRoom,
} from "@/lib/api";

const mockedGetEvent = vi.mocked(getEventByShortCode);
const mockedJoin = vi.mocked(joinWaitingRoom);
const mockedStatus = vi.mocked(getWaitingRoomStatus);
const mockedLeave = vi.mocked(beaconLeaveWaitingRoom);

function waitingEvent() {
  const detail = demoEventDetail(EVENT.shortCode);
  return {
    ...detail,
    event: { ...detail.event, waitingRoomEnabled: true },
  };
}

describe("waiting room page", () => {
  beforeEach(() => {
    sessionStorage.clear();
    router.replace.mockReset();
    mockedGetEvent.mockReset();
    mockedJoin.mockReset();
    mockedStatus.mockReset();
    mockedLeave.mockReset();
    mockedGetEvent.mockResolvedValue({ data: waitingEvent() } as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows queue position and polls until the shopper is admitted", async () => {
    vi.useFakeTimers();
    rememberWaitingRoomEntry({
      eventUuid: EVENT.uuid,
      destination: "ga",
      returnPath: `/e/${EVENT.seoUrl}/${EVENT.shortCode}/`,
    });
    mockedJoin.mockResolvedValue({
      data: {
        status: "waiting",
        position: 12,
        queueSize: 48,
        estimatedWaitSeconds: 90,
      },
    } as never);
    mockedStatus.mockResolvedValue({
      data: { status: "admitted", token: "queue-admission" },
    } as never);

    render(<WaitingRoomPage />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText(/48 fans currently in the queue/i)).toBeInTheDocument();
    expect(screen.getByText(/estimated wait: about 2 minutes/i)).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6_000);
    });

    expect(mockedStatus).toHaveBeenCalledWith(EVENT.uuid);
    expect(router.replace).toHaveBeenCalledWith(
      `/e/${EVENT.seoUrl}/${EVENT.shortCode}/`,
    );
    expect(getWaitingRoomToken(EVENT.uuid)).toBe("queue-admission");
  });

  it("shows a recoverable error when joining the queue fails", async () => {
    mockedJoin.mockRejectedValue(new Error("offline"));

    render(<WaitingRoomPage />);

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent(/something went wrong loading the waiting room/i);
    expect(router.replace).not.toHaveBeenCalled();
  });
});
