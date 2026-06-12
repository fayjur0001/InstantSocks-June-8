/**
 * seed-discount-tiers.ts
 *
 * One-time script — discount_tiers table-এ 5টা default tier insert করার জন্য।
 *
 * Run: ts-node -r tsconfig-paths/register src/scripts/seed-discount-tiers.ts
 *
 * Safe to re-run — already tier আছে এমন rows skip হবে (upsert)।
 */

import "dotenv/config";
import db from "@/db";
import { DiscountTierModel } from "@/db/schema";
import { sql } from "drizzle-orm";

const DEFAULT_TIERS = [
  { tier: "Basic",   minSpend: 0,     maxSpend: 1499,  discount: 0,  sortOrder: 1 },
  { tier: "Bronze",  minSpend: 1500,  maxSpend: 2499,  discount: 5,  sortOrder: 2 },
  { tier: "Silver",  minSpend: 2500,  maxSpend: 3999,  discount: 8,  sortOrder: 3 },
  { tier: "Gold",    minSpend: 4000,  maxSpend: 9999,  discount: 10, sortOrder: 4 },
  { tier: "Diamond", minSpend: 10000, maxSpend: null,  discount: 15, sortOrder: 5 },
] as const;

async function main() {
  console.log("🌱 Seeding discount_tiers...\n");

  for (const row of DEFAULT_TIERS) {
    await db
      .insert(DiscountTierModel)
      .values(row)
      .onConflictDoNothing(); // tier column-এ unique constraint আছে — already থাকলে skip

    console.log(`  ✅ ${row.tier.padEnd(8)} | min: $${String(row.minSpend).padStart(6)} | max: ${row.maxSpend === null ? "   ∞" : "$" + String(row.maxSpend).padStart(5)} | discount: ${row.discount}%`);
  }

  console.log("\n✔ Done. discount_tiers table ready.");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});