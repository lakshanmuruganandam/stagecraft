import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

/**
 * Token bucket stored in the database, so limits hold across serverless
 * instances. `capacity` tokens, refilled at `perSec` tokens per second.
 */
export async function take(key: string, capacity: number, perSec: number): Promise<{ ok: boolean; retryInMs: number }> {
  const db = await getDb();
  const now = Date.now();
  return db.transaction(async (tx) => {
    const row = await tx.query.rateBuckets.findFirst({ where: eq(schema.rateBuckets.key, key) });
    const tokens = row ? Math.min(capacity, row.tokens + ((now - row.updatedAt) / 1000) * perSec) : capacity;
    if (tokens < 1) {
      return { ok: false, retryInMs: Math.ceil(((1 - tokens) / perSec) * 1000) };
    }
    await tx
      .insert(schema.rateBuckets)
      .values({ key, tokens: tokens - 1, updatedAt: now })
      .onConflictDoUpdate({ target: schema.rateBuckets.key, set: { tokens: tokens - 1, updatedAt: now } });
    return { ok: true, retryInMs: 0 };
  });
}
