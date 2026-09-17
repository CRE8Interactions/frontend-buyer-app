import { describe, expect, it } from "vitest";
import { FIELD_COPY } from "@/lib/fieldValidation";
import {
  TICKET_TRANSFER_API_ERROR_MESSAGES,
  TICKET_TRANSFER_DISPLAY_COPY,
  parseTicketTransferApiError,
  ticketTransferAssignedCopy,
  ticketTransferScannedCopy,
} from "@/lib/ticketTransferErrors";

function axiosError(status: number, data: unknown) {
  return { response: { status, data } };
}

describe("ticketTransferAssignedCopy", () => {
  it("names one ticket in the singular", () => {
    expect(ticketTransferAssignedCopy(1)).toBe(
      "This ticket is already assigned to this email address.",
    );
  });

  it("names several tickets in the plural", () => {
    expect(ticketTransferAssignedCopy(2)).toBe(
      "These tickets are already assigned to this email address.",
    );
  });
});

describe("ticketTransferScannedCopy", () => {
  it("names one ticket in the singular", () => {
    expect(ticketTransferScannedCopy(1)).toBe(
      "This ticket has already been scanned and can't be transferred.",
    );
  });

  it("names several tickets in the plural", () => {
    expect(ticketTransferScannedCopy(2)).toBe(
      "These tickets have already been scanned and can't be transferred.",
    );
  });
});

describe("parseTicketTransferApiError", () => {
  it("returns scanned and assigned copy for mapped 402 responses", () => {
    expect(
      parseTicketTransferApiError(
        axiosError(402, {
          error: {
            message: TICKET_TRANSFER_API_ERROR_MESSAGES.alreadyScanned,
          },
        }),
        1,
      ),
    ).toBe(ticketTransferScannedCopy(1));
    expect(
      parseTicketTransferApiError(
        axiosError(402, {
          error: {
            message: TICKET_TRANSFER_API_ERROR_MESSAGES.alreadyScanned,
          },
        }),
        2,
      ),
    ).toBe(ticketTransferScannedCopy(2));
    expect(
      parseTicketTransferApiError(
        axiosError(402, {
          error: {
            message: TICKET_TRANSFER_API_ERROR_MESSAGES.alreadyAssigned,
          },
        }),
        1,
      ),
    ).toBe(ticketTransferAssignedCopy(1));
    expect(
      parseTicketTransferApiError(
        axiosError(402, {
          error: {
            message: TICKET_TRANSFER_API_ERROR_MESSAGES.alreadyAssigned,
          },
        }),
        3,
      ),
    ).toBe(ticketTransferAssignedCopy(3));
  });

  it("returns the ticket fallback for other 402s and network copy otherwise", () => {
    expect(
      parseTicketTransferApiError(
        axiosError(402, { error: { message: "Unknown ticket transfer error" } }),
      ),
    ).toBe(TICKET_TRANSFER_DISPLAY_COPY.failed);
    expect(parseTicketTransferApiError(axiosError(500, {}))).toBe(
      FIELD_COPY.network,
    );
    expect(parseTicketTransferApiError(new Error("offline"))).toBe(
      FIELD_COPY.network,
    );
  });
});
