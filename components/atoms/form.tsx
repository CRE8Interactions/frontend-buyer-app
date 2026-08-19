import type { InputHTMLAttributes, LabelHTMLAttributes } from "react";

/** Form atoms — the app-surface input & label treatments. */

export const inputCls =
  "h-12 w-full rounded-xl border border-white/15 bg-[#051B35] px-4 text-[15px] text-white placeholder-[#7c88a3] outline-none transition-colors focus:border-[#a6e773]";

export const labelCls = "block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#9DA2B3]";

export function Label({ className = "", ...rest }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label {...rest} className={`${labelCls} ${className}`} />;
}

export function Input({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={`${inputCls} ${className}`} />;
}
