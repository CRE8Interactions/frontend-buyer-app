/* Small colour maths for the colour components. A colour is held as HSB plus alpha, the model the area and sliders edit:
   h 0-360, s 0-100, b 0-100, a 0-1. Strings in, strings out: hex (#rgb, #rgba, #rrggbb, #rrggbbaa), rgb(), rgba(), hsl(),
   hsla() and hsb(). No dependencies. */
export type HSBA = { h: number; s: number; b: number; a: number }
export type ColorFormat = "hex" | "rgb" | "hsl" | "hsb"
export type ColorChannel = "hue" | "saturation" | "brightness" | "lightness" | "red" | "green" | "blue" | "alpha"

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
const round = (n: number, d = 0) => {
  const f = 10 ** d
  return Math.round(n * f) / f
}

export function hsbToRgb({ h, s, b }: HSBA): [number, number, number] {
  const S = s / 100
  const V = b / 100
  const f = (n: number) => {
    const k = (n + h / 60) % 6
    return V - V * S * Math.max(0, Math.min(k, 4 - k, 1))
  }
  return [round(f(5) * 255), round(f(3) * 255), round(f(1) * 255)]
}

export function rgbToHsb(r: number, g: number, b: number, a = 1): HSBA {
  const R = r / 255
  const G = g / 255
  const B = b / 255
  const max = Math.max(R, G, B)
  const min = Math.min(R, G, B)
  const d = max - min
  let h = 0
  if (d) {
    if (max === R) h = ((G - B) / d) % 6
    else if (max === G) h = (B - R) / d + 2
    else h = (R - G) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return { h: round(h, 2), s: round(max ? (d / max) * 100 : 0, 2), b: round(max * 100, 2), a }
}

export function hsbToHsl({ h, s, b }: HSBA): [number, number, number] {
  const S = s / 100
  const V = b / 100
  const l = V * (1 - S / 2)
  const sl = l === 0 || l === 1 ? 0 : (V - l) / Math.min(l, 1 - l)
  return [round(h), round(sl * 100), round(l * 100)]
}

function hslToHsb(h: number, s: number, l: number, a = 1): HSBA {
  const S = s / 100
  const L = l / 100
  const v = L + S * Math.min(L, 1 - L)
  return { h, s: round(v ? 2 * (1 - L / v) * 100 : 0, 2), b: round(v * 100, 2), a }
}

const hex2 = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0")

/** `#rrggbb`, or `#rrggbbaa` when the colour is not fully opaque (or `withAlpha` is set). */
export function toHex(c: HSBA, withAlpha = false) {
  const [r, g, b] = hsbToRgb(c)
  const base = `#${hex2(r)}${hex2(g)}${hex2(b)}`.toUpperCase()
  return withAlpha || c.a < 1 ? base + hex2(c.a * 255).toUpperCase() : base
}

export function toCss(c: HSBA) {
  const [r, g, b] = hsbToRgb(c)
  return c.a < 1 ? `rgb(${r} ${g} ${b} / ${round(c.a, 2)})` : `rgb(${r} ${g} ${b})`
}

export function formatColor(c: HSBA, format: ColorFormat) {
  if (format === "hex") return toHex(c)
  if (format === "rgb") {
    const [r, g, b] = hsbToRgb(c)
    return c.a < 1 ? `rgba(${r}, ${g}, ${b}, ${round(c.a, 2)})` : `rgb(${r}, ${g}, ${b})`
  }
  if (format === "hsl") {
    const [h, s, l] = hsbToHsl(c)
    return c.a < 1 ? `hsla(${h}, ${s}%, ${l}%, ${round(c.a, 2)})` : `hsl(${h}, ${s}%, ${l}%)`
  }
  return c.a < 1 ? `hsba(${round(c.h)}, ${round(c.s)}%, ${round(c.b)}%, ${round(c.a, 2)})` : `hsb(${round(c.h)}, ${round(c.s)}%, ${round(c.b)}%)`
}

/** Parses a colour string. Returns null when it is not a colour. */
export function parseColor(input: string): HSBA | null {
  const v = input.trim().toLowerCase()
  const hex = /^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(v)
  if (hex) {
    let h = hex[1]
    if (h.length <= 4) h = h.replace(/./g, "$&$&")
    const n = (i: number) => parseInt(h.slice(i, i + 2), 16)
    return rgbToHsb(n(0), n(2), n(4), h.length === 8 ? round(n(6) / 255, 3) : 1)
  }
  const fn = /^(rgba?|hsla?|hsba?)\(\s*([^)]+)\)$/.exec(v)
  if (!fn) return null
  const parts = fn[2].split(/[\s,/]+/).filter(Boolean).map((p) => (p.endsWith("%") ? parseFloat(p) : parseFloat(p)))
  if (parts.length < 3 || parts.some(Number.isNaN)) return null
  const alpha = parts[3] === undefined ? 1 : clamp(parts[3] > 1 ? parts[3] / 100 : parts[3], 0, 1)
  if (fn[1].startsWith("rgb")) return rgbToHsb(clamp(parts[0], 0, 255), clamp(parts[1], 0, 255), clamp(parts[2], 0, 255), alpha)
  if (fn[1].startsWith("hsl")) return hslToHsb(((parts[0] % 360) + 360) % 360, clamp(parts[1], 0, 100), clamp(parts[2], 0, 100), alpha)
  return { h: ((parts[0] % 360) + 360) % 360, s: clamp(parts[1], 0, 100), b: clamp(parts[2], 0, 100), a: alpha }
}

/** Reads one channel of a colour in the units the fields and sliders show. */
export function getChannel(c: HSBA, channel: ColorChannel): number {
  switch (channel) {
    case "hue": return round(c.h)
    case "saturation": return round(c.s)
    case "brightness": return round(c.b)
    case "lightness": return hsbToHsl(c)[2]
    case "red": return hsbToRgb(c)[0]
    case "green": return hsbToRgb(c)[1]
    case "blue": return hsbToRgb(c)[2]
    case "alpha": return round(c.a * 100)
  }
}

/** Returns the colour with one channel set (alpha as 0-100). Other channels are kept as they are in that channel's model. */
export function setChannel(c: HSBA, channel: ColorChannel, value: number): HSBA {
  switch (channel) {
    case "hue": return { ...c, h: clamp(value, 0, 360) }
    case "saturation": return { ...c, s: clamp(value, 0, 100) }
    case "brightness": return { ...c, b: clamp(value, 0, 100) }
    case "alpha": return { ...c, a: clamp(value, 0, 100) / 100 }
    case "lightness": {
      const [h, s] = hsbToHsl(c)
      return hslToHsb(h, s, clamp(value, 0, 100), c.a)
    }
    default: {
      const rgb = hsbToRgb(c)
      const i = channel === "red" ? 0 : channel === "green" ? 1 : 2
      rgb[i] = clamp(value, 0, 255)
      return { ...rgbToHsb(rgb[0], rgb[1], rgb[2], c.a), h: rgb[0] === rgb[1] && rgb[1] === rgb[2] ? c.h : rgbToHsb(rgb[0], rgb[1], rgb[2], c.a).h }
    }
  }
}

/** Whether black reads better than white on this colour. */
export function isLight(c: HSBA) {
  const [r, g, b] = hsbToRgb(c).map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) * c.a + (1 - c.a) > 0.6
}

export const CHECKERED =
  "repeating-conic-gradient(#efefef 0% 25%, #f7f7f7 0% 50%) 50% / 16px 16px"
