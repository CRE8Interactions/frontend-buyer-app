import { describe, expect, it } from "vitest";
import {
  transferAcceptConfirmCopy,
  transferCancelReturnCopy,
  transferConfirmTitle,
  transferEntityNoun,
  transferKindFromWalletRow,
  transferLoadingTitle,
  transferModalDetailLines,
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
    expect(transferWalletRemovalCopy("ticket", 1)).toBe(
      "This ticket leaves your wallet right away. You can cancel any time before it's claimed.",
    );
    expect(transferWalletRemovalCopy("ticket", 2)).toBe(
      "These tickets leave your wallet right away. You can cancel any time before they're claimed.",
    );
    expect(transferConfirmTitle("ticket", 1)).toBe(
      "You are about to transfer 1 ticket",
    );
    expect(transferConfirmTitle("ticket", 2)).toBe(
      "You are about to transfer 2 tickets",
    );
    expect(transferCancelReturnCopy("ticket", 1)).toBe(
      "Cancelling this transfer returns this ticket to your wallet and removes it from the recipient's account. If the recipient has claimed the transfer already, it can't be cancelled.",
    );
    expect(transferCancelReturnCopy("ticket", 2)).toBe(
      "Cancelling this transfer returns these tickets to your wallet and removes them from the recipient's account. If the recipient has claimed the transfer already, it can't be cancelled.",
    );
    expect(transferAcceptConfirmCopy("ticket", 1)).toBe(
      "Accepting this transfer adds this ticket to your wallet. Once accepted, the transfer is final and can't be undone.",
    );
    expect(transferAcceptConfirmCopy("ticket", 2)).toBe(
      "Accepting this transfer adds these tickets to your wallet. Once accepted, the transfer is final and can't be undone.",
    );
    expect(transferSuccessTitle("ticket", 1)).toBe(
      "Your ticket has been transferred",
    );
    expect(transferSuccessTitle("ticket", 2)).toBe(
      "Your tickets have been transferred",
    );
    expect(transferSuccessBody("ticket", 1, "amy@example.com")).toBe(
      "Sent to amy@example.com. You can cancel from My transfers until they claim it.",
    );
    expect(transferSuccessBody("ticket", 2, "amy@example.com")).toBe(
      "Sent to amy@example.com. You can cancel from My transfers until they claim them.",
    );
    expect(transferLoadingTitle("ticket", 2)).toBe(
      "Transferring your tickets…",
    );
    expect(transferKindFromWalletRow({ ticketCount: 2 })).toEqual({
      kind: "ticket",
      count: 2,
    });
    expect(
      transferKindFromWalletRow({
        seatLines: ["Sec A · Row 1 · Seat 1", "Sec A · Row 1 · Seat 2"],
      }),
    ).toEqual({ kind: "ticket", count: 2 });
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
        passSeat: "GA",
      }),
    ).toBe("All-access");
    expect(transferWalletRemovalCopy("season pass")).toBe(
      "This season pass leaves your wallet right away. You can cancel any time before it's claimed.",
    );
    expect(transferWalletRemovalCopy("access pass")).toBe(
      "This access pass leaves your wallet right away. You can cancel any time before it's claimed.",
    );
    expect(transferConfirmTitle("season pass")).toBe(
      "You are about to transfer 1 season pass",
    );
    expect(transferConfirmTitle("access pass")).toBe(
      "You are about to transfer 1 access pass",
    );
    expect(transferSuccessTitle("season pass")).toBe(
      "Your season pass has been transferred",
    );
    expect(transferSuccessTitle("access pass")).toBe(
      "Your access pass has been transferred",
    );
    expect(transferCancelReturnCopy("season pass", 1)).toBe(
      "Cancelling this transfer returns this season pass to your wallet and removes it from the recipient's account. If the recipient has claimed the transfer already, it can't be cancelled.",
    );
    expect(transferCancelReturnCopy("access pass", 1)).toBe(
      "Cancelling this transfer returns this access pass to your wallet and removes it from the recipient's account. If the recipient has claimed the transfer already, it can't be cancelled.",
    );
    expect(transferAcceptConfirmCopy("season pass", 1)).toBe(
      "Accepting this transfer adds this season pass to your wallet. Once accepted, the transfer is final and can't be undone.",
    );
    expect(
      transferKindFromWalletRow({
        passKind: "season pass",
        seatLines: ["1 Season pass"],
      }),
    ).toEqual({ kind: "season pass", count: 1 });
    expect(
      transferModalDetailLines({
        passKind: "season pass",
        seatLines: ["Sec M · Row M3 · Seat 21"],
        eventCount: 5,
        from: "sender@example.com",
        on: "Sep 11, 2026",
        schedule: "5 events",
      }),
    ).toEqual({
      seats: "Sec M · Row M3 · Seat 21",
      when: undefined,
      games: "5 games",
      remaining: undefined,
      from: "From sender@example.com · Sent Sep 11, 2026",
    });
    expect(
      transferModalDetailLines({
        passKind: "access pass",
        seatLines: ["1 Access pass"],
        eventCount: 3,
        remainingCount: 3,
        from: "sender@example.com",
        on: "Sep 10, 2026",
        schedule: "3 games",
      }),
    ).toEqual({
      seats: undefined,
      when: undefined,
      games: "3 games",
      remaining: undefined,
      from: "From sender@example.com · Sent Sep 10, 2026",
    });
    expect(
      transferModalDetailLines({
        seatLines: ["Sec A · Row 1 · Seat 12"],
        from: "sender@example.com",
        on: "Sep 11, 2026",
        schedule: "Fri, Oct 30, 2026 7:00 PM",
      }),
    ).toEqual({
      seats: "Sec A · Row 1 · Seat 12",
      when: "Fri, Oct 30, 2026 7:00 PM",
      games: undefined,
      remaining: undefined,
      from: "From sender@example.com · Sent Sep 11, 2026",
    });
    expect(
      transferModalDetailLines({
        to: "recipient@example.com",
        on: "Sep 11, 2026",
        direction: "sent",
        schedule: "Fri, Oct 30, 2026 7:00 PM",
        seatLines: ["Sec A · Row 1 · Seat 12"],
      }),
    ).toEqual({
      seats: "Sec A · Row 1 · Seat 12",
      when: "Fri, Oct 30, 2026 7:00 PM",
      games: undefined,
      remaining: undefined,
      from: "Sent to recipient@example.com · Sep 11, 2026",
    });
  });

  it("tells the recipient they will be emailed to claim the tickets", () => {
    expect(transferRecipientNotifyCopy("ticket", 1)).toBe(
      "We'll send them an email to claim the ticket in their Blocktickets account.",
    );
    expect(transferRecipientNotifyCopy("ticket", 2)).toBe(
      "We'll send them an email to claim the tickets in their Blocktickets account.",
    );
    expect(transferRecipientNotifyCopy("ticket", 4)).toBe(
      "We'll send them an email to claim the tickets in their Blocktickets account.",
    );
    expect(transferRecipientNotifyCopy("season pass")).toBe(
      "We'll send them an email to claim the season pass in their Blocktickets account.",
    );
    expect(transferRecipientNotifyCopy("access pass")).toBe(
      "We'll send them an email to claim the access pass in their Blocktickets account.",
    );
    expect(transferRecipientReceivedCopy("ticket", 1)).toBe(
      "The recipient has received an email that you have transferred your ticket to them.",
    );
    expect(transferRecipientReceivedCopy("ticket", 2)).toContain(
      "your tickets",
    );
    expect(transferLoadingTitle("ticket", 1)).toBe("Transferring your ticket…");
    expect(transferSuccessBody("season pass", 1, "amy@example.com")).toBe(
      "Sent to amy@example.com. You can cancel from My transfers until they claim it.",
    );
  });
});
