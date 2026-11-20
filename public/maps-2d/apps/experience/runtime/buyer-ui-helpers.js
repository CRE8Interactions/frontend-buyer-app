// buyer ui helpers: session data and callbacks are injected by buyer-app.
export function createBuyerUiHelpers({
  state: session,
  buyerUnit,
  clearFocusedSeat,
  esc,
  levelPalette,
  money,
  refresh,
  seatNumberLabel,
}) {
  const offerOptions = (selected, allowed = null) =>
    Object.entries(session.store.inventory.offers)
      .filter(([id]) => !allowed || allowed.has(id))
      .map(
        ([id, o]) =>
          `<option value="${esc(id)}" ${id === selected ? 'selected' : ''}>${esc(o.name)}</option>`,
      )
      .join('');

  const sectionOptions = (selected) =>
    session.map.sections
      .map(
        (s) =>
          `<option value="${esc(s.id)}" ${s.id === selected ? 'selected' : ''}>${esc(s.name)}${s.ga ? ' · GA' : ''}</option>`,
      )
      .join('');

  const levelColor = (id, index = 0) =>
    session.store.inventory.offers[id]?.color || levelPalette[index % levelPalette.length];

  function tiers(offer, selected) {
    return (
      offer?.tiers
        .map(
          (t) =>
            `<option value="${esc(t.id)}" ${t.id === selected ? 'selected' : ''}>${esc(t.name)} · ${money(t.price)} each</option>`,
        )
        .join('') || ''
    );
  }

  function changed() {
    // Inventory edits invalidate any local buyer selection; no reservation is implied.
    session.inventoryRevision++;
    session.store.cart.clear();
    session.store.unlocked.clear();
    clearFocusedSeat();
    refresh();
  }

  function seatInfoLabel(s, ids = buyerUnit(s.id)) {
    return `Sec ${esc(s.sectionNumber)} · Row ${esc(s.rowNumber)} · Seat ${esc(seatNumberLabel(ids))}`;
  }

  function seatDeckLabel(section) {
    return session.presentation?.sectionLevels?.[section?.id] || '';
  }

  return { offerOptions, sectionOptions, levelColor, tiers, changed, seatInfoLabel, seatDeckLabel };
}
