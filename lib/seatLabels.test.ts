import { describe, expect, it } from "vitest";
import { DEMO_SEATED_TICKET_GROUPS } from "@/lib/demo/fixtures";
import { getSeatAdditionalLabel } from "@/lib/seatLabels";

describe("getSeatAdditionalLabel", () => {
  const group = DEMO_SEATED_TICKET_GROUPS[0];
  const seatId = group.seatIds?.[0];
  if (!seatId) throw new Error("demo seated groups need a seat id");

  it("uses the first custom label in ticket, group, map seat, then seat index order", () => {
    const seatLabels = { [seatId]: "From the index" };
    expect(
      getSeatAdditionalLabel({
        ticket: { additionalLabel: "On the ticket", seatId },
        ticketGroup: { additionalLabel: "On the group", seatId },
        mapSeat: { additionalLabel: "On the map", seatId },
        seatLabels,
      }),
    ).toBe("On the ticket");
    expect(
      getSeatAdditionalLabel({
        ticketGroup: { additionalLabel: "On the group", seatId },
        mapSeat: { additionalLabel: "On the map", seatId },
        seatLabels,
      }),
    ).toBe("On the group");
    expect(
      getSeatAdditionalLabel({
        mapSeat: { additionalLabel: "On the map", seatId },
        seatLabels,
      }),
    ).toBe("On the map");
    expect(
      getSeatAdditionalLabel({
        ticket: { additionalLabel: "   ", seatId },
        seatLabels,
      }),
    ).toBe("From the index");
  });

  it("returns nothing when the seat has no custom label", () => {
    expect(
      getSeatAdditionalLabel({ ticketGroup: { ...group, seatId } }),
    ).toBe("");
  });
});
