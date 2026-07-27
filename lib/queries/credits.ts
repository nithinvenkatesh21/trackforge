import { db } from "@/lib/db";
import { userCredits, creditTransactions } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

const isUuid = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) &&
  id !== "00000000-0000-0000-0000-000000000000";

export async function getBalance(userId: string) {
  if (!isUuid(userId)) {
    return {
      userId,
      balance: 100,
      totalEarned: 100,
      totalSpent: 0,
    };
  }

  try {
    const [row] = await db
      .select()
      .from(userCredits)
      .where(eq(userCredits.userId, userId))
      .limit(1);

    if (!row) {
      return {
        userId,
        balance: 100,
        totalEarned: 100,
        totalSpent: 0,
      };
    }

    return row;
  } catch (err) {
    console.error("getBalance query error:", err);
    return {
      userId,
      balance: 100,
      totalEarned: 100,
      totalSpent: 0,
    };
  }
}

export async function getTransactions(userId: string, limitCount = 50) {
  if (!isUuid(userId)) return [];

  try {
    return await db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, userId))
      .orderBy(desc(creditTransactions.createdAt))
      .limit(limitCount);
  } catch (err) {
    console.error("getTransactions error:", err);
    return [];
  }
}
