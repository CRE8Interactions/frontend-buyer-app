import { describe, expect, it } from "vitest";
import { FIELD_COPY } from "@/lib/fieldValidation";
import {
  CANCEL_TRANSFER_API_ERROR_MESSAGES,
  parseCancelTransferApiError,
} from "@/lib/cancelTransferErrors";

function axiosError(status: number, data: unknown) {
  return { response: { status, data } };
}

describe("parseCancelTransferApiError", () => {
  it("returns the claimed message for a 400 Transfer has been claimed response", () => {
    expect(
      parseCancelTransferApiError(
        axiosError(400, {
          error: { message: CANCEL_TRANSFER_API_ERROR_MESSAGES.transferClaimed },
        }),
      ),
    ).toBe(CANCEL_TRANSFER_API_ERROR_MESSAGES.transferClaimed);
  });

  it("returns the network fallback for server and unknown API errors", () => {
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
