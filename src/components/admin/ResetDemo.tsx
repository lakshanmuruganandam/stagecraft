"use client";

import { RotateCcw } from "lucide-react";
import { resetDemo } from "@/app/admin/actions";
import { ConfirmButton } from "./ConfirmButton";

export function ResetDemo() {
  return (
    <form action={resetDemo}>
      <ConfirmButton type="submit" variant="ghost" confirmLabel="Wipe & reseed? Click again">
        <RotateCcw size={15} /> Reset demo data
      </ConfirmButton>
    </form>
  );
}
