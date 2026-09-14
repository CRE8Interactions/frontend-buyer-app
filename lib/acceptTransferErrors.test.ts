import { describe, expect, it } from "vitest";
import { FIELD_COPY } from "@/lib/fieldValidation";
import {
  ACCEPT_TRANSFER_API_ERROR_MESSAGES,
  parseAcceptTransferApiError,
  parseAcceptTransferApiResponse,
} from "@/lib/acceptTransferErrors";

function axiosError(status: number, data: unknown) {
  return { response: { status, data } };
}

describe("parseAcceptTransferApiResponse", () => {
  it("returns Transfer has already been claimed for 226", () => {
    expect(parseAcceptTransferApiResponse({ status: 226, data: {} })).toBe(
      ACCEPT_TRANSFER_API_ERROR_MESSAGES.alreadyClaimed,
    );
  });

  it("returns null for success and non-226 responses", () => {
    expect(parseAcceptTransferApiResponse({ status: 200, data: {} })).toBeNull();
    expect(parseAcceptTransferApiResponse({ status: 400, data: {} })).toBeNull();
  });
});

describe("parseAcceptTransferApiError", () => {
  it("returns Transfer has already been claimed for 226", () => {
    expect(
      parseAcceptTransferApiError(
        axiosError(226, {
          error: { message: ACCEPT_TRANSFER_API_ERROR_MESSAGES.alreadyClaimed },
        }),
      ),
    ).toBe(ACCEPT_TRANSFER_API_ERROR_MESSAGES.alreadyClaimed);
    expect(parseAcceptTransferApiError(axiosError(226, {}))).toBe(
      ACCEPT_TRANSFER_API_ERROR_MESSAGES.alreadyClaimed,
    );
  });

  it("returns could not accept for other 4xx errors", () => {
    expect(
      parseAcceptTransferApiError(
        axiosError(400, {
          error: { message: ACCEPT_TRANSFER_API_ERROR_MESSAGES.alreadyClaimed },
        }),
      ),
    ).toBe(ACCEPT_TRANSFER_API_ERROR_MESSAGES.couldNotAccept);
    expect(
      parseAcceptTransferApiError(
        axiosError(400, { error: { message: "Transfer not found" } }),
      ),
    ).toBe(ACCEPT_TRANSFER_API_ERROR_MESSAGES.couldNotAccept);
    expect(parseAcceptTransferApiError(axiosError(402, {}))).toBe(
      ACCEPT_TRANSFER_API_ERROR_MESSAGES.couldNotAccept,
    );
  });

  it("returns the network fallback for server and offline errors", () => {
    expect(parseAcceptTransferApiError(axiosError(500, {}))).toBe(
      FIELD_COPY.network,
    );
    expect(parseAcceptTransferApiError(new Error("offline"))).toBe(
      FIELD_COPY.network,
    );
  });
});
