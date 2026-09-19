import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_EVENTS, DEMO_SEATED_TICKET_GROUPS, DEMO_USER } from "@/lib/demo/fixtures";
import {
  NM_STATE_ATHLETICS_ORG_UUID,
  printedTicketHolderName,
  printedTicketIdLayout,
  printedTicketOfferLayout,
  printedTicketSubtitle,
  printedVenueLabel,
  printTicketsPdf,
  resolveTicketTheme,
  ticketPdfSeatColumnValues,
  type TicketPdfRequest,
} from "@/lib/ticketPdf";

const nmState = DEMO_EVENTS.find((event) => event.shortCode === "NMST004")!;

describe("printed ticket branding", () => {
  it("draws a team event in the organization brand colour with a sporting badge", () => {
    const theme = resolveTicketTheme({ ...nmState, category: { name: "Sports" } });

    expect(theme.primaryColor).toBe(
      nmState.organization.branding?.primaryColor,
    );
    expect(theme.badgeLabel).toBe("SPORTING EVENT");
  });

  it("uses a generic badge when the org category is a named sport without sport in the name", () => {
    const theme = resolveTicketTheme(nmState);

    expect(theme.primaryColor).toBe(
      nmState.organization.branding?.primaryColor,
    );
    expect(theme.badgeLabel).toBe("EVENT TICKET");
  });

  it("falls back to Blocktickets navy and a generic badge without org branding", () => {
    const theme = resolveTicketTheme({ name: "Community Meetup" });

    expect(theme.primaryColor).toBe("#051b35");
    expect(theme.badgeLabel).toBe("EVENT TICKET");
  });

  it.each([
    ["Sporting", "SPORTING EVENT"],
    ["Motorsport", "SPORTING EVENT"],
    ["Football", "EVENT TICKET"],
    ["Hockey", "EVENT TICKET"],
    ["Baseball", "EVENT TICKET"],
    ["NCAA Basketball", "EVENT TICKET"],
    ["Concert", "CONCERT EVENT"],
    ["Theater", "THEATER EVENT"],
    ["Family Show", "FAMILY EVENT"],
    ["Access Pass", "ACCESS PASS"],
  ] as const)("maps category %s to %s", (category, badgeLabel) => {
    expect(
      resolveTicketTheme({ ...nmState, category: { name: category } }).badgeLabel,
    ).toBe(badgeLabel);
  });
});

describe("printedVenueLabel", () => {
  it("title-cases a lowercase API city on print and print-all tickets", () => {
    const city = nmState.venue.address[0].city.toLowerCase();

    expect(
      printedVenueLabel({
        ...nmState,
        venue: {
          ...nmState.venue,
          address: [{ ...nmState.venue.address[0], city }],
        },
      }),
    ).toBe(`${nmState.venue.name}, ${nmState.venue.address[0].city}`);
  });

  it("does not repeat the city when the venue name already includes it", () => {
    const city = nmState.venue.address[0].city;
    const name = `${nmState.venue.name}, ${city.toLowerCase()}`;

    expect(
      printedVenueLabel({
        ...nmState,
        venue: {
          ...nmState.venue,
          name,
          address: [{ ...nmState.venue.address[0], city: city.toLowerCase() }],
        },
      }),
    ).toBe(`${nmState.venue.name}, ${city}`);
  });
});

describe("printedTicketHolderName", () => {
  it("prints first and last name instead of the ticket email", () => {
    expect(
      printedTicketHolderName(
        { checkInCode: "NMS-1", holder: DEMO_USER.email },
        {
          firstName: DEMO_USER.firstName,
          lastName: DEMO_USER.lastName,
          email: DEMO_USER.email,
        },
      ),
    ).toBe(`${DEMO_USER.firstName} ${DEMO_USER.lastName}`);
  });

  it("uses the linked account name when the order only has an email", () => {
    expect(
      printedTicketHolderName(
        { checkInCode: "NMS-1", holder: DEMO_USER.email },
        {
          email: DEMO_USER.email,
          users_permissions_user: {
            firstName: DEMO_USER.firstName,
            lastName: DEMO_USER.lastName,
          },
        },
      ),
    ).toBe(`${DEMO_USER.firstName} ${DEMO_USER.lastName}`);
  });

  it("does not treat Guest as a real ticket holder name", () => {
    expect(
      printedTicketHolderName(
        { checkInCode: "NMS-1", holder: "Guest" },
        {
          firstName: DEMO_USER.firstName,
          lastName: DEMO_USER.lastName,
          email: DEMO_USER.email,
        },
      ),
    ).toBe(`${DEMO_USER.firstName} ${DEMO_USER.lastName}`);
  });

  it("falls back to the email when no name is available", () => {
    expect(
      printedTicketHolderName(
        { checkInCode: "NMS-1", holder: DEMO_USER.email },
        { email: DEMO_USER.email },
      ),
    ).toBe(DEMO_USER.email);
  });
});

