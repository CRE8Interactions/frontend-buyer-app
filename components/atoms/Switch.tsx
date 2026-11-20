"use client";

import { Switch as UISwitch } from "@/components/ui/switch";

/**
 * Switch: on/off toggle over the shadcn Switch (components/ui/switch.tsx). Green when on (an interactive/active
 * state, so green is allowed). Pass `label` for accessibility when there's no visible label next to it.
 */
export default function Switch({
  checked,
  onChange,
  label,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  className?: string;
}) {
  return <UISwitch checked={checked} onCheckedChange={onChange} aria-label={label} className={className} />;
}
