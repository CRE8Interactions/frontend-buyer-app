export const menuRowRadius = "rounded-[16px]"

/* The row used by every list of options (dropdown menu, select, combobox, command, context menu). At least 36px tall,
   16px corners, 10px side padding, 12px gap between
   parts, the default fill on hover and keyboard highlight, pressed scale 0.98 (250ms), focus ring from the keyboard,
   disabled dims. Libraries mark the highlighted row differently, so the state classes come in two flavours. */
export const menuRow = [
  menuRowRadius,
  "group/item relative flex min-h-9 w-full cursor-pointer items-center justify-start gap-3 px-2.5 py-1.5 text-sm text-h-foreground outline-none select-none h-no-highlight",
  "[transition:transform_250ms_cubic-bezier(0.165,0.84,0.44,1),box-shadow_150ms_var(--e-out),background-color_100ms_var(--e-out)] motion-reduce:[transition:none]",
  "focus-visible:h-focus-ring active:will-change-transform active:[transform:scale(0.98)]",
  "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-h-muted",
].join(" ")

/** Radix and Base UI mark the highlighted and disabled row with data-highlighted and data-disabled. */
export const menuRowState = "data-[highlighted]:bg-[color-mix(in_oklab,var(--h-overlay)_92%,var(--h-foreground))] data-[disabled]:pointer-events-none data-[disabled]:h-status-disabled"

/** cmdk marks them with data-selected and data-disabled="true". */
export const menuRowStateCmdk = "data-[selected=true]:bg-[color-mix(in_oklab,var(--h-overlay)_92%,var(--h-foreground))] data-[disabled=true]:pointer-events-none data-[disabled=true]:h-status-disabled"

/** The selection indicator at the start of a checkbox or radio row (the row also takes ps-7). */
export const menuRowIndicator = "pointer-events-none absolute start-2 top-1/2 flex size-4 -translate-y-1/2 items-center justify-center text-h-muted"

/** The popover around a list of options (dropdown, select, context menu, menubar): the overlay fill, 22px corners, the overlay
   shadow, 6px padding, 2px between rows, at least 220px wide, opening from the trigger with a 150ms scale-and-fade from 90%
   and closing in 100ms. Add the library's own max-height and origin classes next to it. */
export const menuPopover =
  "z-50 flex flex-col gap-0.5 overflow-x-hidden overflow-y-auto overscroll-contain rounded-[22px] glass p-1.5 text-sm text-h-foreground shadow-none [min-width:min(13.75rem,100%,calc(100svw-2rem))] max-w-[min(100%,calc(100svw-2rem))] outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-90 data-[state=open]:duration-150 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:duration-100 motion-reduce:animate-none"

/** A separator spanning 94% of the width, centred. */
export const menuSeparator = "my-0.5 ms-[3%] h-px w-[94%] shrink-0 bg-h-separator"

/** A small muted section header, lined up with the row labels. */
export const menuLabel = "w-full px-2.5 pt-1.5 pb-1 text-xs font-medium text-h-muted select-none data-[inset]:ps-7"

/** A plain keyboard hint at the end of a row. */
export const menuShortcut = "ms-auto ps-3 text-xs text-h-muted select-none"
