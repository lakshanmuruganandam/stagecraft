"use client";

import { usePathname } from "next/navigation";

/** Hidden `next` field so server actions return you to the current page. */
export function HereInput() {
  return <input type="hidden" name="next" value={usePathname()} />;
}
