import Reveal from "@/components/atoms/Reveal";
import Button from "@/components/atoms/Button";
import { ArrowRight } from "@/components/atoms/icons";

/**
 * CtaPanel — the closing "Ready to build bigger?" card. One of the few
 * places the green wash is allowed (DESIGN-SYSTEM.md §2).
 */
export default function CtaPanel({
  eyebrow = "Get started",
  title,
  sub,
  action,
  note,
  size = "lg",
  tint = "linear",
}: {
  eyebrow?: string;
  title: string;
  sub: string;
  action: { href: string; label: string };
  /** Small print rendered above the eyebrow (e.g. attribution notes). */
  note?: string;
  size?: "lg" | "md";
  tint?: "linear" | "radial";
}) {
  const padCls = size === "lg" ? "px-6 py-16 sm:py-[72px]" : "px-6 py-14 sm:py-16";
  const titleCls =
    size === "lg"
      ? "text-[clamp(32px,4.4vw,54px)]"
      : "text-[clamp(30px,4vw,48px)]";
  return (
    <Reveal className={`relative mx-auto max-w-[960px] overflow-hidden rounded-[22px] border border-white/10 text-center shadow-2xl shadow-black/40 ${padCls}`}>
      {tint === "linear" ? (
        <>
          <span className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(166, 231, 115,0.18), #051B35 60%)" }} />
          <span className="pointer-events-none absolute -bottom-24 -right-20 h-72 w-72 rounded-full bg-[#a6e773]/[0.10] blur-[110px]" />
        </>
      ) : (
        <span className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(60% 100% at 50% 0%, rgba(166,231,115,0.14), transparent 70%)" }} />
      )}
      <div className="relative mx-auto max-w-[640px]">
        {note && <p className="mx-auto mb-6 max-w-[560px] text-[13px] leading-relaxed text-[#9DA2B3]">{note}</p>}
        <div className="text-[12px] font-medium uppercase tracking-[0.2em] text-[#9DA2B3]">{eyebrow}</div>
        <h2 className={`mt-4 font-semibold leading-tight tracking-[-0.02em] text-white ${titleCls}`}>{title}</h2>
        <p className="mx-auto mt-4 max-w-[480px] text-[16px] leading-relaxed text-[#9DA2B3]">{sub}</p>
        <div className={`flex justify-center ${size === "lg" ? "mt-9" : "mt-8"}`}>
          <Button href={action.href}>
            {action.label} <ArrowRight className="arrow" />
          </Button>
        </div>
      </div>
    </Reveal>
  );
}
