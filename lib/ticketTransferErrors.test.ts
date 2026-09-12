import { describe, expect, it } from "vitest";
import { FIELD_COPY } from "@/lib/fieldValidation";
import {
  TICKET_TRANSFER_API_ERROR_MESSAGES,
  TICKET_TRANSFER_DISPLAY_COPY,
  parseTicketTransferApiError,
} from "@/lib/ticketTransferErrors";

function axiosError(status: number, data: unknown) {
  return { response: { status, data } };
}

describe("parseTicketTransferApiError", () => {
  it("returns scanned and assigned copy for mapped 402 responses", () => {
    expect(
      parseTicketTransferApiError(
        axiosError(402, {
          error: {
            message: TICKET_TRANSFER_API_ERROR_MESSAGES.alreadyScanned,
          },
        }),
      ),
    ).toBe(TICKET_TRANSFER_DISPLAY_COPY.scanned);
    expect(
      parseTicketTransferApiError(
        axiosError(402, {
          error: {
            message: TICKET_TRANSFER_API_ERROR_MESSAGES.alreadyAssigned,
          },
        }),
      ),
    ).toBe(TICKET_TRANSFER_DISPLAY_COPY.assigned);
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
