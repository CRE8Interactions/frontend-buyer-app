import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * StageSkeleton: the loading state for the server-built pages (Browse, team, venue, search), shown by each route's loading.tsx and held by PageGate until the page is ready.
 * It sketches the page at the real sizes (the hero is as tall as the real hero, the tiles and ticket strips are as tall and wide as the real ones), so nothing jumps when the content arrives.
 * Shapes stack at most two layers: a panel (layer 1, the faintest fill) and the few shapes inside it that stand for its content (layer 2, one step stronger).
 * Every shape is the library Skeleton, so the one loading style is the pulse. The two fills are `--sk-1` and `--sk-2` from `.bt-sk` in app/globals.css and follow the visitor's light or dark; both are kept very subtle.
 * Variants: "stage" (team, venue, season pages), "browse" (hero, teams and venues rail, event strips), "search" (field, chips, result rows), "season" (title and price on the left, search and game list on the right).
 * No hooks, so it renders on the server; the shapes are hidden from assistive tech and the wrapper is one busy status.
 */
type Variant = "stage" | "browse" | "search" | "season";

/* a single shape: layer 1 (on the page) or layer 2 (inside a panel) */
const S = ({ className, layer = 1 }: { className?: string; layer?: 1 | 2 }) => (
  <Skeleton className={cn(layer === 1 ? "bg-(color:--sk-1)" : "bg-(color:--sk-2)", className)} />
);

/* a panel: the faint fill is one shape behind its content, so the shapes inside pulse on their own */
const Panel = ({ className, inner, children }: { className: string; inner?: string; children?: ReactNode }) => (
  <div className={cn("relative isolate", className)}>
    <S className="absolute inset-0 -z-10 rounded-[inherit]" />
    <div className={cn("h-full", inner)}>{children}</div>
  </div>
);

/* the real nav: a pill about 52px tall, centred */
const Nav = () => <S layer={2} className="absolute left-1/2 top-3.5 z-10 h-[52px] w-[min(520px,calc(100%-24px))] -translate-x-1/2 rounded-full" />;

/* the real hero: full width, 8px from the edges, as tall as the screen less the peek of the next section (the real block, with its 8px top edge, is at least 580) */
const Hero = () => (
  <div className="px-2 pt-2">
    <Panel className="h-[max(572px,calc(100svh-clamp(96px,14svh,140px)-24px))] rounded-[28px] md:rounded-[36px]" inner="flex items-end justify-between gap-6 p-[clamp(18px,2.4vw,32px)]">
      <div className="grid w-full max-w-[440px] gap-3">
        <S layer={2} className="h-[clamp(34px,5vw,60px)] w-full rounded-xl" />
        <S layer={2} className="h-[clamp(34px,5vw,60px)] w-2/3 rounded-xl" />
        <S layer={2} className="h-4 w-3/4 rounded-lg" />
      </div>
      <S layer={2} className="h-12 w-40 shrink-0 rounded-full" />
    </Panel>
  </div>
);

const Bar = ({ className }: { className: string }) => <S className={cn("rounded-lg", className)} />;

/* a ticket strip as tall as the real one (127px; taller on a phone where the price stub drops below): date, picture, two lines, price and button */
const Strip = () => (
  <Panel className="h-[190px] rounded-[24px] sm:h-[127px]" inner="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-3.5 px-4 sm:grid-cols-[60px_64px_minmax(0,1fr)_180px] sm:gap-[18px] sm:pl-[22px] sm:pr-5">
    <S layer={2} className="h-[49px] w-full rounded-lg" />
    <S layer={2} className="hidden h-16 w-16 rounded-xl sm:block" />
    <div className="grid gap-2">
      <S layer={2} className="h-5 w-3/4 rounded-lg" />
      <S layer={2} className="h-3.5 w-1/2 rounded-md" />
    </div>
    <S layer={2} className="ml-auto hidden h-8 w-28 rounded-full sm:block" />
  </Panel>
);

/* a month of strips: the month on the left, the strips on the right (as the real list) */
const Month = ({ n }: { n: number }) => (
  <div className="grid gap-3 md:grid-cols-[140px_minmax(0,1fr)] md:gap-8">
    <Bar className="h-9 w-16" />
    <div className="grid gap-3">{Array.from({ length: n }, (_, k) => <Strip key={k} />)}</div>
  </div>
);

