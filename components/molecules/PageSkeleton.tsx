import { Skeleton } from "@/components/ui/skeleton";
import { cardCls } from "@/components/molecules/Card";

/**
 * PageSkeleton: the page's own shape drawn in grey while its data loads, so nothing is missing or jumps when the content arrives.
 * It replaces PageLoader where a page fetches inside an already-drawn shell (the header and page frame stay; only the content waits).
 * Variants follow the layout the content will take:
 *  - detail: a main card with a picture block and text, beside a price / action panel
 *  - list:   a heading and a stack of rows
 *  - cards:  a heading and a grid of picture cards
 *  - form:   a heading and labelled fields
 * It announces itself as one busy status (the grey blocks are hidden from assistive tech).
 */
type Variant = "detail" | "list" | "cards" | "form";

const Line = ({ w, h = "h-3.5" }: { w: string; h?: string }) => <Skeleton className={`${h} ${w} rounded-full`} />;

function Detail() {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-6">
      <div className={`${cardCls} overflow-hidden`}>
        <Skeleton className="h-[200px] w-full rounded-none sm:h-[260px]" />
        <div className="grid gap-3 p-5 sm:p-7">
          <Line w="w-40" />
          <Skeleton className="h-9 w-3/4 rounded-lg sm:h-11" />
          <div className="mt-1 flex flex-wrap gap-2">
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-44 rounded-full" />
            <Skeleton className="h-8 w-36 rounded-full" />
          </div>
          <div className="mt-2 grid gap-2"><Line w="w-full" /><Line w="w-11/12" /><Line w="w-2/3" /></div>
        </div>
      </div>
      <div className={`${cardCls} grid gap-4 p-5 sm:p-6`}>
        <Line w="w-20" />
        <Skeleton className="h-11 w-40 rounded-lg" />
        <Line w="w-32" />
        <div className="mt-2 grid gap-3 border-t border-dashed border-foreground/15 pt-5">
          <div className="flex justify-between"><Line w="w-16" /><Line w="w-8" /></div>
          <div className="flex justify-between"><Line w="w-12" /><Line w="w-36" /></div>
        </div>
        <Skeleton className="mt-2 h-12 w-full rounded-full" />
      </div>
    </div>
  );
}

function List() {
  return (
    <div className="grid gap-4">
      <Skeleton className="h-8 w-48 rounded-lg" />
      <div className="grid gap-3">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className={`${cardCls} flex items-center gap-4 p-4`}>
            <Skeleton className="h-14 w-14 shrink-0 rounded-xl" />
            <div className="grid flex-1 gap-2"><Line w="w-1/2" h="h-4" /><Line w="w-1/3" /></div>
            <Skeleton className="hidden h-8 w-24 rounded-full sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}

function Cards() {
  return (
    <div className="grid gap-4">
      <Skeleton className="h-8 w-48 rounded-lg" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className={`${cardCls} overflow-hidden`}>
            <Skeleton className="h-36 w-full rounded-none" />
            <div className="grid gap-2 p-4"><Line w="w-3/4" h="h-4" /><Line w="w-1/2" /><Skeleton className="mt-2 h-9 w-28 rounded-full" /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Form() {
  return (
    <div className="grid max-w-[560px] gap-5">
      <Skeleton className="h-8 w-52 rounded-lg" />
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="grid gap-2"><Line w="w-24" /><Skeleton className="h-12 w-full rounded-xl" /></div>
      ))}
      <Skeleton className="h-12 w-40 rounded-full" />
    </div>
  );
}

export default function PageSkeleton({
  variant = "detail",
  label = "Loading",
  className = "",
}: {
  variant?: Variant;
  label?: string;
  /** kept for call sites that used PageLoader; the skeleton sizes itself */
  className?: string;
  message?: string;
  size?: number;
}) {
  const Body = { detail: Detail, list: List, cards: Cards, form: Form }[variant];
  return (
    <div role="status" aria-busy="true" aria-label={label} className={`${/\bmt-\S+/.exec(className)?.[0] ?? "mt-6"}`}>
      <div aria-hidden="true"><Body /></div>
    </div>
  );
}
