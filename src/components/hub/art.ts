import "server-only";
import fs from "node:fs";
import path from "node:path";

/** Banner for a house if its generated art exists, else null (callers fall back to a colour wash). */
export function houseArt(slug: string): string | null {
  const file = path.join(process.cwd(), "public", "houses", `${slug}.webp`);
  return fs.existsSync(file) ? `/houses/${slug}.webp` : null;
}
