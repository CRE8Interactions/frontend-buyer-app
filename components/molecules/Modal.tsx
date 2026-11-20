"use client";

import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

/** Modal: app-surface dialog with title bar and backdrop-close, on the shadcn Dialog (focus trap, Escape, scroll lock). */
export default function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader className="border-b border-white/10 pb-4 pr-12 text-left">
          <DialogTitle className="text-[24px] font-semibold tracking-[-0.01em]">{title}</DialogTitle>
          <DialogDescription className="sr-only">{title}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
