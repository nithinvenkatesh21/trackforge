import { db } from "@/lib/db";
import { ratings, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getDownloadUrl } from "@/lib/storage";

export async function getUserRatings(userId: string) {
  const ratingRows = await db
    .select({
      id: ratings.id,
      fromUserId: ratings.fromUserId,
      toUserId: ratings.toUserId,
      stars: ratings.stars,
      comment: ratings.comment,
      createdAt: ratings.createdAt,
      fromUserName: users.name,
      fromUserImage: users.imageUrl,
    })
    .from(ratings)
    .innerJoin(users, eq(ratings.fromUserId, users.id))
    .where(eq(ratings.toUserId, userId))
    .orderBy(desc(ratings.createdAt));

  return Promise.all(
    ratingRows.map(async (r) => ({
      ...r,
      fromUserAvatar: r.fromUserImage ? await getDownloadUrl(r.fromUserImage) : null,
    }))
  );
}
