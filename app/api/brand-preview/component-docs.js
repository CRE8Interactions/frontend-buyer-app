(async () => {
  const storybook = new URL(document.currentScript.dataset.storybook + "/", location.href)
  const deployed = storybook.origin === location.origin
  const selection = new URLSearchParams(location.search).get("component")
  if (deployed && selection && /^[a-z0-9][a-z0-9-]*$/.test(selection)) {
    const response = await fetch("/brand/guides/" + selection + ".html").catch(() => null)
    if (response?.ok) {
      const page = document.getElementById("component-guide")
      page.innerHTML = await response.text()
      page.dataset.title = page.querySelector("h1").textContent
      window.refreshBrandRoute()
    }
  }
  const root = document.documentElement
  const clone = (id) => document.getElementById(id).content.firstElementChild.cloneNode(true)
  const nav = clone("ds-area-navigation")
  const sidebar = clone("ds-sidebar-components")
  const header = clone("ds-header-controls")
  document.querySelector("#scrim").before(nav)
  document.querySelector("#theme").after(header)
  document.querySelector("#nav").append(sidebar)
  root.dataset.dsDocs = ""
  document.querySelector(".top .brand .chip").textContent = "Design system"

  let iconsReady = false
  const paintIcon = (slot, name) => {
    if (iconsReady && slot) slot.innerHTML = window.phIcon(name, "bold", 16, "")
  }
  if (window.needW) {
    window.needW("bold").then(() => {
      iconsReady = true
      for (const icon of document.querySelectorAll("[data-ds-icon]")) paintIcon(icon, icon.dataset.dsIcon)
    }).catch(() => {})
  }

  const siteThemes = [...header.querySelectorAll("[data-ds-site-theme]")]
  function syncSiteTheme() {
    for (const button of siteThemes) {
      button.setAttribute("aria-pressed", String(button.dataset.dsSiteTheme === (root.dataset.themePreference ?? root.dataset.theme)))
    }
  }
  for (const button of siteThemes) button.addEventListener("click", () => window.setBrandTheme(button.dataset.dsSiteTheme))
  syncSiteTheme()

  function componentLinksForSelection(container) {
    if (!selection) return null
    const link = [...container.querySelectorAll(".ds-flat-list a")].find((item) => new URL(item.href).searchParams.get("component") === selection)
    link?.setAttribute("data-ds-selected", "")
    return link
  }
  const selectedComponent = document.querySelector("#component-guide h1")?.textContent
  const selectedLink = componentLinksForSelection(sidebar)
  if (selectedComponent && selectedLink) {
    document.querySelector("#component-guide").dataset.title = selectedComponent
  }

  const areas = {
    start: ["overview", "voice", "colour", "typography", "spacing", "motion", "icons", "logo", "imagery",
      "motifs", "buttons", "cards", "charts", "labels", "nav-layout", "social", "examples", "accessibility",
      "library", "tokens", "assets"],
    components: ["component-library", "component-guide", "dialog-guide"],
    releases: ["changelog"],
    migration: ["component-migration"],
  }
  const uiOnly = new Set([...areas.components, "spacing", "motion", "tokens", "buttons", "cards", "charts", "labels", "nav-layout", "library", "component-migration"])
  const graphicOnly = new Set(["imagery", "social", "examples"])
  const areaFor = (id) => Object.keys(areas).find((area) => areas[area].includes(id)) ?? "start"
  const allowed = (id, audience) => !(audience === "g" && uiOnly.has(id) || audience === "u" && graphicOnly.has(id))

  function setAudience(audience) {
    root.dataset.aud = audience
    try { localStorage.setItem("bt-aud", audience) } catch {}
    window.syncBrandAudience?.()
  }
  window.addEventListener("blocktickets-docs-audience", (event) => {
    if (["all", "u", "g"].includes(event.detail)) setAudience(event.detail)
  })
  window.brandDocPager = (pages, current) => pages.filter((page) =>
    areaFor(page.id) === areaFor(current.id) && allowed(page.id, root.dataset.aud) &&
      (page.id !== "component-guide" || page === current)
  )

  const sidebarLinks = [...document.querySelectorAll("#nav a[data-p]")]
  const navGroups = [...document.querySelectorAll("#nav .ng")]
  const componentLinks = [...sidebar.querySelectorAll(".ds-flat-list a")]
  window.addBrandDocEntries?.(componentLinks.map((link) => ({
    l: link.textContent, h: "Component library", to: link.getAttribute("href"),
  })))
  window.brandDocSearchMatch = (entry) => {
    const url = new URL(entry.to, location.href)
    const [id, anchor] = url.hash.slice(2).split("/")
    const audience = root.dataset.aud
    if (!allowed(id, audience) || entry.to === "#/component-guide") return false
    const heading = anchor && document.getElementById(anchor)
    return !(heading && (audience === "g" && heading.classList.contains("for-u") ||
      audience === "u" && heading.classList.contains("for-g")))
  }

  let activeSidebarLink
  let previousAudience = root.dataset.aud
  function syncNavigation() {
    const id = document.querySelector(".page.on")?.id ?? "overview"
    const area = areaFor(id)
    const audience = root.dataset.aud
    if (!allowed(id, audience)) {
      if (audience !== previousAudience) {
        previousAudience = audience
        const next = areas[area].find((candidate) => allowed(candidate, audience))
          ?? (audience === "g" ? "logo" : "colour")
        location.hash = "#/" + next
        return
      }
      // An explicit deep link opens the content in the audience that includes it.
      previousAudience = uiOnly.has(id) ? "u" : "g"
      setAudience(previousAudience)
    } else {
      previousAudience = audience
    }

    root.dataset.dsAreaCurrent = area
    window.refreshBrandDocPager?.()
    for (const link of nav.querySelectorAll("a")) {
      if (link.dataset.dsArea === area) link.setAttribute("aria-current", "page")
      else link.removeAttribute("aria-current")
    }
    for (const link of sidebarLinks) link.hidden = !areas[area].includes(link.dataset.p) || !allowed(link.dataset.p, root.dataset.aud)
    for (const group of navGroups) {
      const visible = !!group.querySelector("a:not([hidden])")
      group.hidden = !visible
      const heading = group.previousElementSibling
      if (heading?.matches("h5")) heading.hidden = !visible
    }
    for (const link of sidebar.querySelectorAll("a")) {
      const current = id === "component-library" && link.classList.contains("ds-index-link")
        || id === "dialog-guide" && link.hasAttribute("data-ds-modal-link")
        || id === "component-guide" && link.hasAttribute("data-ds-selected")
      if (current) link.setAttribute("aria-current", "page")
      else link.removeAttribute("aria-current")
    }
    const active = sidebar.querySelector('[aria-current="page"]')
    if (active && active !== activeSidebarLink) {
      const rail = sidebar.parentElement
      const offset = active.getBoundingClientRect().top - rail.getBoundingClientRect().top
      if (offset < 0 || offset > rail.clientHeight - active.offsetHeight) rail.scrollTop += offset - rail.clientHeight / 3
    }
    activeSidebarLink = active
    if (id === "component-guide" && selectedComponent) document.title = selectedComponent + " · blocktickets Design System"
  }
  window.addEventListener("hashchange", syncNavigation)
  new MutationObserver(syncNavigation).observe(root, { attributeFilter: ["data-aud"] })
  syncNavigation()

  const directory = document.querySelector(".ds-directory")
  const search = document.querySelector("#ds-component-search")
  search.addEventListener("input", () => {
    const term = search.value.trim().toLowerCase()
    const links = [...directory.querySelectorAll("a")]
    const words = term.split(/\s+/).filter(Boolean)
    // every word must appear in the name or the category, so "forms input" finds the Forms & inputs group
    for (const link of links) {
      const text = (link.textContent + " " + (link.dataset.group || "")).toLowerCase()
      link.hidden = !words.every((word) => text.includes(word))
    }
    document.querySelector("#ds-no-matches").hidden = !links.length || links.some((link) => !link.hidden)
  })

  for (const button of document.querySelectorAll("[data-ds-code-toggle]")) {
    const panel = document.getElementById(button.getAttribute("aria-controls"))
    button.addEventListener("click", async () => {
      panel.hidden = !panel.hidden
      button.setAttribute("aria-expanded", String(!panel.hidden))
      if (panel.hidden || !button.dataset.source || panel.dataset.sourceState === "loaded" || panel.dataset.sourceState === "loading") return
      const code = panel.querySelector("code")
      panel.dataset.sourceState = "loading"
      code.textContent = "Loading example source…"
      try {
        const response = await fetch(button.dataset.source)
        if (!response.ok) throw new Error("Example source is unavailable")
        code.textContent = await response.text()
        panel.dataset.sourceState = "loaded"
      } catch {
        code.textContent = "Example source is unavailable. Close and reopen to try again."
        panel.dataset.sourceState = "error"
      }
    })
  }

  for (const button of document.querySelectorAll("[data-ds-copy-markdown]")) {
    button.addEventListener("click", () => {
      const page = button.closest(".ds-doc-page")
      const fence = String.fromCharCode(96).repeat(3)
      const markdown = [...page.querySelectorAll("h1,h2,h3,p:not(.crumb),.ds-anatomy,pre,table")]
        .map((node) => {
          const text = node.textContent.trim()
          if (/^H[1-3]$/.test(node.tagName)) return "#".repeat(Number(node.tagName[1])) + " " + text
          if (node.matches("pre")) return fence + "tsx\n" + text + "\n" + fence
          if (node.matches(".ds-anatomy")) return [...node.children].map((item, i) => (i + 1) + ". " + item.textContent.trim()).join("\n")
          if (node.matches("table")) {
            const rows = [...node.rows].map((row) => [...row.cells].map((cell) => cell.textContent.trim().replaceAll("|", "\\|")))
            return [rows[0], rows[0].map(() => "---"), ...rows.slice(1)].map((row) => "| " + row.join(" | ") + " |").join("\n")
          }
          const links = [...node.querySelectorAll("a")]
          return links.length ? links.map((link) => "[" + link.textContent.trim() + "](" + link.href + ")").join(" · ") : text
        }).filter(Boolean).join("\n\n")
      window.copy(markdown, "component Markdown")
    })
  }

  const frames = [...document.querySelectorAll("iframe[data-ds-story]")]
  const stages = new Map()
  const viewportWidths = { mobile: 390, tablet: 768, desktop: 900 }

  function previewUrl(frame, theme) {
    const url = new URL("iframe.html", storybook)
    url.search = new URLSearchParams({
      id: frame.dataset.dsStory,
      viewMode: "story",
      singleStory: "true",
      shortcuts: "false",
      globals: "theme:" + theme,
      brandPreview: "center",
    })
    return url
  }

  function syncPreview(state) {
    const { frame, stage, button, label } = state
    const theme = state.theme ?? root.dataset.theme
    stage.dataset.previewTheme = theme
    const icon = button.firstElementChild
    icon.dataset.dsIcon = theme === "dark" ? "sun" : "moon"
    paintIcon(icon, icon.dataset.dsIcon)
    const action = "Switch " + label + " preview to " + (theme === "dark" ? "light" : "dark")
    button.setAttribute("aria-label", action)
    button.title = action
    if (frame.hasAttribute("src")) {
      frame.contentWindow?.postMessage({ type: "blocktickets-brand-theme", theme }, storybook.origin)
    }
  }

  // The story reports how tall its content is; the frame grows to show all of it (never below 240px).
  window.addEventListener("message", (event) => {
    if (event.origin !== storybook.origin || event.data?.type !== "blocktickets-brand-preview-size") return
    const frame = frames.find((item) => item.contentWindow === event.source)
    const height = Number(event.data.height)
    if (!frame || !Number.isFinite(height) || height < 60) return
    frame.parentElement.style.setProperty("--ds-preview-height", Math.min(1600, Math.max(240, Math.ceil(height))) + "px")
  })

  window.addEventListener("message", (event) => {
    if (event.origin !== storybook.origin || event.data?.type !== "blocktickets-brand-preview-ready") return
    const frame = frames.find((item) => item.contentWindow === event.source)
    if (!frame) return
    const state = stages.get(frame.parentElement)
    if (event.data.theme === (state.theme ?? root.dataset.theme)) {
      state.stage.dataset.ready = ""
      frame.style.removeProperty("visibility")
    } else {
      syncPreview(state)
    }
  })

  function fitViewport(state) {
    const available = state.viewport.clientWidth
    if (!available) return
    const width = state.size === "desktop" ? Math.max(available, viewportWidths.desktop) : viewportWidths[state.size]
    const scale = Math.min(1, available / width)
    state.frame.style.setProperty("--ds-viewport-width", width + "px")
    state.frame.style.setProperty("--ds-viewport-scale", String(scale))
  }

  const resizeViewports = new ResizeObserver((entries) => {
    for (const { target } of entries) fitViewport(stages.get(target))
  })
  const lazyPreviews = new IntersectionObserver((entries) => {
    for (const { isIntersecting, target } of entries) {
      if (!isIntersecting) continue
      const state = stages.get(target)
      if (!state.frame.hasAttribute("src")) state.frame.src = previewUrl(state.frame, state.theme ?? root.dataset.theme)
      lazyPreviews.unobserve(target)
    }
  }, { rootMargin: "180px 0px" })

  for (const frame of frames) {
    const stage = frame.closest(".ds-stage")
    const viewport = frame.parentElement
    const button = stage.querySelector("[data-ds-preview-theme]")
    const state = {
      frame, stage, viewport, button, label: frame.title.replace(/ preview$/, ""),
      size: matchMedia("(max-width: 520px)").matches ? "mobile" : "desktop",
    }
    stages.set(viewport, state)
    const devices = [...stage.querySelectorAll("[data-ds-viewport]")]
    function selectSize(size) {
      state.size = size
      for (const item of devices) item.setAttribute("aria-pressed", String(item.dataset.dsViewport === size))
      fitViewport(state)
    }
    for (const item of devices) item.addEventListener("click", () => selectSize(item.dataset.dsViewport))
    button.addEventListener("click", () => {
      state.theme = (state.theme ?? root.dataset.theme) === "dark" ? "light" : "dark"
      syncPreview(state)
    })
    stage.querySelector("[data-ds-expand]").addEventListener("click", async () => {
      if (!frame.hasAttribute("src")) frame.src = previewUrl(frame, state.theme ?? root.dataset.theme)
      try {
        await frame.requestFullscreen()
      } catch {
        viewport.classList.toggle("ds-viewport-expanded")
      }
    })
    frame.addEventListener("load", () => syncPreview(state))
    selectSize(state.size)
    resizeViewports.observe(viewport)
    lazyPreviews.observe(viewport)
    syncPreview(state)
  }
  new MutationObserver(() => {
    syncSiteTheme()
    for (const state of stages.values()) syncPreview(state)
  }).observe(root, { attributeFilter: ["data-theme", "data-theme-preference"] })
  import(deployed ? "/brand/brand-controls.js" : new URL("/.storybook/brand-controls.tsx", storybook).href).catch((error) => {
    console.warn("Shared design system controls could not load.", error)
    // Show the page's own controls instead of leaving the header hidden.
    root.dataset.dsSharedControls = "failed"
  })
})()
