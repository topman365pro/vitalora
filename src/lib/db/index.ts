import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { getEnv } from "@/lib/env";
import { schema } from "@/lib/db/schema";

let pool: Pool | null = null;
let database: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!pool) {
    pool = new Pool({
      connectionString: getEnv("DATABASE_URL"),
    });
  }

  if (!database) {
    database = drizzle(pool, { schema });
  }

  return database;
}

export async function closeDb() {
  if (pool) {
    await pool.end();
    pool = null;
    database = null;
  }
}
