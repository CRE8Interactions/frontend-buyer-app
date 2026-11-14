/** Baselines measured down from the bottom of the ticket header. */
export const EXTENDED_TICKET_LAYOUT = {
  date: 22,
  time: 50,
  venue: 78,
  entryLabel: 100,
  entryFirst: 112,
  entryLeading: 10,
  entrySize: 8,
  entryMaxLines: 3,
  labelAbove: 14,
  sectionSize: 10,
  sectionLeading: 12,
  sectionMaxLines: 2,
  seatBoxYOffset: 20,
  seatBoxHeight: 52,
  standardSeatBoxYOffset: 28,
} as const;

export const PRINTED_ENTRY_MAX_CHARS = 180;
export const PRINTED_SECTION_MAX_CHARS = 80;

const WIN_ANSI_EXTRAS = new Set([
  0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160,
  0x2039, 0x0152, 0x017d, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014,
  0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x017e, 0x0178,
]);

export type MeasureWeight = "regular" | "bold";
export type MeasureText = (text: string, size: number, weight: MeasureWeight) => number;

export type PrintedTicketPlan = {
  extended: boolean;
  entryLines: string[];
  sectionPlacement: "column" | "above";
  sectionLines: string[];
  sectionSize: number;
  offerSize: number;
  offerText: string;
};

type EntryTicket = {
  offer?: { description?: unknown } | Array<{ description?: unknown }> | null;
  offerDescription?: unknown;
};

/** Offer copy that prints as entry instructions. The first array offer counts. */
export function ticketEntrySource(ticket: EntryTicket | null | undefined) {
  const raw = ticket?.offer;
  const offer = Array.isArray(raw) ? raw[0] : raw;
  return String(offer?.description ?? ticket?.offerDescription ?? "");
}

function sanitizeTicketText(
  value: unknown,
  options: { preserveNewlines?: boolean } = {},
) {
  const withoutTags = String(value ?? "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ");
  let output = "";
  for (const char of withoutTags) {
    const code = char.codePointAt(0) || 0;
    if (options.preserveNewlines && (char === "\n" || char === "\r")) {
      output += "\n";
      continue;
    }
    if (
      (code >= 0x20 && code <= 0x7e) ||
      (code >= 0xa0 && code <= 0xff) ||
      WIN_ANSI_EXTRAS.has(code)
    ) {
      output += char;
    } else if (/\s/.test(char)) {
      output += " ";
    }
  }
  if (!options.preserveNewlines) return output.replace(/\s+/g, " ").trim();
  return output
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function ellipsisToWidth(
  text: string,
  size: number,
  weight: MeasureWeight,
  maxWidth: number,
  measure: MeasureText,
) {
  if (!text || measure(text, size, weight) <= maxWidth) return text;
  let low = 0;
  let high = text.length;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (measure(`${text.slice(0, middle)}…`, size, weight) <= maxWidth) low = middle;
    else high = middle - 1;
  }
  return low ? `${text.slice(0, low)}…` : "…";
}

function wrapParagraph(
  paragraph: string,
  size: number,
  weight: MeasureWeight,
  maxWidth: number,
  measure: MeasureText,
) {
  const lines: string[] = [];
  let current = "";
  for (const word of paragraph.split(" ").filter(Boolean)) {
    const next = current ? `${current} ${word}` : word;
    if (measure(next, size, weight) <= maxWidth) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    if (measure(word, size, weight) <= maxWidth) {
      current = word;
      continue;
    }
    let remainder = word;
    current = "";
    while (remainder) {
      let take = remainder.length;
      while (take > 1 && measure(remainder.slice(0, take), size, weight) > maxWidth) {
        take -= 1;
      }
      lines.push(remainder.slice(0, take));
      remainder = remainder.slice(take);
    }
  }
  if (current) lines.push(current);
  return lines;
}

