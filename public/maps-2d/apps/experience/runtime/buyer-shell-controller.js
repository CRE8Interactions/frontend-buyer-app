import { icons } from './icons.js';
import { closePopupDialog } from './buyer-popups.js';
export function createBuyerShellController({
  state: session,
  $,
  dismissGeneralAdmission,
  recenter,
  refresh,
  resetOverview,
  setViewMode,
  setWorkspace,
  usesPlayer,
}) {
  function bindShell() {
    $('buyer-tab').onclick = () => setWorkspace('buyer');
    
    $('overview').onclick = resetOverview;
    $('view-2d').onclick = () => setViewMode('2d');
    
    document.addEventListener(
      'pointerdown',
      (event) => {
        const popup = $('seat-popup');
        if (
          !popup.hidden &&
          popup.classList.contains('ga-popup') &&
          !popup.contains(event.target)
        ) {
          dismissGeneralAdmission();
        }
      },
      { capture: true },
    );
    $('expand').onclick = () => {
      const open = $('workspace').classList.toggle('map-expanded'),
        button = $('expand');
      document.body.classList.toggle('map-fullscreen', open);
      button.classList.toggle('active', open);
      button.title = open ? 'Exit full screen' : 'Expand map to full screen';
      button.setAttribute('aria-label', button.title);
      button.innerHTML = icons[open ? 'corners-in' : 'maximize'];
      window.dispatchEvent(new Event('resize'));
    };
    $('recenter').onclick = recenter;
    $('zoom-in').onclick = () =>
      usesPlayer() ? session.player.zoomBy(0.72) : session.flatZoomBy?.(0.72);
    $('zoom-out').onclick = () =>
      usesPlayer() ? session.player.zoomBy(1.38) : session.flatZoomBy?.(1.38);
    for (const button of document.querySelectorAll('[data-three-mode]'))
      button.onclick = () => {
        const mode = button.dataset.threeMode;
        session.player?.setControlMode(mode);
        for (const item of document.querySelectorAll('[data-three-mode]')) {
          const active = item === button;
          item.classList.toggle('active', active);
          item.setAttribute('aria-pressed', String(active));
        }
      };

    for (const b of document.querySelectorAll('dialog .close'))
      b.onclick = () => closePopupDialog(b.closest('dialog'));
    for (const dialog of document.querySelectorAll('dialog'))
      dialog.addEventListener('cancel', (event) => {
        event.preventDefault();
        closePopupDialog(dialog);
      });
  }
  function decorateShell() {
    for (const b of document.querySelectorAll('[data-map-scope]'))
      b.onclick = () => {
        session.adminScope = b.dataset.mapScope;
        session.hoverSection = null;
        session.hoverRow = null;
        for (const el of session.svgInfo?.root.querySelectorAll('[data-row-hovered]') || [])
          el.removeAttribute('data-row-hovered');
        refresh();
      };
    const controlIcons = {
      overview: 'house',
      recenter: 'locate-fixed',
      'svg-info': 'info',
      expand: 'maximize',
      'zoom-in': 'plus',
      'zoom-out': 'minus',
    };
    for (const [id, name] of Object.entries(controlIcons)) $(id).innerHTML = icons[name];
    for (const b of document.querySelectorAll('[data-three-mode]'))
      b.innerHTML = icons[b.dataset.threeMode === 'rotate' ? 'rotate-3d' : 'move'];
    for (const close of document.querySelectorAll('dialog .close')) close.innerHTML = icons.x;
    for (const [id, name] of Object.entries({ 'view-2d': 'map-trifold', 'view-3d': 'cube' }))
      $(id).innerHTML = icons[name];
    for (const [scope, name] of Object.entries({
      section: 'selection',
      row: 'stack',
      seat: 'seat',
    })) {
      const button = document.querySelector(`[data-map-scope="${scope}"]`);
      if (button) {
        const label = button.textContent;
        button.innerHTML = icons[name] + `<span>${label}</span>`;
      }
    }
    for (const link of document.querySelectorAll('a'))
      if (link.textContent.trim().endsWith('↗')) {
        link.lastChild.textContent = link.lastChild.textContent.replace(/\s*↗\s*$/, ' ');
        link.insertAdjacentHTML('beforeend', icons['arrow-square-out']);
      }
    const dataOpen = $('data-open');
    dataOpen.innerHTML = 'Map & handoff ' + icons['arrow-square-out'];
    const rail = document.querySelector('.map-control-rail');
    rail.append($('zoom-in'), $('zoom-out'));
    document.querySelector('.map-zoom-controls').remove();
    const deckButton = $('svg-info');
    deckButton.innerHTML = icons.info + '<span>Rise & slope</span>';
    deckButton.title = 'Rise & slope';
    deckButton.setAttribute('aria-label', 'Rise and slope');
    if (document.body.classList.contains('admin-only')) $('venue-name').after(deckButton);
    else deckButton.hidden = true;
    $('map-help').remove();
    const legend = document.querySelector('.legend');
    $('map-area').append(legend);
    const minimapToggle=$('minimap-toggle');
    if(document.body.classList.contains('player-only')&&minimapToggle)$('map-area').append(minimapToggle);
  }
  return { bindShell, decorateShell };
}
