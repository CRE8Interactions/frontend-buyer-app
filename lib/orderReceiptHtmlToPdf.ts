import { PDFDocument } from "pdf-lib";
import { receiptLogoProxyPath } from "@/lib/receiptLogo";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 34;
const FETCH_MS = 8000;
const RASTERIZE_MS = 800;
const IMAGE_LOAD_MS = 800;
const LOGO_ATTEMPTS = 5;
const LOGO_RETRY_MS = 250;

function dataUrlToBytes(dataUrl: string) {
  const comma = dataUrl.indexOf(",");
  const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function isInlinedSrc(src: string) {
  return src.startsWith("data:") || src.startsWith("blob:");
}

function resolveImageUrl(src: string) {
  if (!src || isInlinedSrc(src)) return src;
  try {
    return new URL(src, window.location.origin).href;
  } catch {
    return src;
  }
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function blobToDataUrl(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:${blob.type || "image/png"};base64,${btoa(binary)}`;
}

function isSvg(src: string, type?: string) {
  const mime = (type || "").toLowerCase();
  if (mime.includes("svg")) return true;
  if (mime.startsWith("image/") && !mime.includes("svg")) return false;
  return src.startsWith("data:image/svg") || /\.svg(\?|#|$)/i.test(src);
}

function rasterizeToPng(src: string) {
  return new Promise<string | null>((resolve) => {
    const image = new Image();
    let settled = false;
    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(value);
    };
    const timer = window.setTimeout(() => finish(null), RASTERIZE_MS);
    image.crossOrigin = "anonymous";
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, image.naturalWidth || image.width || 256);
        canvas.height = Math.max(1, image.naturalHeight || image.height || 256);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          finish(null);
          return;
        }
        ctx.drawImage(image, 0, 0);
        finish(canvas.toDataURL("image/png"));
      } catch {
        finish(null);
      }
    };
    image.onerror = () => finish(null);
    image.src = src;
  });
}

function dataUrlFromLoadedImages(src: string, images: HTMLImageElement[]) {
  const resolved = resolveImageUrl(src);
  for (const image of images) {
    const matches =
      image.currentSrc === resolved ||
      image.src === resolved ||
      image.getAttribute("src") === src;
    if (!matches || !image.complete || !image.naturalWidth) continue;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;
      ctx.drawImage(image, 0, 0);
      return canvas.toDataURL("image/png");
    } catch {
      /* tainted canvas */
    }
  }
  return null;
}

async function fetchAsDataUrl(url: string): Promise<string | null> {
  if (!url || url.startsWith("data:")) return url || null;
  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), FETCH_MS);
    const response = await fetch(url, { signal: controller.signal });
    window.clearTimeout(timer);
    if (!response.ok) return null;
    const blob = await response.blob();
    const dataUrl = await blobToDataUrl(blob);
    if (isSvg(url, blob.type)) {
      const png = await rasterizeToPng(dataUrl);
      if (png) return png;
    }
    return dataUrl;
  } catch {
    return null;
  }
}

async function srcToDataUrl(src: string): Promise<string | null> {
  if (!src || isInlinedSrc(src)) return src || null;
  const direct = resolveImageUrl(src);
  const origin = window.location.origin;
  const candidates = [
    `${origin}${receiptLogoProxyPath(src, origin)}`,
    direct,
  ];
  for (const url of candidates) {
    const dataUrl = await fetchAsDataUrl(url);
    if (dataUrl) return dataUrl;
  }
  return rasterizeToPng(direct);
}

async function inlineReceiptImages(root: ParentNode) {
  const pageImages = [...document.images].filter((img) => !root.contains(img));
  for (const img of [...root.querySelectorAll("img")]) {
    const src = img.getAttribute("src") || "";
    if (isInlinedSrc(src)) continue;
    const dataUrl =
      dataUrlFromLoadedImages(src, pageImages) || (await srcToDataUrl(src));
    if (dataUrl) img.setAttribute("src", dataUrl);
  }
}

function receiptLogoReady(root: ParentNode) {
  const logo = root.querySelector(".invoice-doc__logo");
  if (!(logo instanceof HTMLImageElement)) return true;
  return isInlinedSrc(logo.getAttribute("src") || logo.src || "");
}

async function waitUntilReceiptLogoReady(root: ParentNode) {
  for (let attempt = 0; attempt < LOGO_ATTEMPTS; attempt += 1) {
    await inlineReceiptImages(root);
    if (receiptLogoReady(root)) return;
    if (attempt < LOGO_ATTEMPTS - 1) await sleep(LOGO_RETRY_MS);
  }
  throw new Error("Receipt logo unavailable");
}

function waitForImages(root: ParentNode) {
  return Promise.all(
    [...root.querySelectorAll("img")].map((img) => {
      if (!(img instanceof HTMLImageElement)) return Promise.resolve();
      const src = img.getAttribute("src") || img.src || "";
      if (img.complete || isInlinedSrc(src)) return Promise.resolve();
      return new Promise<void>((resolve) => {
        const done = () => resolve();
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
        window.setTimeout(done, IMAGE_LOAD_MS);
      });
    }),
  );
}

function mountReceiptHtml(html: string) {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const invoice = parsed.querySelector(".invoice-doc");
  if (!invoice) return null;

  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText =
    "position:fixed;left:-10000px;top:0;width:980px;pointer-events:none;z-index:-1;background:#ffffff;";
  const style = document.createElement("style");
  style.textContent = parsed.querySelector("style")?.textContent || "";
  host.appendChild(style);
  host.appendChild(document.importNode(invoice, true));
  document.body.appendChild(host);
  return host;
}

async function captureInvoicePng(invoice: HTMLElement) {
  const { toPng } = await import("html-to-image");
  const options = {
    pixelRatio: 2,
    backgroundColor: "#ffffff",
    cacheBust: false,
    skipFonts: true,
  };
  try {
    return await toPng(invoice, options);
  } catch {
    return toPng(invoice, options);
  }
}

/** Rasterizes the existing invoice HTML and wraps it in a letter-size PDF. */
export async function htmlToReceiptPdf(html: string): Promise<Uint8Array> {
  if (typeof document === "undefined") {
    throw new Error("Receipt PDF unavailable");
  }

  const host = mountReceiptHtml(html);
  if (!host) throw new Error("Receipt unavailable");

  try {
    const invoice = host.querySelector(".invoice-doc");
    if (!(invoice instanceof HTMLElement)) {
      throw new Error("Receipt unavailable");
    }

    await waitUntilReceiptLogoReady(invoice);
    await waitForImages(invoice);
    const dataUrl = await captureInvoicePng(invoice);
    if (!dataUrl.startsWith("data:image/png")) {
      throw new Error("Receipt PDF unavailable");
    }

    const pdf = await PDFDocument.create();
    const image = await pdf.embedPng(dataUrlToBytes(dataUrl));
    const maxWidth = PAGE_WIDTH - MARGIN * 2;
    const maxHeight = PAGE_HEIGHT - MARGIN * 2;
    const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    page.drawImage(image, {
      x: (PAGE_WIDTH - width) / 2,
      y: PAGE_HEIGHT - MARGIN - height,
      width,
      height,
    });
    return pdf.save();
  } finally {
    host.remove();
  }
}
