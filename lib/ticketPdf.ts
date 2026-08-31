"use client";

import {
  PDFDocument,
  rgb,
  StandardFonts,
  type PDFFont,
  type PDFImage,
  type PDFPage,
  type RGB,
} from "pdf-lib";
import QRCode from "qrcode";
import { resolveBrandLogo, resolvePrimaryColor } from "@/lib/branding";
import { formatEventWhen } from "@/lib/helpers";
import type { EventLike } from "@/lib/cartEvents";

type PrintableTicket = {
  id?: string | number;
  checkInCode: string;
  holder?: string;
  sectionNumber?: unknown;
  sectionName?: unknown;
  rowNumber?: unknown;
  seatNumber?: unknown;
  generalAdmission?: boolean;
};

export type TicketPdfRequest = {
  event: EventLike;
  tickets: PrintableTicket[];
  packageName?: string;
  filename?: string;
  mode: "open" | "download";
};

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const TICKET_X = 43.2;
const TICKET_W = 525.6;
const TICKET_H = 316.8;
const TICKET_GAP = 20;
const TOP_TICKET_Y = PAGE_HEIGHT - 48 - TICKET_H;
const BOTTOM_TICKET_Y = TOP_TICKET_Y - TICKET_GAP - TICKET_H;
const TICKET_SLOTS = [TOP_TICKET_Y, BOTTOM_TICKET_Y];
const HEADER_H = 64.8;
const STRIPE_W = 13;
const CORNER_R = 14;
const DEFAULT_PRIMARY = "#1A365D";

const CATEGORY_THEMES = {
  sports: { badgeLabel: "SPORTING EVENT", badgeColor: "#E53E3E", bodyTint: "#EBF8FF" },
  theater: { badgeLabel: "THEATER EVENT", badgeColor: "#D69E2E", bodyTint: "#FFFFF0" },
  concert: { badgeLabel: "CONCERT EVENT", badgeColor: "#ED64A6", bodyTint: "#FAF5FF" },
  family: { badgeLabel: "FAMILY EVENT", badgeColor: "#38A169", bodyTint: "#F0FFF4" },
  access: { badgeLabel: "ACCESS PASS", badgeColor: "#9757D7", bodyTint: "#F8F0FF" },
  default: { badgeLabel: "EVENT TICKET", badgeColor: "#3182CE", bodyTint: "#F7FAFC" },
} as const;

