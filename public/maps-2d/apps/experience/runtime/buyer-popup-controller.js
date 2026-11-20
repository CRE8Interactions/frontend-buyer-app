import {sectionAvailability} from './section-availability.js';
import { setPopupVisible, openPopupDialog, seatInformationHTML, passIdsHTML, offerChipHTML, seasonChipHTML, seeViewHTML } from './buyer-popups.js';
import { locatorSVG } from './seat-locator.js';
import { startingPrice, contrastText } from './buyer-inventory.js';
import { icons } from './icons.js';
import { playerViewport, observePlayerViewport } from './player-viewport.js';
import { mountOrb } from './thinking-orb.js';

// buyer popup controller: session data and callbacks are injected by buyer-app.
export function createBuyerPopupController({
  state: session,
  $,
  buyerSeatInteractive,
  buyerUnit,
  esc,
  gaDetails,
  guard,
  levelColor,
  message,
  money,
  paintSections,
  popupUnlockHTML,
  refresh,
  returnFromSeat,
  restoreSeatView,
  seatDeckLabel,
  seatInfoLabel,
  seatNumberLabel,
  selectedIDs,
  enterSeatView,
  usesPlayer,
}) {
  function dismissPopup() {
    const sectionId = session.currentSection;
    session.focusSeat = null;
    session.suppressSeatPopup = true;
    refresh();
    const badge = [...document.querySelectorAll('.section-annotation-badge:not([hidden])')]
      .find(button => button.dataset.sectionId === sectionId);
    (badge || $('overview'))?.focus({ preventScroll: true });
  }
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || $('seat-popup').hidden || document.querySelector('dialog[open]')) return;
    event.preventDefault();
    dismissPopup();
  });

  function finishPopup(popup, previousFocus, wasVisible) {
    // a card with no seat behind it (a standing section, a sold-out one) is a bottom sheet on a phone too
    if (popup.classList.contains('ga-popup')) { if (sheetMode()) placeSheet(popup); else popup.classList.remove('bt-sheet'); }
    popup.setAttribute('role', 'region');
    popup.setAttribute('aria-label', 'Ticket offers');
    const sectionId = session.map.seatById.get(session.focusSeat)?.sectionId || session.currentSection;
    const section = session.map.sectionById.get(sectionId);
    const level = section ? seatDeckLabel(section) : '';
    if (level) popup.dataset.level = level;
    else delete popup.dataset.level;
    popup.tabIndex = -1;
    const slot = popup.querySelector('[data-level-slot]');
    if (slot) {
      if (level) slot.textContent = level;
      else slot.remove();
    }
    const replacement = previousFocus?.id ? document.getElementById(previousFocus.id)
      : [...popup.querySelectorAll('[data-tier-id], [data-ga-tier-id]')].find(button =>
        previousFocus?.tier && button.dataset.tierId === previousFocus.tier ||
        previousFocus?.gaTier && button.dataset.gaTierId === previousFocus.gaTier);
    if (previousFocus || !wasVisible) (replacement || popup).focus({ preventScroll: true });
  }

  function buyerHover(hit) {
    if (document.body.classList.contains('map-loading')) {
      setPopupVisible($('map-hover-card'), false);
      return;
    }
    if (session.focusSeat) {
      setPopupVisible($('map-hover-card'), false);
      return;
    }
    const card = $('map-hover-card'),
      next = hit?.sectionId || null;
    if (next !== session.hoverSection) {
      session.hoverSection = next;
      paintSections();
    }
    if (
      !hit ||
      session.workspace !== 'buyer' ||
      (!hit.seatId && hit.sectionId === session.currentSection) ||
      session.player?.navigationState().view === 'seat'
    ) {
      setPopupVisible(card, false);
      return;
    }
    delete card.dataset.availability;
    let html;
    if (hit.seatId) {
      const s = session.map.seatById.get(hit.seatId);
      if (!s || !buyerSeatInteractive(s.id)) {
        setPopupVisible(card, false);
        return;
      }
      const section = session.map.sectionById.get(s.sectionId),
        level = seatDeckLabel(section),
        locked = session.store.status(s.id) === 'locked',
        offerId = session.store.inventory.assignments[s.id],
        offer = locked ? null : session.store.inventory.offers[offerId],
        price = startingPrice(offer),
        count = offer?.tiers?.length || 0;
      if (level) card.dataset.level = level;
      else delete card.dataset.level;
      card.className = 'seat-popover';
      html = `${seatInformationHTML(s, true)}<div class="bt-pass bt-pass--hover">${level ? `<div class="bt-pass-top"><span class="bt-chip">${esc(level)}</span></div>` : ''}${passIdsHTML(s.sectionNumber, s.rowNumber, seatNumberLabel(buyerUnit(s.id)))}</div>${locked ? `<div class="bt-price bt-price--locked"><span><img src="./runtime/assets/figma/lock.svg" alt="" aria-hidden="true">Locked offer</span><strong>Unlock to view</strong></div>` : `<div class="bt-price"><span><i aria-hidden="true"></i>${count || 'No'} offer${count === 1 ? '' : 's'} from</span><strong>${price === null ? 'Price pending' : money(price)}</strong></div>`}`;
    } else {
      const section = session.map.sectionById.get(hit.sectionId);
      if (!section) {
        setPopupVisible(card, false);
        return;
      }
      const level = seatDeckLabel(section);
      if (level) card.dataset.level = level;
      else delete card.dataset.level;
      let price = null,
        locked = false;
      if (section.ga) {
        const pool = session.store.inventory.ga[section.id];
        locked = !!pool?.locked && !session.store.unlocked.has(section.id);
        if (!locked) price = startingPrice(session.store.inventory.offers[pool?.offerId]);
      } else {
        const available = section.seats.filter((id) => session.store.status(id) === 'available'),
          prices = available
            .map((id) =>
              startingPrice(
                session.store.inventory.offers[session.store.inventory.assignments[id]],
              ),
            )
            .filter(Number.isFinite);
        price = prices.length ? Math.min(...prices) : null;
        locked =
          !available.length && section.seats.some((id) => session.store.status(id) === 'locked');
      }
      const stock = sectionAvailability(session.store, section, session.presentation.nearSelloutThreshold ?? .1);
      card.dataset.availability = stock.state;
      card.className = locked ? 'section-popover locked-section-popover' : 'section-popover';
      html = stock.state === 'killed'
        ? '<strong>Unavailable</strong>'
        : stock.state === 'sold-out'
        ? '<strong><i aria-hidden="true">●</i>Sold out</strong>'
        : locked
        ? `<span>${icons['lock-key']} Locked offer</span><strong>Unlock to view</strong>`
        : `<span>${stock.state === 'nearly-sold-out' ? 'Few left from' : 'From'}</span><strong><i aria-hidden="true">●</i>${price === null ? 'Price pending' : money(price)}</strong>`;      // the tooltip leads with the section it is about: "Sec 104", or the full name where the section has one ("Suite Overflow")
      const tipName = String(section.name ?? '').trim();
      if (tipName) html = `<b class="bt-tip-sec">${esc(/^[A-Za-z]{0,2}\d+[A-Za-z]?$/.test(tipName) ? 'Sec ' + tipName : tipName)}</b>` + html;
    }
    if (card.innerHTML !== html) card.innerHTML = html;
    setPopupVisible(card, true);
    const area = $('map-area').getBoundingClientRect(),
      width = card.offsetWidth, height = card.offsetHeight, edge = 10, gap = 12,
      badge = document.elementFromPoint(hit.clientX, hit.clientY)?.closest('.section-annotation-badge'),
      rect = badge?.getBoundingClientRect(),
      anchor = rect
        ? {left:rect.left-area.left,right:rect.right-area.left,top:rect.top-area.top,bottom:rect.bottom-area.top}
        : {left:hit.clientX-area.left,right:hit.clientX-area.left,top:hit.clientY-area.top,bottom:hit.clientY-area.top},
      candidates = [
        {x:anchor.right+gap,y:anchor.top},
        {x:anchor.left-width-gap,y:anchor.top},
        {x:anchor.left+(anchor.right-anchor.left-width)/2,y:anchor.bottom+gap},
        {x:anchor.left+(anchor.right-anchor.left-width)/2,y:anchor.top-height-gap},
      ],
      clamp = (value, max) => Math.max(edge, Math.min(value, Math.max(edge, max-edge))),
      positioned = candidates.map(p => ({x:clamp(p.x,area.width-width),y:clamp(p.y,area.height-height)})),
      clear = p => p.x+width <= anchor.left-gap || p.x >= anchor.right+gap || p.y+height <= anchor.top-gap || p.y >= anchor.bottom+gap,
      position = positioned.find(clear) || positioned[0];
    card.style.left = position.x + 'px';
    card.style.top = position.y + 'px';
    card.style.transformOrigin = `${Math.round(hit.clientX - area.left - position.x)}px ${Math.round(hit.clientY - area.top - position.y)}px`;
  }

  function seatPhotoFor(seat) {
    return (
      seat?.viewPhoto ||
      seat?.photo ||
      session.map.sectionById.get(seat?.sectionId)?.viewPhoto ||
      null
    );
  }

  function focusedSeatBounds() {
    if (!session.focusSeat) return null;
    const ids = buyerUnit(session.focusSeat),
      rects = [];
    if (usesPlayer())
      for (const id of ids) {
        const p = session.player?.projectSeat(id);
        if (p && Number.isFinite(p.x) && Number.isFinite(p.y))
          rects.push(
            p.bounds
              ? { ...p.bounds, closeup: true }
              : {
                  left: p.x - (p.radius || 14),
                  right: p.x + (p.radius || 14),
                  top: p.y - (p.radius || 14),
                  bottom: p.y + (p.radius || 14),
                },
          );
      }
    else
      for (const id of ids) {
        const r = session.svgInfo?.root
          .querySelector(`[data-seat-id="${CSS.escape(id)}"]`)
          ?.getBoundingClientRect();
        if (r?.width && r?.height)
          rects.push({ left: r.left, right: r.right, top: r.top, bottom: r.bottom });
      }
    if (!rects.length) return null;
    return {
      left: Math.min(...rects.map((r) => r.left)),
      right: Math.max(...rects.map((r) => r.right)),
      top: Math.min(...rects.map((r) => r.top)),
      bottom: Math.max(...rects.map((r) => r.bottom)),
      closeup: rects.some((r) => r.closeup),
    };
  }

  function focusedPoint() {
    const b = focusedSeatBounds();
    return b
      ? {
          x: (b.left + b.right) / 2,
          y: (b.top + b.bottom) / 2,
          radius: Math.max(b.right - b.left, b.bottom - b.top) / 2,
        }
      : null;
  }

  function updateFocusEffect() {
    const area = $('map-area'),
      point = focusedPoint(),
      visible =
        session.workspace === 'buyer' &&
        !!session.focusSeat &&
        session.player?.navigationState().view !== 'seat' &&
        session.buyerView === '2d';
    let veil = $('seat-focus-veil'),
      ring = $('seat-focus-ring'),
      created = false;
    if (!veil) {
      veil = document.createElement('div');
      veil.id = 'seat-focus-veil';
      ring = document.createElement('div');
      ring.id = 'seat-focus-ring';
      area.append(veil, ring);
      created = true;
    }
    veil.hidden = ring.hidden = false;
    if (!visible || !point) {
      veil.classList.remove('is-visible');
      ring.classList.remove('is-visible');
      delete ring.dataset.seat;
      return;
    }
    // a newly picked seat: the ring lands on it (the animation restarts each time the seat changes)
    if (ring.dataset.seat !== String(session.focusSeat)) {
      ring.dataset.seat = String(session.focusSeat);
      ring.classList.remove('bt-land');
      void ring.offsetWidth;
      ring.classList.add('bt-land');
    }
    const r = area.getBoundingClientRect(),
      x = point.x - r.left,
      y = point.y - r.top,
      radius = point.radius || 16;
    veil.style.setProperty('--focus-x', x + 'px');
    veil.style.setProperty('--focus-y', y + 'px');
    veil.style.setProperty('--focus-clear', Math.max(70, radius * 2.4) + 'px');
    Object.assign(ring.style, {
      left: x + 'px',
      top: y + 'px',
      width: radius * 2 + Math.max(16, radius * 0.4) + 'px',
      height: radius * 2 + Math.max(16, radius * 0.4) + 'px',
    });
    ring.style.borderWidth = Math.max(2, radius * 0.045) + 'px';
    ring.style.setProperty('--pulse-spread', Math.max(8, radius * 0.2) + 'px');
    ring.style.setProperty(
      '--pulse-color',
      selectedIDs().has(session.focusSeat) ? '#97dd62' : '#f5a524',
    );
    if (created) void veil.offsetWidth;
    veil.classList.add('is-visible');
    ring.classList.add('is-visible');
  }

  let seatReturnAnchor = null;

  function updateSeatReturn() {
    const popup = $('seat-popup'),
      state = session.player?.navigationState();
    if (!session.focusSeat) {
      seatReturnAnchor = null;
      $('return-to-seat')?.remove();
      return;
    }
    if (
      !session.player ||
      state?.view === 'seat' ||
      state?.renderMode !== session.buyerView ||
      !$('map-transition').hidden
    ) {
      if ($('return-to-seat')) $('return-to-seat').hidden = true;
      return;
    }
    const key = session.focusSeat + ':' + session.buyerView;
    if (seatReturnAnchor?.key !== key) {
      seatReturnAnchor = { key, snapshot: session.player.captureView() };
    }
    const outOfView = buyerUnit(session.focusSeat).every(
      (id) => session.player.projectSeat(id)?.inViewport === false,
    );
    const button = $('return-to-seat');
    if (button) {
      button.hidden = !outOfView;
      button.onclick = () => restoreSeatView(seatReturnAnchor.snapshot);
    }
  }

  function clearSeatPopupAnchor(popup = $('seat-popup')) {
    popup.classList.remove('seat-anchored');
    delete popup.dataset.direction;
    delete popup.dataset.keyboardDock;
    for (const property of ['left', 'top', 'right', 'bottom', 'transform', 'max-height'])
      popup.style.removeProperty(property);
  }

  // On a phone held upright the seat card is a bottom sheet, not a card floating by the seat: it sits on the bottom edge, opens short (section, row, seat and the
  // offers) so the map and the seat stay in view, pulls up to show the pictures, and pulls down to close. It keeps the card's own glass and contents; the handle is
  // the component library's drawer grabber. Placement is done by the stylesheet; this only sets its state and keeps it above the on-screen keyboard.
  /* A phone held upright. The keyboard makes the page shorter than it is wide, which reads as "landscape" to a media query and used to turn the sheet back into
     a floating card the moment a field was tapped. The tallest the page has been at this width tells which way the phone is really held. */
  const shape = { w: 0, h: 0 }; let sheetDrag = null, sheetClosing = 0;
  const sheetMode = () => { if (innerWidth !== shape.w) { shape.w = innerWidth; shape.h = 0; } shape.h = Math.max(shape.h, innerHeight); return session.workspace === 'buyer' && innerWidth <= 640 && shape.h > innerWidth; };
  function placeSheet(popup) {
    for (const p of ['left', 'top', 'right', 'bottom', 'transform', 'max-height']) popup.style.removeProperty(p);
    const seated = !!session.focusSeat, key = seated ? String(session.focusSeat) : 'section:' + session.currentSection;
    popup.classList.add('bt-sheet'); popup.classList.toggle('seat-anchored', seated);
    const handle = () => { if (popup.classList.contains('bt-sheet') && !popup.querySelector(':scope > .bt-sheet-grab')) { const grab = document.createElement('div'); grab.className = 'bt-sheet-grab'; grab.setAttribute('aria-hidden', 'true'); popup.prepend(grab); } };
    handle();
    const view = playerViewport(), keyboard = Math.max(0, Math.round(innerHeight - view.top - view.height));
    popup.style.setProperty('--bt-kb', keyboard + 'px'); popup.style.setProperty('--bt-room', Math.max(160, Math.round(view.height - 12)) + 'px');
    const typing = popup.contains(document.activeElement) && document.activeElement.matches('input, textarea, select');
    if (popup.dataset.sheetSeat !== key) {
      popup.dataset.sheetSeat = key; popup.scrollTop = 0;
      if (!sheetDrag && (seated || session.currentSection)) { sheetClosing = 0; popup.style.removeProperty('transition'); popup.style.removeProperty('translate'); } /* a sheet for something new never starts where the last one was left */
      // the picked seat should not end up under the sheet: if it would, the map slides up to bring it clear
      if (seated) try { const at = session.player?.projectSeat?.(session.focusSeat), over = at ? at.y - (innerHeight - keyboard - popup.offsetHeight /* where the sheet comes to rest, not where it is while sliding in */ - 96) : 0; if (over > 0) session.player.shift?.(over, 380); /* the map glides up in the same 380ms the sheet takes to slide in */ } catch {}
    }
    /* the pictures are always there; they only step aside while a field is being typed in, so the field and its button fit above the keyboard */
    popup.dataset.detent = typing ? 'peek' : 'full';
    if (!popup.dataset.sheetGestures) {
      popup.dataset.sheetGestures = 'on';
      /* the card is drawn again whenever its contents change (the 3D picture arriving, a ticket picked); the handle is put back every time */
      new MutationObserver(handle).observe(popup, { childList: true });
      /* The handle does one thing: pull it down to close. The pull is followed on the window, not on the handle, because the card is drawn again while it is
         open (the handle is a new element each time) and a pull must still end cleanly when that happens mid-way. */
      const settleBack = () => { popup.style.removeProperty('transition'); popup.style.removeProperty('translate'); };
      const closeSheet = () => {
        sheetClosing = performance.now(); popup.style.removeProperty('transition'); popup.style.translate = '0 110%';
        setTimeout(() => { delete popup.dataset.sheetSeat; dismissPopup(); }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 220);
        setTimeout(() => { if (sheetClosing && !sheetDrag) { sheetClosing = 0; popup.style.removeProperty('translate'); } }, 520);
      };
      popup.addEventListener('pointerdown', (e) => {
        if (!popup.classList.contains('bt-sheet') || popup.hidden || sheetClosing || sheetDrag || e.isPrimary === false || e.button > 0 || !e.target.closest?.('.bt-sheet-grab')) return;
        e.preventDefault(); sheetDrag = { id: e.pointerId, y: e.clientY, moved: 0, at: performance.now(), speed: 0 }; popup.style.transition = 'none';
      });
      addEventListener('pointermove', (e) => {
        if (!sheetDrag || e.pointerId !== sheetDrag.id) return;
        const now = performance.now(), moved = e.clientY - sheetDrag.y; sheetDrag.speed = (moved - sheetDrag.moved) / Math.max(1, now - sheetDrag.at); sheetDrag.at = now; sheetDrag.moved = moved;
        popup.style.translate = `0 ${Math.max(0, moved)}px`;
      }, { passive: true });
      const end = (e) => {
        if (!sheetDrag || (e.pointerId !== undefined && e.pointerId !== sheetDrag.id)) return;
        const d = sheetDrag; sheetDrag = null;
        const far = d.moved > Math.min(110, popup.offsetHeight * 0.3), flick = d.moved > 24 && d.speed > 0.5 && performance.now() - d.at < 80;
        if (e.type === 'pointerup' && popup.classList.contains('bt-sheet') && (far || flick)) closeSheet(); else settleBack();
      };
      for (const type of ['pointerup', 'pointercancel', 'blur']) addEventListener(type, end);
    }
  }

  function positionSeatPopup(id, { force = false } = {}) {
    const popup = $('seat-popup');
    updateSeatReturn();
    updateFocusEffect();
    if (popup.hidden || session.player?.navigationState().view === 'seat') return;
    if (!force && session.lastPopupSeat === id) return;
    session.lastPopupSeat = id;
    cancelAnimationFrame(session.popupPositionFrame);
    session.popupPositionFrame = requestAnimationFrame(() => {
      const seats = focusedSeatBounds(),
        area = $('map-area').getBoundingClientRect(),
        input = document.activeElement,
        editing = popup.contains(input) && input.matches('input, textarea, select'), // typing in the card: it is fitted into what the on-screen keyboard leaves visible
        viewport = editing ? playerViewport() : null;
      if (!seats) return;
      if (sheetMode()) return placeSheet(popup);
      if (popup.classList.contains('bt-sheet')) { popup.classList.remove('bt-sheet'); delete popup.dataset.detent; delete popup.dataset.sheetSeat; popup.style.removeProperty('--bt-kb'); popup.style.removeProperty('--bt-room'); }
      popup.classList.add('seat-anchored');
      popup.style.removeProperty('max-height');
      const width = popup.offsetWidth;
      let height = popup.offsetHeight;
      const seatSpan = Math.max(seats.right - seats.left, seats.bottom - seats.top),
        gap = Math.max(40, Math.min(68, seatSpan * 0.18)),
        edge = 12,
        toolbar = $('mobile-toolbar'),
        toolbarRect =
          toolbar && getComputedStyle(toolbar).display !== 'none'
            ? toolbar.getBoundingClientRect()
            : null;
      const safe = {
        left: area.left + edge,
        right: area.right - edge,
        top: area.top + edge,
        bottom: Math.min(area.bottom - edge, toolbarRect?.top ? toolbarRect.top - 8 : Infinity),
        centerX: (seats.left + seats.right) / 2,
        centerY: (seats.top + seats.bottom) / 2,
      };
      if (viewport) {
        safe.left = Math.max(safe.left, viewport.left + edge);
        safe.right = Math.min(safe.right, viewport.left + viewport.width - edge);
        safe.top = Math.max(safe.top, viewport.top + edge);
        safe.bottom = Math.min(safe.bottom, viewport.top + viewport.height - edge);
        const available = Math.max(96, safe.bottom - safe.top);
        if (height > available) {
          height = available;
          popup.style.setProperty('max-height', height + 'px', 'important');
        }
      }
      const clamp = (n, min, max) => Math.max(min, Math.min(n, max)),
        candidates = [
          {
            direction: 'right',
            space: safe.right - seats.right,
            left: seats.right + gap,
            top: clamp(safe.centerY - height / 2, safe.top, safe.bottom - height),
          },
          {
            direction: 'left',
            space: seats.left - safe.left,
            left: seats.left - gap - width,
            top: clamp(safe.centerY - height / 2, safe.top, safe.bottom - height),
          },
          {
            direction: 'below',
            space: safe.bottom - seats.bottom,
            left: clamp(safe.centerX - width / 2, safe.left, safe.right - width),
            top: seats.bottom + gap,
          },
          {
            direction: 'above',
            space: seats.top - safe.top,
            left: clamp(safe.centerX - width / 2, safe.left, safe.right - width),
            top: seats.top - gap - height,
          },
        ].sort(
          (a, b) =>
            b.space -
            (b.direction === 'left' || b.direction === 'right' ? width : height) -
            (a.space - (a.direction === 'left' || a.direction === 'right' ? width : height)),
        );
      const fits = (c) =>
        c.left >= safe.left &&
        c.left + width <= safe.right &&
        c.top >= safe.top &&
        c.top + height <= safe.bottom;
      let candidate = candidates.find(fits);
      // At close range, scroll a shorter card in the free space above/below the seat.
      if (!candidate && seats.closeup) {
        const vertical = candidates
            .filter((c) => c.direction === 'above' || c.direction === 'below')
            .sort((a, b) => b.space - a.space),
          free = vertical.find((c) => c.space - gap >= 96 && width <= safe.right - safe.left);
        if (free) {
          height = Math.min(height, free.space - gap);
          popup.style.setProperty('max-height', height + 'px', 'important');
          candidate = {
            ...free,
            top: free.direction === 'above' ? seats.top - gap - height : seats.bottom + gap,
          };
        }
      }
      candidate = candidate || candidates[0];
      const left = clamp(candidate.left, safe.left, Math.max(safe.left, safe.right - width)),
        top = clamp(candidate.top, safe.top, Math.max(safe.top, safe.bottom - height));
      popup.dataset.direction = candidate.direction;
      popup.style.setProperty('left', left + 'px', 'important');
      popup.style.setProperty('top', top + 'px', 'important');
      popup.style.setProperty('right', 'auto', 'important');
      popup.style.setProperty('bottom', 'auto', 'important');
      popup.style.setProperty('transform', 'none', 'important');
      popup.style.transformOrigin = `${Math.round(safe.centerX - left)}px ${Math.round(safe.centerY - top)}px`;
      if (editing) {
        const field = input.getBoundingClientRect(),
          card = popup.getBoundingClientRect();
        if (field.bottom > card.bottom - edge) popup.scrollTop += field.bottom - card.bottom + edge;
        else if (field.top < card.top + edge) popup.scrollTop -= card.top + edge - field.top;
      }
    });
  }

  let unlockPositionFrame = 0;

  const positionUnlockInput = () => {
    cancelAnimationFrame(unlockPositionFrame);
    unlockPositionFrame = requestAnimationFrame(() => {
      const popup = $('seat-popup'),
        input = document.activeElement,
        panel = popup?.querySelector('.seat-view-offer-panel');
      const editing =
        session.buyerView === '3d' &&
        popup?.contains(input) &&
        input.matches('.popup-unlock input');
      if (!editing) {
        if (popup?.dataset.keyboardDock) {
          delete popup.dataset.keyboardDock;
          popup.style.removeProperty('bottom');
          popup.style.removeProperty('max-height');
          panel?.style.removeProperty('max-height');
        }
        return;
      }
      if (!popup.classList.contains('seat-view-dock')) {
        if (session.focusSeat) positionSeatPopup(session.focusSeat, { force: true });
        return;
      }
      if (!panel) return;
      const viewport = playerViewport(),
        edge = 12,
        pills = popup.querySelector('.seat-view-pill-row'),
        pillHeight = pills?.getBoundingClientRect().height || 54;
      popup.dataset.keyboardDock = 'true';
      popup.style.setProperty(
        'bottom',
        Math.max(edge, innerHeight - viewport.top - viewport.height + edge) + 'px',
        'important',
      );
      popup.style.setProperty('max-height', 'none', 'important');
      panel.style.setProperty(
        'max-height',
        Math.max(60, viewport.height - edge * 2 - pillHeight - 9) + 'px',
        'important',
      );
      const form = input.closest('.locked-offer-form') || input,
        field = form.getBoundingClientRect(),
        card = panel.getBoundingClientRect();
      if (field.bottom > card.bottom - edge) panel.scrollTop += field.bottom - card.bottom + edge;
      else if (field.top < card.top + edge) panel.scrollTop -= card.top + edge - field.top;
    });
  };

  document.addEventListener('focusin', positionUnlockInput);

  observePlayerViewport(() => {
    positionUnlockInput();
    if (session.focusSeat) positionSeatPopup(session.focusSeat, { force: true });
  });

  function openSeatPhoto(seat) {
    const photo = seatPhotoFor(seat),
      img = $('seat-photo'),
      empty = $('seat-photo-empty');
    $('seat-photo-title').textContent = seatInfoLabel(seat, buyerUnit(seat.id)).replaceAll(
      '&middot;',
      '·',
    );
    img.hidden = !photo;
    empty.hidden = !!photo;
    if (photo) img.src = photo;
    openPopupDialog($('seat-photo-dialog'));
  }

  function renderPopup() {
    updateSeatReturn();
    const popup = $('seat-popup'),
      wasVisible = !popup.hidden,
      active = document.activeElement,
      previousFocus = popup.contains(active) ? { id: active.id, tier: active.dataset.tierId, gaTier: active.dataset.gaTierId } : null,
      firstPerson = session.player?.navigationState().view === 'seat';
    document.body.classList.toggle(
      'seat-view-active',
      session.workspace === 'buyer' && firstPerson,
    );
    const currentSection = session.map.sectionById.get(session.currentSection),
      killed = currentSection?.killed,
      soldOut = sectionAvailability(session.store, currentSection).state === 'sold-out',
      ga = currentSection?.ga,
      cameraMoving = !!session.player?.navigationState().cameraMotion,
      popupVisible =
        !session.suppressSeatPopup &&
        !cameraMoving &&
        session.workspace === 'buyer' &&
        (!!session.focusSeat || !!ga || soldOut || killed);
    popup.dataset.seatView = 'false';
    setPopupVisible(popup, popupVisible);
    updateFocusEffect();
    if (!popupVisible) return;
    if ((soldOut || killed) && !session.focusSeat) {
      clearSeatPopupAnchor(popup);
      popup.classList.add('ga-popup');
      popup.dataset.availability = killed ? 'killed' : 'sold-out';
      popup.innerHTML = `<div class="bt-pass"><div class="bt-pass-top"><span class="bt-chip bt-chip--danger">${killed ? 'Unavailable' : 'Sold out'}</span><span class="bt-chip" data-level-slot></span></div><h2 class="bt-title">${esc(currentSection.name)}</h2><p class="bt-sub">${killed ? 'This section is not available for selection.' : 'All released tickets in this section have sold.'}</p></div><button class="primary bt-wide" data-show-available>Back to full map</button>`;
      popup.querySelector('[data-show-available]').onclick = () => $('overview').click();
      finishPopup(popup, previousFocus, wasVisible);
      return;
    }
    delete popup.dataset.availability;
    if (ga && !session.focusSeat) {
      clearSeatPopupAnchor(popup);
      popup.classList.add('ga-popup');
      popup.innerHTML = gaDetails();
      finishPopup(popup, previousFocus, wasVisible);
      return;
    }
    popup.classList.remove('ga-popup');
    const s = session.map.seatById.get(session.focusSeat),
      offerId = session.store.inventory.assignments[s.id],
      offer = session.store.inventory.offers[offerId],
      offerColor = levelColor(
        offerId,
        Object.keys(session.store.inventory.offers).indexOf(offerId),
      ),
      unit = buyerUnit(s.id),
      line = session.store.cart.get('seat:' + unit[0]),
      status = session.store.status(s.id);
    popup.dataset.seatView = String(firstPerson);
    const locked = status === 'locked',
      offerRows =
        (!locked &&
          offer?.tiers
            .map((tier) => {
              const active = line?.tierId === tier.id,
                disabled = status !== 'available' && !active;
              return `<button class="bt-offer ${active ? 'is-chosen' : ''}" data-tier-id="${esc(tier.id)}" aria-pressed="${active}" ${disabled ? 'disabled' : ''}><i>${icons.check}</i><span class="bt-offer-name">${esc(tier.name)}</span><span class="bt-offer-price">${money(tier.price)}</span></button>`;
            })
            .join('')) ||
        (!locked ? '<div class="popup-empty">This seat is not currently on sale.</div>' : '');
    const offerContent = locked
      ? popupUnlockHTML()
      : `<div class="bt-offers" role="group" aria-label="Choose an offer">${offerRows}</div>${offer?.tiers?.length ? '<p class="bt-offers-note">Prices include taxes and fees</p>' : ''}`;
    const noticeHTML = seatInformationHTML(s, true),
      existingNotice = popup.querySelector(
        firstPerson
          ? '.seat-view-offer-panel > .seat-information.compact'
          : ':scope > .seat-information.compact',
      ),
      preserveNotice = popup.dataset.noticeSeatId === s.id && existingNotice,
      noticeMarkup = preserveNotice ? '' : noticeHTML;
    const bindSeatOffers = () => {
      { // the small picture on the view button: a supplied photo if there is one, else a still from the generated view; with neither, the button stays a plain link
        const shot = popup.querySelector('[data-view-shot]'), host = window.maps2d, show = (url) => { if (!shot?.isConnected) return; if (url) { shot.style.backgroundImage = `url("${url}")`; shot.dataset.ready = 'true'; session.lastShot = { url, section: s.sectionId }; } else { shot.style.removeProperty('background-image'); delete shot.dataset.ready; shot.dataset.empty = 'true'; const note = shot.parentElement?.querySelector('[data-view-wait]'); if (note) { note.hidden = false; note.textContent = '3D preview not available'; Promise.resolve(host?.seatViewTimings?.()).then((t) => { if (t?.error && note.isConnected) note.title = t.error; }).catch(() => {}); } } };
        /* moving from one seat to the next in a section: the last picture stays up until the new one is ready, so the slot does not blink empty in between */
        if (shot && session.lastShot?.section === s.sectionId) { shot.style.backgroundImage = `url("${session.lastShot.url}")`; shot.dataset.ready = 'true'; }
        // while the picture is on its way the slot shows the site's thinking orb, and nothing else
        { const orb = popup.querySelector('[data-view-orb]'); if (orb && shot && shot.dataset.ready !== 'true') mountOrb(orb, { state: 'working', size: 64, speed: 0.5, grow: 1.75, dark: document.body.classList.contains('bt-map-dark') }); }
        if (shot) { const photo = host?.realViewPhoto?.(s); if (photo) show(photo); else if (host?.seatViewSnapshot) host.seatViewSnapshot(s.id).then(show, () => show(null)); else show(null); }
      }
      { // the two pictures: arrows and dots follow the scroll position, and the popover remembers which picture this seat was on when it redraws
        const track = popup.querySelector('[data-view-track]'), box = track?.closest('[data-view]'), navs = box ? [...box.querySelectorAll('[data-view-go]')] : [], dots = box ? [...box.querySelectorAll('.bt-view-dots i')] : [];
        if (track && navs.length) {
          const count = track.children.length, mark = () => { const i = Math.min(count - 1, Math.max(0, Math.round(track.scrollLeft / Math.max(1, track.clientWidth)))); session.viewSlide = { id: s.id, i }; dots.forEach((d, k) => d.toggleAttribute('data-on', k === i)); navs[0].hidden = i === 0; navs[1].hidden = i === count - 1; return i; };
          if (session.viewSlide?.id === s.id && session.viewSlide.i) track.scrollLeft = session.viewSlide.i * track.clientWidth;
          track.addEventListener('scroll', mark, { passive: true }); mark();
          for (const nav of navs) nav.addEventListener('click', (e) => { e.stopPropagation(); track.scrollTo({ left: (mark() + Number(nav.dataset.viewGo)) * track.clientWidth, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); });
        }
      }
      // A tap on a seat can bring the card up under the finger; the click that ends that tap then lands on the card (on a phone, usually on the 3D picture) and
      // used to open the 3D view by itself. A click only counts here if the press began on the card. Clicks made by the keyboard or by code carry no press and pass.
      // The on-screen keyboard. While a field in the card has focus the card is placed again inside the part of the screen the keyboard leaves visible (it is
      // made shorter and scrolls if it has to be), and the field with its button is scrolled into view. It is placed again as the keyboard slides in and out.
      if (!popup.dataset.keyboardAware) {
        popup.dataset.keyboardAware = 'on';
        const typing = () => { const el = document.activeElement; return popup.contains(el) && el.matches('input, textarea, select') ? el : null; };
        const reveal = () => { const el = typing(); if (!el) return; const part = el.closest('.locked-offer-form, .popup-unlock') || el, a = part.getBoundingClientRect(), b = popup.getBoundingClientRect(); if (a.bottom > b.bottom - 12) popup.scrollTop += a.bottom - b.bottom + 12; else if (a.top < b.top + 12) popup.scrollTop -= b.top + 12 - a.top; };
        const settle = () => { if (session.focusSeat) positionSeatPopup(session.focusSeat, { force: true }); else if (popup.classList.contains('bt-sheet')) placeSheet(popup); setTimeout(reveal, 50); };
        popup.addEventListener('focusin', (e) => { if (e.target.matches?.('input, textarea, select')) for (const ms of [0, 150, 350, 650]) setTimeout(settle, ms); });
        popup.addEventListener('focusout', () => setTimeout(settle, 150));
        for (const type of ['resize', 'scroll']) window.visualViewport?.addEventListener(type, () => { if (typing()) settle(); });
      }
      if (!popup.dataset.pressGuard) {
        popup.dataset.pressGuard = 'on'; let began = false;
        window.addEventListener('pointerdown', (e) => { began = popup.contains(e.target); }, true);
        popup.addEventListener('click', (e) => { if (e.detail !== 0 && !began) { e.stopPropagation(); e.preventDefault(); } }, true);
      }
      $('see-view')?.addEventListener('click', () => {
        // generated 3D view unless a real photo was supplied for this seat
        const host = window.maps2d;
        if (host?.openSeatView && !host.realViewPhoto?.(s)) host.openSeatView(s.id).catch(() => openSeatPhoto(s));
        else openSeatPhoto(s);
      });
      for (const button of popup.querySelectorAll('[data-tier-id]'))
        button.onclick = guard(() => {
          navigator.vibrate?.(8);
          if (line?.tierId === button.dataset.tierId) session.store.cart.delete('seat:' + unit[0]);
          else session.store.addSeat(s.id, button.dataset.tierId);
          refresh();
        });
      $('popup-unlock')?.addEventListener(
        'click',
        guard(() => {
          if (!session.store.inventory.demo)
            throw Error('Connect the admin unlock endpoint before granting access.');
          if ($('popup-unlock-code').value !== 'DEMO')
            throw Error('That code is not valid for this demo.');
          session.store.unlockSeat(s.id);
          session.inventoryRevision++;
          message('Demo access unlocked.');
          refresh();
        }),
      );
    };
    if (firstPerson) {
      clearSeatPopupAnchor(popup);
      popup.classList.add('seat-view-dock');
      popup.innerHTML = `<div class="seat-view-offer-panel">${noticeMarkup}<div class="bt-pass"><div class="bt-pass-top"><span class="bt-chip" data-level-slot></span>${locked ? '' : offerChipHTML(offer?.name || 'Not on sale', offerColor)}</div>${passIdsHTML(s.sectionNumber, s.rowNumber, seatNumberLabel(unit), unit.length > 1 ? 'Seats' : 'Seat')}</div>${seasonChipHTML()}${session.seatViewOfferOpen ? offerContent : ''}</div><div class="seat-view-pill-row"><button id="seat-go-selection" class="seat-view-pill">${icons['chevron-left']} Go to selection</button><button id="seat-select-offer" class="seat-view-pill primary-pill" aria-expanded="${session.seatViewOfferOpen}">${icons.plus} ${session.seatViewOfferOpen ? 'Close offers' : 'Select offer'}</button></div>`;
      if (preserveNotice) popup.querySelector('.seat-view-offer-panel').prepend(existingNotice);
      popup.dataset.noticeSeatId = s.id;
      bindSeatOffers();
      finishPopup(popup, previousFocus, wasVisible);
      $('seat-go-selection').onclick = () =>
        returnFromSeat({ to2D: session.seatViewReturnMode === '2d' });
      $('seat-select-offer').onclick = () => {
        session.seatViewOfferOpen = !session.seatViewOfferOpen;
        renderPopup();
      };
      return;
    }
    document.body.classList.remove('seat-view-active');
    popup.classList.remove('seat-view-dock');
    popup.innerHTML = `${noticeMarkup}<div class="bt-pass"><div class="bt-pass-top"><span class="bt-chip" data-level-slot></span>${locked ? '' : offerChipHTML(offer?.name || 'Not on sale', offerColor)}</div>${passIdsHTML(s.sectionNumber, s.rowNumber, seatNumberLabel(unit), unit.length > 1 ? 'Seats' : 'Seat')}</div>${seasonChipHTML()}${offerContent}${seatPhotoFor(s) || window.maps2d?.openSeatView ? seeViewHTML(locatorSVG(session.map, s)) : ''}<div class="seat-popup-actions"><button id="return-to-seat" type="button" hidden><img src="./runtime/assets/figma/return-to-seat.svg" alt="" aria-hidden="true"><span>Return to seat</span></button></div>`;
    if (preserveNotice) popup.prepend(existingNotice);
    popup.dataset.noticeSeatId = s.id;
    bindSeatOffers();
    updateSeatReturn();
    finishPopup(popup, previousFocus, wasVisible);
    positionSeatPopup(s.id);
  }

  return { buyerHover, updateFocusEffect, updateSeatReturn, positionSeatPopup, renderPopup };
}
