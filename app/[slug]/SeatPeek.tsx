"use client";

import { useEffect, useState } from "react";
import { ArrowsOut } from "@phosphor-icons/react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { sectionImageIdentifiers } from "@/lib/seatView";

/* A small photo of the view from a section. It is a button: it opens a dialog where the pictures are a carousel, the view from the seats and then where the
   section is on the venue map. The pictures are the venue's own files (the view is a 30 MB photo), so they come through /api/seat-view, which shrinks them once on
   the server (a thumbnail here, a larger picture in the dialog). A picture that does not exist for this section drops out; with none left there is no photo. */
type Key = "view" | "where";

export default function SeatPeek({ venueSlug, section, row, className = "", compact = false, render }: { venueSlug: string; section: string; row?: string; className?: string; /** a smaller tile, for a list of sections */ compact?: boolean; /** a trigger of the page's own instead of the thumbnail: it is given the function that opens the dialog */ render?: (open: () => void) => React.ReactNode }) {
  const id = sectionImageIdentifiers(null, section).find((x) => /^[a-z0-9-]+$/.test(x));
  const [open, setOpen] = useState(false);
  const [bad, setBad] = useState<Key[]>([]);
  const [seen, setSeen] = useState<Key[]>([]);
  const [api, setApi] = useState<CarouselApi>();
  const [at, setAt] = useState(0);

  useEffect(() => {
    if (!api) return;
    const read = () => setAt(api.selectedScrollSnap());
    read();
    api.on("select", read);
    return () => { api.off("select", read); };
  }, [api]);

  if (!id) return null;
  const src = (type: "thumbnail" | "seat-view", w: 480 | 1400) => `/api/seat-view/?venue=${encodeURIComponent(venueSlug)}&section=${encodeURIComponent(id)}&type=${type}&w=${w}`;
  const all = [
    { key: "view" as Key, type: "seat-view" as const, alt: `The view from section ${section}` },
    { key: "where" as Key, type: "thumbnail" as const, alt: `Section ${section} on the venue map` },
  ];
  const slides = all.filter((s) => !bad.includes(s.key));
  if (slides.length === 0) return null;
  const first = slides[0];
  const drop = (k: Key) => setBad((x) => (x.includes(k) ? x : [...x, k]));
  const mark = (k: Key) => setSeen((x) => (x.includes(k) ? x : [...x, k]));

  return (
    <>
      {render ? render(() => setOpen(true)) : <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`See section ${section}${row ? `, row ${row}` : ""}: ${slides.length > 1 ? "the view from the seats and where it is on the map" : first.alt.toLowerCase()}`}
        className={`group/peek relative isolate aspect-[4/3] ${compact ? "w-[72px]" : "w-[84px] md:w-[104px]"} shrink-0 overflow-hidden rounded-[14px] bg-black/15 outline-none ring-1 ring-white/30 transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:ring-2 focus-visible:ring-h-focus active:scale-[0.97] [@media(hover:hover)]:hover:scale-[1.04] ${className}`}
      >
        {!seen.includes(first.key) && <Skeleton className="absolute inset-0 rounded-none" />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={first.key}
          src={src(first.type, 480)}
          alt=""
          decoding="async"
          onLoad={() => mark(first.key)}
          onError={() => drop(first.key)}
          className={`absolute inset-0 size-full ${first.key === "where" ? "object-contain" : "object-cover"} transition-opacity duration-300 ${seen.includes(first.key) ? "opacity-100" : "opacity-0"}`}
        />
        <span aria-hidden className="absolute bottom-1.5 right-1.5 grid size-6 place-items-center rounded-full bg-h-surface text-h-foreground shadow-[0_1px_3px_color-mix(in_srgb,var(--shade)_35%,transparent)] transition-transform duration-200 [@media(hover:hover)]:group-hover/peek:scale-110">
          <ArrowsOut weight="bold" className="size-3" />
        </span>
      </button>}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>{`Section ${section}${row ? `, row ${row}` : ""}`}</DialogTitle>
            <DialogDescription>{slides.length > 1 ? "The view from your seats, then where the section is on the map." : first.alt}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Carousel opts={{ loop: slides.length > 1 }} setApi={setApi} aria-label={`Pictures of section ${section}`}>
              <CarouselContent>
                {slides.map((s) => (
                  <CarouselItem key={s.key}>
                    <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-h-default">
                      {!seen.includes(s.key) && <Skeleton className="absolute inset-0 rounded-none" />}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src(s.type, 1400)}
                        alt={s.alt}
                        decoding="async"
                        onLoad={() => mark(s.key)}
                        onError={() => drop(s.key)}
                        className={`absolute inset-0 size-full ${s.key === "where" ? "object-contain" : "object-cover"} transition-opacity duration-300 ${seen.includes(s.key) ? "opacity-100" : "opacity-0"}`}
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {slides.length > 1 ? <><CarouselPrevious variant="secondary" className="left-3" /><CarouselNext variant="secondary" className="right-3" /></> : null}
            </Carousel>
            {slides.length > 1 ? (
              <>
                <div aria-hidden className="mt-4 flex justify-center gap-1.5">
                  {slides.map((s, n) => (
                    <i key={s.key} className={`h-1.5 rounded-full bg-h-foreground transition-[width,opacity] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${n === at ? "w-5 opacity-80" : "w-1.5 opacity-25"}`} />
                  ))}
                </div>
                <p className="sr-only" aria-live="polite">{`Picture ${at + 1} of ${slides.length}`}</p>
              </>
            ) : null}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}
