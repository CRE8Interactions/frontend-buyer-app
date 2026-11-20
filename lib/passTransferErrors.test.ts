import { describe, expect, it } from "vitest";
import { FIELD_COPY } from "@/lib/fieldValidation";
import {
  PASS_TRANSFER_API_ERROR_MESSAGES,
  PASS_TRANSFER_DISPLAY_COPY,
  organizationResaleEnabled,
  parsePassTransferApiError,
  seasonPassBlockedTransferCopy,
} from "@/lib/passTransferErrors";

function axiosError(status: number, data: unknown) {
  return { response: { status, data } };
}

describe("parsePassTransferApiError", () => {
  it("returns season-pass transferred copy for unavailable included tickets", () => {
    expect(
      parsePassTransferApiError(
        axiosError(400, {
          error: {
            message: PASS_TRANSFER_API_ERROR_MESSAGES.seasonPassUnavailable,
          },
        }),
        "season pass",
      ),
    ).toBe(PASS_TRANSFER_DISPLAY_COPY.seasonPassTransferred);
    expect(
      parsePassTransferApiError(
        axiosError(400, {
          error: {
            message: PASS_TRANSFER_API_ERROR_MESSAGES.seasonPassUnavailable,
          },
        }),
        "season pass",
        true,
      ),
    ).toBe(PASS_TRANSFER_DISPLAY_COPY.seasonPassTransferredOrResold);
  });

  it("mentions listed only when the organization has resale on", () => {
    expect(seasonPassBlockedTransferCopy(false)).toBe(
      PASS_TRANSFER_DISPLAY_COPY.seasonPassTransferred,
    );
    expect(seasonPassBlockedTransferCopy(true)).toBe(
      PASS_TRANSFER_DISPLAY_COPY.seasonPassTransferredOrResold,
    );
    expect(organizationResaleEnabled({ organization: { enableResale: true } })).toBe(
      true,
    );
    expect(
      organizationResaleEnabled({
        event: null,
        organization: { name: "Houston Bulls" },
        package: {
          organization: { name: "Houston Bulls" },
          events: [
            {
              enableResale: true,
              organization: { setting: { allowResales: true } },
            },
          ],
        },
      }),
    ).toBe(true);
    expect(
      organizationResaleEnabled({
        package: {
          events: [
            {
              enableResale: false,
              organization: { setting: { allowResales: false } },
            },
          ],
        },
      }),
    ).toBe(false);
    expect(organizationResaleEnabled({ package: { organization: {} } })).toBe(
      false,
    );
  });

  it("returns assigned and scanned copy for mapped 402 responses", () => {
    expect(
      parsePassTransferApiError(
        axiosError(402, {
          error: {
            message: PASS_TRANSFER_API_ERROR_MESSAGES.alreadyAssigned,
          },
        }),
        "access pass",
      ),
    ).toBe(PASS_TRANSFER_DISPLAY_COPY.assigned);
    expect(
      parsePassTransferApiError(
        axiosError(402, {
          error: {
            message: PASS_TRANSFER_API_ERROR_MESSAGES.alreadyScanned,
          },
        }),
        "season pass",
      ),
    ).toBe(PASS_TRANSFER_DISPLAY_COPY.scanned);
  });

  it("names the pass kind when the transfer is already pending", () => {
    expect(
      parsePassTransferApiError(
        axiosError(400, {
          error: { message: PASS_TRANSFER_API_ERROR_MESSAGES.accessPassPending },
        }),
        "access pass",
      ),
    ).toBe("This access pass already has a pending transfer.");
    // The API sends the access-pass wording for a season pass too.
    expect(
      parsePassTransferApiError(
        axiosError(400, {
          error: { message: PASS_TRANSFER_API_ERROR_MESSAGES.accessPassPending },
        }),
        "season pass",
      ),
    ).toBe("This season pass already has a pending transfer.");
  });

  it("reuses the shared empty-email copy when the API rejects a missing recipient", () => {
    expect(
      parsePassTransferApiError(
        axiosError(400, {
          error: {
            message: PASS_TRANSFER_API_ERROR_MESSAGES.recipientRequired,
          },
        }),
        "access pass",
      ),
    ).toBe(FIELD_COPY.emailRequired);
  });

  it("returns pass-specific fallback copy for other client errors", () => {
    expect(
      parsePassTransferApiError(
        axiosError(404, {
          error: { message: PASS_TRANSFER_API_ERROR_MESSAGES.notFound },
        }),
        "season pass",
      ),
    ).toBe("Unable to transfer this season pass. Please try again.");
    expect(
      parsePassTransferApiError(
        axiosError(402, { error: { message: "Unknown pass transfer error" } }),
        "access pass",
      ),
    ).toBe("We couldn't transfer this access pass. Please try again.");
  });

  it("returns network copy for server failures", () => {
    expect(parsePassTransferApiError(new Error("offline"), "season pass")).toBe(
      FIELD_COPY.network,
    );
  });
});
