import "server-only";
import fs from "node:fs";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { connection } from "next/server";
import * as schema from "./schema";
import { isDemo } from "@/lib/env";

export type DB = LibSQLDatabase<typeof schema>;

type Holder = { client: Client; db: DB; ready: Promise<DB> };

// Survive dev hot-reloads: one client + one migration run per process.
const g = globalThis as unknown as { __stagecraft?: Holder };

function resolveUrl() {
  const remote = process.env.DATABASE_URL ?? process.env.TURSO_DATABASE_URL;
  if (remote) return remote;
  // Serverless file systems are read-only except /tmp. Fine for a demo,
  // but use Turso (DATABASE_URL) for anything real.
  const dir = process.env.VERCEL ? "/tmp" : path.join(process.cwd(), ".data");
  fs.mkdirSync(dir, { recursive: true });
  return `file:${path.join(dir, "stagecraft.db")}`;
}

function init(): Holder {
  const url = resolveUrl();
  const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN ?? process.env.TURSO_AUTH_TOKEN });
  const db = drizzle(client, { schema });

  const ready = (async () => {
    if (url.startsWith("file:")) {
      await client.execute("PRAGMA journal_mode = WAL");
      await client.execute("PRAGMA busy_timeout = 15000");
      await client.execute("PRAGMA foreign_keys = ON");
    }
    await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
    const { seedIfEmpty, seedHousesIfEmpty } = await import("./seed");
    // Demo data (and its public demo password) only ever exists in demo mode.
    if (isDemo() && process.env.STAGECRAFT_SEED !== "off") await seedIfEmpty(db);
    else await seedHousesIfEmpty(db);
    return db;
  })();

  return { client, db, ready };
}

/**
 * Resolves once migrations (and demo seeding) have finished.
 * Database reads are request-time data, so this also opts the caller out
 * of prerendering (Cache Components); outside a request it's a no-op.
 */
export async function getDb(): Promise<DB> {
  try {
    await connection();
  } catch {
    /* not inside a request (scripts, build-time tooling) */
  }
  g.__stagecraft ??= init();
  return g.__stagecraft.ready;
}

export { schema };
