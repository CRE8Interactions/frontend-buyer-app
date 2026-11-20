import { sectionAvailability } from './section-availability.js';
import { createBuyerSession } from './buyer-session.js';
import { createBuyerInventory } from './buyer-inventory.js';
import { setPopupVisible } from './buyer-popups.js';
import { mountPlayerDiagnostics } from './player-diagnostics-panel.js';
import { mountMobileShell } from './mobile-shell.js';
import { createBuyerUiHelpers } from './buyer-ui-helpers.js';
import { createBuyerMapRenderer } from './buyer-map-renderer.js';
import { createBuyerNavigation } from './buyer-navigation.js';
import { createBuyerMapInput } from './buyer-map-input.js';
import { createBuyerPanel } from './buyer-panel.js';
import { createBuyerPopupController } from './buyer-popup-controller.js';
import { createBuyerMapLoader } from './buyer-map-loader.js';
import { createBuyerFlatController } from './buyer-flat-controller.js';
import { createBuyerShellController } from './buyer-shell-controller.js';
const sandbox = !!window.BUYER_SANDBOX,
  queryParams = new URLSearchParams(location.search),
  diagnosticsEnabled = queryParams.get('diagnostics') === '1',
  hideStairsRails = queryParams.get('hideStairsRails') === '1',
  dark3D = queryParams.get('dark3d') === '1';
const $ = (id) => document.getElementById(id),
  esc = (s) =>
    String(s ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
const state = createBuyerSession({ sandbox });
const { money, publicOfferIds, selectedIDs, buyerSeatInteractive, buyerUnit, seatNumberLabel } =
  createBuyerInventory({ getMap: () => state.map, getStore: () => state.store });
const rendered = { flat: null, three: null };
const usesPlayer = () => !!state.player && !$('canvas-host').hidden;
mountPlayerDiagnostics({
  enabled: diagnosticsEnabled,
  getState: () => ({
    player: state.player,
    buyerView: state.buyerView,
    flatCamera: state.flatCamera,
    loadDiagnostics: state.loadDiagnostics,
  }),
});
const mobileShell = !sandbox
  ? mountMobileShell({
      onMinimapOpen: () => state.refreshNavigator?.(),
      onCloseOffers: () => {
        if (state.focusSeat) backToSection();
        else if (state.currentSection && state.map?.sectionById.get(state.currentSection)?.ga) {
          dismissGeneralAdmission();
        }
      },
    })
  : null;
const message = (text) => {
  $('toast').textContent = text;
  setPopupVisible($('toast'), true);
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => setPopupVisible($('toast'), false), 6500);
};
const guard =
  (fn) =>
  (...args) => {
    try {
      return fn(...args);
    } catch (e) {
      message(e.message);
    }
  };
const levelPalette = [
  '#2563eb',
  '#db2777',
  '#7c3aed',
  '#059669',
  '#ea580c',
  '#0891b2',
  '#ca8a04',
  '#dc2626',
];
const { offerOptions, sectionOptions, levelColor, tiers, changed, seatInfoLabel, seatDeckLabel } =
  createBuyerUiHelpers({
    clearFocusedSeat: (...args) => clearFocusedSeat(...args),
    state,
    buyerUnit,
    esc,
    levelPalette,
    money,
    refresh: (...args) => refresh(...args),
    seatNumberLabel,
  });
const { paintSections, paint, renderFlatUnitCues, paintFlatSectionStates, refresh } =
  createBuyerMapRenderer({
    state,
    $,
    buyerUnit,
    esc,
    levelColor,
    levelPalette,
    mobileShell,
    money,
    renderAdmin: (...args) => renderAdmin(...args),
    renderBuyer: (...args) => renderBuyer(...args),
    rendered,
    sandbox,
    selectedIDs,
    usesPlayer,
  });
