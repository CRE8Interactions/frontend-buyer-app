"use client";

/**
 * Switch — on/off toggle. Green when on (an interactive/active state, so
 * green is allowed). Pass `label` for accessibility when there's no visible
 * label next to it.
 */
export default function Switch({
  checked,
  onChange,
  label,
  className = "",
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${checked ? "border-transparent bg-[#a6e773]" : "border-white/15 bg-white/[0.08]"
        } ${className}`}
    >
      <span
        className={`absolute top-1/2 h-[18px] w-[18px] -translate-y-1/2 rounded-full transition-[left,background-color] duration-200 ${checked ? "left-[22px] bg-[#051B35]" : "left-[3px] bg-[#BCBFCC]"
          }`}
      />
    </button>
  );
}
