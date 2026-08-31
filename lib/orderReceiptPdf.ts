import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { OrderReceipt } from "@/lib/orderReceipt";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 48;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const INK = rgb(0.067, 0.094, 0.153);
const MUTED = rgb(0.42, 0.446, 0.49);
const RULE = rgb(0.898, 0.906, 0.922);
const HEADER_BG = rgb(0.957, 0.961, 0.973);
const GREEN = rgb(0.271, 0.702, 0.42);
const WHITE = rgb(1, 1, 1);

function hexRgb(hex: string) {
  const raw = hex.replace("#", "").trim();
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  if (full.length !== 6) return INK;
  return rgb(
    parseInt(full.slice(0, 2), 16) / 255,
    parseInt(full.slice(2, 4), 16) / 255,
    parseInt(full.slice(4, 6), 16) / 255,
  );
}

function wrapText(font: PDFFont, text: string, size: number, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  const pushChunk = (chunk: string) => {
    if (font.widthOfTextAtSize(chunk, size) <= maxWidth) {
      lines.push(chunk);
      return;
    }
    let rest = chunk;
    while (rest) {
      let take = rest.length;
      while (take > 1 && font.widthOfTextAtSize(rest.slice(0, take), size) > maxWidth) {
        take -= 1;
      }
      lines.push(rest.slice(0, take));
      rest = rest.slice(take);
    }
  };
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    current = "";
    if (font.widthOfTextAtSize(word, size) <= maxWidth) current = word;
    else pushChunk(word);
  }
  if (current) lines.push(current);
  return lines.length ? lines : [text];
}

function drawCheck(page: PDFPage, x: number, y: number, size: number) {
  page.drawCircle({
    x: x + size / 2,
    y: y + size / 2,
    size: size / 2,
    color: GREEN,
  });
  page.drawLine({
    start: { x: x + size * 0.28, y: y + size * 0.5 },
    end: { x: x + size * 0.44, y: y + size * 0.34 },
    thickness: 1.8,
    color: WHITE,
  });
  page.drawLine({
    start: { x: x + size * 0.44, y: y + size * 0.34 },
    end: { x: x + size * 0.74, y: y + size * 0.68 },
    thickness: 1.8,
    color: WHITE,
  });
}

async function embedLogo(
  pdf: PDFDocument,
  page: PDFPage,
  url: string | undefined,
  x: number,
  y: number,
  size: number,
) {
  if (!url || /\.svg(\?|$)/i.test(url)) return false;
  if (typeof fetch !== "function") return false;
  try {
    const href =
      url.startsWith("http") || url.startsWith("data:")
        ? url
        : typeof window !== "undefined"
          ? new URL(url, window.location.origin).href
          : url;
    const res = await fetch(href);
    if (!res.ok) return false;
    const bytes = new Uint8Array(await res.arrayBuffer());
    const png = bytes[0] === 0x89 && bytes[1] === 0x50;
    const jpg = bytes[0] === 0xff && bytes[1] === 0xd8;
    if (!png && !jpg) return false;
    const image = png ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
    page.drawImage(image, { x, y, width: size, height: size });
    return true;
  } catch {
    return false;
  }
}

