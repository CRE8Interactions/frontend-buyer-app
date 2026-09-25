import { beforeEach, describe, expect, it } from "vitest";
import { DEMO_EVENTS } from "@/lib/demo/fixtures";
import {
  readTrackingCode,
  readTrackingCodeForCart,
  rememberTrackingCode,
} from "@/lib/trackingLink";

const EVENT = DEMO_EVENTS[0];

describe("trackingLink", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("stores a 4–12 digit tracking code for the event", () => {
    rememberTrackingCode(EVENT.uuid, "1234");

    expect(readTrackingCode(EVENT.uuid)).toBe("1234");
    expect(sessionStorage.getItem(`trackingLink:${EVENT.uuid}`)).toBe("1234");
  });

  it("does not store empty, zero, letter, or missing-event codes", () => {
    rememberTrackingCode(EVENT.uuid, "");
    rememberTrackingCode(EVENT.uuid, "0");
    rememberTrackingCode(EVENT.uuid, "GO2026");
    rememberTrackingCode(undefined, "1234");

    expect(readTrackingCode(EVENT.uuid)).toBeNull();
    expect(sessionStorage.getItem(`trackingLink:${EVENT.uuid}`)).toBeNull();
  });

  it("reads a stored code from a checkout cart event uuid", () => {
    rememberTrackingCode(EVENT.uuid, "987654");

    expect(
      readTrackingCodeForCart({ event: { uuid: EVENT.uuid } }),
    ).toBe("987654");
    expect(readTrackingCodeForCart({ eventUUID: EVENT.uuid })).toBe("987654");
    expect(readTrackingCodeForCart({})).toBeNull();
  });
});
