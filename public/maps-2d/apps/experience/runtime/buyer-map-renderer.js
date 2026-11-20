import {sectionAvailability, sectionStateColors} from './section-availability.js';
import { icons } from './icons.js';

// buyer map renderer: session data and callbacks are injected by buyer-app.
export function createBuyerMapRenderer({
  state: session,
  $,
  buyerUnit,
  esc,
  levelColor,
  levelPalette,
  mobileShell,
  money,
  renderAdmin,
  renderBuyer,
  rendered,
  sandbox,
  selectedIDs,
  usesPlayer,
}) {
  // Price on the map. Offers are ranked by their lowest price, and a seat takes a shade from one ramp by that rank: the cheapest lightest, the dearest the full
  // brand navy. Only the rank is decided here; the shades for each theme live in the map (flat-webgl.js) and in the seat key's styles. With one price there is no
  // ramp and every open seat keeps the usual colour.
  const PRICE_LIGHT = ['#4a6fa5', '#051b35'];
  const shade = (rank) => '#' + [1, 3, 5].map((n) => Math.round(parseInt(PRICE_LIGHT[0].slice(n, n + 2), 16) + (parseInt(PRICE_LIGHT[1].slice(n, n + 2), 16) - parseInt(PRICE_LIGHT[0].slice(n, n + 2), 16)) * rank).toString(16).padStart(2, '0')).join('');
  function priceLadder() {
    const offers = session.store?.inventory.offers || {}, from = {};
    for (const [id, offer] of Object.entries(offers)) { const low = Math.min(...(offer.tiers || []).map((t) => t.price).filter(Number.isFinite)); if (Number.isFinite(low)) from[id] = low; }
    const steps = [...new Set(Object.values(from))].sort((a, b) => a - b), rank = {};
    if (steps.length > 1) for (const [id, low] of Object.entries(from)) rank[id] = steps.indexOf(low) / (steps.length - 1);
    return { steps: steps.length > 1 ? steps : [], rank };
  }

  function renderLegend() {
    const legend = $('availability-legend');
    if (!legend || !session.store) return;
    const offers = Object.keys(session.store.inventory.offers), ladder = session.workspace === 'buyer' ? priceLadder() : { steps: [] },
      dots = ladder.steps.length
        ? ladder.steps.slice(0, 4).map((_, i) => `<i class="tier" style="--tier:${(i / (ladder.steps.length - 1)).toFixed(3)}"></i>`).join('')
        : (offers.length ? offers : ['available'])
        .slice(0, 4)
        .map(
          (id, i) =>
            `<i style="background:${esc(id === 'available' ? '#2563eb' : levelColor(id, i))}"></i>`,
        )
        .join(''),
      // with more than one price, the key lists the prices in place of the single "Available" line
      priced = ladder.steps.map((low, i) => `<span class="legend-item"><i class="tier" style="--tier:${(i / (ladder.steps.length - 1)).toFixed(3)}" aria-hidden="true"></i>From ${esc(money(low))}</span>`).join('');
    let disclosure = legend.querySelector('details');
    if (!disclosure) {
      legend.setAttribute('aria-label', 'Seat availability key');
      legend.innerHTML = '<details class="map-legend-disclosure"><summary><span class="legend-preview" aria-hidden="true"></span><span>Seat key</span><svg aria-hidden="true" viewBox="0 0 12 12"><path d="m3 4.5 3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></summary><div class="map-legend-items"></div></details>';
      disclosure = legend.querySelector('details');
      const compact = matchMedia('(max-width: 760px), (max-height: 500px) and (max-width: 1024px)'), sync = () => { disclosure.open = !compact.matches; };
      sync();
      compact.addEventListener('change', sync);
      disclosure.addEventListener('keydown', event => {
        if (event.key === 'Escape' && compact.matches && disclosure.open) {
          event.preventDefault(); event.stopPropagation(); disclosure.open = false;
          disclosure.querySelector('summary').focus();
        }
      });
    }
    const items = disclosure.querySelector('.map-legend-items'),
      markup = `${priced || `<span class="legend-item"><span class="legend-offers" aria-hidden="true">${dots}</span>Available</span>`}<span class="legend-item"><i class="selected" aria-hidden="true"></i>Selected</span><span class="legend-item"><i class="locked" aria-hidden="true"></i>Locked</span><span class="legend-item"><i class="unavailable" aria-hidden="true"></i>Unavailable</span>${session.map.seats.some((s) => s.accessible || s.da) ? '<span class="legend-item"><i class="wheelchair" aria-hidden="true"></i>Wheelchair</span>' : ''}${session.map.seats.some((s) => s.exclusive) ? '<span class="legend-item"><i class="exclusive" aria-hidden="true"></i>Exclusive</span>' : ''}`;
    if (items.innerHTML !== markup) items.innerHTML = markup;
    const preview = disclosure.querySelector('.legend-preview');
    if (preview.innerHTML !== dots) preview.innerHTML = dots;
  }

  function paintSections() {
    if (!usesPlayer()) paintFlatSectionStates();
    else
      session.player?.colorSections((id) =>
        (session.workspace === 'buyer' && sectionStateColors[session.sectionAvailability?.[id]?.state]) ||
        (session.map.sectionById.get(id).ga
          ? id === session.currentSection
            ? '#246dc8'
            : id === session.hoverSection
              ? '#5b91e2'
              : '#397ade'
          : id ===
              (session.workspace === 'admin' ? session.adminActiveSection : session.currentSection)
            ? '#dbeafe'
            : id === session.hoverSection
              ? '#e8f2ff'
              : '#ffffff'),
      );
  }

  function paint() {
    session.sectionAvailability = Object.fromEntries(session.map.sections.map(section => [section.id, sectionAvailability(session.store, section, session.presentation.nearSelloutThreshold ?? .1)]));
    const selected = selectedIDs(),
      focused = new Set(session.focusSeat ? buyerUnit(session.focusSeat) : []),
      admin = new Set(session.adminSelected),
      mode = usesPlayer()
        ? session.workspace === 'admin' || session.buyerView === '2d'
          ? 'webgl-flat'
          : 'three'
        : 'flat';
    const key = [
        session.inventoryRevision,
        session.workspace,
        session.accessiblePalette,
        session.offerFilter,
        session.adminScope,
      ].join('/'),
      previous = rendered[mode];
    const ids =
      previous?.key === key
        ? new Set([
            ...previous.selected,
            ...selected,
            ...previous.focused,
            ...focused,
            ...previous.admin,
            ...admin,
          ])
        : null;
    const offerIds = Object.keys(session.store.inventory.offers),
      palette = session.accessiblePalette
        ? ['#0072B2', '#E69F00', '#009E73', '#CC79A7', '#56B4E9', '#D55E00']
        : levelPalette,
      offerColors = new Map(
        offerIds.map((id, i) => [
          id,
          session.accessiblePalette ? palette[i % palette.length] : levelColor(id, i),
        ]),
      );
    const ladder = session.workspace === 'buyer' ? priceLadder() : { steps: [], rank: {} };
    const color = (id) =>
      session.workspace === 'admin'
        ? admin.has(id)
          ? '#97dd62'
          : offerColors.get(session.store.inventory.assignments[id]) || '#d4dde8'
        : selected.has(id)
          ? '#97dd62'
          : focused.has(id)
            ? '#f5a524'
            : session.store.status(id) === 'available'
              ? session.offerFilter &&
                session.store.inventory.assignments[id] !== session.offerFilter
                ? '#cbd3dd'
                : ladder.rank[session.store.inventory.assignments[id]] !== undefined
                  ? shade(ladder.rank[session.store.inventory.assignments[id]])
                  : offerColors.get(session.store.inventory.assignments[id]) || '#2563eb'
              : session.store.status(id) === 'locked'
                ? '#334155'
                : '#d4dde8';
    if (mode !== 'flat') {
      if (mode === 'webgl-flat')
        session.player.setFlatContext({
          workspace: session.workspace,
          sectionId:
            session.workspace === 'admin' ? session.adminActiveSection : session.currentSection,
          scope: session.adminScope,
          selected: session.workspace === 'admin' ? admin : selected,
          focused,
          locked: session.map.seats
            .filter((s) => session.store.status(s.id) === 'locked')
            .map((s) => s.id),
          disabled: session.map.seats
            .filter((s) => !['available', 'locked'].includes(session.store.status(s.id)))
            .map((s) => s.id),
          sectionAvailability: session.workspace === 'buyer' ? session.sectionAvailability : {},
          // the price ramp for the map: which shade stands for which rank, and each section's cheapest open price as a rank
          priceRamp: Object.fromEntries(Object.values(ladder.rank).map((rank) => [shade(rank), rank])),
          sectionTier: ladder.steps.length
            ? Object.fromEntries(session.map.sections.filter((s) => !s.killed).map((s) => { let best = Infinity; if (s.ga) { const pool = session.store.inventory.ga[s.id], rank = pool && !pool.locked && pool.sold < pool.capacity ? ladder.rank[pool.offerId] : undefined; if (rank !== undefined) best = rank; } else for (const id of s.seats || []) { if (session.store.status(id) !== 'available') continue; const rank = ladder.rank[session.store.inventory.assignments[id]]; if (rank !== undefined && rank < best) best = rank; } return [s.id, best]; }).filter(([, rank]) => Number.isFinite(rank)))
            : {},
          allocated: Object.fromEntries(
            Object.entries(session.store.inventory.ga).map(([id, pool]) => [id, pool.allocated]),
          ),
        });
      session.player?.setGroupedSeats(
        [...session.store.cart.values()]
          .map((line) => line.seatIds)
          .filter((ids) => ids?.length > 1),
      );
      session.player?.setActiveSeat([...focused]);
      session.player?.colorSeats(color, ids);
    } else paintFlatMap(ids, color, selected, focused);
    rendered[mode] = { key, selected, focused, admin };
    paintSections();
  }

  function paintFlatMap(ids, color, chosen, focused) {
    const root = session.svgInfo?.root;
    if (!root) return;
    const ns = 'http://www.w3.org/2000/svg';
    let updates = 0;
    for (const id of ids || session.flatElements.keys()) {
      const record = session.flatElements.get(id);
      if (!record) continue;
      const { el } = record,
        seat = session.map.seatById.get(id),
        status = session.store.status(id),
        section = seat && session.map.sectionById.get(seat.sectionId),
        accessible = seat.accessible || seat.da;
      if (section?.ga) {
        el.style.display = 'none';
        continue;
      }
      el.style.display = '';
      const selected =
          session.workspace === 'admin' ? session.adminSelected.has(id) : chosen.has(id),
        pending = session.workspace === 'buyer' && focused.has(id) && !selected;
      const fill =
          accessible && status === 'available' && !selected && !pending ? '#dceeff' : color(id),
        key = [fill, selected, pending, status, session.workspace].join('/');
      if (record.key === key) continue;
      record.key = key;
      updates++;
      el.setAttribute('fill', fill);
      el.style.setProperty('--seat-color', fill);
      el.toggleAttribute('data-seat-pending', pending);
      el.toggleAttribute('data-seat-confirmed', session.workspace === 'buyer' && selected);
      // Rendering state remains in JS; original imported SVG text is never rewritten.
      if (accessible || status === 'locked') {
        let title = record.title;
        if (!title) {
          title = document.createElementNS(ns, 'title');
          el.append(title);
          record.title = title;
        }
        title.textContent = `Section ${seat.sectionNumber} · Row ${seat.rowNumber} · Seat ${seat.number}${accessible ? ' · Wheelchair accessible space' : ''}${status === 'locked' ? ' · Locked seat' : ''}`;
      } else {
        record.title?.remove();
        record.title = null;
      }
      const markKind =
        session.workspace === 'buyer' && selected
          ? 'check'
          : !chosen.has(id)
            ? accessible && status === 'available'
              ? 'accessible'
              : status === 'locked'
                ? 'locked'
                : null
            : null;
      const old = session.flatMarks.get(id);
      if (old?.kind === markKind) continue;
      old?.el.remove();
      session.flatMarks.delete(id);
      if (!markKind) continue;
      const b = record.bounds || (record.bounds = el.getBBox());
      let mark;
      mark = document.createElementNS(ns, 'svg');
      const size = Math.min(b.width, b.height) * (markKind === 'check' ? 0.7 : accessible ? 0.92 : 0.7);
      for (const [name, value] of Object.entries({
        x: b.x + (b.width - size) / 2,
        y: b.y + (b.height - size) / 2,
        width: size,
        height: size,
        viewBox: '0 0 256 256',
        class: 'flat-seat-symbol',
      }))
        mark.setAttribute(name, value);
      const glyph =
        markKind === 'check' ? 'check' : markKind === 'locked' ? 'lock-key' : 'wheelchair';
      mark.innerHTML = new DOMParser().parseFromString(
        icons[glyph],
        'image/svg+xml',
      ).documentElement.innerHTML;
      if (el.hasAttribute('transform'))
        mark.setAttribute('transform', el.getAttribute('transform'));
      el.parentNode.append(mark);
      session.flatMarks.set(id, { kind: markKind, el: mark });
    }
    $('admin-map').dataset.seatsUpdated = String(updates);
    if (session.workspace === 'admin')
      for (const section of session.map.sections.filter((s) => s.ga)) {
        const value = session.store.inventory.ga[section.id]?.allocated;
        let label = session.gaLabels.get(section.id);
        if (!Number.isInteger(value)) {
          label?.remove();
          session.gaLabels.delete(section.id);
          continue;
        }
        if (!label) {
          const group = session.flatSections.find((el) => el.dataset.sectionId === section.id);
          if (!group) continue;
          const b = group.getBBox();
          label = document.createElementNS(ns, 'text');
          label.setAttribute('class', 'ga-allocation-label');
          label.setAttribute('x', b.x + b.width / 2);
          label.setAttribute('y', b.y + b.height / 2);
          group.append(label);
          session.gaLabels.set(section.id, label);
        }
        label.textContent = String(value);
      }
    for (const label of session.gaLabels.values())
      label.style.display = session.workspace === 'admin' ? '' : 'none';
    renderFlatUnitCues();
  }

  function renderFlatUnitCues() {
    const root = session.svgInfo?.root;
    if (!root) return;
    const groups = new Map();
    if (session.workspace === 'buyer')
      for (const line of session.store.cart.values())
        if (line.seatIds?.length > 1)
          groups.set(line.seatIds.join('|'), { ids: line.seatIds, state: 'selected' });
    const focus = session.focusSeat ? buyerUnit(session.focusSeat) : [];
    if (focus.length > 1)
      groups.set(focus.join('|'), {
        ids: focus,
        state: selectedIDs().has(focus[0]) ? 'selected' : 'focused',
      });
    if (!session.focusSeat && session.hoverUnitIds.length > 1)
      groups.set(session.hoverUnitIds.join('|'), { ids: session.hoverUnitIds, state: 'hovered' });
    const signature = [
      session.workspace,
      ...[...groups.values()].map((group) => group.state + ':' + group.ids.join(',')),
    ].join('|');
    if (signature === session.flatUnitCueSignature) return;
    session.flatUnitCueSignature = signature;
    root.querySelector('.seat-unit-cues')?.remove();
    if (!groups.size) return;
    const ns = 'http://www.w3.org/2000/svg',
      layer = document.createElementNS(ns, 'g');
    layer.setAttribute('class', 'seat-unit-cues');
    for (const { ids, state } of groups.values()) {
      const points = ids
        .map((id) => {
          const el = session.flatElements.get(id)?.el,
            b = el?.getBBox(),
            rootMatrix = root.getCTM(),
            seatMatrix = el?.getCTM();
          if (!b || !rootMatrix || !seatMatrix) return null;
          return new DOMPoint(b.x + b.width / 2, b.y + b.height / 2).matrixTransform(
            rootMatrix.inverse().multiply(seatMatrix),
          );
        })
        .filter(Boolean);
      if (points.length < 2) continue;
      const cue = document.createElementNS(ns, 'g');
      cue.setAttribute('class', 'seat-unit-cue');
      cue.dataset.state = state;
      const path = document.createElementNS(ns, 'path');
      path.setAttribute('class', 'seat-unit-link');
      path.setAttribute('d', points.map((p, i) => (i ? 'L ' : 'M ') + p.x + ' ' + p.y).join(' '));
      cue.append(path);
      layer.append(cue);
    }
    root.append(layer);
  }

  function paintFlatSectionStates() {
    for (const el of session.flatSections) {
      const hovered = el.dataset.sectionId === session.hoverSection,
        active =
          el.dataset.sectionId ===
          (session.workspace === 'admin' ? session.adminActiveSection : session.currentSection);
      if (el.hasAttribute('data-section-hovered') !== hovered)
        el.toggleAttribute('data-section-hovered', hovered);
      if (el.hasAttribute('data-section-active') !== active)
        el.toggleAttribute('data-section-active', active);
    }
    session.refreshNavigator?.();
  }

  function refresh() {
    if (!session.map) return;
    document.body.classList.toggle(
      'seat-focused',
      session.workspace === 'buyer' && !!session.focusSeat,
    );
    session.player?.setHoverEnabled(true);
    document.body.dataset.selectionScope = session.adminScope;
    for (const b of document.querySelectorAll('[data-map-scope]'))
      b.classList.toggle('active', b.dataset.mapScope === session.adminScope);
    renderLegend();
    session.workspace === 'admin' ? renderAdmin() : renderBuyer();
    paint();
    if (sandbox) {
      const cart = $('sidebar').querySelector('.cart');
      $('sandbox-cart').textContent =
        `${session.store.quantity} tickets · ${money(session.store.subtotal)} · Review`;
      document.body.classList.toggle(
        'sandbox-ga',
        !!session.map.sectionById.get(session.currentSection)?.ga,
      );
    }
    mobileShell?.update({
      workspace: session.workspace,
      quantity: session.store.quantity,
      total: money(session.store.subtotal),
      selection: session.adminSelected.size + session.adminSelectedGA.size,
    });
    $('inventory-mode').textContent = session.store.inventory.demo
      ? 'Demo inventory · no live sales'
      : 'Local inventory · backend not connected';
  }

  return { paintSections, paint, renderFlatUnitCues, paintFlatSectionStates, refresh };
}
