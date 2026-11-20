"use client";

import { useEffect, useState } from "react";

/* The current year, for © lines. It is worked out from the visitor's clock after the page loads, so a page that was built or cached in December still says the new year in January; the server's value only fills the gap before then. */
export default function CopyrightYear() {
  const [year, setYear] = useState(() => new Date().getFullYear());
  useEffect(() => { setYear(new Date().getFullYear()); }, []);
  return <span suppressHydrationWarning>{year}</span>;
}
