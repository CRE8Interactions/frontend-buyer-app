/** Marker artwork and texture ownership shared by the 2D/3D coordinator. */
export function createPlayerTextures({ THREE, icons, document }) {
  const textures = new Set();
  function texture(draw, size = 64) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    draw(c.getContext('2d'));
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    textures.add(t);
    return t;
  }
  function phosphor(name, bg, fg = '#1857a9') {
    return texture((c) => {
      c.fillStyle = bg;
      c.beginPath();
      c.arc(64, 64, 58, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = fg;
      c.lineWidth = 5;
      c.stroke();
      const d = icons[name].match(/<path[^>]*d="([^"]+)/)?.[1];
      if (d) {
        c.save();
        c.translate(32, 32);
        c.scale(0.25, 0.25);
        c.fillStyle = fg;
        c.fill(new Path2D(d));
        c.restore();
      }
    }, 128);
  }
  const check = texture((c) => {
    c.strokeStyle = '#fff';
    c.lineWidth = 10;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(14, 34);
    c.lineTo(27, 47);
    c.lineTo(51, 17);
    c.stroke();
  });
  const lock = texture((c) => {
    c.clearRect(0, 0, 64, 64);
    const d = icons['lock-key'].match(/<path[^>]*d="([^"]+)/)?.[1];
    if (d) {
      c.fillStyle = '#fff';
      c.save();
      c.translate(4, 4);
      c.scale(0.22, 0.22);
      c.fill(new Path2D(d));
      c.restore();
    }
  });
  const accessible = phosphor('wheelchair', '#facc15', '#18181b');
  const star = texture((c) => {
    c.fillStyle = '#fff';
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 11 : 25, a = -Math.PI / 2 + (i * Math.PI) / 5;
      c[i ? 'lineTo' : 'moveTo'](32 + r * Math.cos(a), 33 + r * Math.sin(a));
    }
    c.closePath();
    c.lineJoin = 'round';
    c.lineWidth = 4;
    c.strokeStyle = '#fff';
    c.stroke();
    c.fill();
  });
  return {
    check,
    lock,
    accessible,
    star,
    dispose() {
      for (const texture of textures) texture.dispose();
      textures.clear();
    },
  };
}
