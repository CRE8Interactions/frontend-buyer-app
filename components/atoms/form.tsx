import type { InputHTMLAttributes, LabelHTMLAttributes } from "react";
import { Input as UIInput } from "@/components/ui/input";
import { Label as UILabel } from "@/components/ui/label";

/** Form atoms: the app-surface input & label, on the shadcn Input and Label (components/ui). */

/** Class strings for raw <input>/<label> elements that cannot use the components (e.g. third-party inputs). */
export const inputCls =
  "h-12 w-full rounded-2xl border border-transparent bg-foreground/[0.06] px-4 text-[15px] text-foreground placeholder:text-mute outline-none transition-colors focus:border-primary";

export const labelCls = "block text-[12px] font-semibold uppercase tracking-[0.1em] text-muted-foreground";

export function Label(props: LabelHTMLAttributes<HTMLLabelElement>) {
  return <UILabel {...props} />;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <UIInput {...props} />;
}
