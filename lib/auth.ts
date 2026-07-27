import { auth, currentUser as clerkCurrentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, userCredits } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function getCurrentUser() {
  let clerkId: string | null = null;

  try {
    const authData = await auth();
    clerkId = authData.userId;
  } catch (error: any) {
    if (error?.digest === "DYNAMIC_SERVER_USAGE" || error?.message?.includes("DYNAMIC_SERVER_USAGE")) {
      throw error;
    }
    console.error("auth() retrieval error:", error);
    return null;
  }

  if (!clerkId) {
    return null;
  }

  // Fallback user representation for authenticated clerkId
  const fallbackUser = {
    id: clerkId,
    clerkId,
    email: `${clerkId}@user.clerk`,
    name: "Creator",
    imageUrl: null,
    role: "user" as const,
    bio: null,
    creatorRoles: [],
    genres: [],
    daw: null,
    lookingFor: [],
    socialLinks: null,
    rating: 0,
    totalRatings: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  try {
    // Try finding existing user row in Postgres
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkId))
      .limit(1);

    // Auto-provision user record if not created by webhook yet
    if (!user) {
      try {
        const clerkUser = await clerkCurrentUser();
        const primaryEmail =
          clerkUser?.emailAddresses?.find(
            (e) => e.id === clerkUser.primaryEmailAddressId
          )?.emailAddress || clerkUser?.emailAddresses?.[0]?.emailAddress || `${clerkId}@clerk.user`;

        const fullName =
          clerkUser?.firstName || clerkUser?.lastName
            ? `${clerkUser?.firstName || ""} ${clerkUser?.lastName || ""}`.trim()
            : clerkUser?.username || "Creator";

        const [newUser] = await db
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

        user = newUser;

        if (user) {
          await db
            .insert(userCredits)
            .values({
              userId: user.id,
              balance: 100, // Welcome bonus credits
            })
            .onConflictDoNothing();
        }
      } catch (e: any) {
        if (e?.digest === "DYNAMIC_SERVER_USAGE" || e?.message?.includes("DYNAMIC_SERVER_USAGE")) {
          throw e;
        }
        console.error("Auto-provisioning user error:", e);
      }
    }

    return user || fallbackUser;
  } catch (dbError: any) {
    if (dbError?.digest === "DYNAMIC_SERVER_USAGE" || dbError?.message?.includes("DYNAMIC_SERVER_USAGE")) {
      throw dbError;
    }
    console.error("Database user query error:", dbError);
    // Always return fallbackUser when clerkId is present so authenticated session UI renders cleanly
    return fallbackUser;
  }
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Not authenticated");
  }
  return user;
}
