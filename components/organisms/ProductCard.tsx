"use client";

import Link from "next/link";
import { cardCls } from "@/components/molecules/Card";
import { ArrowRight } from "@/components/atoms/icons";
import { imageUrl, type ApiImage } from "@/lib/helpers";

/** Generic product card for packages, flex packs, and venues. */
export default function ProductCard({
  href,
  title,
  meta,
  price,
  image,
  className = "",
}: {
  href: string;
  title: string;
  meta?: string;
  price?: string;
  image?: ApiImage | ApiImage[];
  className?: string;
}) {
  const img = Array.isArray(image) ? image[0] : image;

  return (
    <Link
      href={href}
      className={`${cardCls} group flex flex-col overflow-hidden transition-transform hover:-translate-y-0.5 ${className}`}
    >
      <div className="relative flex aspect-[16/10] items-center justify-center overflow-hidden bg-[#06203c]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl(img)}
          alt=""
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, transparent 45%, rgba(5,27,53,0.9) 100%)",
          }}
          aria-hidden
        />
      </div>
      <div className="flex flex-1 items-start gap-3 p-4 sm:p-5">
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-[16px] font-semibold leading-snug tracking-[-0.01em]">
            {title}
          </h3>
          {meta && (
            <p className="mt-1.5 text-[13px] leading-relaxed text-[#9DA2B3]">
              {meta}
            </p>
          )}
          {price && (
            <p className="mt-2 text-[14px] font-semibold text-white">{price}</p>
          )}
        </div>
        <span
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-white transition-transform group-hover:translate-x-0.5"
          aria-hidden
        >
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}
