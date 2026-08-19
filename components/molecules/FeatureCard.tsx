import type { ReactNode } from "react";
import Link from "next/link";
import Reveal from "@/components/atoms/Reveal";
import IconChip from "@/components/atoms/IconChip";
import { ArrowRight } from "@/components/atoms/icons";

/**
 * FeatureCard — bento feature card: icon chip, eyebrow, title, body, with
 * optional link, `aside` panel (product vignette) and `backdrop` slot.
 */
export default function FeatureCard({
  className = "",
  icon,
  eyebrow,
  title,
  body,
  glow,
  bodyClassName = "text-[14px]",
  link,
  aside,
  backdrop,
}: {
  className?: string;
  icon: ReactNode;
  eyebrow: string;
  title: string;
  body: string;
  glow: string;
  bodyClassName?: string;
  link?: { href: string; label: string };
  aside?: ReactNode;
  backdrop?: ReactNode;
}) {
  return (
    <Reveal className={`relative flex flex-col overflow-hidden rounded-[22px] border border-white/[0.08] p-7 shadow-xl shadow-black/20 ${className}`}>
      <span className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))" }} />
      <span className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl" style={{ background: `${glow}40` }} />
      {backdrop && <span className="pointer-events-none absolute inset-0">{backdrop}</span>}
      <div className="relative flex flex-1 flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col">
          <IconChip>{icon}</IconChip>
          <p className="mt-5 text-[12px] font-medium uppercase tracking-[0.06em] text-[#9DA2B3]">{eyebrow}</p>
          <h3 className="mt-2 text-[24px] font-medium leading-snug tracking-[-0.01em] text-white">{title}</h3>
          <p className={`mt-2 max-w-[60ch] leading-relaxed text-[#9DA2B3] ${bodyClassName}`}>{body}</p>
          {link && (
            <Link href={link.href} className="group/lnk mt-auto inline-flex items-center gap-1.5 pt-6 text-[14px] font-medium text-[#BCBFCC] transition-colors hover:text-[#a6e773]">
              {link.label}
              <ArrowRight className="h-4 w-4 transition-transform group-hover/lnk:translate-x-0.5" />
            </Link>
          )}
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </div>
    </Reveal>
  );
}
