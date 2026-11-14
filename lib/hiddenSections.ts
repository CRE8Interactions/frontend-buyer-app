type HiddenSection = {
  sectionId?: string | number;
  hidden?: boolean;
};

export function isSectionHidden(
  sections: Record<string, HiddenSection> | null | undefined,
  sectionId: string | number | null | undefined,
) {
  if (!sections || sectionId == null || sectionId === "") return false;
  const section =
    sections[String(sectionId)] ??
    (typeof sectionId === "string" && /^\d+$/.test(sectionId)
      ? sections[String(Number(sectionId))]
      : undefined);
  if (section) return Boolean(section.hidden);
  const target = String(sectionId);
  return Object.values(sections).some(
    (candidate) =>
      candidate?.hidden && String(candidate.sectionId ?? "") === target,
  );
}

export function omitHiddenSectionGroups<
  T extends { sectionId?: string | number | null },
>(
  groups: T[],
  sections: Record<string, HiddenSection> | null | undefined,
): T[] {
  if (!sections) return groups;
  return groups.filter((group) => !isSectionHidden(sections, group.sectionId));
}
