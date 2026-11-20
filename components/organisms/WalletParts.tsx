"use client";

/** Small parts the wallet screens share: a sliding filter row, a sticky group header, a page heading. */

import { useEffect, useState } from "react";
import { MagnifyingGlass, Rows, SquaresFour } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { SearchField } from "@/components/ui/search-field";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { H1 } from "@/lib/walletUtils";


/**
 * The wallet's spacing, one set of steps for every screen: SCREEN is the gap between a screen's big blocks (head, toolbar,
 * lists), BLOCK the gap inside one block (a toolbar and its list, a list's rows), GROUPS the gap between a screen's sections.
 * Small steps (8, 12) belong to parts, not to screens.
 */
export const SCREEN = "flex w-full flex-col gap-5 sm:gap-8";
export const BLOCK = "flex flex-col gap-5";
export const GROUPS = "flex flex-col gap-12";

/**
 * The row under a page heading. On a computer: filters on the left, search on the right, and an optional view switch. On a
 * phone it is one row: the filters scroll, and search is an icon that opens a field in their place (the view switch is left
 * out; phones always list). It closes with Cancel, and stays open while there is a search to see.
 */
export function Toolbar({ chips, search, trailing }: { chips?: React.ReactNode; search?: { value: string; onChange: (v: string) => void; placeholder: string; label: string }; trailing?: React.ReactNode }) {
  const mobile = useIsMobile();
  const [open, setOpen] = useState(false);
  if (mobile && search) {
    const showing = open || !!search.value;
    return (
      <div className="flex items-center gap-2">
        {showing ? (
          <>
            <SearchField variant="secondary" size="md" autoFocus value={search.value} onChange={(e) => search.onChange(e.target.value)} placeholder={search.placeholder} aria-label={search.label} shortcutKey="" shortcutLabel="" />
            <Button variant="tertiary" onClick={() => { search.onChange(""); setOpen(false); }}>Cancel</Button>
          </>
        ) : (
          <>
            <div className="min-w-0 flex-1">{chips}</div>
            <Button variant="secondary" size="icon" aria-label={search.label} onClick={() => setOpen(true)}><MagnifyingGlass weight="bold" /></Button>
          </>
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      {chips}
      {(search || trailing) && (
        <div className="flex min-w-[220px] flex-1 items-center gap-3 lg:ml-auto lg:max-w-[440px]">
          {search && <SearchField variant="secondary" size="md" value={search.value} onChange={(e) => search.onChange(e.target.value)} placeholder={search.placeholder} aria-label={search.label} shortcutKey="" shortcutLabel="" />}
          {trailing}
        </div>
      )}
    </div>
  );
}

/** List or tiles, remembered between visits. The same switch as Browse's Events. */
export function useViewPref(key = "wl-view"): ["list" | "tiles", (v: "list" | "tiles") => void] {
  const [view, set] = useState<"list" | "tiles">("list");
  useEffect(() => {
    try { const v = localStorage.getItem(key); if (v === "list" || v === "tiles") set(v); } catch { /* storage blocked: the choice lasts for this visit */ }
  }, [key]);
  return [view, (v) => { set(v); try { localStorage.setItem(key, v); } catch { /* same */ } }];
}

export function ViewSwitch({ value, onChange }: { value: "list" | "tiles"; onChange: (v: "list" | "tiles") => void }) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as "list" | "tiles")} className="shrink-0">
      <TabsList size="md" variant="soft" aria-label="View as">
        <TabsTrigger value="list" iconOnly aria-label="List view"><Rows weight="bold" /></TabsTrigger>
        <TabsTrigger value="tiles" iconOnly aria-label="Tiles view"><SquaresFour weight="bold" /></TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

export function PageHead({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="max-w-[60ch]">
      <h1 className={H1}>{title}</h1>
      {children && <p className="mt-3 text-pretty text-[17px] leading-snug text-ink2">{children}</p>}
    </div>
  );
}

/** A horizontal filter row: the library Tabs as they are, scrolling sideways on a phone. */
export function Chips<T extends string>({
  value, onChange, items, label, className, variant = "soft", size = "md",
}: {
  value: T; onChange: (v: T) => void; label: string; className?: string;
  /** line is the page's own navigation (underlined, larger); soft is a filter under it (pill track, smaller) */
  variant?: "soft" | "line"; size?: "sm" | "md" | "lg";
  /** `badge` is a number waiting on you: it shows as a green pill (the dock's) in place of the plain count, on phones too. */
  items: { id: T; label: string; count?: number; badge?: number }[];
}) {
  return (
    <div className={cn("-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0", className)}>
      <Tabs value={value} onValueChange={(v) => onChange(v as T)}>
        <TabsList variant={variant} size={size} aria-label={label} className="w-max">
          {items.map((c) => (
            <TabsTrigger key={c.id} value={c.id}>
              {c.label}
              {c.badge ? (
                <span aria-label={`${c.badge} waiting`} className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[12px] font-semibold leading-none tabular-nums text-primary-foreground">{c.badge > 9 ? "9+" : c.badge}</span>
              ) : c.count != null && <span className="tabular-nums text-ink2 max-sm:hidden">{c.count}</span>}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}

/** What a screen shows while it loads: a heading and a few rows, on the library's pulse. */
export function ScreenSkeleton() {
  return (
    <div className="flex flex-col gap-10" role="status" aria-label="Loading">
      <div className="flex flex-col gap-3"><Skeleton className="h-14 w-[min(420px,80%)] rounded-[16px]" /><Skeleton className="h-5 w-[min(320px,60%)] rounded-full" /></div>
      <Skeleton className="h-12 w-full rounded-full" />
      <div className="flex flex-col gap-3">
        {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-[88px] w-full rounded-[24px]" />)}
      </div>
    </div>
  );
}

export function GroupHeader({ name, count }: { name: string; count?: number }) {
  return (
    <div className="sticky top-[76px] z-10 -mx-1 flex items-baseline justify-between bg-background/85 px-1 pb-2 pt-8 backdrop-blur-md">
      <h2 className="text-[15px] font-semibold tracking-[-0.01em]">{name}</h2>
      {count != null && <span className="text-[13px] tabular-nums text-mute">{count}</span>}
    </div>
  );
}

/** A round tile with two initials, for people. */
export function Initials({ name, className }: { name: string; className?: string }) {
  const t = (name.split("@")[0].split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("") || "?").toUpperCase();
  return <span aria-hidden className={cn("flex size-12 shrink-0 items-center justify-center rounded-full bg-secondary text-[15px] font-semibold", className)}>{t}</span>;
}

export { PullLoadMore } from "./PullLoadMore";

/**
 * The one padding every wallet sheet shares, so a ticket, a flow, a pack and a pass all sit on the same lines: 20px at the sides on a phone,
 * 32px on a computer, and the top is 8px under the grab handle on a phone and 32px (the same as the sides) on a computer. It is two custom
 * properties: SheetPage and ResponsiveSheet set them, and anything inside that needs to bleed to the edge or line up reads them
 * (`mx-[calc(var(--sheet-x)*-1)]`) instead of repeating the numbers.
 */
export const SHEET_VARS = "[--sheet-x:1.25rem] md:[--sheet-x:2rem] [--sheet-top:0.5rem] md:[--sheet-top:2rem]";
export const SHEET_PAD = "px-(--sheet-x) pt-(--sheet-top)";

/**
 * A detail that behaves like the platform: on a phone it is a bottom sheet you can drag down to dismiss (tall, rounded,
 * with a grab handle, padded for the home bar, its own scroll that never chains to the page); on a computer it slides
 * in from the right. The content sits in a container so it can lay itself out by the sheet's width.
 */
export function ResponsiveSheet({ open, onOpenChange, title, description = "Details", bare, children }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: string; /** the content is a full-height screen of its own (a flow): no padding, no scroll here */ bare?: boolean; children: React.ReactNode }) {
  const mobile = useIsMobile();
  if (mobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[94dvh] max-h-[94dvh] gap-0 rounded-t-[28px] px-0 pb-0">
          <DrawerTitle className="sr-only">{title}</DrawerTitle>
          <DrawerDescription className="sr-only">{description}</DrawerDescription>
          <div className={cn("@container min-h-0 flex-1", bare ? "flex flex-col" : cn(SHEET_VARS, SHEET_PAD, "touch-pan-y overflow-y-auto overscroll-contain pb-0"))}>{children}</div>
        </DrawerContent>
      </Drawer>
    );
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[min(780px,100vw)] max-w-none rounded-l-[28px]">
        <SheetTitle className="sr-only">{title}</SheetTitle>
        <SheetDescription className="sr-only">{description}</SheetDescription>
        <div className={cn("@container min-h-0 flex-1", bare ? "flex flex-col" : cn(SHEET_VARS, SHEET_PAD, "overflow-y-auto overscroll-contain pb-0"))}>{children}</div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * A short task or a code: a bottom sheet on a phone (full-width buttons stacked above the home bar), a dialog on a
 * computer. Give it a footer and it lays the buttons out for each.
 */
export function ResponsiveDialog({ open, onOpenChange, title, description, align, size = "sm", footer, footerInline, children }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: React.ReactNode; description?: React.ReactNode; align?: "center"; size?: "sm" | "md"; footer?: React.ReactNode; /** on a phone, put the buttons side by side on one line (the first one smaller) instead of stacked */ footerInline?: boolean; children?: React.ReactNode;
}) {
  const mobile = useIsMobile();
  if (mobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="gap-0 rounded-t-[28px] px-0 pb-0">
          <div className={cn("px-5 pt-1", align === "center" && "text-center")}>
            <DrawerTitle className="text-[20px] font-semibold tracking-[-0.02em]">{title}</DrawerTitle>
            {description && <DrawerDescription className="mt-1 text-[15px] text-ink2">{description}</DrawerDescription>}
          </div>
          {children && <div className="max-h-[56dvh] touch-pan-y overflow-y-auto overscroll-contain px-5 py-5">{children}</div>}
          {footer && <div className={cn("gap-2 px-5 pb-[calc(20px+env(safe-area-inset-bottom))] pt-2", footerInline ? "flex [&>*]:min-w-0 [&>*:first-child]:flex-1 [&>*:last-child]:flex-[2] [&>*:only-child]:flex-1" : "flex flex-col-reverse [&>*]:w-full")}>{footer}</div>}
        </DrawerContent>
      </Drawer>
    );
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size={size}>
        <DialogHeader align={align}><DialogTitle>{title}</DialogTitle>{description && <DialogDescription>{description}</DialogDescription>}</DialogHeader>
        {children && <DialogBody className={align === "center" ? "flex flex-col items-center gap-3" : "flex flex-col gap-2"}>{children}</DialogBody>}
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}

/**
 * One screen inside a sheet: the sheet's own paddings (so a flow lines up with the ticket) and its own scroll.
 */
export function SheetPage({ children, scroll = true, className }: { children: React.ReactNode; scroll?: boolean; className?: string }) {
  return (
    <div className={cn("@container flex min-h-0 w-full flex-1 flex-col", SHEET_VARS, SHEET_PAD, scroll && "touch-pan-y overflow-x-hidden overflow-y-auto overscroll-contain", className)}>
      {children}
    </div>
  );
}
