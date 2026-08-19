import Reveal from "@/components/atoms/Reveal";

/** StatCard — big-number outcome stat with label and supporting detail. */
export default function StatCard({
  value,
  label,
  detail,
  delay = 0,
}: {
  value: string;
  label: string;
  detail: string;
  delay?: number;
}) {
  return (
    <Reveal delay={delay} className="relative overflow-hidden rounded-[18px] border border-white/[0.08] p-6">
      <span className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.05), transparent)" }} />
      <div className="relative text-[36px] font-semibold tabular-nums leading-none tracking-[-0.03em] text-white">{value}</div>
      <div className="relative mt-4 text-[14px] font-medium text-white">{label}</div>
      <p className="relative mt-2 text-[12px] leading-relaxed text-[#9DA2B3]">{detail}</p>
    </Reveal>
  );
}