const {
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
} = createBuyerNavigation({
  state,
  $,
  buyerSeatInteractive,
  buyerUnit,
  ensurePlayer: (...args) => ensurePlayer(...args),
  message,
  mobileShell,
  paint: (...args) => paint(...args),
  refresh: (...args) => refresh(...args),
  renderPopup: (...args) => renderPopup(...args),
  rendered,
  sectionBounds: (...args) => sectionBounds(...args),
  updateFocusEffect: (...args) => updateFocusEffect(...args),
  updateSeatReturn: (...args) => updateSeatReturn(...args),
  usesPlayer,
});
const { mapPick, mapHover, bindMapInput } = createBuyerMapInput({
  state,
  $,
  buyerUnit,
  buyerSeatInteractive,
  backToSection: (...args) => backToSection(...args),
  chooseSeat: (...args) => chooseSeat(...args),
  paintFlatSectionStates: (...args) => paintFlatSectionStates(...args),
  renderFlatUnitCues: (...args) => renderFlatUnitCues(...args),
  sectionBounds: (...args) => sectionBounds(...args),
  showSection: (...args) => showSection(...args),
  adminToggle: (...args) => adminToggle(...args),
  buyerHover: (...args) => buyerHover(...args),
  buyerPick: (...args) => buyerPick(...args),
  openGAAllocation: (...args) => openGAAllocation(...args),
  paintSections: (...args) => paintSections(...args),
  refresh: (...args) => refresh(...args),
});
const { popupUnlockHTML, gaDetails, renderBuyer } = createBuyerPanel({
  focusBestAvailable: (...args) => focusBestAvailable(...args),
  state,
  $,
  buyerUnit,
  esc,
  guard,
  levelColor,
  message,
  money,
  offerOptions,
  paint: (...args) => paint(...args),
  publicOfferIds,
  refresh: (...args) => refresh(...args),
  renderPopup: (...args) => renderPopup(...args),
  resetOverview: (...args) => resetOverview(...args),
  seatNumberLabel,
  selectedIDs,
  showSection: (...args) => showSection(...args),
  tiers: (...args) => tiers(...args),
});
const { buyerHover, updateFocusEffect, updateSeatReturn, positionSeatPopup, renderPopup } =
  createBuyerPopupController({
    restoreSeatView: (...args) => restoreSeatView(...args),
    state,
    $,
    buyerSeatInteractive,
    buyerUnit,
    esc,
    gaDetails: (...args) => gaDetails(...args),
    guard,
    levelColor,
    message,
    money,
    paintSections: (...args) => paintSections(...args),
    popupUnlockHTML: (...args) => popupUnlockHTML(...args),
    refresh: (...args) => refresh(...args),
    returnFromSeat: (...args) => returnFromSeat(...args),
    seatDeckLabel: (...args) => seatDeckLabel(...args),
    seatInfoLabel: (...args) => seatInfoLabel(...args),
    seatNumberLabel,
    selectedIDs,
    enterSeatView: (...args) => enterSeatView(...args),
    usesPlayer,
  });
const adminToggle = () => {}, openGAAllocation = () => {}, renderAdmin = () => {};
const { ensurePlayer, loadBundle, loadDefaultMap } = createBuyerMapLoader(
  {
    state,
    $,
    bindMapInput,
    beginNavigation,
    navigationIsCurrent,
    buyerSeatInteractive,
    buyerUnit,
    dark3D,
    diagnosticsEnabled,
    hideStairsRails,
    mapHover: (...args) => mapHover(...args),
    mapPick: (...args) => mapPick(...args),
    message,
    positionSeatPopup: (...args) => positionSeatPopup(...args),
    rendered,
    setViewMode: (...args) => setViewMode(...args),
    setWorkspace: (...args) => setWorkspace(...args),
    setupFlatNavigation: (...args) => setupFlatNavigation(...args),
  },
);
const { sectionBounds, setupFlatNavigation } = createBuyerFlatController({
  state,
  $,
  diagnosticsEnabled,
  positionSeatPopup: (...args) => positionSeatPopup(...args),
  updateFocusEffect: (...args) => updateFocusEffect(...args),
  usesPlayer,
});
const { bindShell, decorateShell } = createBuyerShellController({
  dismissGeneralAdmission: (...args) => dismissGeneralAdmission(...args),
  recenter: (...args) => recenter(...args),
  state,
  $,
  refresh: (...args) => refresh(...args),
  resetOverview: (...args) => resetOverview(...args),
  setViewMode: (...args) => setViewMode(...args),
  setWorkspace: (...args) => setWorkspace(...args),
  usesPlayer,
});
bindShell();

// The package entry point owns map loading, including the default export.
window.__studio = {
  getState: () => ({
    seats: state.map?.seats.length ?? 0,
    sections: state.map?.sections.length ?? 0,
    rows: state.map?.rows.length ?? 0,
    workspace: state.workspace,
    selection: state.adminSelected.size,
    cart: [...(state.store?.cart.values() ?? [])],
    subtotal: state.store?.subtotal ?? 0,
    currentSection: state.currentSection,
    focusSeat: state.focusSeat,
    player: state.player?.state(),
  }),
  sectionAvailability: id => sectionAvailability(state.store, state.map?.sectionById.get(id), state.presentation.nearSelloutThreshold ?? .1),
  map: () => state.map,
  store: () => state.store,
  player: () => state.player,
  loadBundle,
  showSection,
  chooseSeat,
  loadDefaultMap,
  refresh: () => {
    state.inventoryRevision++;
    refresh();
  },
  setWorkspace,
  adminToggle,
};
decorateShell();
