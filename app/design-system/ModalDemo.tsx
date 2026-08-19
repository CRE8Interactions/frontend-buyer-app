"use client";

import { useState } from "react";
import Modal from "@/components/molecules/Modal";
import Button from "@/components/atoms/Button";

/** Live demo trigger for the Modal molecule on the design-system page. */
export default function ModalDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Open Modal
      </Button>
      {open && (
        <Modal title="Modal" onClose={() => setOpen(false)}>
          <p className="mt-5 text-[15px] leading-relaxed text-[#9DA2B3]">
            App-surface dialog on the elevated card color. Backdrop click or the × closes it.
          </p>
          <Button onClick={() => setOpen(false)} className="mt-6 w-full">
            Close
          </Button>
        </Modal>
      )}
    </>
  );
}
