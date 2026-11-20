// Display metadata comes only from SVG rules, independently of JSON deck geometry.
// The closest declaration wins. An empty label explicitly hides an inherited level.
export function sectionLevelsFromSVG(root) {
  const levels = {};
  for (const section of root.querySelectorAll('[data-section-id]:not([data-seat-id])')) {
    const id = section.getAttribute('data-section-id');
    let node = section;
    while (node) {
      if (node.hasAttribute('data-level-label')) {
        levels[id] = node.getAttribute('data-level-label').trim();
        break;
      }
      const legacy = [...node.classList].map(name => name.match(/^deck_(\d+)rise[\d.]+_rake[\d.]+$/)).find(Boolean);
      if (legacy) {
        levels[id] = `Deck ${legacy[1]}`;
        break;
      }
      if (node === root) break;
      node = node.parentElement;
    }
  }
  return levels;
}
