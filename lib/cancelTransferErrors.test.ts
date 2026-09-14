import { describe, expect, it } from "vitest";
import { FIELD_COPY } from "@/lib/fieldValidation";
import {
  CANCEL_TRANSFER_API_ERROR_MESSAGES,
  parseCancelTransferApiError,
  parseCancelTransferApiResponse,
} from "@/lib/cancelTransferErrors";

function axiosError(status: number, data: unknown) {
  return { response: { status, data } };
}

describe("parseCancelTransferApiResponse", () => {
  it("returns Transfer has already been claimed for 400", () => {
    expect(parseCancelTransferApiResponse({ status: 400, data: {} })).toBe(
      CANCEL_TRANSFER_API_ERROR_MESSAGES.alreadyClaimed,
    );
  });

  it("returns null for success and non-400 responses", () => {
    expect(parseCancelTransferApiResponse({ status: 200, data: {} })).toBeNull();
    expect(parseCancelTransferApiResponse({ status: 226, data: {} })).toBeNull();
  });
});

describe("parseCancelTransferApiError", () => {
  it("returns Transfer has already been claimed for 400", () => {
    expect(
      parseCancelTransferApiError(
        axiosError(400, {
          error: { message: CANCEL_TRANSFER_API_ERROR_MESSAGES.alreadyClaimed },
        }),
      ),
    ).toBe(CANCEL_TRANSFER_API_ERROR_MESSAGES.alreadyClaimed);
    expect(parseCancelTransferApiError(axiosError(400, {}))).toBe(
      CANCEL_TRANSFER_API_ERROR_MESSAGES.alreadyClaimed,
    );
  });

  it("returns could not cancel for other 4xx errors", () => {
    expect(
      parseCancelTransferApiError(
        axiosError(403, {
          error: { message: "You cannot cancel this transfer" },
        }),
      ),
    ).toBe(CANCEL_TRANSFER_API_ERROR_MESSAGES.couldNotCancel);
    expect(parseCancelTransferApiError(axiosError(402, {}))).toBe(
      CANCEL_TRANSFER_API_ERROR_MESSAGES.couldNotCancel,
    );
  });

  it("returns the network fallback for server and offline errors", () => {
    expect(
      parseCancelTransferApiError(
        axiosError(500, { error: { message: "Internal Server Error" } }),
      ),
    ).toBe(FIELD_COPY.network);
    expect(parseCancelTransferApiError(new Error("offline"))).toBe(
      FIELD_COPY.network,
    );
  });
});