describe("printedTicketOfferLayout", () => {
  const eventTime = "7:00 PM";

  it("prints a seated fixture offer and keeps the event time", () => {
    expect(
      printedTicketOfferLayout(
        {
          checkInCode: "NMS-1",
          offerName: DEMO_SEATED_TICKET_GROUPS[0].offer?.name,
        },
        eventTime,
        undefined,
        nmState,
      ),
    ).toEqual({
      timeValue: eventTime,
      secondary: {
        label: "OFFER",
        value: DEMO_SEATED_TICKET_GROUPS[0].offer?.name,
      },
    });
  });

  it("uses the session window for prelims and skips a generic package", () => {
    expect(
      printedTicketOfferLayout(
        { checkInCode: "PRE-1", offerName: "Prelims" },
        eventTime,
        "Season Package",
        nmState,
      ),
    ).toEqual({
      timeValue: "MORNING UNTIL 4:00",
      secondary: { label: "OFFER", value: "PRELIMS" },
    });
  });

  it("keeps a package label when the offer is generic", () => {
    expect(
      printedTicketOfferLayout(
        { checkInCode: "STD-1", offerName: "Standard Admission" },
        eventTime,
        "Season Package",
        nmState,
      ),
    ).toEqual({
      timeValue: eventTime,
      secondary: { label: "PACKAGE", value: "Season Package" },
    });
  });

  it("uses the package on the ticket when no package name is passed in", () => {
    expect(
      printedTicketOfferLayout(
        {
          checkInCode: "PKG-1",
          offerName: "Standard Admission",
          package: { name: "Season Package" },
        },
        eventTime,
        undefined,
        nmState,
      ),
    ).toEqual({
      timeValue: eventTime,
      secondary: { label: "PACKAGE", value: "Season Package" },
    });
  });
});

describe("printedTicketIdLayout", () => {
  const athleticsEvent = {
    ...nmState,
    organization: {
      ...nmState.organization,
      uuid: NM_STATE_ATHLETICS_ORG_UUID,
    },
  };

  it("prints the ticket id on NM State Athletics stock", () => {
    expect(
      printedTicketIdLayout({ id: 2048, checkInCode: "NMS-1" }, athleticsEvent),
    ).toEqual({ label: "TICKET ID", value: "2048" });
  });

  it("omits the ticket id for other organizations or tickets without an id", () => {
    expect(
      printedTicketIdLayout({ id: 2048, checkInCode: "NMS-1" }, nmState),
    ).toBeNull();
    expect(
      printedTicketIdLayout({ checkInCode: "NMS-1" }, athleticsEvent),
    ).toBeNull();
  });
});

describe("printedTicketSubtitle", () => {
  it("uses the event summary when one is set", () => {
    expect(
      printedTicketSubtitle({
        ...nmState,
        summary: "Home opener at Aggie Memorial.",
      }),
    ).toBe("Home opener at Aggie Memorial.");
  });

  it("joins attractions when the event has no summary", () => {
    expect(printedTicketSubtitle({ ...nmState, summary: undefined })).toBe(
      nmState.attractions.map((attraction) => attraction.name).join(" • "),
    );
  });
});

describe("ticketPdfSeatColumnValues", () => {
  it("shows GA for row and seat when a GA ticket has no assigned row or seat", () => {
    expect(
      ticketPdfSeatColumnValues({
        checkInCode: "GA-1",
        generalAdmission: true,
        sectionNumber: "ga",
      }),
    ).toEqual({ section: "ga", row: "GA", seat: "GA" });
  });

  it("keeps reserved row and seat values for assigned GA sections", () => {
    expect(
      ticketPdfSeatColumnValues({
        checkInCode: "GA-2",
        generalAdmission: true,
        sectionNumber: "P",
        rowNumber: 12,
        seatNumber: 8,
      }),
    ).toEqual({ section: "P", row: "12", seat: "8" });
  });

  it("uses dash placeholders for reserved tickets missing row or seat", () => {
    expect(
      ticketPdfSeatColumnValues({
        checkInCode: "RES-1",
        sectionNumber: "G",
        rowNumber: 25,
      }),
    ).toEqual({ section: "G", row: "25", seat: "—" });
  });
});

describe("printTicketsPdf", () => {
  const objectUrl = "blob:ticket-pdf";
  let blobs: Blob[];

  beforeEach(() => {
    blobs = [];
    vi.spyOn(URL, "createObjectURL").mockImplementation((blob: Blob | MediaSource) => {
      blobs.push(blob as Blob);
      return objectUrl;
    });
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const request = (overrides: Partial<TicketPdfRequest> = {}) =>
    ({
      event: nmState,
      tickets: [
        { id: 1, checkInCode: "NMS-1", holder: "Jaime Convery", sectionNumber: "G", rowNumber: 20, seatNumber: 20 },
        { id: 2, checkInCode: "NMS-2", holder: "Jaime Convery", sectionNumber: "G", rowNumber: 20, seatNumber: 21 },
      ],
      mode: "download",
      ...overrides,
    }) as TicketPdfRequest;

  it("downloads every selected ticket as one PDF named after the event", async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    await printTicketsPdf(request({ filename: nmState.name }));

    expect(click).toHaveBeenCalledOnce();
    expect(blobs).toHaveLength(1);
    expect(blobs[0].type).toBe("application/pdf");
    expect(blobs[0].size).toBeGreaterThan(0);
  });

  it("refuses to print a ticket that has no check-in code", async () => {
    await expect(
      printTicketsPdf(request({ tickets: [{ id: 3, checkInCode: "" }] })),
    ).rejects.toThrow(/check-in code/i);
  });

  it("still builds a PDF when the event includes a summary", async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    await printTicketsPdf(
      request({
        event: {
          ...nmState,
          summary:
            "Join us this fall for the Bands of America Regional Championship - September 19th, 2026. See you there!",
        },
        tickets: [
          {
            id: 1,
            checkInCode: "NMS-1",
            holder: "Jaime Convery",
            sectionNumber: "G",
            rowNumber: 20,
            seatNumber: 20,
          },
        ],
      }),
    );

    expect(click).toHaveBeenCalledOnce();
    expect(blobs[0]?.size).toBeGreaterThan(0);
  });
});
