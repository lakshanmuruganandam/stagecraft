import "server-only";
import fs from "node:fs";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "./schema";

export type DB = LibSQLDatabase<typeof schema>;

type Holder = { client: Client; db: DB; ready: Promise<DB> };

// Survive dev hot-reloads: one client + one migration run per process.
const g = globalThis as unknown as { __stagecraft?: Holder };

function resolveUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  // Serverless file systems are read-only except /tmp. Fine for a demo,
  // but use Turso (DATABASE_URL) for anything real.
  const dir = process.env.VERCEL ? "/tmp" : path.join(process.cwd(), ".data");
  fs.mkdirSync(dir, { recursive: true });
  return `file:${path.join(dir, "stagecraft.db")}`;
}

function init(): Holder {
  const url = resolveUrl();
  const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });
  const db = drizzle(client, { schema });

  const ready = (async () => {
    if (url.startsWith("file:")) {
      await client.execute("PRAGMA journal_mode = WAL");
      await client.execute("PRAGMA busy_timeout = 5000");
      await client.execute("PRAGMA foreign_keys = ON");
    }
    await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
    if (process.env.STAGECRAFT_SEED !== "off") {
      const { seedIfEmpty } = await import("./seed");
      await seedIfEmpty(db);
    }
    return db;
  })();

  return { client, db, ready };
}

/** Resolves once migrations (and demo seeding) have finished. */
export function getDb(): Promise<DB> {
  g.__stagecraft ??= init();
  return g.__stagecraft.ready;
}

export { schema };
