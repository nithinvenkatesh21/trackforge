import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, ilike, or } from "drizzle-orm";
import { getDownloadUrl } from "@/lib/storage";

export async function getUserById(userId: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return null;

  const avatarUrl = user.imageUrl ? await getDownloadUrl(user.imageUrl) : null;

  return {
    ...user,
    avatarUrl,
  };
}

export async function searchUsers(searchTerm: string) {
  if (!searchTerm || searchTerm.trim().length < 2) {
    return [];
  }

  const term = `%${searchTerm.trim()}%`;

  const results = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      imageUrl: users.imageUrl,
      creatorRoles: users.creatorRoles,
    })
    .from(users)
    .where(or(ilike(users.name, term), ilike(users.email, term)))
    .limit(10);

  return Promise.all(
    results.map(async (u) => ({
      ...u,
      avatarUrl: u.imageUrl ? await getDownloadUrl(u.imageUrl) : null,
    }))
  );
}
