import { describe, expect, it } from "vitest";
import { TICKET_TRANSFER_POPULATE_QUERY } from "@/lib/api";

describe("transfer list query", () => {
  it("asks for the event venue timezone so kickoff times use the venue zone", () => {
    const params = new URLSearchParams(TICKET_TRANSFER_POPULATE_QUERY);
    expect(params.get("populate[event][populate][venue][fields][0]")).toBe("timezone");
  });

  it("still loads the tickets, order, and users each transfer row shows", () => {
    const params = new URLSearchParams(TICKET_TRANSFER_POPULATE_QUERY);
    for (const relation of ["tickets", "order", "fromUser", "toUser"]) {
      expect(params.get(`populate[${relation}]`)).toBe("true");
    }
  });
});
