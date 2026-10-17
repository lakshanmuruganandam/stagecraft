"use client";

import { Printer } from "lucide-react";
import { buttonClass } from "@/components/ui/primitives";

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className={buttonClass("outline", "sm")}>
      <Printer size={14} /> PDF
    </button>
  );
}
