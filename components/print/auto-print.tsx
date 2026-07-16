"use client";

import { useEffect } from "react";

/** Fires the browser print dialog once the print view has rendered. */
export function AutoPrint() {
  useEffect(() => {
    // Small delay lets fonts/layout settle before the dialog snapshots.
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, []);
  return null;
}
