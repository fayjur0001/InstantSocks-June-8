import "dotenv/config";
import { Pool } from "pg";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
  try {
    await pool.query("ALTER TABLE tickets ADD COLUMN IF NOT EXISTS category varchar");
    console.log("✅ category column added to tickets table.");
  } catch (e) {
    console.error("❌ Failed:", e);
  } finally {
    await pool.end();
  }
}

main();