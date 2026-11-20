import { icons } from './icons.js';
import { escapeHTML as esc } from './html.js';
const popupAnimations = new WeakMap(),
  reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export function setPopupVisible(element, visible) {
  if (!element) return;
  const state = popupAnimations.get(element);
  if (state?.visible === visible) return;
  state?.animation?.cancel();
  const record = { visible, animation: null };
  popupAnimations.set(element, record);
  if (visible) {
    const from = element.hidden ? 0 : Number.parseFloat(getComputedStyle(element).opacity) || 0;
    element.hidden = false;
    element.style.pointerEvents = '';
    if (reducedMotion()) {
      element.style.opacity = '';
      return;
    }
    record.animation = element.animate([{ opacity: from }, { opacity: 1 }], {
      duration: 180,
      easing: 'ease-in',
      fill: 'both',
    });
    record.animation.finished
      .then(() => {
        if (popupAnimations.get(element) === record) {
          record.animation = null;
          element.style.opacity = '';
        }
      })
      .catch(() => {});
    return;
  }
  element.style.pointerEvents = 'none';
  element.hidden = true;
  element.style.opacity = '';
}
export function openPopupDialog(dialog) {
  if (dialog.open) return;
  dialog.classList.remove('is-closing');
  dialog.showModal();
  if (!reducedMotion())
    dialog.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: 'ease-in' });
}
export function closePopupDialog(dialog) {
  if (!dialog?.open) return;
  dialog.classList.remove('is-closing');
  dialog.close();
}
const accessIcon = () => icons.wheelchair;
export const seatInformationHTML = (seat, compact = false) => {
  if (compact) {
    const notice =
      seat.accessibleType === 'DA' || seat.da
        ? { kind: 'accessibility', icon: 'wheelchair.svg', text: 'Wheelchair space' }
        : seat.obstructedView
          ? {
              kind: 'information',
              icon: 'obstructed.svg',
              text: seat.obstructedViewLabel || 'Obstructed view - Rail',
            }
          : null;
    return notice
      ? `<div class="seat-information compact"><span class="${notice.kind}"><img src="./runtime/assets/figma/${notice.icon}" alt="" aria-hidden="true"><b>${esc(notice.text)}</b></span></div>`
      : '';
  }
  const items = [];
  if (seat.accessibleType === 'DA' || seat.da)
    items.push({ kind: 'accessibility', icon: accessIcon('DA'), text: 'Wheelchair space' });
  else if (seat.accessibleType === 'DB')
    items.push({
      kind: 'accessibility',
      icon: accessIcon('DB'),
      text: 'Accessible chairback seat',
    });
  if (seat.obstructedView)
    items.push({ kind: 'information', icon: icons.info, text: 'Obstructed view' });
  for (const note of seat.viewNotes || [])
    items.push({ kind: 'information', icon: icons.info, text: note });
  return items.length
    ? `<div class="seat-information">${items.map((item) => `<span class="${item.kind}">${item.icon}<b>${esc(item.text)}</b></span>`).join('')}</div>`
    : '';
};

/* Pass header pieces shared by the seat card, the seat popup and the general-admission popup. */
export const passIdsHTML = (section, row, seat, seatLabel = 'Seat') =>
  `<div class="bt-ids"><div><small>Section</small><b>${esc(section)}</b></div><div><small>Row</small><b>${esc(row)}</b></div><div><small>${esc(seatLabel)}</small><b>${esc(seat)}</b></div></div>`;
export const offerChipHTML = (name, color) =>
  `<span class="bt-chip bt-chip--offer" style="--offer-color:${esc(color)}"><i aria-hidden="true"></i>${esc(name)}</span>`;
export const seasonChipHTML = () => {
  const n = Number(globalThis.maps2d?.seasonGames);
  return Number.isFinite(n) && n > 0 ? `<div class="bt-season"><i aria-hidden="true"></i>This seat covers all ${n} home games</div>` : '';
};
// The top of the seat popover: two pictures to swipe between. First the view from the seat (a button: it opens the full 3D view), then where the seat is on the map.
export const seeViewHTML = (locator = '') =>
  '<div class="bt-view" data-view><div class="bt-view-track" data-view-track>' +
  '<button id="see-view" class="bt-view-slide" type="button"><span class="bt-view-shot" data-view-shot aria-hidden="true"></span><canvas class="bt-view-orb" data-view-orb aria-hidden="true"></canvas><span class="bt-view-wait" data-view-wait hidden></span><span class="bt-view-label"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>View in 3D</span></button>' +
  (locator ? '<div class="bt-view-slide bt-view-map" role="img" aria-label="Where this seat is on the map">' + locator + '</div>' : '') + '</div>' +
  (locator ? '<button class="bt-view-nav" data-view-go="-1" type="button" aria-label="Previous picture" hidden><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg></button><button class="bt-view-nav" data-view-go="1" type="button" aria-label="Next picture"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button><div class="bt-view-dots" aria-hidden="true"><i data-on></i><i></i></div>' : '') + '</div>';
