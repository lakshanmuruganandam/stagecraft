import { fmtDate } from "@/lib/format";
import { memberById, odysseyFor } from "@/server/odyssey";
import { BadgeTile } from "./BadgeTile";
import { HoloCard } from "./HoloCard";
import { LORE } from "./lore";

/**
 * Drop-in server components for any page (e.g. /me):
 *   <IdentityCard userId={id} />   holographic member card
 *   <BadgeShelf userId={id} />     tiered badge grid with progress
 * Wrap them in <Suspense>: they read request-time data.
 */
export async function IdentityCard({ userId }: { userId: string }) {
  const [m, o] = await Promise.all([memberById(userId), odysseyFor(userId)]);
  if (!m) return null;
  return (
    <HoloCard
      name={m.name}
      houseName={m.house?.name ?? null}
      houseColor={m.house?.color ?? "#ffa928"}
      role={m.role}
      level={o.level.level}
      title={o.level.title}
      xp={o.xp}
      nextXp={o.level.ceiling}
      progress={o.level.progress}
      badges={o.earned}
      memberSince={fmtDate(m.createdAt, { month: "short", year: "numeric" })}
      epithet={m.house ? LORE[m.house.slug]?.epithet : undefined}
    />
  );
}

export async function BadgeShelf({ userId, limit }: { userId: string; limit?: number }) {
  const o = await odysseyFor(userId);
  // Earned first (gold → bronze), then the closest locked ones.
  const order = { gold: 0, silver: 1, bronze: 2 } as const;
  const badges = o.badges
    .slice()
    .sort((a, b) => (a.tier && b.tier ? order[a.tier] - order[b.tier] : a.tier ? -1 : b.tier ? 1 : b.progress - a.progress))
    .slice(0, limit);
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {badges.map((b, i) => (
        <BadgeTile key={b.id} badge={b} index={i} />
      ))}
    </ul>
  );
}
