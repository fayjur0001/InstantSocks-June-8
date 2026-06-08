import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// ✅ FIX: pool config ছাড়া load এ connection exhaustion হয়
const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  max: 20,                      // সর্বোচ্চ 20 concurrent connection
  idleTimeoutMillis: 30_000,    // 30s idle connection close
  connectionTimeoutMillis: 5_000, // 5s এর মধ্যে connect না হলে error
});

const db = drizzle(pool, { schema });
export default db;