function wrapTicketText(
  value: unknown,
  size: number,
  weight: MeasureWeight,
  maxWidth: number,
  maxLines: number,
  measure: MeasureText,
) {
  const source = sanitizeTicketText(value, { preserveNewlines: true });
  const paragraphs = source
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const lines = paragraphs.flatMap((paragraph) =>
    wrapParagraph(paragraph, size, weight, maxWidth, measure),
  );
  if (lines.length <= maxLines) return { lines, fits: true };
  const kept = lines.slice(0, maxLines);
  const last = ellipsisToWidth(kept[maxLines - 1], size, weight, maxWidth, measure);
  kept[maxLines - 1] = last.endsWith("…") ? last : `${last}…`;
  return { lines: kept, fits: false };
}

function seatColumnSize(value: string) {
  return value.length > 8 ? 11 : value.length > 4 ? 14 : 16;
}

function sectionStaysInColumn(value: string, measure: MeasureText, columnWidth: number) {
  const text = sanitizeTicketText(value);
  if (!text || text === "—" || text === "General Admission") return true;
  return measure(text, seatColumnSize(text), "bold") <= columnWidth;
}

function fitOfferLine(label: string, maxWidth: number, measure: MeasureText) {
  const text = sanitizeTicketText(label);
  if (!text) return { offerText: "", offerSize: 11 };
  for (let size = 11; size >= 8; size -= 0.5) {
    if (measure(text, size, "regular") <= maxWidth) {
      return { offerText: text, offerSize: size };
    }
  }
  return {
    offerText: ellipsisToWidth(text, 8, "regular", maxWidth, measure),
    offerSize: 8,
  };
}

function fitSectionLines(value: string, width: number, measure: MeasureText) {
  const text = sanitizeTicketText(value, { preserveNewlines: true });
  for (const size of [10, 9, 8]) {
    const wrapped = wrapTicketText(
      text,
      size,
      "bold",
      width,
      EXTENDED_TICKET_LAYOUT.sectionMaxLines,
      measure,
    );
    if (wrapped.fits) return { lines: wrapped.lines, size };
  }
  // A name at or under the character limit can still need more than two lines
  // when breaks are kept. Print the lines that fit instead of failing the PDF.
  const fallback = wrapTicketText(
    text,
    8,
    "bold",
    width,
    EXTENDED_TICKET_LAYOUT.sectionMaxLines,
    measure,
  );
  return { lines: fallback.lines, size: 8 };
}

export function planPrintedTicketDetails(input: {
  sectionValue: unknown;
  entrySource: unknown;
  offerLabel: unknown;
  measure: MeasureText;
  entryWidth: number;
  sectionWidth: number;
  offerMaxWidth: number;
  seatColumnWidth?: number;
}): PrintedTicketPlan {
  const seatColumnWidth = input.seatColumnWidth ?? 60;
  const sectionValue = String(input.sectionValue ?? "");
  const inColumn = sectionStaysInColumn(sectionValue, input.measure, seatColumnWidth);
  const section = inColumn
    ? {
        lines: [sanitizeTicketText(sectionValue) || "—"],
        size: seatColumnSize(sectionValue),
      }
    : fitSectionLines(sectionValue, input.sectionWidth, input.measure);

  const entrySource = String(input.entrySource ?? "");
  let entryLines: string[] = [];
  const entryText = sanitizeTicketText(entrySource, { preserveNewlines: true });
  if (entryText) {
    const wrapped = wrapTicketText(
      entryText,
      EXTENDED_TICKET_LAYOUT.entrySize,
      "regular",
      input.entryWidth,
      EXTENDED_TICKET_LAYOUT.entryMaxLines,
      input.measure,
    );
    // Descriptions the offer form accepts can still exceed three lines when
    // breaks are kept. Truncate to the card instead of failing the PDF.
    if (wrapped.fits || entrySource.length <= PRINTED_ENTRY_MAX_CHARS) {
      entryLines = wrapped.lines;
    }
  }

  const offer = fitOfferLine(
    String(input.offerLabel ?? ""),
    input.offerMaxWidth,
    input.measure,
  );

  return {
    extended: entryLines.length > 0 || !inColumn,
    entryLines,
    sectionPlacement: inColumn ? "column" : "above",
    sectionLines: section.lines,
    sectionSize: section.size,
    offerSize: offer.offerSize,
    offerText: offer.offerText,
  };
}
