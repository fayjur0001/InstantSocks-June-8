



import "dotenv/config";
import db from "@/db";
import { UserModel } from "@/db/schema";
import { isNull, inArray, asc, eq } from "drizzle-orm";

async function main() {
  console.log("🔧 Starting agent serial fix...\n");

  
  const superAdmins = await db.query.UserModel.findMany({
    where: (u, { eq, isNull, and }) =>
      and(eq(u.role, "super admin"), isNull(u.agentSerial)),
    columns: { id: true, username: true },
  });

  for (const sa of superAdmins) {
    await db
      .update(UserModel)
      .set({ agentSerial: 0 })
      .where(eq(UserModel.id, sa.id));
    console.log(`✅ Super admin: ${sa.username} → AGT-000`);
  }

  
  const agentUsers = await db.query.UserModel.findMany({
    where: (u, { inArray, isNull, and }) =>
      and(
        inArray(u.role, ["admin", "support"]),
        isNull(u.agentSerial)
      ),
    columns: { id: true, username: true, role: true, createdAt: true },
    orderBy: (u, { asc }) => asc(u.createdAt), 
  });

  if (agentUsers.length === 0) {
    console.log("ℹ️  No admin/support users without agentSerial found.");
  } else {
    
    const maxSerialRow = await db.query.UserModel.findMany({
      columns: { agentSerial: true },
      orderBy: (u, { desc }) => desc(u.agentSerial),
      limit: 1,
    });

    let nextSerial = (maxSerialRow[0]?.agentSerial ?? 0) + 1;

    for (const agent of agentUsers) {
      await db
        .update(UserModel)
        .set({ agentSerial: nextSerial })
        .where(eq(UserModel.id, agent.id));
      console.log(
        `✅ ${agent.role}: ${agent.username} → AGT-${String(nextSerial).padStart(3, "0")}`
      );
      nextSerial++;
    }
  }

  console.log("\n✅ Done! All existing agents have been assigned serials.");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});