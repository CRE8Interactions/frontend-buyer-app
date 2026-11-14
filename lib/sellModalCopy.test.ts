import { describe, expect, it } from "vitest";
import {
  sellConfirmTitle,
  sellLoadingTitle,
  sellRemoveBody,
  sellRemovalLine,
  sellSuccessBody,
  sellSuccessTitle,
} from "@/lib/sellModalCopy";

describe("sellModalCopy", () => {
  it("uses singular and plural confirm, loading, and success titles", () => {
    expect(sellConfirmTitle(1)).toBe("You are about to list 1 ticket");
    expect(sellConfirmTitle(2)).toBe("You are about to list 2 tickets");
    expect(sellLoadingTitle(1)).toBe("Listing your ticket…");
    expect(sellLoadingTitle(2)).toBe("Listing your tickets…");
    expect(sellSuccessTitle(1)).toBe("Your ticket has been listed");
    expect(sellSuccessTitle(2)).toBe("Your tickets have been listed");
  });

  it("says tickets leave the account and return only if the listing is removed", () => {
    expect(sellRemovalLine(1)).toMatch(/leaves your account right away/);
    expect(sellRemovalLine(2)).toMatch(/leave your account right away/);
    expect(sellSuccessBody(1)).toMatch(/My listings/);
    expect(sellRemoveBody(1)).toMatch(/returns this ticket to your account/);
    expect(sellRemoveBody(2)).toMatch(/returns these tickets to your account/);
  });
});