/* a teams and venues tile: 266 x 184 like the real one, with its mark above and two lines below */
const Tile = () => (
  <Panel className="h-[184px] w-[clamp(248px,26vw,296px)] shrink-0 rounded-[26px]" inner="flex flex-col justify-between p-5">
    <S layer={2} className="h-[52px] w-[52px] rounded-2xl" />
    <div className="grid gap-2">
      <S layer={2} className="h-3 w-1/3 rounded-md" />
      <S layer={2} className="h-5 w-3/4 rounded-lg" />
    </div>
  </Panel>
);

const Pills = ({ n, h = "h-10" }: { n: number; h?: string }) => <div className="flex gap-2 overflow-hidden">{Array.from({ length: n }, (_, k) => <S key={k} className={cn("w-24 shrink-0 rounded-full", h)} />)}</div>;

const Wrap = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn("mx-auto grid w-full max-w-[1180px] px-4 md:px-8", className)}>{children}</div>
);

export default function StageSkeleton({ variant = "stage", label = "Loading", gate, done }: { variant?: Variant; label?: string; /** set by PageGate: this copy sits over a page that is already rendered */ gate?: boolean; /** PageGate is lifting it: fade out */ done?: boolean }) {
  return (
    <div className="bt-sk" data-gate={gate ? "1" : undefined} data-done={done ? "1" : undefined} role="status" aria-busy="true" aria-label={label}>
      <div className="relative pb-16" aria-hidden>
        <Nav />
        {variant === "search" ? (
          <Wrap className="w-[min(860px,100%)] gap-4 pt-[92px]">
            <S className="h-14 w-full rounded-full" />
            <Pills n={4} h="h-[38px]" />
            {Array.from({ length: 6 }, (_, k) => (
              <Panel key={k} className="h-[62px] rounded-2xl" inner="grid grid-cols-[44px_minmax(0,1fr)_40px] items-center gap-3.5 px-3">
                <S layer={2} className="h-11 w-11 rounded-xl" />
                <div className="grid gap-2"><S layer={2} className="h-4 w-1/2 rounded-lg" /><S layer={2} className="h-3 w-1/3 rounded-md" /></div>
                <S layer={2} className="h-4 w-9 rounded-md" />
              </Panel>
            ))}
          </Wrap>
        ) : variant === "season" ? (
          <Wrap className="gap-6 pt-[104px] md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] md:gap-12 md:pt-[112px]">
            <div className="grid content-start gap-5">
              <S className="h-8 w-40 rounded-full" />
              <S className="hidden h-[84px] w-[132px] rounded-[26px] md:block" />
              <div className="grid gap-3"><S className="h-[clamp(34px,5vw,60px)] w-4/5 rounded-xl" /><S className="h-[clamp(34px,5vw,60px)] w-3/5 rounded-xl" /></div>
              <S className="h-4 w-3/5 rounded-lg" />
              <Panel className="h-[88px] max-w-[420px] rounded-[22px]" inner="flex items-center justify-between gap-4 px-5"><div className="grid gap-2"><S layer={2} className="h-8 w-28 rounded-lg" /><S layer={2} className="h-3.5 w-40 rounded-md" /></div><S layer={2} className="h-12 w-36 rounded-full" /></Panel>
            </div>
            <Panel className="rounded-[28px]" inner="grid gap-3 p-4 md:p-6">
              <div className="flex items-baseline justify-between"><S layer={2} className="h-8 w-48 rounded-lg" /><S layer={2} className="h-4 w-14 rounded-md" /></div>
              <S layer={2} className="h-11 w-full rounded-full" />
              {Array.from({ length: 6 }, (_, k) => (
                <div key={k} className="flex items-center gap-3 px-1 py-1"><S layer={2} className="h-12 w-12 shrink-0 rounded-[14px]" /><div className="grid flex-1 gap-2"><S layer={2} className="h-4 w-3/5 rounded-lg" /><S layer={2} className="h-3.5 w-2/5 rounded-md" /></div></div>
              ))}
            </Panel>
          </Wrap>
        ) : variant === "browse" ? (
          <>
            <Hero />
            <Wrap className="gap-12 pt-8">
              <div className="grid gap-3">
                <Bar className="h-7 w-48" />
                <S className="h-10 w-44 rounded-full" />
                <div className="flex gap-3.5 overflow-hidden pt-1">{Array.from({ length: 4 }, (_, k) => <Tile key={k} />)}</div>
              </div>
              <div className="grid gap-4">
                <Bar className="h-7 w-24" />
                <S className="h-12 w-full rounded-full" />
                <Pills n={3} />
                <Month n={3} />
              </div>
            </Wrap>
          </>
        ) : (
          <>
            <Hero />
            <Wrap className="gap-4 pt-8">
              <Pills n={3} h="h-11" />
              <Month n={3} />
            </Wrap>
          </>
        )}
      </div>
    </div>
  );
}
