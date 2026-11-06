import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  decodePDFRawStream,
  PDFArray,
  PDFDocument,
  PDFRawStream,
  PDFRef,
} from "pdf-lib";
import { DEMO_EVENTS, DEMO_SEATED_TICKET_GROUPS, DEMO_USER, demoTicketGroups } from "@/lib/demo/fixtures";
import { formatEventWhen } from "@/lib/helpers";
import { PRINTED_ENTRY_MAX_CHARS, PRINTED_SECTION_MAX_CHARS } from "@/lib/printedTicketDetails";
import { ACCESSIBLE_LABEL_DA } from "@/lib/ticketAccessibility";
import {
  NM_STATE_ATHLETICS_ORG_UUID,
  printedTicketHolderName,
  printedTicketIdLayout,
  printedTicketAccessibilityLayout,
  printedTicketOfferLayout,
  printedTicketSubtitle,
  printedVenueLabel,
  printTicketsPdf,
  resolveTicketTheme,
  ticketPdfSeatColumnValues,
  type TicketPdfRequest,
} from "@/lib/ticketPdf";

const nmState = DEMO_EVENTS.find((event) => event.shortCode === "NMST004")!;

function decodePdfHex(content: string) {
  return content.replace(/<([0-9A-Fa-f\s]+)>/g, (_, hex: string) => {
    const bytes = hex.replace(/\s+/g, "");
    let out = "";
    for (let i = 0; i < bytes.length; i += 2) {
      out += String.fromCharCode(parseInt(bytes.slice(i, i + 2), 16));
    }
    return out;
  });
}

async function pdfPageText(blob: Blob) {
  const doc = await PDFDocument.load(await blob.arrayBuffer());
  const contents = doc.getPage(0).node.Contents();
  const refs = contents instanceof PDFArray ? contents.asArray() : [contents];
  let text = "";
  for (const ref of refs) {
    const stream = doc.context.lookup(ref as PDFRef);
    if (!(stream instanceof PDFRawStream)) continue;
    text += decodePdfHex(
      new TextDecoder("latin1").decode(decodePDFRawStream(stream).decode()),
    );
  }
  return text;
}

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

