import type { SVGProps } from "react";

const base = (props: SVGProps<SVGSVGElement>) => ({
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...props,
});

export const ArrowRight = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
export const Ticket = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
    <path d="M13 5v2M13 11v2M13 17v2" />
  </svg>
);
export const Seat = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 18v-6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6" /><path d="M4 18h16M7 10V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v4" /></svg>
);
export const Spark = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></svg>
);
export const Users = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
);
export const Shield = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></svg>
);
/** Same mark the seat map paints on a verified-resale seat (`icon-resale`). */
export const Resale = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 20 20" fill="currentColor" {...p}>
    <path d="M3.33329 9.99984C3.33329 6.31794 6.31806 3.33317 9.99996 3.33317C12.0975 3.33317 13.9406 4.30275 15.1518 5.82751L13.7524 5.82341C13.2922 5.82206 12.918 6.19406 12.9166 6.6543C12.9153 7.11453 13.2873 7.48872 13.7475 7.49007L16.6166 7.49847C16.6486 7.50043 16.6808 7.50054 16.7131 7.49876L17.0809 7.49983C17.3023 7.50048 17.5149 7.41297 17.6717 7.25662C17.8285 7.10027 17.9166 6.88794 17.9166 6.6665L17.9166 3.33317C17.9166 2.87293 17.5435 2.49984 17.0833 2.49984C16.6231 2.49984 16.25 2.87293 16.25 3.33317L16.25 4.54106C14.7395 2.78349 12.5191 1.6665 9.99996 1.6665C5.39759 1.6665 1.66663 5.39746 1.66663 9.99984C1.66663 10.4601 2.03972 10.8332 2.49996 10.8332C2.9602 10.8332 3.33329 10.4601 3.33329 9.99984Z" />
    <path d="M16.6667 9.99984C16.6667 13.6817 13.6819 16.6665 10 16.6665C7.9025 16.6665 6.05936 15.6969 4.84817 14.1722L6.2476 14.1763C6.70783 14.1776 7.08202 13.8056 7.08337 13.3454C7.08472 12.8851 6.71272 12.511 6.25248 12.5096L3.38343 12.5012C3.35142 12.4992 3.31921 12.4991 3.28694 12.5009L2.91915 12.4998C2.69771 12.4992 2.48512 12.5867 2.32832 12.7431C2.17151 12.8994 2.08337 13.1117 2.08337 13.3332L2.08338 16.6665C2.08338 17.1267 2.45647 17.4998 2.91671 17.4998C3.37695 17.4998 3.75004 17.1267 3.75004 16.6665L3.75004 15.4586C5.2605 17.2162 7.48089 18.3332 10 18.3332C14.6024 18.3332 18.3334 14.6022 18.3334 9.99984C18.3334 9.5396 17.9603 9.1665 17.5 9.1665C17.0398 9.1665 16.6667 9.5396 16.6667 9.99984Z" />
  </svg>
);
export const Layers = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="m12 2 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 17l9 5 9-5" /></svg>
);
export const Bolt = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" /></svg>
);
export const Check = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M20 6 9 17l-5-5" /></svg>
);
export const Info = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
);
export const MapPin = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
);
export const Sort = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3" /></svg>
);
export const Accessibility = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="16" cy="4" r="1" /><path d="m18 19 1-7-6 1" /><path d="m5 8 3-3 5.5 3-2.36 3.5" /><path d="M4.24 14.5a5 5 0 0 0 6.88 6" /><path d="M13.76 17.5a5 5 0 0 0-6.88-6" /></svg>
);
