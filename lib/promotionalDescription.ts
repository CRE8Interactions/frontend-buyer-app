/** Admin caps the field at this length; the storefront API trims to it too. */
export const PROMOTIONAL_DESCRIPTION_MAX = 320;

type PromotionalFields = {
  promotionalDescription?: unknown;
  promotionalDescriptionText?: unknown;
};

function normalize(value: string) {
  const text = value.replace(/\s+/g, " ").trim();
  return text.slice(0, PROMOTIONAL_DESCRIPTION_MAX);
}

function collectBlockText(node: unknown, parts: string[]) {
  if (!node || typeof node !== "object") return;
  const block = node as { text?: unknown; children?: unknown };
  if (typeof block.text === "string") parts.push(block.text);
  if (Array.isArray(block.children)) {
    block.children.forEach((child) => collectBlockText(child, parts));
  }
}

function promotionalText(value: unknown) {
  if (typeof value === "string") return normalize(value);
  if (!Array.isArray(value)) return "";
  const parts: string[] = [];
  value.forEach((block) => collectBlockText(block, parts));
  return normalize(parts.join(" "));
}

/**
 * Event promo line ("Pink Night. Free bobblehead…"). The storefront sends
 * plain text; other event endpoints send the raw rich-text blocks.
 */
export function eventPromotionalCopy(event: object | null | undefined): string {
  if (!event) return "";
  const fields = event as PromotionalFields;
  return (
    promotionalText(fields.promotionalDescription) ||
    promotionalText(fields.promotionalDescriptionText)
  );
}
