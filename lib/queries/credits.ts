import { db } from "@/lib/db";
import { userCredits, creditTransactions } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function getBalance(userId: string) {
  const [row] = await db
    .select()
    .from(userCredits)
    .where(eq(userCredits.userId, userId))
    .limit(1);

  if (!row) {
    // Return default 0 balance row structure
    return {
      userId,
      balance: 0,
      totalEarned: 0,
      totalSpent: 0,
    };
  }

  return row;
}

export async function getTransactions(userId: string, limitCount = 50) {
  return await db
    .select()
    .from(creditTransactions)
    .where(eq(creditTransactions.userId, userId))
    .orderBy(desc(creditTransactions.createdAt))
    .limit(limitCount);
}
