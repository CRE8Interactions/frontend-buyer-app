import type { OrderReceipt } from "@/lib/orderReceipt";

/** Print CSS from blocktickets admin InvoiceHtml / tickets invoice-html.js. */
const INVOICE_CSS = `
.invoice-doc {
  max-width: 980px;
  margin: 0 auto;
  background: #ffffff;
  border-radius: 12px;
  padding: 40px 44px;
  color: #111827;
  font-family: -apple-system, BlinkMacSystemFont, "Poppins", "Segoe UI", Roboto, Arial, sans-serif;
}
.invoice-doc__top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; }
.invoice-doc__logo { height: 44px; width: 44px; object-fit: contain; }
.invoice-doc__title { font-size: 32px; font-weight: 600; color: #111827; }
.invoice-doc__header { display: grid; grid-template-columns: 1fr 340px; gap: 28px; margin-bottom: 18px; }
.invoice-doc__seller-name { font-weight: 600; margin-bottom: 16px; }
.invoice-doc__seller-phone { margin-top: 19px; }
.invoice-doc__meta { display: grid; gap: 10px; align-content: start; }
.invoice-doc__meta-row { display: grid; grid-template-columns: 140px 1fr; gap: 12px; font-size: 14px; }
.invoice-doc__meta-label { color: #353945; }
.invoice-doc__meta-value { text-align: right; font-weight: 500; }
.invoice-doc__amount-due { display: flex; align-items: flex-start; gap: 8px; margin: 32px 0; }
.invoice-doc__amount-icon--success { color: #45B36B; }
.invoice-doc__amount-line { font-size: 24px; font-weight: 600; line-height: 1.4; }
.invoice-doc__billto { margin-bottom: 22px; }
.invoice-doc__billto-label { margin-bottom: 6px; font-size: 14px; }
.invoice-doc__billto-name { font-size: 16px; font-weight: 600; }
.invoice-doc__table { border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
.invoice-doc__thead {
  display: grid;
  grid-template-columns: 1fr 80px 120px 120px;
  padding: 12px 16px;
  background: #F4F5F6;
  font-size: 14px;
  color: #141416;
  font-weight: 500;
}
.invoice-doc__trow {
  display: grid;
  grid-template-columns: 1fr 80px 120px 120px;
  padding: 12px 16px;
  border-top: 1px solid #e5e7eb;
  font-size: 14px;
  font-weight: 500;
}
.invoice-doc__trow--empty { color: #6b7280; }
.invoice-doc__desc-title { font-size: 14px; font-weight: 500; color: #111827; }
.invoice-doc__num { text-align: right; font-variant-numeric: tabular-nums; }
.invoice-doc__bottom { display: grid; grid-template-columns: 1fr 360px; gap: 24px; margin-top: 22px; }
.invoice-doc__totals { display: grid; gap: 4px; font-size: 14px; font-weight: 500; }
.invoice-doc__totals-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding-bottom: 5px; border-bottom: 1px solid #eef0f3; }
.invoice-doc__totals-row--strong { font-weight: 600; font-size: 16px; }
.invoice-doc__totals-row--amount-due { border-bottom: none; padding-bottom: 0; }
.invoice-doc__totals-value { text-align: right; font-variant-numeric: tabular-nums; }
.invoice-doc__totals-subtext { font-weight: 400; font-size: 12px; color: #6b7280; }
.invoice-doc__footer { margin-top: 32px; padding-top: 15px; border-top: 1px solid #eef0f3; text-align: center; }
.invoice-doc__footer-note { font-weight: 400; font-size: 12px; margin-top: 6px; }
.invoice-doc__muted { font-weight: 400; font-size: 14px; }
.invoice-doc__muted--note { margin-top: 9px; }
@page { margin: 12mm; }
`;

const PAID_ICON_SVG =
  '<path fill-rule="evenodd" clip-rule="evenodd" d="M16 29.3333C23.3638 29.3333 29.3333 23.3638 29.3333 16C29.3333 8.63619 23.3638 2.66666 16 2.66666C8.63616 2.66666 2.66663 8.63619 2.66663 16C2.66663 23.3638 8.63616 29.3333 16 29.3333ZM23.609 11.0576C23.0883 10.5369 22.2449 10.5369 21.7242 11.0576L14.6666 18.1152L11.609 15.0576C11.0883 14.5369 10.2449 14.5369 9.72424 15.0576C9.20354 15.5783 9.20354 16.4217 9.72424 16.9424L13.7242 20.9424C14.2449 21.4631 15.0883 21.4631 15.609 20.9424L23.609 12.9424C24.1297 12.4217 24.1297 11.5783 23.609 11.0576Z" fill="#45B36B"/>';