function hexToRgb(hex?: string | null, fallback = DEFAULT_PRIMARY): RGB {
  const raw = String(hex || fallback).trim().replace("#", "");
  const normalized =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return hexToRgb(fallback, DEFAULT_PRIMARY);
  const int = Number.parseInt(normalized, 16);
  return rgb(((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255);
}

function lightenHex(hex: string, amount = 0.92) {
  const color = hexToRgb(hex);
  return rgb(
    color.red + (1 - color.red) * amount,
    color.green + (1 - color.green) * amount,
    color.blue + (1 - color.blue) * amount,
  );
}

// Contrast against white and black is equal at this relative luminance.
const CONTRAST_PIVOT = 0.179;

function relativeLuminance(color: RGB) {
  const channel = (value: number) =>
    value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
  return (
    0.2126 * channel(color.red) +
    0.7152 * channel(color.green) +
    0.0722 * channel(color.blue)
  );
}

/**
 * The brand color doubles as a label color on the pale ticket body, where light
 * brands wash out. Step it down until small labels stay legible on that tint.
 */
function accentOn(primary: RGB, maxLuminance = 0.17) {
  let accent = primary;
  for (let i = 0; i < 24 && relativeLuminance(accent) > maxLuminance; i += 1) {
    accent = rgb(accent.red * 0.88, accent.green * 0.88, accent.blue * 0.88);
  }
  return accent;
}

// Glyphs the standard PDF fonts can encode above Latin-1 (WinAnsi specials).
const WIN_ANSI_EXTRAS = new Set([
  0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160,
  0x2039, 0x0152, 0x017d, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014,
  0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x017e, 0x0178,
]);

/**
 * Standard fonts throw on anything WinAnsi cannot encode, so drop unsupported
 * glyphs and flatten whitespace into single spaces for these one-line fields.
 */
function sanitizeText(text: unknown) {
  let output = "";
  for (const char of String(text ?? "")) {
    const code = char.codePointAt(0) ?? 0;
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
  return output.replace(/\s+/g, " ").trim();
}

function fitText(text: unknown, font: PDFFont, size: number, maxWidth: number) {
  const value = sanitizeText(text);
  if (!value) return "";
  if (font.widthOfTextAtSize(value, size) <= maxWidth) return value;
  let low = 0;
  let high = value.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (font.widthOfTextAtSize(`${value.slice(0, mid)}…`, size) <= maxWidth) low = mid;
    else high = mid - 1;
  }
  return low > 0 ? `${value.slice(0, low)}…` : "…";
}

function richTextToPlain(value: unknown) {
  return String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/[*_`>]/g, "");
}

/** Org categories name the sport itself ("Hockey"), not the word "sport". */
const SPORT_WORDS =
  /sport|athletic|football|hockey|baseball|softball|basketball|soccer|rugby|lacrosse|volleyball|tennis|golf|wrestling|boxing|mma|racing/;

export function resolveTicketCategoryKey(categoryName?: string) {
  const name = String(categoryName || "").trim().toLowerCase();
  if (!name) return "default" as const;
  if (SPORT_WORDS.test(name)) return "sports" as const;
  if (name.includes("concert") || name.includes("music")) return "concert" as const;
  if (
    name.includes("theater") ||
    name.includes("theatre") ||
    name.includes("arts") ||
    name.includes("comedy")
  ) {
    return "theater" as const;
  }
  if (name.includes("family")) return "family" as const;
  if (name.includes("access")) return "access" as const;
  return "default" as const;
}

function resolveCategoryName(event: EventLike) {
  return (
    event.category?.name || event.categoryName || event.organization?.category?.name || ""
  );
}

/** Brand colour and category treatment a printed ticket is drawn with. */
export function resolveTicketTheme(event: EventLike) {
  return {
    primaryColor: resolvePrimaryColor(event, event.organization),
    ...CATEGORY_THEMES[resolveTicketCategoryKey(resolveCategoryName(event))],
  };
}

function resolveSubtitle(event: EventLike) {
  if (event.summary) return richTextToPlain(event.summary).trim();
  const attractions = event.attractions;
  if (Array.isArray(attractions) && attractions.length > 0) {
    return attractions
      .map((a) => a?.name)
      .filter(Boolean)
      .join("  •  ");
  }
  return event.subCategory?.name || "";
}

/** Package purchases title the ticket with the package itself; don't repeat it. */
function resolvePackageName(packageName: string | undefined, event: EventLike) {
  const name = String(packageName || "").trim();
  return name === String(event.name || "").trim() ? "" : name;
}

function drawRoundedRect(
  page: PDFPage,
  {
    x,
    y,
    width,
    height,
    radius,
    color,
    borderColor,
    borderWidth = 1,
  }: {
    x: number;
    y: number;
    width: number;
    height: number;
    radius: number;
    color?: RGB;
    borderColor?: RGB;
    borderWidth?: number;
  },
) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  if (color) {
    if (r === 0) {
      page.drawRectangle({ x, y, width, height, color });
    } else {
      page.drawRectangle({ x: x + r, y, width: width - 2 * r, height, color });
      page.drawRectangle({ x, y: y + r, width, height: height - 2 * r, color });
      page.drawCircle({ x: x + r, y: y + r, size: r, color });
      page.drawCircle({ x: x + width - r, y: y + r, size: r, color });
      page.drawCircle({ x: x + r, y: y + height - r, size: r, color });
      page.drawCircle({ x: x + width - r, y: y + height - r, size: r, color });
    }
  }
  if (borderColor) {
    page.drawRectangle({ x, y, width, height, borderColor, borderWidth });
  }
}

async function embedLogo(pdf: PDFDocument, event: EventLike) {
  const url = resolveBrandLogo(event, event.organization);
  if (!url || url.startsWith("data:")) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const bytes = await response.arrayBuffer();
    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    if (contentType.includes("png") || /\.png(\?|$)/i.test(url)) {
      return await pdf.embedPng(bytes);
    }
    if (contentType.includes("jpeg") || contentType.includes("jpg") || /\.jpe?g(\?|$)/i.test(url)) {
      return await pdf.embedJpg(bytes);
    }
    try {
      return await pdf.embedPng(bytes);
    } catch {
      return await pdf.embedJpg(bytes);
    }
  } catch {
    return null;
  }
}

function venueLabel(event: EventLike) {
  const name = event.venue?.name || "";
  const city = event.venue?.address?.[0]?.city;
  return city && name && !name.includes(city) ? `${name}, ${city}` : name;
}

async function drawBrandedTicket(
  pdf: PDFDocument,
  page: PDFPage,
  {
    event,
    ticket,
    packageName,
    fonts,
    logo,
    ticketY,
    showPageChrome,
  }: {
    event: EventLike;
    ticket: PrintableTicket;
    packageName?: string;
    fonts: { regular: PDFFont; bold: PDFFont };
    logo: PDFImage | null;
    ticketY: number;
    showPageChrome: boolean;
  },
) {
  const { regular, bold } = fonts;
  const theme = resolveTicketTheme(event);
  const primaryHex = theme.primaryColor;
  const primary = hexToRgb(primaryHex);
  const badgeColor = hexToRgb(theme.badgeColor);
  const bodyBg = theme.bodyTint ? hexToRgb(theme.bodyTint) : lightenHex(primaryHex, 0.94);
  const headerOnLight = relativeLuminance(primary) > CONTRAST_PIVOT;
  const headerText = headerOnLight ? hexToRgb("#1A1F2B") : rgb(1, 1, 1);
  const headerSubtleText = headerOnLight ? hexToRgb("#41506B") : hexToRgb("#E2E8EF");
  const textDark = hexToRgb("#1A1F2B");
  const textBody = hexToRgb("#2D3648");
  const textMuted = hexToRgb("#708095");
  const textFaint = hexToRgb("#A0AEBF");
  const boxBorder = hexToRgb("#E2E8F0");
  const labelColor = accentOn(primary);

  if (showPageChrome) {
    page.drawText("EVENT TICKET  •  PRINTABLE  •  KEEP THIS FOR ENTRY", {
      x: 156.4,
      y: PAGE_HEIGHT - 30,
      size: 11,
      font: bold,
      color: hexToRgb("#495467"),
    });
  }

  drawRoundedRect(page, {
    x: TICKET_X + 3,
    y: ticketY - 3,
    width: TICKET_W,
    height: TICKET_H,
    radius: CORNER_R,
    color: hexToRgb("#A0AEC0"),
  });
  drawRoundedRect(page, {
    x: TICKET_X,
    y: ticketY,
    width: TICKET_W,
    height: TICKET_H,
    radius: CORNER_R,
    color: bodyBg,
    borderColor: primary,
    borderWidth: 1.5,
  });

  const headerBottom = ticketY + TICKET_H - HEADER_H;
  page.drawRectangle({
    x: TICKET_X,
    y: headerBottom,
    width: TICKET_W,
    height: HEADER_H,
    color: primary,
  });
  page.drawRectangle({
    x: TICKET_X,
    y: ticketY,
    width: STRIPE_W,
    height: TICKET_H,
    color: primary,
  });
  // Re-stroke the outline so the header and stripe keep clean rounded corners.
  drawRoundedRect(page, {
    x: TICKET_X,
    y: ticketY,
    width: TICKET_W,
    height: TICKET_H,
    radius: CORNER_R,
    borderColor: primary,
    borderWidth: 1.5,
  });

  const contentLeft = TICKET_X + 25;
  const headerTop = ticketY + TICKET_H;

  const badgeTextWidth = bold.widthOfTextAtSize(theme.badgeLabel, 9);
  const badgeW = Math.max(111, badgeTextWidth + 24);
  const badgeY = headerTop - 42;
  drawRoundedRect(page, {
    x: contentLeft,
    y: badgeY,
    width: badgeW,
    height: 23,
    radius: 11,
    color: badgeColor,
  });
  page.drawText(theme.badgeLabel, {
    x: contentLeft + (badgeW - badgeTextWidth) / 2,
    y: badgeY + 7,
    size: 9,
    font: bold,
    color: rgb(1, 1, 1),
  });

  const subtitle = resolveSubtitle(event);
  if (subtitle) {
    const subtitleX = contentLeft + badgeW + 12;
    page.drawText(
      fitText(subtitle, regular, 9, TICKET_X + TICKET_W - 110 - subtitleX),
      { x: subtitleX, y: badgeY + 7, size: 9, font: regular, color: headerSubtleText },
    );
  }

  page.drawText(fitText(event.name, bold, 20, TICKET_W - 140) || "Event", {
    x: contentLeft,
    y: headerTop - 58,
    size: 20,
    font: bold,
    color: headerText,
  });

  if (logo) {
    const scale = Math.min(70 / logo.width, 40 / logo.height);
    page.drawImage(logo, {
      x: TICKET_X + TICKET_W - logo.width * scale - 18,
      y: headerTop - 52,
      width: logo.width * scale,
      height: logo.height * scale,
    });
  }

  const drawField = (label: string, value: unknown, x: number, y: number) => {
    page.drawText(label, { x, y: y + 16, size: 8, font: bold, color: labelColor });
    page.drawText(fitText(value, regular, 11, 230) || "—", {
      x,
      y,
      size: 11,
      font: regular,
      color: textBody,
    });
  };

  const timezone = event.venue?.timezone;
  drawField("DATE", formatEventWhen(event.start, timezone, "ddd, MMM D, YYYY"), contentLeft, headerBottom - 40);
  drawField("TIME", formatEventWhen(event.start, timezone, "h:mm A"), contentLeft, headerBottom - 80);
  drawField("VENUE", venueLabel(event), contentLeft, headerBottom - 120);

  const holderX = TICKET_X + 270;
  page.drawText("TICKET HOLDER", {
    x: holderX,
    y: headerBottom - 24,
    size: 8,
    font: bold,
    color: labelColor,
  });
  page.drawText(fitText(ticket.holder, regular, 12, 140) || "Guest", {
    x: holderX,
    y: headerBottom - 40,
    size: 12,
    font: regular,
    color: textBody,
  });
  page.drawLine({
    start: { x: holderX, y: headerBottom - 48 },
    end: { x: holderX + 140, y: headerBottom - 48 },
    thickness: 0.75,
    color: hexToRgb("#CBCFD8"),
  });

  const resolvedPackage = resolvePackageName(packageName, event);
  if (resolvedPackage) {
    drawField("PACKAGE", resolvedPackage, holderX, headerBottom - 80);
  }

  const seatBoxX = contentLeft;
  const seatBoxY = ticketY + 28;
  drawRoundedRect(page, {
    x: seatBoxX,
    y: seatBoxY,
    width: 223,
    height: 68,
    radius: 8,
    color: rgb(1, 1, 1),
    borderColor: boxBorder,
    borderWidth: 1,
  });

  const isGA = Boolean(ticket.generalAdmission);
  const seatCols = [
    {
      label: "SECTION",
      value: isGA
        ? String(ticket.sectionName ?? ticket.sectionNumber ?? "General Admission")
        : String(ticket.sectionName ?? ticket.sectionNumber ?? "—"),
      x: seatBoxX + 22,
    },
    { label: "ROW", value: isGA ? "GA" : String(ticket.rowNumber ?? "—"), x: seatBoxX + 100 },
    { label: "SEAT", value: isGA ? "GA" : String(ticket.seatNumber ?? "—"), x: seatBoxX + 170 },
  ];
  seatCols.forEach((col) => {
    const labelW = bold.widthOfTextAtSize(col.label, 7);
    page.drawText(col.label, {
      x: col.x,
      y: seatBoxY + 48,
      size: 7,
      font: bold,
      color: labelColor,
    });
    const size = col.value.length > 8 ? 11 : col.value.length > 4 ? 14 : 16;
    const value = fitText(col.value, bold, size, 60);
    page.drawText(value, {
      x: col.x + Math.max(0, (labelW - bold.widthOfTextAtSize(value, size)) / 2),
      y: seatBoxY + 22,
      size,
      font: bold,
      color: textDark,
    });
  });

  const qrSize = 118;
  const qrX = TICKET_X + TICKET_W - qrSize - 24;
  const qrY = ticketY + 40;
  drawRoundedRect(page, {
    x: qrX - 6,
    y: qrY - 6,
    width: qrSize + 12,
    height: qrSize + 12,
    radius: 8,
    color: rgb(1, 1, 1),
    borderColor: boxBorder,
    borderWidth: 1,
  });
  const qrImage = await pdf.embedPng(
    await QRCode.toDataURL(ticket.checkInCode, { margin: 0, width: 512 }),
  );
  page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });

  const scanLabel = "SCAN AT ENTRANCE";
  page.drawText(scanLabel, {
    x: qrX + (qrSize - regular.widthOfTextAtSize(scanLabel, 7)) / 2,
    y: qrY - 16,
    size: 7,
    font: regular,
    color: textMuted,
  });

  page.drawText("Valid ID required  •  Non-transferable  •  Subject to venue policies", {
    x: contentLeft,
    y: ticketY + 10,
    size: 7,
    font: regular,
    color: textFaint,
  });
}

function safeFilename(name: string) {
  return `${sanitizeText(name) || "tickets"}.pdf`.replace(/[<>:"/\\|?*]/g, "-");
}

/** Packs branded tickets two per LETTER page, matching the printed ticket stock. */
export async function printTicketsPdf({
  event,
  tickets,
  packageName,
  filename,
  mode,
}: TicketPdfRequest) {
  if (!tickets.length) throw new Error("There are no tickets to print.");
  if (tickets.some((ticket) => !ticket.checkInCode)) {
    throw new Error("A ticket is missing its check-in code.");
  }

  const pdf = await PDFDocument.create();
  const fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
  };
  const logo = await embedLogo(pdf, event);

  let page: PDFPage | null = null;
  for (let index = 0; index < tickets.length; index += 1) {
    const slot = index % TICKET_SLOTS.length;
    if (slot === 0) page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    await drawBrandedTicket(pdf, page!, {
      event,
      ticket: tickets[index],
      packageName,
      fonts,
      logo,
      ticketY: TICKET_SLOTS[slot],
      showPageChrome: slot === 0,
    });
  }

  const bytes = await pdf.save();
  const url = URL.createObjectURL(
    new Blob([Uint8Array.from(bytes).buffer], { type: "application/pdf" }),
  );
  if (mode === "open") {
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = safeFilename(filename || event.name || "tickets");
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
