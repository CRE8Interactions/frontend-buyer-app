import { describe, expect, it } from "vitest";
import {
  transferCancelReturnCopy,
  transferConfirmTitle,
  transferEntityNoun,
  transferKindFromWalletRow,
  transferLoadingTitle,
  transferRecipientDescriptor,
  transferRecipientNotifyCopy,
  transferRecipientReceivedCopy,
  transferSuccessBody,
  transferSuccessTitle,
  transferThisThese,
  transferWalletRemovalCopy,
} from "@/lib/transferModalCopy";

describe("transfer modal copy", () => {
  it("names tickets in the singular or plural from the count", () => {
    expect(transferEntityNoun("ticket", 1)).toBe("ticket");
    expect(transferEntityNoun("ticket", 2)).toBe("tickets");
    expect(transferThisThese("ticket", 1)).toBe("this ticket");
    expect(transferThisThese("ticket", 2)).toBe("these tickets");
    expect(transferRecipientDescriptor("ticket", { count: 1 })).toBe(
      "this ticket",
    );
    expect(transferRecipientDescriptor("ticket", { count: 2 })).toBe(
      "these tickets",
    );
    expect(transferWalletRemovalCopy("ticket", 1)).toMatch(/^This ticket /);
    expect(transferWalletRemovalCopy("ticket", 2)).toMatch(/^These tickets /);
    expect(transferConfirmTitle("ticket", 1)).toBe(
      "You are about to transfer 1 ticket",
    );
    expect(transferConfirmTitle("ticket", 2)).toBe(
      "You are about to transfer 2 tickets",
    );
    expect(transferCancelReturnCopy("ticket", 1)).toBe(
      "Cancelling the transfer returns this ticket to your wallet and removes it from the recipient's account. If the recipient has claimed the transfer already, it can't be cancelled.",
    );
    expect(transferCancelReturnCopy("ticket", 2)).toBe(
      "Cancelling the transfer returns these tickets to your wallet and removes them from the recipient's account. If the recipient has claimed the transfer already, it can't be cancelled.",
    );
    expect(transferKindFromWalletRow({ ticketCount: 2 })).toEqual({
      kind: "ticket",
      count: 2,
    });
  });

  it("names a season or access pass instead of a ticket", () => {
    expect(transferEntityNoun("season pass")).toBe("season pass");
    expect(transferEntityNoun("access pass")).toBe("access pass");
    expect(
      transferRecipientDescriptor("season pass", {
        passName: "NMS Football Season Seats - Tier D",
        passSeat: "Sec R · Row 25 · Seat 11",
      }),
    ).toBe("NMS Football Season Seats - Tier D · Sec R · Row 25 · Seat 11");
    expect(
      transferRecipientDescriptor("access pass", {
        passName: "All-access",
        passSeat: "Ticket",
      }),
    ).toBe("All-access");
    expect(transferWalletRemovalCopy("season pass")).toMatch(
      /^The season pass /,
    );
    expect(transferWalletRemovalCopy("access pass")).toMatch(
      /^The access pass /,
    );
    expect(transferSuccessTitle("season pass")).toBe(
      "Season pass transfer pending",
    );
    expect(transferSuccessTitle("access pass")).toBe(
      "Access pass transfer pending",
    );
    expect(transferCancelReturnCopy("season pass", 1)).toBe(
      "Cancelling the transfer returns this season pass to your wallet and removes it from the recipient's account. If the recipient has claimed the transfer already, it can't be cancelled.",
    );
    expect(transferCancelReturnCopy("access pass", 1)).toBe(
      "Cancelling the transfer returns this access pass to your wallet and removes it from the recipient's account. If the recipient has claimed the transfer already, it can't be cancelled.",
    );
    expect(
      transferKindFromWalletRow({
        passKind: "season pass",
        seatLines: ["1 Season pass"],
      }),
    ).toEqual({ kind: "season pass", count: 1 });
  });

  it("tells the recipient they will be emailed about the transferred entity", () => {
    expect(transferRecipientNotifyCopy("ticket", 1)).toContain("your ticket");
    expect(transferRecipientNotifyCopy("ticket", 2)).toContain("your tickets");
    expect(transferRecipientNotifyCopy("season pass")).toContain(
      "your season pass",
    );
    expect(transferRecipientReceivedCopy("ticket", 1)).toBe(
      "The recipient has received an email that you have transferred your ticket to them.",
    );
    expect(transferRecipientReceivedCopy("ticket", 2)).toContain(
      "your tickets",
    );
    expect(transferLoadingTitle("ticket", 1)).toBe("Transferring your ticket…");
    expect(transferSuccessBody("ticket", 1)).toContain(
      "pending until the recipient claims it",
    );
    expect(transferSuccessBody("ticket", 1)).not.toMatch(/@/);
    expect(transferSuccessBody("season pass", 1)).toContain(
      "The season pass left your wallet",
    );
  });
});
