import { prepareMapRevision } from './map-cache.js';
import { structuralBoxOverridesFromMap } from './map-presentation.js';
import { emptyInventory, demoInventory, InventoryStore, validateInventory } from './model.js';

// buyer map loader: session data and callbacks are injected by buyer-app.
export function createBuyerMapLoader({
  state: session,
  $,
  bindMapInput,
  beginNavigation,
  navigationIsCurrent,
  buyerSeatInteractive,
  buyerUnit,
  dark3D,
  diagnosticsEnabled,
  hideStairsRails,
  mapHover,
  mapPick,
  message,
  positionSeatPopup,
  rendered,
  setViewMode,
  setWorkspace,
  setupFlatNavigation,
}) {
  async function ensurePlayer({ background = false } = {}) {
    if (session.player) return session.player;
    if (session.playerPromise) {
      if (!background) {
        $('view-3d').setAttribute('aria-busy', 'true');
        $('view-3d').textContent = '3D…';
      }
      return session.playerPromise;
    }
    const revision = session.loadRevision,
      activeMap = session.map,
      activePresentation = session.presentation;
    session.playerAbort = new AbortController();
    const signal = session.playerAbort.signal;
    if (!background) {
      $('view-3d').setAttribute('aria-busy', 'true');
      $('view-3d').textContent = '3D…';
    }
    const job = import('./map-player.js?v=performance-20260929')
      .then(({ createMapPlayer }) =>
        createMapPlayer(
          $('canvas-host'),
          activeMap,
          activePresentation,
          mapPick,
          mapHover,
          (id) => session.workspace !== 'buyer' || buyerSeatInteractive(id),
          (id) => (session.store ? buyerUnit(id) : [id]),
          () => {
            session.refreshNavigator?.();
            if (session.focusSeat) positionSeatPopup(session.focusSeat, { force: true });
          },
          {
            signal,
            artwork: session.svgInfo?.root,
            artworkCacheKey: session.visualRevision,
            diagnostics: diagnosticsEnabled,
            hideStairsRails,
            dark3D,
          },
        ),
      )
      .then((result) => {
        if (signal.aborted || revision !== session.loadRevision) {
          result.destroy();
          return null;
        }
        session.player = result;
        session.player.setActive(false);
        rendered.three = null;
        return session.player;
      })
      .catch((error) => {
        if (error.name !== 'AbortError' && revision === session.loadRevision)
          message('3D could not load. The 2D map is still available. ' + error.message);
        return null;
      })
      .finally(() => {
        if (revision === session.loadRevision) {
          session.playerPromise = null;
          $('view-3d').removeAttribute('aria-busy');
          $('view-3d').textContent = '3D';
        }
      });
    session.playerPromise = job;
    return job;
  }

  function validatePresentation(p) {
    if (!p || typeof p !== 'object') throw Error('Invalid presentation settings.');
    if (p.nearSelloutThreshold !== undefined && (!Number.isFinite(p.nearSelloutThreshold) || p.nearSelloutThreshold < 0 || p.nearSelloutThreshold > 1)) throw Error('nearSelloutThreshold must be between 0 and 1.');
    if (p.focus && !['cx', 'cy', 'width', 'height'].every((k) => Number.isFinite(p.focus[k])))
      throw Error('Invalid presentation focus.');
    if (p.focus && (p.focus.width <= 0 || p.focus.height <= 0))
      throw Error('Field dimensions must be positive.');
    if (
      p.bowl &&
      (!Number.isFinite(p.bowl.rise) ||
        p.bowl.rise < 0 ||
        p.bowl.rise > 2 ||
        !Number.isFinite(p.bowl.maximum) ||
        p.bowl.maximum < 0)
    )
      throw Error('Invalid bowl settings.');
    return p;
  }

  async function loadBundle(jsonText, svgText, config, inventory) {
    const loadStartedAt = performance.now(),
      revision = ++session.loadRevision,
      restore3D = session.buyerView === '3d';
    beginNavigation('reload');
    session.playerAbort?.abort();
    session.playerPromise = null;
    const prepareStartedAt = performance.now(),
      prepared = await prepareMapRevision(jsonText, svgText, { seatSource: config?.svgSeatSource ?? 'auto' });
    if (revision !== session.loadRevision) return;
    const token = beginNavigation('reload-ready');
    session.loadDiagnostics = {
      prepareMs: performance.now() - prepareStartedAt,
      preparationSource: prepared.preparationSource,
      seats: prepared.map.seats.length,
      sections: prepared.map.sections.length,
      rows: prepared.map.rows.length,
      svgChars: svgText?.length || 0,
      bundleReadyMs: null,
    };
    const authoredBenches = new Map(
        (prepared.presentation.gaBenches || []).map((entry) => [entry.sectionNumber, entry]),
      ),
      previewBenches = config.gaBenches?.map(
        (entry) => authoredBenches.get(entry.sectionNumber) || entry,
      ),
      nextMap = prepared.map,
      jsonPresentation = {
        ...(typeof nextMap.raw?.rendering?.glassWall === 'boolean'
          ? { glassWall: nextMap.raw.rendering.glassWall }
          : {}),
      },
      mapPresentation = { structuralBoxOverrides: structuralBoxOverridesFromMap(nextMap.raw), sectionLevels: prepared.presentation.sectionLevels },
      nextConfig = validatePresentation(
        config.studioPreview
          ? {
              ...prepared.presentation,
              ...jsonPresentation,
              ...mapPresentation,
              ...config,
              ...(previewBenches ? { gaBenches: previewBenches } : {}),
            }
          : { ...config, ...prepared.presentation, ...jsonPresentation, ...mapPresentation },
      ),
      nextSVG = prepared.info,
      nextInventory =
        inventory === true
          ? demoInventory(nextMap, { gaSold: config.studioPreview ? 0 : 18, sectionAvailability: config.demoSectionAvailability || {} })
          : inventory
            ? structuredClone(inventory)
            : emptyInventory(nextMap, nextConfig.currency || 'CAD');
    for (const section of nextMap.sections) {
      const ga = config.gaSections?.[section.id];
      if (ga && !section.ga) {
        if (!Number.isSafeInteger(ga.capacity) || ga.capacity < 0) throw Error('Invalid GA capacity.');
        const statuses=section.seats.map(id=>nextInventory.statuses[id]);
        if (!nextInventory.ga[section.id] && statuses.includes('held')) throw Error('Provide a GA inventory pool before converting a section with held seats.');
        const sold=statuses.filter(s=>s==='sold').length;
        if (!nextInventory.ga[section.id] && ga.capacity < sold) throw Error('GA capacity cannot be less than the section’s sold tickets.');
        const counts=new Map();for(const id of section.seats){const offer=nextInventory.assignments[id];if(offer)counts.set(offer,(counts.get(offer)||0)+1);}
        const offerId=[...counts].sort((a,b)=>b[1]-a[1])[0]?.[0]||null;
        section.ga=true;section.convertedGA=true;section.gaCapacity=ga.capacity;section.gaCaption='General admission · non-reserved seating';
        section.gaConfig={...section.gaConfig,capacity:ga.capacity,benches:false};
        nextInventory.ga[section.id]??={capacity:ga.capacity,sold,offerId,locked:statuses.length>0&&statuses.every(status=>status==='locked')};
      }
      section.killed = config.killedSections?.[section.id] === true;
      if (section.killed) {
        for (const node of nextSVG.root.querySelectorAll(`[data-section-id="${CSS.escape(section.id)}"]`)) node.remove();
      }
      const name = config.sectionNames?.[section.id];
      if (typeof name === 'string' && name.trim()) {
        section.displayName = section.name = name.trim();
        for (const id of section.seats) nextMap.seatById.get(id).sectionNumber = section.displayName;
      }
      // Badges replace every section identifier; keep the authored reveal cover.
      for (const group of nextSVG.root.querySelectorAll(`[data-section-id="${CSS.escape(section.id)}"]`)) {
        if (group.hasAttribute('data-seat-id')) continue;
        const identifier = group.matches('g.identifier') ? group : group.querySelector('g.identifier');
        if (!identifier) continue;
        const cover = identifier.querySelector('[data-admin-section-cover]') || identifier.querySelector('path');
        for (const child of [...identifier.children]) if (child !== cover) child.remove();
      }
    }
    validateInventory(nextMap, nextInventory);
    $('loading').hidden = false;
    session.player?.destroy();
    session.player = null;
    rendered.flat = rendered.three = null;
    session.sidebarKey = '';
    session.cartMarkup = '';
    session.flatUnitCueSignature = '';
    session.hoverUnitIds = [];
    session.inventoryRevision++;
    session.flatMarks = new Map();
    session.gaLabels = new Map();
    session.flatElements = new Map(
      [...nextSVG.root.querySelectorAll('[data-seat-id]')].map((el) => [el.dataset.seatId, { el }]),
    );
    session.flatSections = [
      ...nextSVG.root.querySelectorAll('[data-section-id]:not([data-seat-id])'),
    ];
    session.map = nextMap;
    session.presentation = nextConfig;
    session.svgInfo = nextSVG;
    session.visualRevision = prepared.visualRevision;
    session.sourceJSON = jsonText;
    session.sourceSVG = svgText;
    session.store = new InventoryStore(session.map, nextInventory);
    session.adminSelected.clear();
    session.adminSelectedGA.clear();
    session.currentSection =
      session.focusSeat =
      session.hoverSection =
      session.adminSection =
      session.adminActiveSection =
        null;
    session.offerFilter = '';
    $('admin-map').replaceChildren(session.svgInfo.root);
    bindMapInput();
    // Presentation and flat artwork are reused only for an identical imported revision.
    setupFlatNavigation(session.svgInfo.root);
    // Row surfaces belong beneath the seats in the flat display. Do this after
    // extracting 3D presentation metadata so the 3D pipeline is unaffected.
    for (const path of session.svgInfo.root.querySelectorAll('path[class]'))
      if (/-row-.+-path(?:\s|$)/.test(path.getAttribute('class') || '')) {
        path.parentNode.insertBefore(path, path.parentNode.firstChild);
        path.style.pointerEvents = 'none';
      }

    $('venue-name').textContent = session.presentation.name || 'Imported venue';
    $('map-summary').textContent =
      `${session.map.seats.length.toLocaleString()} seats · ${session.map.rows.length} rows · ${session.map.sections.length} sections. ${session.svgInfo.uuidMatches} SVG UUID matches, ${session.svgInfo.classMatches} legacy class matches. ${session.sourceSVG ? 'Venue JSON includes Admin seat-type edits; SVG remains unchanged.' : 'JSON-only geometry preview; original artwork was not supplied.'}`;
    $('export-map').textContent = 'Venue map JSON';
    $('export-svg').disabled = !session.sourceSVG;
    session.buyerView = '2d';
    try {
      await setWorkspace(session.workspace, { token });
      if (revision !== session.loadRevision || !navigationIsCurrent(token)) return;
      if (restore3D && session.workspace === 'buyer') await setViewMode('3d', { token });
      if (revision !== session.loadRevision || !navigationIsCurrent(token)) return;
      const area = $('map-area');
      for (const host of [$('canvas-host'), $('admin-map')])
        for (const animation of host.getAnimations()) animation.cancel();
      area.classList.remove('map-revealed', 'map-entering');
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      if (revision !== session.loadRevision || !navigationIsCurrent(token)) return;
      area.classList.add('map-revealed', 'map-entering');
      await new Promise((resolve) => requestAnimationFrame(resolve));
      if (revision !== session.loadRevision || !navigationIsCurrent(token)) return;
      if (session.loadDiagnostics)
        session.loadDiagnostics.bundleReadyMs = performance.now() - loadStartedAt;
      setTimeout(() => {
        if (revision === session.loadRevision) area.classList.remove('map-entering');
      }, 1200);
    } finally {
      if (revision === session.loadRevision) {
        $('loading').hidden = true;
        $('map-area').classList.add('map-revealed');
      }
    }
  }

  async function loadDefaultMap() {
    const [j, s] = await Promise.all(
      [window.maps2d?.venue?.files?.json, window.maps2d?.venue?.files?.svg].map((f) => { if (!f) throw Error('No venue is loaded.'); return f; }).map((f) =>
        fetch(f).then((r) => {
          if (!r.ok) throw Error(`Could not load ${f.split('?')[0]}.`);
          return r.text();
        }),
      ),
    );
    const raw = JSON.parse(j);
    await loadBundle(
      j,
      s,
      { name: raw.name || 'Seatmap Player', currency: 'CAD', demo: true, studioPreview: true },
      true,
    );
  }

  return { ensurePlayer, loadBundle, loadDefaultMap };
}
