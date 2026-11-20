import { icons } from './icons.js';
import { seatInformationHTML, offerChipHTML, seasonChipHTML } from './buyer-popups.js';
import { contrastText } from './buyer-inventory.js';

// buyer panel: session data and callbacks are injected by buyer-app.
export function createBuyerPanel({
  state: session,
  $,
  buyerUnit,
  esc,
  guard,
  focusBestAvailable,
  levelColor,
  message,
  money,
  offerOptions,
  paint,
  publicOfferIds,
  refresh,
  renderPopup,
  resetOverview,
  seatNumberLabel,
  selectedIDs,
  showSection,
  tiers,
}) {
  function cartHTML() {
    return `<div class="cart"><div class="eyebrow">YOUR SELECTION · ${session.store.quantity} TICKETS</div>${
      [...session.store.cart.values()]
        .map((l) => {
          const s = session.map.sectionById.get(l.sectionId),
            seat = l.seatIds ? session.map.seatById.get(l.seatIds[0]) : null,
            offer = session.store.inventory.offers[l.offerId],
            tier = offer.tiers.find((t) => t.id === l.tierId);
          return `<div class="cart-line"><div><b>${esc(s.name)}</b><small>${seat ? `Row ${esc(seat.rowNumber)} · Seats ${l.seatIds.map((id) => esc(session.map.seatById.get(id).number)).join(', ')}` : `General admission · ${l.quantity} ticket${l.quantity === 1 ? '' : 's'}`}</small><small>${esc(offer.name)} · ${esc(tier.name)} · ${money(l.price)} each</small></div><div><b>${money(l.price * l.quantity)}</b> <button class="remove icon-only" data-remove="${esc(l.key)}" aria-label="Remove tickets from ${esc(s.name)}${seat ? `, row ${esc(seat.rowNumber)}, seats ${esc(seatNumberLabel(l.seatIds))}` : ''}">${icons.x}</button></div></div>`;
        })
        .join('') || '<p class="fine">Your selected seats and GA tickets appear here.</p>'
    }<div class="subtotal"><span>Subtotal</span><strong>${money(session.store.subtotal)}</strong></div></div>`;
  }

  function seatDetails() {
    const s = session.map.seatById.get(session.focusSeat),
      offer = session.store.inventory.offers[session.store.inventory.assignments[s.id]],
      unit = buyerUnit(s.id),
      line = session.store.cart.get('seat:' + unit[0]),
      status = session.store.status(s.id),
      section = session.map.sectionById.get(s.sectionId);
    return `<div class="seat-card"><span class="eyebrow">${esc(status.toUpperCase())}${s.accessible ? ' · ACCESSIBLE' : ''}</span><div class="seat-bits"><div><span>SEC</span><strong>${esc(section.number)}</strong></div><div><span>ROW</span><strong>${esc(s.rowNumber)}</strong></div><div><span>SEAT</span><strong>${esc(seatNumberLabel(unit))}</strong></div></div>${seatInformationHTML(s)}${status === 'locked' ? unlockHTML() : `${offer ? `<label for="seat-tier">${esc(offer.name)} · price tiers</label><select id="seat-tier">${tiers(offer, line?.tierId)}</select>` : '<p class="message">This seat has not been released to an offer.</p>'}<p class="fine">${unit.length > 1 ? `Sold together as ${unit.length} seats.` : 'Individual seat selection.'}</p><button id="toggle-seat" class="primary" ${status !== 'available' ? 'disabled' : ''}>${line ? 'Remove from selection' : 'Add to selection'}</button>`}</div>`;
  }

  function unlockHTML() {
    return `<label for="unlock-code">Unlock code</label><input id="unlock-code" type="password" placeholder="Enter code" autocomplete="off"><button id="unlock" class="primary">Unlock access</button><p class="fine">${session.store.inventory.demo ? 'Demo code: DEMO. No real access is granted.' : 'Live unlock authorization is not connected in this preview.'}</p>`;
  }

  function popupUnlockHTML(scope = 'popup') {
    const prefix = scope === 'ga' ? '' : 'popup-';
    return `<div class="popup-unlock locked-offer-panel"><div class="locked-offer-icon"><img src="./runtime/assets/figma/lock.svg" alt="" aria-hidden="true"></div><b>Locked offer</b><small>Enter an access code to reveal purchasing options.</small><div class="locked-offer-form"><input id="${prefix}unlock-code" type="password" placeholder="Add access code" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="done" aria-label="Access code"><button id="${prefix}unlock">Unlock</button></div></div>`;
  }

  const gaQtyShown = { value: null, dir: '', at: 0 };
  function gaDetails() {
    const section = session.map.sectionById.get(session.currentSection),
      pool = session.store.inventory.ga[session.currentSection],
      locked = !!pool?.locked && !session.store.unlocked.has(session.currentSection),
      offer = locked ? null : session.store.inventory.offers[pool?.offerId],
      line = session.store.cart.get('ga:' + session.currentSection),
      remaining = pool ? pool.capacity - pool.sold : 0,
      offerColor = levelColor(
        pool?.offerId,
        Object.keys(session.store.inventory.offers).indexOf(pool?.offerId),
      ),
      selectedTier = session.gaTier || line?.tierId || offer?.tiers[0]?.id,
      tier = offer?.tiers.find((t) => t.id === selectedTier) || offer?.tiers[0],
      caption = section?.gaCaption || 'Non-reserved seating · standing admission',
      tierRows = offer?.tiers
        .map(
          (t) =>
            `<button class="bt-offer ${t.id === tier?.id ? 'is-chosen' : ''}" data-ga-tier-id="${esc(t.id)}" aria-pressed="${t.id === tier?.id}"><i>${icons.check}</i><span class="bt-offer-name">${esc(t.name)}</span><span class="bt-offer-price"><b>${money(t.price)}</b></span></button>`,
        )
        .join('');
    if (session.gaQuantity !== gaQtyShown.value) {
      gaQtyShown.dir = gaQtyShown.value == null ? '' : session.gaQuantity > gaQtyShown.value ? 'is-up' : 'is-down';
      gaQtyShown.value = session.gaQuantity;
      gaQtyShown.at = Date.now();
    }
    const qtyMotion = gaQtyShown.dir && Date.now() - gaQtyShown.at < 350 ? gaQtyShown.dir : '';
    const name = section?.displayName || section?.number || section?.name || 'GA';
    return `<div class="bt-pass bt-pass--ga"><div class="bt-pass-top"><span class="bt-chip" data-level-slot></span>${locked || !offer ? '' : offerChipHTML(offer.name || 'General admission', offerColor || '#0485f7')}</div><h2 class="bt-title">${esc(name)}</h2><p class="bt-sub">${esc(caption)}${remaining > 0 && remaining < 50 ? ` · ${remaining} left` : ''}</p></div>${seasonChipHTML()}${locked ? popupUnlockHTML('ga') : pool && offer ? `<div class="bt-offers" role="group" aria-label="Choose a ticket type">${tierRows}</div><div class="bt-buy"><div class="bt-step"><button id="ga-minus" aria-label="Decrease quantity" ${session.gaQuantity <= 1 ? 'disabled' : ''}>${icons.minus}</button><input id="ga-quantity" class="${qtyMotion}" type="number" inputmode="numeric" min="1" max="${remaining}" value="${session.gaQuantity}" aria-label="Ticket quantity"><button id="ga-plus" aria-label="Increase quantity" ${session.gaQuantity >= remaining ? 'disabled' : ''}>${icons.plus}</button></div><button id="add-ga" class="primary" ${remaining <= 0 ? 'disabled' : ''}>${line ? 'Update' : 'Add'} tickets · ${money(session.gaQuantity * (tier?.price || 0))}</button></div><p class="bt-offers-note">Prices include taxes and fees</p>` : `<div class="popup-empty">${pool ? 'This section has not been released to an offer.' : 'No capacity was exported for this section.'}</div>`}`;
  }

  function listingHTML() {
    const listings = [];
    for (const row of session.map.rows) {
      const groups = new Map();
      for (const id of row.seats) {
        const offerId = session.store.inventory.assignments[id];
        if (
          !offerId ||
          (session.offerFilter && offerId !== session.offerFilter) ||
          session.store.status(id) !== 'available'
        )
          continue;
        const key = offerId;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(id);
      }
      for (const [offerId, ids] of groups) {
        const offer = session.store.inventory.offers[offerId],
          section = session.map.sectionById.get(row.sectionId),
          price = Math.min(...offer.tiers.map((t) => t.price));
        listings.push({
          sectionId: section.id,
          title: `${section.name} · Row ${row.number}`,
          offer,
          ids,
          price,
          ga: false,
        });
      }
    }
    for (const s of session.map.sections.filter((s) => s.ga)) {
      const g = session.store.inventory.ga[s.id],
        o = session.store.inventory.offers[g?.offerId];
      if (
        g &&
        o &&
        (!g.locked || session.store.unlocked.has(s.id)) &&
        g.capacity > g.sold &&
        (!session.offerFilter || session.offerFilter === g.offerId)
      )
        listings.push({
          sectionId: s.id,
          title: s.name,
          offer: o,
          ids: [],
          price: Math.min(...o.tiers.map((t) => t.price)),
          ga: true,
          count: g.capacity - g.sold,
        });
    }
    listings.sort((a, b) => a.price - b.price);
    return `<span class="eyebrow">FIND YOUR TICKETS</span><h2>Choose your view.</h2><p>Browse tickets or click a section on the map.</p><div class="best-available"><strong>${icons.seat} Find seats together</strong><div><button id="best-minus" aria-label="Fewer seats">${icons.minus}</button><span>${session.bestQuantity}</span><button id="best-plus" aria-label="More seats">${icons.plus}</button><button id="find-best" class="primary">Find best available</button></div></div><label for="offer-filter">Ticket category</label><select id="offer-filter"><option value="">All available offers</option>${offerOptions(session.offerFilter, publicOfferIds())}</select><label class="palette-toggle"><input id="accessible-palette" type="checkbox" ${session.accessiblePalette ? 'checked' : ''}> Colourblind-friendly colours</label><div class="fine">${listings.length} listings · sorted by starting price</div><div class="section-list">${
      listings
        .slice(0, session.listingLimit)
        .map(
          (l) =>
            `<button class="listing" data-visit="${esc(l.sectionId)}"><div class="listing-top"><span>${icons.seat}${esc(l.title)}</span><strong>${money(l.price)}</strong></div><small>${esc(l.offer.name)} · ${l.ga ? `${l.count} GA tickets` : l.ids.length + ' seats'} · from / each</small></button>`,
        )
        .join('') ||
      '<div class="message">No offers are available yet. Use the map to unlock protected inventory.</div>'
    }</div>${listings.length > session.listingLimit ? '<button id="more-listings" class="secondary">Show more listings</button>' : ''}`;
  }

  function findBestAvailable() {
    for (const row of session.map.rows) {
      let run = [];
      for (const id of row.seats) {
        const matches =
          session.store.status(id) === 'available' &&
          session.store.inventory.assignments[id] &&
          (!session.offerFilter || session.store.inventory.assignments[id] === session.offerFilter);
        if (matches) run.push(id);
        else run = [];
        if (run.length >= session.bestQuantity) {
          const ids = run.slice(-session.bestQuantity),
            tier =
              session.store.inventory.offers[session.store.inventory.assignments[ids[0]]]
                ?.tiers?.[0];
          if (!tier) continue;
          for (const seatId of ids)
            if (!selectedIDs().has(seatId)) session.store.addSeat(seatId, tier.id);
          focusBestAvailable(row.sectionId, ids[0]);
          message(
            `${session.bestQuantity} seats together found in ${session.map.sectionById.get(row.sectionId).name}, row ${row.number}.`,
          );
          return;
        }
      }
    }
    message('No contiguous seats match those preferences.');
  }

  function renderBuyer() {
    updateSelectionStatus();
    const section = session.map.sectionById.get(session.currentSection);
    const oldSidebarKey = session.sidebarKey;
    const nextSidebarKey = [
      session.inventoryRevision,
      session.currentSection,
      session.offerFilter,
      session.listingLimit,
      session.accessiblePalette,
    ].join('/');
    if (session.sidebarKey !== nextSidebarKey) {
      session.sidebarKey = nextSidebarKey;
      session.cartMarkup = '';
      $('sidebar').innerHTML = section
        ? `<div class="section-context"><button id="all-listings" class="link-button">${icons['arrow-left']} All listings</button><h2>${esc(section.name)}</h2><p>${section.ga ? 'Buy from this shared admission pool.' : `Choose a seat on the map. Offers and unlock options open beside the seat.`}</p></div>${cartHTML()}`
        : listingHTML() + cartHTML();
    } else renderCartOnly();
    renderPopup();
    if (oldSidebarKey !== nextSidebarKey) {
      $('offer-filter')?.addEventListener('change', (e) => {
        session.offerFilter = e.target.value;
        refresh();
      });
      $('more-listings')?.addEventListener('click', () => {
        session.listingLimit += 60;
        refresh();
      });
      $('best-minus')?.addEventListener('click', () => {
        session.bestQuantity = Math.max(1, session.bestQuantity - 1);
        refresh();
      });
      $('best-plus')?.addEventListener('click', () => {
        session.bestQuantity = Math.min(8, session.bestQuantity + 1);
        refresh();
      });
      $('find-best')?.addEventListener('click', guard(findBestAvailable));
      $('accessible-palette')?.addEventListener('change', (e) => {
        session.accessiblePalette = e.target.checked;
        refresh();
      });
      for (const b of $('sidebar').querySelectorAll('[data-visit]'))
        b.onclick = () => showSection(b.dataset.visit);
      $('all-listings')?.addEventListener('click', resetOverview);
    }
    $('toggle-seat')?.addEventListener(
      'click',
      guard(() => {
        const key = 'seat:' + session.store.unit(session.focusSeat)[0];
        if (session.store.cart.has(key)) session.store.cart.delete(key);
        else session.store.addSeat(session.focusSeat, $('seat-tier').value);
        refresh();
      }),
    );
    $('seat-tier')?.addEventListener(
      'change',
      guard((e) => {
        if (session.store.cart.has('seat:' + session.store.unit(session.focusSeat)[0]))
          session.store.addSeat(session.focusSeat, e.target.value);
        paint();
        renderCartOnly();
      }),
    );
    $('unlock')?.addEventListener(
      'click',
      guard(() => {
        if (!session.store.inventory.demo)
          throw Error('Connect the admin unlock endpoint before granting access.');
        if ($('unlock-code').value !== 'DEMO') throw Error('That code is not valid for this demo.');
        if (session.focusSeat) session.store.unlockSeat(session.focusSeat);
        else session.store.unlocked.add(session.currentSection);
        session.inventoryRevision++;
        message('Demo access unlocked.');
        refresh();
      }),
    );
    function quantity(delta) {
      const max = Math.max(
        1,
        session.store.inventory.ga[session.currentSection].capacity -
          session.store.inventory.ga[session.currentSection].sold,
      );
      session.gaQuantity = Math.max(1, Math.min(max, session.gaQuantity + delta));
      refresh();
    }
    $('ga-minus')?.addEventListener('click', () => quantity(-1));
    $('ga-plus')?.addEventListener('click', () => quantity(1));
    $('ga-quantity')?.addEventListener('input', (e) => {
      session.gaQuantity = Number(e.target.value);
    });
    $('ga-quantity')?.addEventListener('change', (e) => {
      const max = Math.max(
        1,
        session.store.inventory.ga[session.currentSection].capacity -
          session.store.inventory.ga[session.currentSection].sold,
      );
      session.gaQuantity = Math.max(1, Math.min(max, Number(e.target.value) || 1));
      refresh();
    });
    for (const button of $('seat-popup').querySelectorAll('[data-ga-tier-id]'))
      button.addEventListener('click', () => {
        session.gaTier = button.dataset.gaTierId;
        refresh();
      });
    $('add-ga')?.addEventListener(
      'click',
      guard(() => {
        const g = session.store.inventory.ga[session.currentSection],
          tierId =
            session.gaTier ||
            session.store.cart.get('ga:' + session.currentSection)?.tierId ||
            session.store.inventory.offers[g?.offerId]?.tiers[0]?.id;
        session.store.addGA(session.currentSection, Number($('ga-quantity').value), tierId);
        message('General admission selection updated.');
        refresh();
      }),
    );
    const bestCounter = $('sidebar').querySelector('.best-available div>span');
    if (bestCounter) bestCounter.textContent = String(session.bestQuantity);
    bindCart();
  }

  let selectionStatus, lastSelectionSummary = '';
  function updateSelectionStatus() {
    if (!selectionStatus) {
      selectionStatus = document.createElement('span');
      selectionStatus.className = 'map-selection-status';
      selectionStatus.setAttribute('role', 'status');
      selectionStatus.setAttribute('aria-atomic', 'true');
      $('map-area').append(selectionStatus);
    }
    const quantity = session.store.quantity;
    const summary = `${quantity} ticket${quantity === 1 ? '' : 's'} · ${money(session.store.subtotal)}`;
    if (summary !== lastSelectionSummary) {
      if (lastSelectionSummary || quantity) selectionStatus.textContent = `Selection updated: ${summary}`;
      lastSelectionSummary = summary;
    }
  }

  function bindCart() {
    for (const b of $('sidebar').querySelectorAll('[data-remove]'))
      b.onclick = () => {
        session.store.cart.delete(b.dataset.remove);
        refresh();
      };
  }

  function renderCartOnly() {
    const html = cartHTML();
    if (html === session.cartMarkup) return;
    session.cartMarkup = html;
    const el = $('sidebar').querySelector('.cart');
    if (el) {
      const temp = document.createElement('div');
      temp.innerHTML = html;
      el.replaceWith(temp.firstElementChild);
      bindCart();
    }
  }

  return { popupUnlockHTML, gaDetails, renderBuyer };
}
