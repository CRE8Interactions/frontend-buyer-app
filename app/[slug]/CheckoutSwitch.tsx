"use client";

import { useState } from "react";
import { CheckoutClassic, type CheckoutProps } from "./Checkout";
import CheckoutScene from "./CheckoutScene";

/* The checkout has two looks. `scene` is the newer one (the view from the seat is the whole page, the payment a frosted card over it, the form unlocking the view);
   `classic` is the two-panel one (the order on a bold team-colour panel, the payment beside it). Change LOOK to go back for good, or add ?checkout=classic or
   ?checkout=scene to the address to compare the two without touching the code. */
const LOOK: "scene" | "classic" = "scene";

export function CheckoutView(props: CheckoutProps) {
  /* this only ever renders after a press on the page (never on the server), so reading the address here is safe */
  const [look] = useState<"scene" | "classic">(() => {
    if (typeof window === "undefined") return LOOK;
    const q = new URLSearchParams(window.location.search).get("checkout");
    return q === "classic" || q === "scene" ? q : LOOK;
  });
  return look === "classic" ? <CheckoutClassic {...props} /> : <CheckoutScene {...props} />;
}
