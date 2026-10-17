import { customAlphabet } from "nanoid";

// Unambiguous alphabet (no 0/O, 1/l/I) so certificate IDs can be read aloud.
const alpha = customAlphabet("23456789abcdefghjkmnpqrstuvwxyz", 12);
const certAlpha = customAlphabet("23456789ABCDEFGHJKMNPQRSTUVWXYZ", 10);

export const newId = () => alpha();
export const newCertId = () => {
  const raw = certAlpha();
  return `SC-${raw.slice(0, 5)}-${raw.slice(5)}`;
};

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .slice(0, 60);
}
