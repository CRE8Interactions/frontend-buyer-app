"use client"

import * as React from "react"

/* The map player is not a React component: it is the shared program in public/maps-2d that every venue loads.
   This frame runs the real player and then puts it in one state (a hover, an open card, the 3D view), so
   Storybook always shows what buyers get and nothing has to be redrawn by hand when the player changes. */

/* eslint-disable @typescript-eslint/no-explicit-any -- the player is plain JavaScript and has no types */
export type PlayerWindow = Window & { maps2d?: any; PointerEvent: typeof PointerEvent }
export type PlayerSetup = (win: PlayerWindow, api: any) => void | Promise<void>

export const wait = (ms: number) => new Promise<void>((done) => setTimeout(done, ms))

export interface MapPlayerFrameProps {
  /** Venue folder to load. Left out, the player loads its default venue. */
  venue?: string
  /** "phone" is 390 x 780 and gets the bottom sheet; "desktop" fills the width. */
  size?: "desktop" | "phone"
  /** Light or dark. In the app the player follows the device. */
  theme?: "light" | "dark"
  /** Runs once the map is ready; puts the player in the state the story is about. */
  setup?: PlayerSetup
}

export function MapPlayerFrame({ venue, size = "desktop", theme = "dark", setup }: MapPlayerFrameProps) {
  const frame = React.useRef<HTMLIFrameElement>(null)
  const [firstTheme] = React.useState(theme)
  const [ready, setReady] = React.useState(false)
  const src = `/maps-2d/apps/experience/index.html?style=schematic&theme=${firstTheme}${venue ? `&venue=${encodeURIComponent(venue)}` : ""}`

  React.useEffect(() => {
    let stopped = false
    void (async () => {
      for (let i = 0; i < 200 && !stopped; i++) {
        const win = frame.current?.contentWindow as PlayerWindow | null
        let api: any
        try { api = win?.maps2d } catch { api = null }
        if (win && api?.map?.() && api?.player?.()) {
          await wait(900)
          if (stopped) return
          try { await setup?.(win, api) } catch (error) { console.warn("Map player story could not reach its state", error) }
          if (!stopped) setReady(true)
          return
        }
        await wait(150)
      }
    })()
    return () => { stopped = true }
  }, [setup, src])

  React.useEffect(() => {
    try { (frame.current?.contentWindow as PlayerWindow | null)?.maps2d?.setTheme?.(theme) } catch {}
  }, [theme, ready])

  const phone = size === "phone"
  return (
    <iframe
      ref={frame}
      src={src}
      title="Map player"
      data-ready={ready}
      style={{
        display: "block",
        width: phone ? 390 : "100%",
        height: phone ? "min(780px, calc(100vh - 32px))" : "min(680px, 100vh)",
        margin: phone ? "16px auto" : 0,
        border: 0,
        borderRadius: phone ? 28 : 0,
      }}
    />
  )
}
