import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

// Public, data-independent pages only: keeps the sitemap static (no database at build time).
const PAGES = ["", "/houses", "/calendar", "/quests", "/leaderboard", "/verify", "/pitch"];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return PAGES.map((p) => ({ url: `${base}${p}`, changeFrequency: p === "" ? "hourly" : "daily", priority: p === "" ? 1 : 0.7 }));
}
