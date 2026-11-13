import type { InternalAxiosRequestConfig } from "axios";
import { describe, expect, it } from "vitest";
import { demoAdapter } from "@/lib/demo/adapter";
import { DEMO_SESSION, DEMO_USER } from "@/lib/demo/fixtures";

describe("demo SMS opt-in", () => {
  it("returns the demo session with the requested preference", async () => {
    const res = await demoAdapter({
      method: "post",
      url: "/verifies/sms-opt-in",
      data: { data: { smsOptIn: true } },
    } as InternalAxiosRequestConfig);

    expect(res.status).toBe(200);
    expect(res.data).toEqual({
      ...DEMO_SESSION,
      user: { ...DEMO_USER, smsOptIn: true },
    });
  });
});
