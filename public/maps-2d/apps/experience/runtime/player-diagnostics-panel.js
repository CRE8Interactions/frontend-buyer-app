import { escapeHTML as esc } from './html.js';
export function mountPlayerDiagnostics({ enabled, getState }) {
  let diagnosticsTimer = 0,
    diagnosticsObserver = null;
  const longTasks = [];
  const $ = (id) => document.getElementById(id);
  if (!enabled) return;
  const area = $('map-area');
  if (!area || $('player-diagnostics')) return;
  const panel = document.createElement('section');
  panel.id = 'player-diagnostics';
  panel.setAttribute('aria-label', 'Player performance diagnostics');
  panel.innerHTML =
    '<header><strong>Performance diagnostics</strong><button type="button" data-copy>Copy report</button><button type="button" data-collapse aria-label="Collapse diagnostics">−</button></header><div data-content>Waiting for 3D frames…</div><small data-note>Move the camera, then copy during lag. CPU timings do not directly measure GPU execution.</small>';
  area.append(panel);
  const content = panel.querySelector('[data-content]'),
    copyButton = panel.querySelector('[data-copy]'),
    collapseButton = panel.querySelector('[data-collapse]');
  if (globalThis.PerformanceObserver) {
    try {
      diagnosticsObserver = new PerformanceObserver((list) => {
        const now = performance.now();
        for (const entry of list.getEntries())
          longTasks.push({ at: now, duration: entry.duration });
        while (longTasks.length && now - longTasks[0].at > 60000) longTasks.shift();
      });
      diagnosticsObserver.observe({ type: 'longtask', buffered: true });
    } catch {
      diagnosticsObserver = null;
    }
  }
  const fmt = (value, digits = 1) => (Number.isFinite(value) ? value.toFixed(digits) : '—');
  const update = () => {
    if (!panel.isConnected) return;
    const { player, buyerView, flatCamera, loadDiagnostics } = getState();
    const state = { renderMode: buyerView === '2d' ? '2d' : '3d' },
      d = player?.diagnostics?.() || (buyerView === '2d' ? flatCamera?.diagnostics?.() : null);
    if (!d) {
      content.textContent =
        state.renderMode === '2d' ? 'Preparing the 2D map renderer…' : 'Preparing the 3D renderer…';
      return;
    }
    const now = performance.now(),
      recent = longTasks.filter((task) => now - task.at <= 60000),
      longTaskStats = {
        supported: !!diagnosticsObserver,
        count: recent.length,
        maxMs: Math.max(0, ...recent.map((task) => task.duration)),
      },
      svgRenderer = d.rendererType === 'svg',
      load = player?.performanceState?.() || {},
      loadRows = loadDiagnostics
        ? `<div><span>Map + SVG preparation</span><b>${fmt(loadDiagnostics.prepareMs)} ms · ${loadDiagnostics.seats.toLocaleString()} seats · ${loadDiagnostics.sections.toLocaleString()} sections · ${(loadDiagnostics.svgChars / 1e6).toFixed(2)}M SVG chars</b></div><div><span>2D chart ready</span><b>${fmt(loadDiagnostics.bundleReadyMs)} ms</b></div>`
        : '',
      threeRow = load.perspectiveReady
        ? `<div><span>3D overview preparation</span><b>${load.threeBuildMs === null ? 'building…' : `${fmt(load.threeBuildMs)} ms`}</b></div>`
        : '',
      rendererRows = svgRenderer
        ? `<div><span>Renderer</span><b>SVG map</b></div><div><span>Map elements</span><b>${d.dom.seatElements.toLocaleString()} seats · ${d.dom.paths.toLocaleString()} paths · ${d.dom.elements.toLocaleString()} total</b></div><div><span>Map viewport</span><b>${d.dom.width}×${d.dom.height} CSS px · DPR ${fmt(d.dom.pixelRatio, 2)}</b></div>`
        : `<div><span>WebGL context</span><b>${d.contextLost ? 'LOST' : 'OK'}${d.lastContextEvent ? ' · ' + esc(d.lastContextEvent.type) + ' ' + esc(new Date(d.lastContextEvent.at).toLocaleTimeString()) : ''}</b></div><div><span>Scene</span><b>${d.drawCalls} draw calls · ${d.triangles.toLocaleString()} triangles</b></div><div><span>GPU resources</span><b>${d.geometries} geometries · ${d.textures} textures</b></div><div><span>Canvas</span><b>${d.canvas.width}×${d.canvas.height} px · DPR ${fmt(d.canvas.pixelRatio, 2)}</b></div>`;
    if (!svgRenderer) panel.dataset.contextLost = String(d.contextLost);
    content.innerHTML = `${loadRows}${threeRow}${d.geometrySource ? `<div><span>Venue geometry</span><b>${esc(d.geometrySource)}</b></div>` : ''}${d.staticRendering ? `<div><span>Static batching</span><b>${d.staticRendering.sources} meshes → ${d.staticRendering.groups} batches</b></div>` : ''}${rendererRows}<div><span>Frame rate</span><b>${fmt(d.fps, 0)} FPS · ${d.sampleCount} samples / ${d.windowSeconds}s</b></div><div><span>Frame gap</span><b>p95 ${fmt(d.frameGapMs.p95)} ms · max ${fmt(d.frameGapMs.max)} ms · &gt;50 ms ${d.frameGapMs.over50}</b></div><div><span>CPU frame work</span><b>avg ${fmt(d.frameWorkMs.avg)} ms · p95 ${fmt(d.frameWorkMs.p95)} ms · max ${fmt(d.frameWorkMs.max)} ms</b></div><div><span>Long tasks / 60s</span><b>${longTaskStats.supported ? `${longTaskStats.count} · max ${fmt(longTaskStats.maxMs)} ms` : 'not supported by this browser'}</b></div>`;
    panel._report = {
      capturedAt: new Date().toISOString(),
      url: location.pathname,
      mode: state.renderMode,
      view: d.view,
      sectionId: d.sectionId,
      load: loadDiagnostics,
      threePreparation: load,
      device: {
        userAgent: navigator.userAgent,
        screen: `${screen.width}x${screen.height}`,
        viewport: `${innerWidth}x${innerHeight}`,
        devicePixelRatio,
        hardwareConcurrency: navigator.hardwareConcurrency || null,
        deviceMemory: navigator.deviceMemory || null,
      },
      renderer: {
        ...d,
        frameWorkScope: svgRenderer
          ? 'Main-thread SVG navigation animation and viewBox/minimap updates; excludes asynchronous browser paint/compositing.'
          : 'Main-thread frame callback including camera UI updates; excludes asynchronous GPU execution and browser paint/compositing.',
      },
      longTasks: longTaskStats,
    };
  };
  copyButton.onclick = async () => {
    update();
    const report = JSON.stringify(panel._report, null, 2);
    try {
      await navigator.clipboard.writeText(report);
      copyButton.textContent = 'Copied';
      setTimeout(() => (copyButton.textContent = 'Copy report'), 1600);
    } catch {
      const input = document.createElement('textarea');
      input.value = report;
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.append(input);
      input.select();
      const copied = document.execCommand('copy');
      input.remove();
      copyButton.textContent = copied ? 'Copied' : 'Copy failed';
      setTimeout(() => (copyButton.textContent = 'Copy report'), 1600);
    }
  };
  collapseButton.onclick = () => {
    const collapsed = panel.classList.toggle('collapsed');
    collapseButton.textContent = collapsed ? '+' : '−';
    collapseButton.setAttribute(
      'aria-label',
      collapsed ? 'Expand diagnostics' : 'Collapse diagnostics',
    );
  };
  update();
  diagnosticsTimer = setInterval(update, 500);
  return () => {
    clearInterval(diagnosticsTimer);
    diagnosticsObserver?.disconnect();
    panel.remove();
  };
}
