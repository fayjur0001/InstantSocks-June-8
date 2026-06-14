



import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });

async function main() {
  const client = await pool.connect();
  try {
    console.log("🔧 Creating discount_tiers table...");

    
    await client.query(`
      CREATE TABLE IF NOT EXISTS "discount_tiers" (
        "id"          serial PRIMARY KEY NOT NULL,
        "tier"        varchar(32) NOT NULL UNIQUE,
        "min_spend"   real NOT NULL,
        "max_spend"   real,
        "discount"    real NOT NULL DEFAULT 0,
        "sort_order"  integer NOT NULL,
        "created_at"  timestamp NOT NULL DEFAULT now(),
        "updated_at"  timestamp NOT NULL DEFAULT now()
      );
    `);
    console.log("  ✅ Table created (or already exists)");

    
    const tiers = [
      { tier: "Basic",   minSpend: 0,     maxSpend: 1499,  discount: 0,  sortOrder: 1 },
      { tier: "Bronze",  minSpend: 1500,  maxSpend: 2499,  discount: 5,  sortOrder: 2 },
      { tier: "Silver",  minSpend: 2500,  maxSpend: 3999,  discount: 8,  sortOrder: 3 },
      { tier: "Gold",    minSpend: 4000,  maxSpend: 9999,  discount: 10, sortOrder: 4 },
      { tier: "Diamond", minSpend: 10000, maxSpend: null,  discount: 15, sortOrder: 5 },
    ];

    console.log("\n🌱 Seeding tiers...");
    for (const t of tiers) {
      await client.query(
        `INSERT INTO discount_tiers (tier, min_spend, max_spend, discount, sort_order)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (tier) DO NOTHING`,
        [t.tier, t.minSpend, t.maxSpend, t.discount, t.sortOrder]
      );
      console.log(`  ✅ ${t.tier.padEnd(8)} | discount: ${t.discount}%`);
    }

    console.log("\n✔ Done!");
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("❌ Failed:", err.message);
  process.exit(1);
});