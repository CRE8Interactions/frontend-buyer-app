"use client";

import { ArrowLeft } from "@phosphor-icons/react";
import Button from "@/components/atoms/Button";

/* The head of every page a storefront links to: a back button (with the page's actions on the same row), the team crest or the venue plate, and the
   title with its facts right under it. The title carries the page; there is no label above it. */
export default function PageHead({ back, title, mark, plate, actions, children }: {
  back: { href: string; label: string }; title: string; mark?: string; plate?: React.ReactNode; actions?: React.ReactNode; children?: React.ReactNode;
}) {
  return (
    <header className="pg-head">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <Button href={back.href} variant="ghost" className="-ml-3 w-max max-w-full"><ArrowLeft weight="bold" aria-hidden /><span className="truncate">{back.label}</span></Button>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      <div className="pg-head-row">
        {mark && (
          <span className="pg-mark" aria-hidden>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mark} alt="" />
          </span>
        )}
        {plate && <span className="pg-bowl-plate" aria-hidden>{plate}</span>}
        <div className="grid min-w-0 gap-2">
          <h1 className="pg-h1">{title}</h1>
          {children}
        </div>
      </div>
    </header>
  );
}
