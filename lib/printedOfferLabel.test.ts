import { describe, expect, it } from "vitest";
import { DEMO_SEATED_TICKET_GROUPS } from "@/lib/demo/fixtures";
import {
  formatPrintedOfferLine,
  printedOfferBadgeName,
  resolvePrintedOfferInfo,
} from "@/lib/printedOfferLabel";

const fieldClub = DEMO_SEATED_TICKET_GROUPS[0].offer!;

describe("resolvePrintedOfferInfo", () => {
  it("returns null when the ticket has no printable offer name", () => {
    expect(resolvePrintedOfferInfo({})).toBeNull();
    expect(resolvePrintedOfferInfo({ offer: { name: "Open" } })).toBeNull();
    expect(
      resolvePrintedOfferInfo({ offer: { name: "Standard Admission" } }),
    ).toBeNull();
    expect(resolvePrintedOfferInfo({ name: "Lower Bowl" })).toBeNull();
  });

  it("reads session offers from ticket.name when offer_uuid is missing", () => {
    expect(resolvePrintedOfferInfo({ name: "Day Pass" })).toEqual({
      label: "ALL DAY PASS",
      shortLabel: "ALL DAY",
      window: "ALL DAY",
    });
    expect(resolvePrintedOfferInfo({ name: "Prelims 9:00 to 4:00" })).toEqual({
      label: "PRELIMS 9:00 TO 4:00",
      shortLabel: "PRELIMS",
      window: "MORNING UNTIL 4:00",
    });
    expect(resolvePrintedOfferInfo({ name: "Final 6:00pm" })).toEqual({
      label: "FINAL 6:00PM",
      shortLabel: "FINALS",
      window: "6:00PM UNTIL END",
    });
  });

  it("keeps buyer-type day passes distinct", () => {
    expect(
      resolvePrintedOfferInfo({ offer: { name: "Student Day Pass" } }),
    ).toEqual({
      label: "STUDENT DAY PASS",
      shortLabel: "ALL DAY",
      window: "ALL DAY",
    });
  });

  it("labels prelims and finals with guest-service time windows", () => {
    expect(resolvePrintedOfferInfo({ offer: { name: "Prelims" } })).toEqual({
      label: "PRELIMS",
      shortLabel: "PRELIMS",
      window: "MORNING UNTIL 4:00",
    });
    expect(resolvePrintedOfferInfo({ offer: { name: "Finals" } })).toEqual({
      label: "FINALS",
      shortLabel: "FINALS",
      window: "6:00PM UNTIL END",
    });
  });

  it("reads snake_case and array offer payloads from sold tickets", () => {
    expect(resolvePrintedOfferInfo({ offer_name: "Prelims" })).toEqual({
      label: "PRELIMS",
      shortLabel: "PRELIMS",
      window: "MORNING UNTIL 4:00",
    });
    expect(
      resolvePrintedOfferInfo({ offer: [{ name: "Finals" }] }),
    ).toEqual({
      label: "FINALS",
      shortLabel: "FINALS",
      window: "6:00PM UNTIL END",
    });
  });

  it("prints the seated fixture offer without its long description", () => {
    expect(resolvePrintedOfferInfo({ offer: fieldClub })).toEqual({
      label: fieldClub.name,
      shortLabel: fieldClub.name,
      window: "",
    });
  });
});

describe("formatPrintedOfferLine", () => {
  it("joins a bare offer label with its validity window", () => {
    expect(formatPrintedOfferLine({ offer: { name: "Prelims" } })).toBe(
      "PRELIMS • MORNING UNTIL 4:00",
    );
    expect(formatPrintedOfferLine({ name: "Day Pass" })).toBe(
      "ALL DAY PASS • ALL DAY",
    );
  });

  it("does not repeat a time already in the offer name", () => {
    expect(formatPrintedOfferLine({ name: "Prelims 9:00 to 4:00" })).toBe(
      "PRELIMS 9:00 TO 4:00",
    );
  });
});

describe("printedOfferBadgeName", () => {
  it("returns the printable offer label without the time window", () => {
    expect(printedOfferBadgeName({ offer: { name: "Prelims" } })).toBe(
      "PRELIMS",
    );
    expect(printedOfferBadgeName({ offer: fieldClub })).toBe(fieldClub.name);
  });

  it("is empty for generic or missing offers so the badge can stay Tickets", () => {
    expect(printedOfferBadgeName({ offer: { name: "Standard Admission" } })).toBe(
      "",
    );
    expect(printedOfferBadgeName({})).toBe("");
  });
});
