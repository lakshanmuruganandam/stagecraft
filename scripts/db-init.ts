/**
 * Run migrations + demo seed against DATABASE_URL / TURSO_DATABASE_URL.
 * Seeding ahead of time avoids cold-start instances racing to seed.
 *   NODE_OPTIONS=--conditions=react-server npx tsx scripts/db-init.ts [--reset]
 * --reset wipes and reseeds (use the same STAGECRAFT_SECRET as production so
 * seeded certificates verify).
 */
import { getDb } from "../src/db";

async function main() {
  const db = await getDb();
  if (process.argv.includes("--reset")) {
    const { wipe, seed, ensureDemoPasswords } = await import("../src/db/seed");
    await wipe(db);
    await seed(db);
    await ensureDemoPasswords(db);
    console.log("database reseeded");
  }
  console.log("database ready");
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
