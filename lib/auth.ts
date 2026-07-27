import { auth, currentUser as clerkCurrentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, userCredits } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const FALLBACK_UUID = "00000000-0000-0000-0000-000000000000";

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

  // Safe fallback user representation with a valid UUID format for Postgres queries
  const fallbackUser = {
    id: FALLBACK_UUID,
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
        let primaryEmail = `${clerkId}@user.clerk`;
        let fullName = "Creator";
        let imageUrl: string | null = null;

        try {
          const clerkUser = await clerkCurrentUser();
          if (clerkUser) {
            primaryEmail =
              clerkUser.emailAddresses?.find(
                (e) => e.id === clerkUser.primaryEmailAddressId
              )?.emailAddress || clerkUser.emailAddresses?.[0]?.emailAddress || primaryEmail;

            fullName =
              clerkUser.firstName || clerkUser.lastName
                ? `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim()
                : clerkUser.username || fullName;

            imageUrl = clerkUser.imageUrl || null;
          }
        } catch (clerkErr) {
          console.error("clerkCurrentUser fetch error (using fallback defaults):", clerkErr);
        }

        const [newUser] = await db
          .insert(users)
          .values({
            clerkId,
            email: primaryEmail,
            name: fullName,
            imageUrl,
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
    return fallbackUser;
  }
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  // If user is already a persisted row in Postgres, return it immediately
  if (user.id && user.id !== FALLBACK_UUID) {
    return user;
  }

  // If user was using fallback User object, attempt auto-provisioning in Postgres
  try {
    let [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, user.clerkId))
      .limit(1);

    if (!dbUser) {
      const [inserted] = await db
        .insert(users)
        .values({
          clerkId: user.clerkId,
          email: user.email,
          name: user.name || "Creator",
          imageUrl: user.imageUrl,
          role: "user",
        })
        .onConflictDoUpdate({
          target: users.clerkId,
          set: { updatedAt: new Date() },
        })
        .returning();

      if (inserted) {
        dbUser = inserted;
        await db
          .insert(userCredits)
          .values({
            userId: inserted.id,
            balance: 100,
          })
          .onConflictDoNothing();
      }
    }

    if (dbUser) {
      return dbUser;
    }
  } catch (err) {
    console.error("requireUser DB provisioning error:", err);
  }

  return user;
}
