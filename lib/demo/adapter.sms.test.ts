import { describe, expect, it } from "vitest";
import type { InternalAxiosRequestConfig } from "axios";
import { demoAdapter } from "@/lib/demo/adapter";
import { demoSmsTickets } from "@/lib/demo/fixtures";

function get(url: string) {
  return demoAdapter({ method: "get", url } as InternalAxiosRequestConfig);
}

describe("demo SMS ticket links", () => {
  it("serves the fixture tickets and expires the expired token", async () => {
    const live = await get("/orders/sms-tickets/demo");
    expect(live.status).toBe(200);
    expect(live.data).toEqual(demoSmsTickets());

    const expired = await get("/orders/sms-tickets/expired");
    expect(expired.status).toBe(410);

    const apple = await get("/orders/sms-tickets/demo/apple-passes");
    expect(apple.data).toBeInstanceOf(Blob);

    const google = await get("/orders/sms-tickets/demo/google-passes");
    expect(google.data).toEqual({
      url: "https://pay.google.com/gp/v/save/demo-sms",
    });
  });
});