describe("printedTicketAccessibilityLayout", () => {
  it("prints the accessibility label for an accessible seat", () => {
    expect(
      printedTicketAccessibilityLayout({
        checkInCode: "ADA-1",
        accessible: true,
        accessibleType: "DA",
      }),
    ).toEqual({ label: "ACCESSIBILITY", value: ACCESSIBLE_LABEL_DA });
  });

  it("omits accessibility when the ticket is not accessible", () => {
    expect(
      printedTicketAccessibilityLayout({
        checkInCode: "STD-1",
        seatNumber: 14,
      }),
    ).toBeNull();
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

  it("prints the seat number without an accessibility suffix", () => {
    expect(
      ticketPdfSeatColumnValues({
        checkInCode: "RES-DA",
        sectionNumber: "115ADA",
        rowNumber: "G",
        seatNumber: "13_DA",
      }),
    ).toEqual({ section: "115ADA", row: "G", seat: "13" });
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

  it("prints the purchasing organization and leaves that line off when the name is blank", async () => {
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const ticket = {
      id: 1,
      checkInCode: "NMS-1",
      holder: "Jaime Convery",
      sectionNumber: "G",
      rowNumber: 20,
      seatNumber: 20,
    };

    await printTicketsPdf(
      request({
        purchasedByOrganizationName: nmState.organization.name,
        tickets: [ticket],
      }),
    );
    const withOrg = await pdfPageText(blobs[0]);
    expect(withOrg).toContain("ORGANIZATION");
    expect(withOrg).toContain(nmState.organization.name);

    blobs.length = 0;
    await printTicketsPdf(
      request({
        purchasedByOrganizationName: "   ",
        tickets: [ticket],
      }),
    );
    expect(await pdfPageText(blobs[0])).not.toContain("ORGANIZATION");
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

  const eventTime = formatEventWhen(nmState.start, nmState.venue.timezone, "h:mm A");

  function entryLabels(text: string) {
    return text.split("ENTRY").length - 1;
  }

  it("keeps a short ticket on the event time without an entry block", async () => {
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    await printTicketsPdf(
      request({
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

    const text = await pdfPageText(blobs[0]);
    expect(eventTime.length).toBeGreaterThan(0);
    expect(text).toContain(eventTime);
    expect(text).toContain(nmState.name);
    expect(entryLabels(text)).toBe(1);
  });

  it("prints a long section name and entry instructions without replacing the time", async () => {
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const entry =
      "Enter through Gate C. Club lounge opens 90 minutes before puck drop. Wristbands are required on the party deck. No re-entry after the first period. Show ticket at the club door.";
    const offerName = "Premium All-Inclusive Champions Club Access Pass";
    const sectionNumber = "Champions Club Party Deck — West Suite Entrance";

    await printTicketsPdf(
      request({
        event: {
          ...nmState,
          organization: {
            ...nmState.organization,
            uuid: NM_STATE_ATHLETICS_ORG_UUID,
          },
        },
        purchasedByOrganizationName: nmState.organization.name,
        tickets: [
          {
            id: 1,
            checkInCode: "NMS-1",
            holder: "Jaime Convery",
            sectionNumber,
            rowNumber: "A",
            seatNumber: 14,
            accessible: true,
            accessibleType: "DA",
            offer: { name: offerName, description: entry },
          },
        ],
      }),
    );

    const text = await pdfPageText(blobs[0]);
    expect(text).toContain(eventTime);
    expect(text).toContain("Champions Club Party Deck");
    expect(text).toContain("West Suite");
    expect(text).toContain("Enter through Gate C.");
    expect(text).toContain(offerName);
    expect(text).not.toContain("…");
    expect(text).toContain("Open space for");
    expect(text).toContain("wheelchair");
    expect(text).not.toContain("Accessible:");
    expect(text.indexOf("OFFER")).toBeLessThan(text.indexOf("TICKET ID"));
    expect(text.indexOf("TICKET ID")).toBeLessThan(text.indexOf("ACCESSIBILITY"));
    expect(text.indexOf("ACCESSIBILITY")).toBeLessThan(text.indexOf("ORGANIZATION"));
    expect(text).toContain(nmState.organization.name);
  });

  it("prints the entry lines that fit when a description needs more than three", async () => {
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const description = [
      "Enter Gate C.",
      "Show your wristband.",
      "No re-entry after the first period.",
      "Club door only.",
    ].join("\n");
    expect(description.length).toBeLessThanOrEqual(PRINTED_ENTRY_MAX_CHARS);

    await printTicketsPdf(
      request({
        purchasedByOrganizationName: nmState.organization.name,
        tickets: [
          {
            id: 1,
            checkInCode: "NMS-1",
            sectionNumber: "101",
            rowNumber: "A",
            seatNumber: 4,
            offer: { name: "Club", description },
          },
        ],
      }),
    );

    const text = await pdfPageText(blobs[0]);
    expect(text).toContain("Enter Gate C.");
    expect(text).toContain("Show your wristband.");
    expect(text).toContain("No re-entry after the first period.");
    expect(text).not.toContain("Club door only.");
    expect(text).toContain(eventTime);
    expect(text).toContain(nmState.organization.name);
  });

  it("drops a third section line and still prints the ticket", async () => {
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const sectionNumber = [
      "Lower Level Champions Club",
      "Party Deck West Suite",
      "Entrance Gate C",
    ].join("\n");
    expect(sectionNumber.length).toBeLessThanOrEqual(PRINTED_SECTION_MAX_CHARS);

    await printTicketsPdf(
      request({
        tickets: [
          {
            id: 1,
            checkInCode: "NMS-1",
            generalAdmission: false,
            sectionNumber,
            rowNumber: "A",
            seatNumber: 14,
          },
        ],
      }),
    );

    const text = await pdfPageText(blobs[0]);
    expect(text).toContain("Lower Level Champions Club");
    expect(text).toContain("Party Deck West Suite");
    expect(text).not.toContain("Entrance Gate C");
    expect(text).toContain(eventTime);
  });

  it("still prints when a description is longer than the card", async () => {
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    await printTicketsPdf(
      request({
        tickets: [
          {
            id: 1,
            checkInCode: "NMS-1",
            sectionNumber: "101",
            rowNumber: "A",
            seatNumber: 4,
            offer: { name: "Club", description: "A".repeat(PRINTED_ENTRY_MAX_CHARS + 1) },
          },
        ],
      }),
    );

    const text = await pdfPageText(blobs[0]);
    expect(text).toContain(nmState.name);
    expect(text).toContain(eventTime);
    expect(entryLabels(text)).toBe(1);
  });

  it("strips markup from entry instructions", async () => {
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const vip = demoTicketGroups().ticketGroups.find((group) => group.id === "grp-vip");
    if (!vip?.offer || !("description" in vip.offer) || !vip.offer.description) {
      throw new Error("VIP fixture is missing its offer description");
    }

    await printTicketsPdf(
      request({
        tickets: [
          {
            id: 1,
            checkInCode: "NMS-1",
            sectionNumber: "101",
            rowNumber: "B",
            seatNumber: 2,
            offer: [
              {
                name: vip.offer.name,
                description: `<script>alert(1)</script>${vip.offer.description}`,
              },
            ],
          },
        ],
      }),
    );

    const text = await pdfPageText(blobs[0]);
    expect(text).toContain(vip.offer.description);
    expect(text).not.toContain("script");
    expect(text).not.toContain("alert");
  });

  it("wraps the accessibility label onto more lines instead of cutting it off", async () => {
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    await printTicketsPdf(
      request({
        tickets: [
          {
            id: 1,
            checkInCode: "NMS-1",
            sectionNumber: "101",
            rowNumber: "A",
            seatNumber: 4,
            accessible: true,
            accessibleType: "DA",
          },
        ],
      }),
    );

    const text = await pdfPageText(blobs[0]);
    expect(text).toContain(ACCESSIBLE_LABEL_DA.split(" ").slice(0, 2).join(" "));
    expect(text).toContain("wheelchair");
    expect(text).not.toContain("…");
  });
});
