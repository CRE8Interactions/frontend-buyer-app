"use client";

import { useLayoutEffect } from "react";

/* Applies the visitor's stored light/dark choice. This used to be an inline <script> inside the page component, which React
   refuses to run on the client: it logged an error and made the dev server reload the page on its own. */
export default function ThemeInit() {
  useLayoutEffect(() => {
    try {
      const t = localStorage.getItem("concept-theme");
      if (t === "light" || t === "dark") document.documentElement.dataset.nt = t;
    } catch { /* storage blocked: the page follows the device */ }
  }, []);
  return null;
}
