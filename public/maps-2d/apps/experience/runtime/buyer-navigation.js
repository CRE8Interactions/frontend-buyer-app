// @ts-check
import { createNavigationOwner } from './buyer-navigation-owner.js';
import { setPopupVisible } from './buyer-popups.js';

// Player assertions below encode the existing host invariant: seat-return, restore,
// and active-renderer actions are wired only after player creation. They preserve
// nullable loading state and keep every renderer argument and result checked.
// buyer navigation: session data and callbacks are injected by buyer-app.
/** @param {import('../../../types/checked-contracts.js').BuyerNavigationOptions} options */
export function createBuyerNavigation({
  state: session,
  $,
  buyerSeatInteractive,
  buyerUnit,
  ensurePlayer,
  message,
  mobileShell,
  paint,
  refresh,
  renderPopup,
  navigationOwner = createNavigationOwner(),
  rendered,
  sectionBounds,
  updateFocusEffect,
  updateSeatReturn,
  usesPlayer,
}) {
  /** @type {import("../../../types/checked-contracts.js").NavigationToken | undefined} */
  let currentNavigation;
  // A renderer switch survives selection/camera actions, but not another view or map load.
  /** @type {object | null} */
  let currentViewRequest = null;
  /** @param {import("../../../types/checked-contracts.js").NavigationToken | undefined} token */
  const navigationIsCurrent = (token) => navigationOwner.isCurrent(token);
  /** @param {import("../../../types/checked-contracts.js").NavigationKind} kind */
  function beginNavigation(kind) {
    if (['view', 'workspace', 'reload', 'reload-ready'].includes(kind)) currentViewRequest = null;
    currentNavigation = navigationOwner.begin(kind);
    session.suppressSeatPopup = false;
    $('map-transition').hidden = true;
    const viewButton = $('view-3d');
    if (viewButton.getAttribute('aria-busy') === 'true') {
      viewButton.removeAttribute('aria-busy');
      viewButton.textContent = '3D';
    }
    // Finish host cleanup even when a newer action interrupts the crossfade.
    const canvas = $('canvas-host'),
      artwork = $('admin-map');
    for (const host of [canvas, artwork]) {
      for (const animation of host.getAnimations()) animation.cancel();
      host.style.pointerEvents = '';
    }
    if (!canvas.hidden && !artwork.hidden) artwork.hidden = true;
    return currentNavigation;
  }

  /** @param {string} id */
  async function showSection(id) {
    const section = session.map.sectionById.get(id);
    if (!section || section.killed) return;
    const token = beginNavigation('section');
    session.currentSection = id;
    session.focusSeat = null;
    session.hoverUnitIds = [];
    session.lastPopupSeat = null;
    session.gaQuantity = session.store.cart.get('ga:' + id)?.quantity || 1;
    session.gaTier = null;
    mobileShell?.close();
    paint();
    if (usesPlayer()) {
      session.player?.sectionView(id);
      if (!(await waitForCamera(token))) return;
    } else {
      const box = sectionBounds(id);
      if (box) session.flatCamera?.fit(box);
    }
    if (!navigationIsCurrent(token) || session.currentSection !== id) return;
    $('view-label').textContent = section.name;
    refresh();
  }

  /**
   * The map was panned so another section sits in the middle of the screen: move the focus there without moving the camera.
   * @param {string} id
   */
  function followSection(id) {
    const section = session.map.sectionById.get(id);
    if (!section || section.killed || section.ga || session.focusSeat || session.currentSection === id) return;
    if (['sold-out', 'killed'].includes(session.sectionAvailability?.[id]?.state)) return;
    session.currentSection = id;
    session.hoverUnitIds = [];
    session.lastPopupSeat = null;
    $('view-label').textContent = section.name;
    refresh();
  }

  /** @param {string} id */
  function chooseSeat(id) {
    mobileShell?.close();
    setPopupVisible($('map-hover-card'), false);
    const s = session.map.seatById.get(id);
    if (!s || session.map.sectionById.get(s.sectionId)?.killed || session.map.sectionById.get(s.sectionId)?.convertedGA) return;
    beginNavigation('selection');
    session.currentSection = s.sectionId;
    const unit = buyerUnit(id),
      key = 'seat:' + unit[0],
      offer = session.store.inventory.offers[session.store.inventory.assignments[id]];
    if (offer?.tiers.length === 1 && session.store.status(id) === 'available') {
      if (session.store.cart.has(key)) session.store.cart.delete(key);
      else session.store.addSeat(id, offer.tiers[0].id);
      session.focusSeat = id;
      refresh();
      return;
    }
    if (session.focusSeat === id && session.player?.navigationState().view !== 'seat') {
      session.focusSeat = null;
      refresh();
      return;
    }
    session.focusSeat = id;
    refresh();
  }

  function backToSection() {
    beginNavigation('selection-dismiss');
    session.focusSeat = null;
    session.hoverUnitIds = [];
    session.lastPopupSeat = null;
    refresh();
  }

  function waitForCamera(token = currentNavigation) {
    const active = session.player;
    return navigationOwner
      .waitForCamera(
        token,
        () =>
          session.player === active &&
          session.workspace === 'buyer' &&
          !!active?.navigationState().cameraMotion,
      )
      .then((completed) => completed && navigationIsCurrent(token) && session.player === active);
  }

  async function enterSeatView() {
    const token = beginNavigation('seat');
    const seatId = session.focusSeat;
    session.seatViewReturnMode = session.buyerView;
    session.suppressSeatPopup = true;
    setPopupVisible($('seat-popup'), false);
    if (session.buyerView === '2d' || session.player?.navigationState().renderMode === '2d')
      await setViewMode('3d', { token });
    if (!navigationIsCurrent(token)) return;
    if (!session.player || session.buyerView !== '3d' || session.focusSeat !== seatId || !seatId) {
      session.suppressSeatPopup = false;
      return;
    }
    session.seatViewOfferOpen = false;
    session.player.seatView(seatId);
    $('view-label').textContent = 'View from your seat';
    if (!(await waitForCamera(token))) return;
    session.suppressSeatPopup = false;
    renderPopup();
  }

  async function returnFromSeat({ to2D = false } = {}) {
    const token = beginNavigation('seat-return');
    session.suppressSeatPopup = true;
    session.seatViewOfferOpen = false;
    document.body.classList.remove('seat-view-active');
    setPopupVisible($('seat-popup'), false);
    /** @type {import("../../../types/checked-contracts.js").RendererNavigationPort} */ (
      session.player
    ).exitSeatView();
    $('view-label').textContent =
      session.map.sectionById.get(/** @type {string} */ (session.currentSection))?.name ||
      'Seat selection';
    if (!(await waitForCamera(token))) return;
    if (to2D) {
      await setViewMode('2d', { token });
      if (!(await waitForCamera(token))) return;
    }
    session.suppressSeatPopup = false;
    session.lastPopupSeat = null;
    refresh();
  }

  function dismissGeneralAdmission() {
    beginNavigation('general-admission-dismiss');
    session.currentSection = null;
    session.gaTier = null;
    refresh();
  }

  function clearFocusedSeat() {
    beginNavigation('inventory-change');
    session.focusSeat = null;
  }

  /** @param {string} sectionId @param {string} seatId */
  function focusBestAvailable(sectionId, seatId) {
    showSection(sectionId);
    session.focusSeat = seatId;
    refresh();
  }

  /** @param {import("../../../types/checked-contracts.js").ViewSnapshot} snapshot */
  function restoreSeatView(snapshot) {
    beginNavigation('seat-recenter');
    /** @type {import("../../../types/checked-contracts.js").RendererNavigationPort} */ (
      session.player
    ).restoreView(snapshot);
  }

  function recenter() {
    beginNavigation('recenter');
    const sectionId =
      session.workspace === 'admin'
        ? session.adminActiveSection || session.adminSection
        : session.currentSection;
    if (sectionId && usesPlayer())
      /** @type {import("../../../types/checked-contracts.js").RendererNavigationPort} */ (
        session.player
      ).sectionView(sectionId);
    else if (sectionId && (session.workspace === 'admin' || session.buyerView === '2d')) {
      const target = $('admin-map').querySelector(`[data-section-id=\"${CSS.escape(sectionId)}\"]`),
        box = /** @type {SVGGraphicsElement | null} */ (target)?.getBBox();
      if (box)
        session.flatSetView?.([
          box.x - box.width * 0.8,
          box.y - box.height * 0.8,
          box.width * 2.6,
          box.height * 2.6,
        ]);
    } else if (sectionId)
      /** @type {import("../../../types/checked-contracts.js").RendererNavigationPort} */ (
        session.player
      ).sectionView(sectionId);
    else if (usesPlayer())
      /** @type {import("../../../types/checked-contracts.js").RendererNavigationPort} */ (
        session.player
      ).reset();
    else session.flatReset?.();
    $('view-label').textContent = /** @type {string} */ (
      session.focusSeat
        ? 'Selected seat'
        : sectionId
          ? session.map.sectionById.get(sectionId)?.name
          : session.buyerView === '2d'
            ? '2D map'
            : '3D bowl'
    );
  }

  /** @param {{seatId?: string, sectionId?: string}} hit */
  function buyerPick(hit) {
    if (session.workspace !== 'buyer') return;
    if (hit.follow) {
      followSection(hit.sectionId);
      return;
    }
    if (hit.seatId) {
      if (!buyerSeatInteractive(hit.seatId)) return;
      chooseSeat(hit.seatId);
      return;
    }
    if (hit.sectionId) {
      showSection(hit.sectionId);
      return;
    }
    if (session.focusSeat) backToSection();
    else if (session.map.sectionById.get(session.currentSection)?.ga || ['sold-out', 'killed'].includes(session.sectionAvailability?.[session.currentSection]?.state)) dismissGeneralAdmission();
  }

  function resetOverview() {
    beginNavigation('overview');
    session.flatReset?.();
    session.currentSection = null;
    session.focusSeat = null;
    session.hoverSection = null;
    session.player?.reset();
    $('view-label').textContent =
      session.workspace === 'admin'
        ? '2D design map'
        : session.buyerView === '2d'
          ? '2D map'
          : '3D bowl';
    refresh();
  }

  /** @param {import('../../../types/checked-contracts.js').RenderMode} mode @param {{token?: import('../../../types/checked-contracts.js').NavigationToken}} [options] */
  async function setViewMode(mode, { token = beginNavigation('view') } = {}) {
    mode = '2d';
    const request = {};
    currentViewRequest = request;
    const viewIsCurrent = () => currentViewRequest === request;
    const switching = session.workspace === 'buyer' && mode !== session.buyerView,
      transition = $('map-transition');
    if (switching) {
      /** @type {HTMLElement} */ (transition.querySelector('strong')).textContent =
        mode === '3d' ? 'Preparing 3D view…' : 'Preparing 2D view…';
      transition.hidden = false;
    }
    try {
      const result = await ensurePlayer();
      if (!viewIsCurrent()) return;
      if (!result && mode === '3d') return;

      const oldHost = $('admin-map').hidden ? $('canvas-host') : $('admin-map');
      setPopupVisible($('map-hover-card'), false);
      session.buyerView = mode;
      const flat = session.workspace === 'admin' || mode === '2d',
        host = result ? $('canvas-host') : $('admin-map'),
        other = result ? $('admin-map') : $('canvas-host');
      for (const el of [host, other]) {
        for (const animation of el.getAnimations()) animation.cancel();
        el.style.pointerEvents = '';
      }
      document.body.classList.toggle('flat-map', flat);
      host.hidden = false;
      other.hidden = oldHost === host;
      $('map-navigator').hidden = false;
      for (const control of /** @type {NodeListOf<HTMLElement>} */ (
        document.querySelectorAll('.three-only')
      ))
        control.hidden = flat;
      $('view-2d').classList.toggle('active', flat);
      $('view-3d').classList.toggle('active', !flat);
      $('view-2d').setAttribute('aria-pressed', String(flat));
      $('view-3d').setAttribute('aria-pressed', String(!flat));
      if (navigationIsCurrent(token)) $('view-label').textContent = flat ? '2D map' : '3D bowl';
      if (result) {
        if (
          !flat &&
          !(
            /** @type {import("../../../types/checked-contracts.js").RendererNavigationPort} */ (
              session.player
            ).state().perspectiveReady
          )
        ) {
          $('view-3d').setAttribute('aria-busy', 'true');
          $('view-3d').textContent = '3D…';
        }
        try {
          await result.setFlatMode(flat);
        } catch (error) {
          if (!viewIsCurrent() || !navigationIsCurrent(token)) return;
          message(
            '3D could not load. The 2D map is still available. ' +
              /** @type {Error} */ (error).message,
          );
          if (viewIsCurrent()) await setViewMode('2d', { token });
          return;
        } finally {
          if (viewIsCurrent()) {
            $('view-3d').removeAttribute('aria-busy');
            $('view-3d').textContent = '3D';
          }
        }
        if (!viewIsCurrent()) return;
        /** @type {import("../../../types/checked-contracts.js").RendererNavigationPort} */ (
          session.player
        ).setActive(true);
        /** @type {import("../../../types/checked-contracts.js").RendererNavigationPort} */ (
          session.player
        ).resize();
        rendered[flat ? 'webgl-flat' : 'three'] = null;
        if (session.currentSection && session.workspace === 'buyer') {
          // Apply the latest section to the newly available renderer, even if a
          // selection superseded the original mode-switch camera continuation.
          const cameraToken = currentNavigation;
          /** @type {import("../../../types/checked-contracts.js").RendererNavigationPort} */ (
            session.player
          ).sectionView(session.currentSection);
          await waitForCamera(cameraToken);
          if (!viewIsCurrent()) return;
        }
      } else if (!session.currentSection) session.flatCamera?.reset();
      if (oldHost !== host && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        other.style.pointerEvents = 'none';
        other.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: 260,
          easing: 'ease-in-out',
          fill: 'forwards',
        });
        host
          .animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: 'ease-in-out' })
          .finished.then(() => {
            if (viewIsCurrent()) {
              other.hidden = true;
              other.style.pointerEvents = '';
              for (const animation of other.getAnimations()) animation.cancel();
            }
          })
          .catch(() => {});
        setTimeout(() => {
          if (viewIsCurrent()) {
            other.hidden = true;
            other.style.pointerEvents = '';
            for (const animation of other.getAnimations()) animation.cancel();
          }
        }, 300);
      } else other.hidden = true;
      session.lastPopupSeat = null;
      updateFocusEffect();
      refresh();
    } finally {
      if (viewIsCurrent()) {
        transition.hidden = true;
        updateSeatReturn();
      }
    }
  }

  /** @param {import('../../../types/checked-contracts.js').Workspace} next @param {{token?: import('../../../types/checked-contracts.js').NavigationToken}} [options] */
  async function setWorkspace(next, { token = beginNavigation('workspace') } = {}) {
    next = 'buyer';
    session.workspace = next;
    if (next === 'admin') session.flatReset?.();
    document.body.classList.toggle('admin', next === 'admin');
    $('buyer-tab').classList.toggle('active', next === 'buyer');
    $('admin-tab').classList.toggle('active', next === 'admin');
    /** @type {HTMLButtonElement} */ ($('view-3d')).disabled = next === 'admin';
    setPopupVisible($('seat-popup'), false);
    await setViewMode(session.buyerView, { token });
    if (!navigationIsCurrent(token)) return;
    $('sidebar').scrollTop = 0;
  }

  return {
    beginNavigation,
    navigationIsCurrent,
    enterSeatView,
    dismissGeneralAdmission,
    clearFocusedSeat,
    focusBestAvailable,
    restoreSeatView,
    recenter,
    showSection,
    chooseSeat,
    backToSection,
    returnFromSeat,
    buyerPick,
    resetOverview,
    setViewMode,
    setWorkspace,
  };
}
