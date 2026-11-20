// buyer map input: session data and callbacks are injected by buyer-app.
export function createBuyerMapInput({
  state: session,
  $,
  backToSection,
  buyerUnit,
  buyerSeatInteractive,
  chooseSeat,
  paintFlatSectionStates,
  renderFlatUnitCues,
  sectionBounds,
  showSection,
  adminToggle,
  buyerHover,
  buyerPick,
  openGAAllocation,
  paintSections,
  refresh,
}) {
  function mapPick(hit) {
    if (session.workspace === 'buyer') {
      buyerPick(hit);
      return;
    }
    const seat = session.map.seatById.get(hit.seatId),
      id = seat?.sectionId || hit.sectionId,
      section = session.map.sectionById.get(id);
    if (!section) return;
    session.adminSection = session.adminActiveSection = id;
    if (section.ga) {
      openGAAllocation(id);
      refresh();
      return;
    }
    if (session.adminScope === 'section') {
      adminToggle(section.seats);
      session.player.sectionView(id);
    } else if (session.adminScope === 'row' && seat)
      adminToggle(session.map.rowById.get(seat.rowId).seats);
    else if (seat) adminToggle([seat.id]);
  }

  function mapHover(hit) {
    if (session.workspace === 'buyer') {
      buyerHover(hit);
      return;
    }
    session.hoverSection = session.adminScope === 'section' ? hit?.sectionId || null : null;
    session.hoverRow =
      session.adminScope === 'row' ? session.map.seatById.get(hit?.seatId)?.rowId || null : null;
    paintSections();
  }

  function bindMapInput() {
    $('admin-map').onmousemove = (e) => {
      if (session.workspace === 'buyer' && session.focusSeat) return;
      const el = e.target.closest('[data-seat-id],[data-section-id]'),
        seat = session.map.seatById.get(el?.dataset.seatId),
        section = seat?.sectionId || el?.dataset.sectionId || null,
        next = section;
      if (next !== session.hoverSection) {
        session.hoverSection =
          session.workspace === 'admin' && session.adminScope !== 'section' ? null : next;
        paintFlatSectionStates();
      }
      if (session.workspace === 'admin') {
        const row = session.adminScope === 'row' ? seat?.rowId : null;
        if (row !== session.hoverRow) {
          session.hoverRow = row;
          for (const node of session.svgInfo.root.querySelectorAll('[data-row-id]'))
            node.toggleAttribute('data-row-hovered', node.dataset.rowId === row);
        }
      }
      if (session.workspace === 'buyer' && session.buyerView === '2d') {
        const nextUnit = seat ? buyerUnit(seat.id) : [];
        if (nextUnit.join('|') !== session.hoverUnitIds.join('|')) {
          session.hoverUnitIds = nextUnit;
          session.flatUnitCueSignature = '';
          renderFlatUnitCues();
        }
        buyerHover(
          section
            ? { seatId: seat?.id, sectionId: section, clientX: e.clientX, clientY: e.clientY }
            : null,
        );
      }
    };
    $('admin-map').onmouseleave = () => {
      session.hoverRow = null;
      session.hoverUnitIds = [];
      session.flatUnitCueSignature = '';
      renderFlatUnitCues();
      for (const node of session.svgInfo.root.querySelectorAll('[data-row-hovered]'))
        node.removeAttribute('data-row-hovered');
      session.hoverSection = null;
      paintFlatSectionStates();
      buyerHover(null);
    };
    $('admin-map').onclick = (e) => {
      if (session.adminDragged) return;
      const el = e.target.closest('[data-seat-id],[data-section-id]');
      if (session.workspace === 'buyer' && session.focusSeat && !el?.dataset.seatId) {
        backToSection();
        return;
      }
      if (!el) return;
      const seat = session.map.seatById.get(el.dataset.seatId),
        section = seat?.sectionId || el.dataset.sectionId;
      if (session.workspace === 'buyer') {
        if (!section) return;
        if (seat) {
          if (!buyerSeatInteractive(seat.id)) return;
          chooseSeat(seat.id);
        } else showSection(section);
        return;
      }
      session.adminSection = session.adminActiveSection = section;
      if (session.map.sectionById.get(section)?.ga) {
        openGAAllocation(section);
        refresh();
        return;
      }
      if (session.adminScope === 'section') {
        adminToggle(session.map.sectionById.get(section).seats);
        const box = sectionBounds(section);
        if (box) session.flatCamera?.fit(box);
      } else if (session.adminScope === 'row' && seat)
        adminToggle(session.map.rowById.get(seat.rowId).seats);
      else if (seat) adminToggle([seat.id]);
    };
  }

  return { mapPick, mapHover, bindMapInput };
}
