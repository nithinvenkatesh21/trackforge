"use server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { userCredits, creditTransactions } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function addCredits(
  targetUserId: string,
  amount: number,
  description: string,
  relatedId?: string
) {
  if (amount <= 0) {
    throw new Error("Amount must be positive");
  }

  // Ensure credit row exists
  const [existing] = await db
    .select()
    .from(userCredits)
    .where(eq(userCredits.userId, targetUserId))
    .limit(1);

  if (!existing) {
    await db.insert(userCredits).values({
      userId: targetUserId,
      balance: amount,
      totalEarned: amount,
      totalSpent: 0,
    }).onConflictDoNothing();
  } else {
    await db
      .update(userCredits)
      .set({
        balance: sql`${userCredits.balance} + ${amount}`,
        totalEarned: sql`${userCredits.totalEarned} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(userCredits.userId, targetUserId));
  }

  // Write immutable ledger entry
  await db.insert(creditTransactions).values({
    userId: targetUserId,
    amount,
    type: "earned",
    relatedId: relatedId || null,
    description,
  });

  revalidatePath("/dashboard");
  return { success: true };
}

export async function deductCredits(
  targetUserId: string,
  amount: number,
  description: string,
  relatedId?: string
) {
  if (amount <= 0) {
    throw new Error("Amount must be positive");
  }

  const [existing] = await db
    .select()
    .from(userCredits)
    .where(eq(userCredits.userId, targetUserId))
    .limit(1);

  if (!existing || existing.balance < amount) {
    throw new Error("Insufficient credits");
  }

  await db
    .update(userCredits)
    .set({
      balance: sql`${userCredits.balance} - ${amount}`,
      totalSpent: sql`${userCredits.totalSpent} + ${amount}`,
      updatedAt: new Date(),
    })
    .where(eq(userCredits.userId, targetUserId));

  // Write immutable ledger entry
  await db.insert(creditTransactions).values({
    userId: targetUserId,
    amount: -amount,
    type: "spent",
    relatedId: relatedId || null,
    description,
  });

  revalidatePath("/dashboard");
  return { success: true };
}

export async function adminAddCredits(targetUserId: string, amount: number) {
  const user = await requireUser();

  if (user.role !== "admin") {
    throw new Error("Forbidden: Admin access required");
  }

  return addCredits(targetUserId, amount, `Admin top-up by ${user.name || "Admin"}`);
}
