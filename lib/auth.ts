import { auth, currentUser as clerkCurrentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, userCredits } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function getCurrentUser() {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return null;
    }

    // Try finding existing user row in Postgres
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkId))
      .limit(1);

    // Auto-provision user record if not created by webhook yet
    if (!user) {
      const clerkUser = await clerkCurrentUser();
      const primaryEmail =
        clerkUser?.emailAddresses?.find(
          (e) => e.id === clerkUser.primaryEmailAddressId
        )?.emailAddress || clerkUser?.emailAddresses?.[0]?.emailAddress || `${clerkId}@clerk.user`;

      const fullName =
        clerkUser?.firstName || clerkUser?.lastName
          ? `${clerkUser?.firstName || ""} ${clerkUser?.lastName || ""}`.trim()
          : clerkUser?.username || "Creator";

      [user] = await db
        .insert(users)
        .values({
          clerkId,
          email: primaryEmail,
          name: fullName,
          imageUrl: clerkUser?.imageUrl || null,
          role: "user",
        })
        .onConflictDoUpdate({
          target: users.clerkId,
          set: { updatedAt: new Date() },
        })
        .returning();

      // Initialize default user credits
      await db
        .insert(userCredits)
        .values({
          userId: user.id,
          balance: 100, // Welcome bonus credits
        })
        .onConflictDoNothing();
    }

    return user || null;
  } catch (error) {
    console.error("getCurrentUser error:", error);
    return null;
  }
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Not authenticated");
  }
  return user;
}
