"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "@phosphor-icons/react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

/* The light/dark switch, the same one as the nav's: the choice is kept (localStorage) and set on <html data-nt>; with none stored the page follows the device. */
export default function ThemeSwitch() {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    try { const saved = localStorage.getItem("concept-theme"); if (saved === "light" || saved === "dark") document.documentElement.dataset.nt = saved; } catch { /* storage blocked: the page follows the device */ }
    const read = () => { const scope = document.querySelector(".n"); setDark(scope ? getComputedStyle(scope).colorScheme === "dark" : true); };
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-nt"] });
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", read);
    return () => { mo.disconnect(); mq.removeEventListener("change", read); };
  }, []);
  return (
    <Tabs value={dark ? "dark" : "light"} onValueChange={(v) => { document.documentElement.dataset.nt = v; try { localStorage.setItem("concept-theme", v); } catch { /* storage blocked: the choice lasts for this visit */ } }}>
      <TabsList size="md" variant="soft" aria-label="Colour mode">
        <TabsTrigger value="light" iconOnly aria-label="Light mode"><Sun weight="bold" /></TabsTrigger>
        <TabsTrigger value="dark" iconOnly aria-label="Dark mode"><Moon weight="bold" /></TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