export async function buildOrderReceiptPdf(receipt: OrderReceipt): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const ensureSpace = (needed: number) => {
    if (y - needed > MARGIN) return;
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
  };

  const logoSize = 36;
  const logoX = MARGIN;
  const logoY = y - logoSize;
  const drewLogo = await embedLogo(pdf, page, receipt.sellerLogoUrl, logoX, logoY, logoSize);
  if (!drewLogo) {
    page.drawRectangle({
      x: logoX,
      y: logoY,
      width: logoSize,
      height: logoSize,
      color: hexRgb(receipt.sellerAccent),
    });
    const initials = receipt.sellerInitials || "BT";
    const initialSize = 11;
    page.drawText(initials, {
      x: logoX + (logoSize - bold.widthOfTextAtSize(initials, initialSize)) / 2,
      y: logoY + 13,
      size: initialSize,
      font: bold,
      color: WHITE,
    });
  }

  const title = receipt.title;
  const titleSize = 28;
  const titleY = y - 22;
  page.drawText(title, {
    x: PAGE_WIDTH - MARGIN - bold.widthOfTextAtSize(title, titleSize),
    y: titleY,
    size: titleSize,
    font: bold,
    color: INK,
  });

  page.drawText(receipt.sellerName, {
    x: MARGIN,
    y: logoY - 18,
    size: 13,
    font: bold,
    color: INK,
  });

  const meta = [
    ["Invoice number:", receipt.invoiceNumber],
    ["Payment method:", receipt.paymentMethod],
    ["Date of issue:", receipt.issueDate],
    ["Date due:", receipt.dueDate],
  ];
  let metaY = titleY - 26;
  const metaLabelX = PAGE_WIDTH - MARGIN - 248;
  for (const [label, value] of meta) {
    page.drawText(label, {
      x: metaLabelX,
      y: metaY,
      size: 10,
      font: regular,
      color: MUTED,
    });
    page.drawText(value, {
      x: PAGE_WIDTH - MARGIN - regular.widthOfTextAtSize(value, 10),
      y: metaY,
      size: 10,
      font: regular,
      color: INK,
    });
    metaY -= 15;
  }
  y = Math.min(logoY - 18, metaY) - 28;

  drawCheck(page, MARGIN, y - 6, 22);
  const paidLines = wrapText(bold, receipt.paidOnLabel, 14, CONTENT_WIDTH - 36);
  let paidY = y;
  for (const line of paidLines) {
    page.drawText(line, {
      x: MARGIN + 32,
      y: paidY,
      size: 14,
      font: bold,
      color: INK,
    });
    paidY -= 18;
  }
  page.drawText(receipt.supportNote, {
    x: MARGIN + 32,
    y: paidY - 2,
    size: 10,
    font: regular,
    color: MUTED,
  });
  y = paidY - 28;

  page.drawText(receipt.billToLabel, {
    x: MARGIN,
    y,
    size: 10,
    font: regular,
    color: MUTED,
  });
  y -= 16;
  page.drawText(receipt.billToName, {
    x: MARGIN,
    y,
    size: 12,
    font: bold,
    color: INK,
  });
  y -= 15;
  page.drawText(receipt.billToEmail, {
    x: MARGIN,
    y,
    size: 10,
    font: regular,
    color: MUTED,
  });
  y -= 28;

  const qtyW = 40;
  const unitW = 78;
  const amountW = 78;
  const descW = CONTENT_WIDTH - qtyW - unitW - amountW - 24;
  const colQty = MARGIN + descW + 8;
  const colUnit = colQty + qtyW + 8;
  const colAmount = colUnit + unitW + 8;

  page.drawRectangle({
    x: MARGIN,
    y: y - 4,
    width: CONTENT_WIDTH,
    height: 28,
    color: HEADER_BG,
  });
  page.drawText("Description", {
    x: MARGIN + 12,
    y: y + 6,
    size: 9,
    font: regular,
    color: MUTED,
  });
  page.drawText("Qty", {
    x: colQty + qtyW - regular.widthOfTextAtSize("Qty", 9),
    y: y + 6,
    size: 9,
    font: regular,
    color: MUTED,
  });
  page.drawText("Unit price", {
    x: colUnit + unitW - regular.widthOfTextAtSize("Unit price", 9),
    y: y + 6,
    size: 9,
    font: regular,
    color: MUTED,
  });
  page.drawText("Amount", {
    x: colAmount + amountW - regular.widthOfTextAtSize("Amount", 9),
    y: y + 6,
    size: 9,
    font: regular,
    color: MUTED,
  });
  y -= 8;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: MARGIN + CONTENT_WIDTH, y },
    thickness: 0.6,
    color: RULE,
  });

  const rows =
    receipt.lines.length > 0
      ? receipt.lines
      : [
          {
            description: receipt.emptyLinesMessage,
            qty: "",
            unitPrice: "",
            amount: "",
          },
        ];

  for (const row of rows) {
    const descLines = wrapText(regular, row.description, 10, descW - 16);
    const rowH = Math.max(28, descLines.length * 13 + 14);
    ensureSpace(rowH + 8);
    y -= rowH;
    let textY = y + rowH - 18;
    for (const line of descLines) {
      page.drawText(line, {
        x: MARGIN + 12,
        y: textY,
        size: 10,
        font: regular,
        color: INK,
      });
      textY -= 13;
    }
    if (row.qty) {
      page.drawText(row.qty, {
        x: colQty + qtyW - regular.widthOfTextAtSize(row.qty, 10),
        y: y + rowH - 18,
        size: 10,
        font: regular,
        color: INK,
      });
    }
    if (row.unitPrice) {
      page.drawText(row.unitPrice, {
        x: colUnit + unitW - regular.widthOfTextAtSize(row.unitPrice, 10),
        y: y + rowH - 18,
        size: 10,
        font: regular,
        color: INK,
      });
    }
    if (row.amount) {
      page.drawText(row.amount, {
        x: colAmount + amountW - regular.widthOfTextAtSize(row.amount, 10),
        y: y + rowH - 18,
        size: 10,
        font: regular,
        color: INK,
      });
    }
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: MARGIN + CONTENT_WIDTH, y },
      thickness: 0.6,
      color: RULE,
    });
  }

  y -= 22;
  const totalsW = 240;
  const totalsX = MARGIN + CONTENT_WIDTH - totalsW;
  for (const row of receipt.totals) {
    ensureSpace(22);
    const font = row.strong ? bold : regular;
    const size = row.strong ? 11 : 10;
    page.drawText(row.label, {
      x: totalsX,
      y,
      size,
      font,
      color: INK,
    });
    page.drawText(row.amount, {
      x: MARGIN + CONTENT_WIDTH - font.widthOfTextAtSize(row.amount, size),
      y,
      size,
      font,
      color: INK,
    });
    y -= 8;
    if (!row.strong) {
      page.drawLine({
        start: { x: totalsX, y },
        end: { x: MARGIN + CONTENT_WIDTH, y },
        thickness: 0.5,
        color: RULE,
      });
    }
    y -= 14;
  }

  return pdf.save();
}

export function saveReceiptPdf(bytes: Uint8Array, filename: string) {
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
