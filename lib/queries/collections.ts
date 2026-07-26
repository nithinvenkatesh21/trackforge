import { db } from "@/lib/db";
import { marketplaceCollections, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function getMyCollections(userId: string) {
  return await db
    .select()
    .from(marketplaceCollections)
    .where(eq(marketplaceCollections.userId, userId))
    .orderBy(desc(marketplaceCollections.createdAt));
}

export async function getPublicCollections() {
  return await db
    .select({
      id: marketplaceCollections.id,
      userId: marketplaceCollections.userId,
      name: marketplaceCollections.name,
      description: marketplaceCollections.description,
      assetIds: marketplaceCollections.assetIds,
      isPublic: marketplaceCollections.isPublic,
      createdAt: marketplaceCollections.createdAt,
      creatorName: users.name,
      creatorImage: users.imageUrl,
    })
    .from(marketplaceCollections)
    .innerJoin(users, eq(marketplaceCollections.userId, users.id))
    .where(eq(marketplaceCollections.isPublic, true))
    .orderBy(desc(marketplaceCollections.createdAt));
}
