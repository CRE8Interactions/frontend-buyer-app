import { createFlatNavigation } from './flat-navigation.js?v=mobile-20260922';

// buyer flat controller: session data and callbacks are injected by buyer-app.
export function createBuyerFlatController({
  state: session,
  $,
  diagnosticsEnabled,
  positionSeatPopup,
  updateFocusEffect,
  usesPlayer,
}) {
  function sectionBounds(id) {
    const group = session.svgInfo.root.querySelector(`[data-section-id="${CSS.escape(id)}"]`);
    if (!group) return null;
    const b = group.getBBox(),
      m = session.svgInfo.root.getCTM()?.inverse().multiply(group.getCTM());
    if (!m) return b;
    const points = [
      [b.x, b.y],
      [b.x + b.width, b.y],
      [b.x, b.y + b.height],
      [b.x + b.width, b.y + b.height],
    ].map(([x, y]) => new DOMPoint(x, y).matrixTransform(m));
    const xs = points.map((p) => p.x),
      ys = points.map((p) => p.y);
    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
    };
  }

  function setupFlatNavigation(svg) {
    session.flatCamera?.destroy();
    session.flatCamera = null;
    session.flatNavigationAbort?.abort();
    session.flatNavigationAbort = new AbortController();
    const stage = $('map-navigator-stage'),
      mini = stage.querySelector('svg'),
      box = stage.querySelector('i'),
      label = $('map-navigator-label'),
      vb = svg.viewBox.baseVal,
      art = [vb.x, vb.y, vb.width, vb.height];
    mini.replaceChildren();
    mini.setAttribute('viewBox', art.join(' '));
    stage.style.aspectRatio = art[2] / art[3];
    stage.style.height = 'auto';
    const ns = 'http://www.w3.org/2000/svg';
    if (session.presentation.rink?.art && session.presentation.focus) {
      const image = document.createElementNS(ns, 'image'),
        f = session.presentation.focus;
      for (const [k, v] of Object.entries({
        x: f.cx - f.width / 2,
        y: f.cy - f.height / 2,
        width: f.width,
        height: f.height,
        href: session.presentation.rink.art,
      }))
        image.setAttribute(k, v);
      mini.append(image);
    }
    const items = [];
    for (const section of session.map.sections) {
      if (!section.path || section.killed) continue;
      const path = document.createElementNS(ns, 'path');
      path.setAttribute('d', section.path);
      path.setAttribute('fill', '#d4dde8');
      path.setAttribute('stroke', '#fff');
      path.setAttribute('stroke-width', art[2] / 850);
      path.dataset.miniSection = section.id;
      mini.append(path);
      items.push({ section, path, b: path.getBBox() });
    }
    const at = (x, y) => {
      const point = new DOMPoint(x, y),
        hits = items.filter((i) => i.path.isPointInFill(point));
      return (
        hits.sort((a, b) => a.b.width * a.b.height - b.b.width * b.b.height)[0] ||
        items.reduce((best, i) => {
          const d = Math.hypot(x - i.b.x - i.b.width / 2, y - i.b.y - i.b.height / 2);
          return !best || d < best.d ? { ...i, d } : best;
        }, null)
      )?.section;
    };
    const update = () => {
      updateFocusEffect();
      if (session.focusSeat) positionSeatPopup(session.focusSeat, { force: true });
      for (const item of items) {
        const fill =
          item.section.id ===
          (session.workspace === 'admin' ? session.adminActiveSection : session.currentSection)
            ? '#4e8ce8'
            : '#d4dde8';
        if (item.path.getAttribute('fill') !== fill) {
          item.path.setAttribute('fill', fill);
          if (fill === '#4e8ce8') mini.append(item.path); // the chosen section is drawn last, so its outline is not cut into by its neighbours
        }
      }
      if (!stage.getClientRects().length) return;
      for (const item of items) if (!item.b.width) item.b = item.path.getBBox();
      const three = usesPlayer() ? session.player?.mapView?.() : null,
        v = three
          ? [
              three.x - (three.width || art[2] * three.ratio) / 2,
              three.y - (three.height || art[3] * three.ratio) / 2,
              three.width || art[2] * three.ratio,
              three.height || art[3] * three.ratio,
            ]
          : session.flatCamera?.get() || art;
      const zoomRatio = three
          ? 1 / Math.max(0.01, three.ratio)
          : (Math.max(art[2], art[3] * (svg.clientWidth / svg.clientHeight || 1)) * 1.2) / v[2],
        zoom = $('zoom-percent');
      if (zoom) zoom.textContent = Math.round(100 * zoomRatio) + '%';
      const x = ((v[0] - art[0]) / art[2]) * 100,
        y = ((v[1] - art[1]) / art[3]) * 100,
        w = (v[2] / art[2]) * 100,
        h = (v[3] / art[3]) * 100,
        fullVenue = zoomRatio <= 1.005;
      Object.assign(box.style, {
        opacity: fullVenue ? '0' : '1',
        pointerEvents: fullVenue ? 'none' : 'auto',
        left: Math.max(0, x) + '%',
        top: Math.max(0, y) + '%',
        width: Math.max(0, Math.min(100, x + w) - Math.max(0, x)) + '%',
        height: Math.max(0, Math.min(100, y + h) - Math.max(0, y)) + '%',
      });
      const section = fullVenue ? null : at(v[0] + v[2] / 2, v[1] + v[3] / 2),
        deckLabel = session.presentation.sectionLevels?.[section?.id] || '';
      label.textContent = section
        ? `${section.name}${deckLabel ? ' · ' + deckLabel : ''}`
        : 'Full venue';

    };
    const sizes = session.map.seats.map((s) => Math.min(s.w, s.h)).sort((a, b) => a - b);
    session.flatCamera = createFlatNavigation(svg, {
      seatSize: sizes[Math.floor(sizes.length / 2)] || 8,
      onChange: update,
      diagnostics: diagnosticsEnabled,
    });
    session.refreshNavigator = update;
    session.flatSetView = session.flatCamera.set;
    session.flatReset = session.flatCamera.reset;
    session.flatZoomBy = (f) => session.flatCamera.zoomButton(f);
    let drag = null,
      miniFrame = 0;
    const sync = () => {
        if (!miniFrame)
          miniFrame = requestAnimationFrame(() => {
            miniFrame = 0;
            update();
          });
      },
      point = (e) => {
        const m = mini.getScreenCTM();
        return m ? new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse()) : null;
      };
    stage.onpointerdown = (e) => {
      if (e.button !== 0) return;
      const p = point(e),
        three = usesPlayer() ? session.player.mapView() : null,
        v = session.flatCamera.get(),
        cx = three?.x ?? v[0] + v[2] / 2,
        cy = three?.y ?? v[1] + v[3] / 2;
      drag = {
        id: e.pointerId,
        dx: e.target === box ? p.x - cx : 0,
        dy: e.target === box ? p.y - cy : 0,
      };
      stage.setPointerCapture(e.pointerId);
      move(e);
    };
    const move = (e) => {
      if (drag?.id !== e.pointerId) return;
      const p = point(e);
      if (!p) return;
      const x = p.x - drag.dx,
        y = p.y - drag.dy;
      if (usesPlayer()) {
        session.player.panToMap(x, y, false);
        sync();
      } else {
        const v = session.flatCamera.get();
        session.flatCamera.set([x - v[2] / 2, y - v[3] / 2, v[2], v[3]], true);
      }
    };
    stage.onpointermove = move;
    stage.onpointerup = stage.onpointercancel = () => {
      drag = null;
      sync();
    };
    update();
  }

  return { sectionBounds, setupFlatNavigation };
}
