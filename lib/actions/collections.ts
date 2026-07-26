"use server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { marketplaceCollections } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createCollection(input: {
  name: string;
  description?: string;
  assetIds?: string[];
  isPublic?: boolean;
}) {
  const user = await requireUser();

  const [col] = await db
    .insert(marketplaceCollections)
    .values({
      userId: user.id,
      name: input.name,
      description: input.description || null,
      assetIds: input.assetIds || [],
      isPublic: input.isPublic ?? true,
    })
    .returning();

  revalidatePath("/marketplace");
  return col;
}

export async function addAssetToCollection(collectionId: string, assetId: string) {
  const user = await requireUser();

  const [col] = await db
    .select()
    .from(marketplaceCollections)
    .where(eq(marketplaceCollections.id, collectionId))
    .limit(1);

  if (!col || col.userId !== user.id) {
    throw new Error("Collection not found or unauthorized");
  }

  if (col.assetIds.includes(assetId)) {
    return col;
  }

  const [updated] = await db
    .update(marketplaceCollections)
    .set({
      assetIds: [...col.assetIds, assetId],
      updatedAt: new Date(),
    })
    .where(eq(marketplaceCollections.id, collectionId))
    .returning();

  revalidatePath("/marketplace");
  return updated;
}

export async function removeAssetFromCollection(collectionId: string, assetId: string) {
  const user = await requireUser();

  const [col] = await db
    .select()
    .from(marketplaceCollections)
    .where(eq(marketplaceCollections.id, collectionId))
    .limit(1);

  if (!col || col.userId !== user.id) {
    throw new Error("Collection not found or unauthorized");
  }

  const [updated] = await db
    .update(marketplaceCollections)
    .set({
      assetIds: col.assetIds.filter((id) => id !== assetId),
      updatedAt: new Date(),
    })
    .where(eq(marketplaceCollections.id, collectionId))
    .returning();

  revalidatePath("/marketplace");
  return updated;
}

export async function setCollectionVisibility(collectionId: string, isPublic: boolean) {
  const user = await requireUser();

  const [col] = await db
    .select()
    .from(marketplaceCollections)
    .where(eq(marketplaceCollections.id, collectionId))
    .limit(1);

  if (!col || col.userId !== user.id) {
    throw new Error("Collection not found or unauthorized");
  }

  const [updated] = await db
    .update(marketplaceCollections)
    .set({
      isPublic,
      updatedAt: new Date(),
    })
    .where(eq(marketplaceCollections.id, collectionId))
    .returning();

  revalidatePath("/marketplace");
  return updated;
}

export async function deleteCollection(collectionId: string) {
  const user = await requireUser();

  const [col] = await db
    .select()
    .from(marketplaceCollections)
    .where(eq(marketplaceCollections.id, collectionId))
    .limit(1);

  if (!col || col.userId !== user.id) {
    throw new Error("Collection not found or unauthorized");
  }

  await db.delete(marketplaceCollections).where(eq(marketplaceCollections.id, collectionId));

  revalidatePath("/marketplace");
  return { success: true };
}
