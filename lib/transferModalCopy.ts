import {
  formatAccessPassRemainingLine,
  formatTransferredGamesLine,
  transferPartyDateLine,
} from "@/lib/ticketTransfers";

export type TransferModalKind = "ticket" | "season pass" | "access pass";

export function transferEntityNoun(
  kind: TransferModalKind,
  count = 1,
): string {
  if (kind === "season pass" || kind === "access pass") return kind;
  return count === 1 ? "ticket" : "tickets";
}

export function transferThisThese(
  kind: TransferModalKind,
  count = 1,
): string {
  if (kind === "season pass" || kind === "access pass") return `the ${kind}`;
  return count === 1 ? "this ticket" : "these tickets";
}

/** Recipient-screen identity: this/these tickets, or pass name · seat. */
export function transferRecipientDescriptor(
  kind: TransferModalKind,
  {
    count = 1,
    passName,
    passSeat,
  }: {
    count?: number;
    passName?: string;
    passSeat?: string;
  } = {},
): string {
  if (kind === "ticket") return transferThisThese(kind, count);
  const name = String(passName || "").trim();
  if (kind === "access pass") return name;
  const seat = String(passSeat || "").trim();
  const seatLine = seat && seat !== "Ticket" ? seat : "";
  return [name, seatLine].filter(Boolean).join(" · ");
}

export function transferRecipientNotifyCopy(
  kind: TransferModalKind,
  count = 1,
): string {
  return `The recipient will get notified via email that you have transferred your ${transferEntityNoun(kind, count)} to them.`;
}

export function transferRecipientReceivedCopy(
  kind: TransferModalKind,
  count = 1,
): string {
  return `The recipient has received an email that you have transferred your ${transferEntityNoun(kind, count)} to them.`;
}

export function transferWalletRemovalCopy(
  kind: TransferModalKind,
  count = 1,
): string {
  if (kind === "ticket") {
    return count === 1
      ? "This ticket leaves your wallet right away and returns only if you cancel the transfer before it's claimed."
      : "These tickets leave your wallet right away and return only if you cancel the transfer before they're claimed.";
  }
  return `The ${kind} leaves your wallet right away and returns only if you cancel the transfer before it's claimed.`;
}

export function transferConfirmTitle(
  kind: TransferModalKind,
  count = 1,
): string {
  if (kind === "ticket") {
    return `You are about to transfer ${count} ${count === 1 ? "ticket" : "tickets"}`;
  }
  return `You are about to transfer this ${kind}`;
}

export function transferLoadingTitle(
  kind: TransferModalKind,
  count = 1,
): string {
  return `Transferring your ${transferEntityNoun(kind, count)}…`;
}

export function transferSuccessTitle(
  kind: TransferModalKind,
  count = 1,
): string {
  if (kind === "season pass") return "Season pass transfer pending";
  if (kind === "access pass") return "Access pass transfer pending";
  return count === 1 ? "Transfer sent" : "Transfers sent";
}

export function transferCancelEntity(
  kind: TransferModalKind,
  count = 1,
): string {
  if (kind === "season pass" || kind === "access pass") return `this ${kind}`;
  return count === 1 ? "this ticket" : "these tickets";
}

export function transferKindFromWalletRow(row: {
  id?: string;
  accessPassId?: string;
  passKind?: TransferModalKind;
  ticketCount?: number;
  seat?: string;
  seatLines?: string[];
}): { kind: TransferModalKind; count: number } {
  if (row.passKind === "season pass" || row.passKind === "access pass") {
    return { kind: row.passKind, count: 1 };
  }
  const lines = (row.seatLines?.length ? row.seatLines : row.seat ? [row.seat] : [])
    .map((line) => String(line || "").trim())
    .filter(Boolean);
  const joined = lines.join(" ").toLowerCase();
  const isPass =
    Boolean(row.accessPassId) ||
    /^access-pass-transfer-/.test(String(row.id || "")) ||
    joined.includes("season pass") ||
    joined.includes("access pass");
  if (isPass) {
    return {
      kind: joined.includes("season pass") ? "season pass" : "access pass",
      count: 1,
    };
  }
  return {
    kind: "ticket",
    count: Math.max(1, row.ticketCount || lines.length || 1),
  };
}

export function transferModalDetailLines(row: {
  passKind?: TransferModalKind;
  seat?: string;
  seatLines?: string[];
  from?: string;
  to?: string;
  on?: string;
  direction?: "sent" | "received";
  eventCount?: number;
  remainingCount?: number;
  when?: string;
  schedule?: string;
}): {
  seats?: string;
  when?: string;
  games?: string;
  remaining?: string;
  from?: string;
} {
  const kind = row.passKind;
  const rawSeats = (
    row.seatLines?.length ? row.seatLines : row.seat ? [row.seat] : []
  )
    .map((line) => String(line || "").trim())
    .filter(Boolean)
    .filter(
      (line) =>
        !/^1 Access pass$/i.test(line) && !/^1 Season pass$/i.test(line),
    );
  const seats =
    kind === "access pass" || rawSeats.length === 0
      ? undefined
      : rawSeats.join(" · ");
  const when =
    kind === "season pass" || kind === "access pass"
      ? undefined
      : String(row.when || row.schedule || "").trim() || undefined;
  const games =
    (kind === "season pass" || kind === "access pass") &&
    (row.eventCount ?? 0) > 0
      ? formatTransferredGamesLine(row.eventCount ?? 0) || undefined
      : undefined;
  const remaining =
    kind === "access pass" && !games
      ? formatAccessPassRemainingLine(
          row.remainingCount ?? 0,
          row.eventCount ?? 0,
        ) || undefined
      : undefined;
  const direction = row.direction ?? (row.to ? "sent" : "received");
  const from =
    transferPartyDateLine({
      direction,
      email: direction === "sent" ? row.to : row.from,
      on: row.on,
    }) || undefined;
  return { seats, when, games, remaining, from };
}

export function transferCancelReturnCopy(
  kind: TransferModalKind,
  count = 1,
): string {
  const entity = transferCancelEntity(kind, count);
  const pronoun = kind === "ticket" && count !== 1 ? "them" : "it";
  return `Cancelling this transfer returns ${entity} to your wallet and removes ${pronoun} from the recipient's account. If the recipient has claimed the transfer already, it can't be cancelled.`;
}

export function transferAcceptConfirmCopy(
  kind: TransferModalKind,
  count = 1,
): string {
  if (kind === "ticket") {
    return count === 1
      ? "Accepting this transfer adds this ticket to your wallet. Once accepted, the transfer is final and can't be undone."
      : "Accepting this transfer adds these tickets to your wallet. Once accepted, the transfer is final and can't be undone.";
  }
  return `Accepting this transfer adds this ${kind} to your wallet. Once accepted, the transfer is final and can't be undone.`;
}

export function transferSuccessBody(
  kind: TransferModalKind,
  count: number,
): string {
  const received = transferRecipientReceivedCopy(kind, count);
  if (kind === "season pass" || kind === "access pass") {
    return `${received} The ${kind} left your wallet. Manage or cancel the transfer from My transfers until the recipient claims it.`;
  }
  if (count === 1) {
    return `${received} The ticket left your wallet and is pending until the recipient claims it. Cancel from My transfers any time before then — once claimed, the transfer can't be cancelled.`;
  }
  return `${received} The tickets left your wallet and are pending until the recipient claims them. Cancel from My transfers any time before then — once claimed, the transfer can't be cancelled.`;
}