function escapeHtml(str: string | number | null | undefined) {
  if (str == null || str === "") return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function originBase() {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/`;
}

/** Full invoice HTML document used by blocktickets Download PDF (print iframe). */
export function renderOrderReceiptHtml(receipt: OrderReceipt) {
  const logoSrc = escapeHtml(receipt.sellerLogoUrl || "/blocktickets-emblem-navy.svg");
  const sellerName = escapeHtml(receipt.sellerName);
  const inquiryEmail = escapeHtml(receipt.inquiryEmail);

  const lineRows =
    receipt.lines.length === 0
      ? `
    <div class="invoice-doc__trow invoice-doc__trow--empty">
      <div class="invoice-doc__muted">${escapeHtml(receipt.emptyLinesMessage)}</div>
      <div></div><div></div><div></div>
    </div>`
      : receipt.lines
          .map(
            (line) => `
    <div class="invoice-doc__trow">
      <div class="invoice-doc__desc">
        <div class="invoice-doc__desc-title">${escapeHtml(line.description)}</div>
      </div>
      <div class="invoice-doc__num">${escapeHtml(line.qty)}</div>
      <div class="invoice-doc__num">${escapeHtml(line.unitPrice)}</div>
      <div class="invoice-doc__num">${escapeHtml(line.amount)}</div>
    </div>`,
          )
          .join("");

  const totalsHtml = receipt.totals
    .map((row) => {
      const strong = row.strong ? " invoice-doc__totals-row--strong" : "";
      const due = row.amountDue ? " invoice-doc__totals-row--amount-due" : "";
      const note = row.note
        ? `<div class="invoice-doc__totals-subtext">${escapeHtml(row.note)}</div>`
        : "";
      return `
        <div class="invoice-doc__totals-row${strong}${due}">
          <div class="invoice-doc__totals-label">
            <div>${escapeHtml(row.label)}</div>
            ${note}
          </div>
          <div class="invoice-doc__totals-value">${escapeHtml(row.amount)}</div>
        </div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <base href="${escapeHtml(originBase())}" />
  <title>${escapeHtml(receipt.title)}</title>
  <style>${INVOICE_CSS}</style>
</head>
<body style="margin:0;background:#f9fafb;">
  <div class="invoice-doc" role="document">
    <div class="invoice-doc__top">
      <div class="invoice-doc__brand">
        <img class="invoice-doc__logo" src="${logoSrc}" alt="${sellerName}" />
      </div>
      <div class="invoice-doc__title">${escapeHtml(receipt.title)}</div>
    </div>
    <div class="invoice-doc__header">
      <div class="invoice-doc__seller">
        <div class="invoice-doc__seller-name">${sellerName}</div>
        ${receipt.sellerAddressLine1 ? `<div class="invoice-doc__muted">${escapeHtml(receipt.sellerAddressLine1)}</div>` : ""}
        ${receipt.sellerAddressLine2 ? `<div class="invoice-doc__muted">${escapeHtml(receipt.sellerAddressLine2)}</div>` : ""}
        ${receipt.sellerCountry ? `<div class="invoice-doc__muted">${escapeHtml(receipt.sellerCountry)}</div>` : ""}
        ${receipt.sellerPhone ? `<div class="invoice-doc__muted invoice-doc__seller-phone">${escapeHtml(receipt.sellerPhone)}</div>` : ""}
        ${receipt.sellerEmail ? `<div class="invoice-doc__muted">${escapeHtml(receipt.sellerEmail)}</div>` : ""}
      </div>
      <div class="invoice-doc__meta">
        <div class="invoice-doc__meta-row">
          <div class="invoice-doc__meta-label">Invoice number:</div>
          <div class="invoice-doc__meta-value">${escapeHtml(receipt.invoiceNumber)}</div>
        </div>
        <div class="invoice-doc__meta-row">
          <div class="invoice-doc__meta-label">Payment method:</div>
          <div class="invoice-doc__meta-value">${escapeHtml(receipt.paymentMethod)}</div>
        </div>
        <div class="invoice-doc__meta-row">
          <div class="invoice-doc__meta-label">Date of issue:</div>
          <div class="invoice-doc__meta-value">${escapeHtml(receipt.issueDate)}</div>
        </div>
        <div class="invoice-doc__meta-row">
          <div class="invoice-doc__meta-label">Date due:</div>
          <div class="invoice-doc__meta-value">${escapeHtml(receipt.dueDate)}</div>
        </div>
      </div>
    </div>
    <div class="invoice-doc__amount-due">
      <div class="invoice-doc__amount-icon invoice-doc__amount-icon--success" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">${PAID_ICON_SVG}</svg>
      </div>
      <div>
        <div class="invoice-doc__amount-line">${escapeHtml(receipt.paidOnLabel)}</div>
        <div class="invoice-doc__muted invoice-doc__muted--note">${escapeHtml(receipt.supportNote)}</div>
      </div>
    </div>
    <div class="invoice-doc__billto">
      <div class="invoice-doc__muted invoice-doc__billto-label">${escapeHtml(receipt.billToLabel)}</div>
      <div class="invoice-doc__billto-name">${escapeHtml(receipt.billToName)}</div>
      <div class="invoice-doc__muted">${escapeHtml(receipt.billToEmail)}</div>
    </div>
    <div class="invoice-doc__table">
      <div class="invoice-doc__thead">
        <div>Description</div>
        <div class="invoice-doc__num">Qty</div>
        <div class="invoice-doc__num">Unit price</div>
        <div class="invoice-doc__num">Amount</div>
      </div>${lineRows}
    </div>
    <div class="invoice-doc__bottom">
      <div></div>
      <div class="invoice-doc__totals">${totalsHtml}
      </div>
    </div>
    <div class="invoice-doc__footer">
      ${receipt.sellerTaxId ? `<div class="invoice-doc__footer-note"><div class="invoice-doc__muted">HST - ${escapeHtml(receipt.sellerTaxId)}</div></div>` : ""}
      ${
        receipt.sellerTiname && receipt.sellerTincode
          ? `<div class="invoice-doc__footer-note"><div class="invoice-doc__muted">${escapeHtml(receipt.sellerTiname)}: ${escapeHtml(receipt.sellerTincode)}</div></div>`
          : ""
      }
      <div class="invoice-doc__footer-note">
        Please note our rules and regulations: all sales are final, and we do not offer exchanges or refunds.
      </div>
      <div class="invoice-doc__footer-note">
        For inquiries, email us at ${inquiryEmail}.
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function receiptHasInvoiceDoc(html: string) {
  return html.includes("invoice-doc");
}
