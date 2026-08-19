import type { TicketGroup } from "@/stores/filtersStore";

export const MIXED_MAP_SELECTION_ERROR = {
  title: "Selected tickets not available",
  message:
    "You can only select tickets from one row or GA section at a time...",
  buttonText: "Return to tickets list",
  leaveMap: true,
} as const;

function isGa(group: TicketGroup) {
  return Boolean(group.GA || group.generalAdmission);
}

function sectionKey(group: TicketGroup) {
  return String(group.sectionId ?? group.sectionNumber ?? group.sectionName ?? "");
}

function rowKey(group: TicketGroup) {
  return `${sectionKey(group)}:${String(
    group.rowId ?? group.rowNumber ?? group.rowName ?? "",
  )}`;
}

/** Null if the incoming seats may join the current map selection. */
export function mixedMapSelectionError(
  selected: TicketGroup[],
  incoming: TicketGroup | TicketGroup[],
) {
  if (!selected.length) return null;
  const next = Array.isArray(incoming) ? incoming : [incoming];
  if (!next.length) return null;

  const all = [...selected, ...next];
  const seated = all.filter((group) => !isGa(group));
  const ga = all.filter(isGa);

  if (seated.length && ga.length) return { ...MIXED_MAP_SELECTION_ERROR };

  if (ga.length) {
    const section = sectionKey(ga[0]);
    if (ga.some((group) => sectionKey(group) !== section)) {
      return { ...MIXED_MAP_SELECTION_ERROR };
    }
    return null;
  }

  const row = rowKey(seated[0]);
  if (seated.some((group) => rowKey(group) !== row)) {
    return { ...MIXED_MAP_SELECTION_ERROR };
  }
  return null;
}
