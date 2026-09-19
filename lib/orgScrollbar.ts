/** Shared shopper scrollbar: org-colored thumb on a light track. */

export const ORG_SCROLLBAR_CLASS = "org-scrollbar";
export const ORG_SCROLLBAR_TRACK = "#e7eaf1";

export function orgScrollbarCss(thumbColor: string) {
  const thumb = thumbColor.trim() || "#051B35";
  return `
.${ORG_SCROLLBAR_CLASS} {
  scrollbar-width: thin;
  scrollbar-color: ${thumb} ${ORG_SCROLLBAR_TRACK};
}
.${ORG_SCROLLBAR_CLASS}::-webkit-scrollbar { width: 7px; height: 7px; }
.${ORG_SCROLLBAR_CLASS}::-webkit-scrollbar-track {
  background: ${ORG_SCROLLBAR_TRACK};
  border-radius: 999px;
}
.${ORG_SCROLLBAR_CLASS}::-webkit-scrollbar-thumb {
  background: ${thumb};
  border-radius: 999px;
}
.${ORG_SCROLLBAR_CLASS}::-webkit-scrollbar-button {
  display: none;
  width: 0;
  height: 0;
}
`.trim();
}
