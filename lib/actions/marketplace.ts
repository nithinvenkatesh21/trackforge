"use server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  marketplaceAssets,
  marketplacePurchases,
  marketplaceReviews,
  notifications,
} from "@/lib/db/schema";
import {
  createMarketplaceAssetSchema,
  createReviewSchema,
  CreateMarketplaceAssetInput,
  CreateReviewInput,
} from "@/lib/schemas/marketplace";
import { deductCredits, addCredits } from "@/lib/actions/credits";
import { eq, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createMarketplaceAsset(input: CreateMarketplaceAssetInput) {
  const user = await requireUser();
  const validated = createMarketplaceAssetSchema.parse(input);

  const [asset] = await db
    .insert(marketplaceAssets)
    .values({
      creatorId: user.id,
      title: validated.title,
      description: validated.description,
      type: validated.type,
      genre: validated.genre || null,
      bpm: validated.bpm || null,
      key: validated.key || null,
      price: validated.price,
      licenseType: validated.licenseType,
      fileKey: validated.fileKey,
      previewKey: validated.previewKey || null,
      coverImageKey: validated.coverImageKey || null,
      tags: validated.tags || [],
      downloads: 0,
      rating: 0,
      reviewCount: 0,
      featured: false,
    })
    .returning();

  revalidatePath("/marketplace");
  return asset;
}

export async function toggleFeaturedAsset(assetId: string) {
  const user = await requireUser();

  if (user.role !== "admin") {
    throw new Error("Forbidden: Only admin can toggle featured marketplace assets");
  }

  const [asset] = await db
    .select()
    .from(marketplaceAssets)
    .where(eq(marketplaceAssets.id, assetId))
    .limit(1);

  if (!asset) {
    throw new Error("Asset not found");
  }

  const [updated] = await db
    .update(marketplaceAssets)
    .set({
      featured: !asset.featured,
      updatedAt: new Date(),
    })
    .where(eq(marketplaceAssets.id, assetId))
    .returning();

  revalidatePath("/marketplace");
  revalidatePath(`/marketplace/${assetId}`);
  return updated;
}

export async function updateMarketplaceAsset(
  assetId: string,
  input: Partial<CreateMarketplaceAssetInput>
) {
  const user = await requireUser();

  const [asset] = await db
    .select()
    .from(marketplaceAssets)
    .where(eq(marketplaceAssets.id, assetId))
    .limit(1);

  if (!asset || asset.creatorId !== user.id) {
    throw new Error("Forbidden: Only asset creator can update asset settings");
  }

  const [updated] = await db
    .update(marketplaceAssets)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(marketplaceAssets.id, assetId))
    .returning();

  revalidatePath("/marketplace");
  revalidatePath(`/marketplace/${assetId}`);
  return updated;
}

export async function deleteMarketplaceAsset(assetId: string) {
  const user = await requireUser();

  const [asset] = await db
    .select()
    .from(marketplaceAssets)
    .where(eq(marketplaceAssets.id, assetId))
    .limit(1);

  if (!asset || asset.creatorId !== user.id) {
    throw new Error("Forbidden: Only asset creator can delete asset");
  }

  await db.delete(marketplaceAssets).where(eq(marketplaceAssets.id, assetId));

  revalidatePath("/marketplace");
  return { success: true };
}

export async function purchaseAsset(assetId: string) {
  const user = await requireUser();

  const [asset] = await db
    .select()
    .from(marketplaceAssets)
    .where(eq(marketplaceAssets.id, assetId))
    .limit(1);

  if (!asset) {
    throw new Error("Asset not found");
  }

  if (asset.creatorId === user.id) {
    throw new Error("Cannot purchase your own asset");
  }

  // Check existing purchase
  const [existingPurchase] = await db
    .select()
    .from(marketplacePurchases)
    .where(
      and(
        eq(marketplacePurchases.userId, user.id),
        eq(marketplacePurchases.assetId, assetId)
      )
    )
    .limit(1);

  if (existingPurchase) {
    throw new Error("Already purchased this asset");
  }

  // Deduct credits from buyer (checks balance internally)
  if (asset.price > 0) {
    await deductCredits(
      user.id,
      asset.price,
      `Purchased marketplace asset: ${asset.title}`,
      assetId
    );

    // Credit seller
    await addCredits(
      asset.creatorId,
      asset.price,
      `Sale of asset: ${asset.title}`,
      assetId
    );
  }

  // Insert purchase record (enforced with unique constraint)
  await db.insert(marketplacePurchases).values({
    userId: user.id,
    assetId: assetId,
    price: asset.price,
  });

  // Increment download count
  await db
    .update(marketplaceAssets)
    .set({ downloads: sql`${marketplaceAssets.downloads} + 1` })
    .where(eq(marketplaceAssets.id, assetId));

  // Notify seller
  await db.insert(notifications).values({
    userId: asset.creatorId,
    type: "asset_sold",
    title: "Asset Sold!",
    message: `${user.name || "A buyer"} purchased your asset "${asset.title}" for ${asset.price} credits.`,
    fromUserId: user.id,
  });

  revalidatePath(`/marketplace/${assetId}`);
  revalidatePath("/marketplace");
  return { success: true };
}

export async function createAssetReview(input: CreateReviewInput) {
  const user = await requireUser();
  const validated = createReviewSchema.parse(input);

  // Must have purchased first
  const [purchase] = await db
    .select()
    .from(marketplacePurchases)
    .where(
      and(
        eq(marketplacePurchases.userId, user.id),
        eq(marketplacePurchases.assetId, validated.assetId)
      )
    )
    .limit(1);

  if (!purchase) {
    throw new Error("Must purchase asset before leaving a review");
  }

  // Insert review
  await db.insert(marketplaceReviews).values({
    reviewerId: user.id,
    assetId: validated.assetId,
    stars: validated.stars,
    comment: validated.comment || null,
  });

  // Recompute average rating
  const [ratingAgg] = await db
    .select({
      avgRating: sql<number>`AVG(${marketplaceReviews.stars})`,
      reviewCount: sql<number>`COUNT(*)`,
    })
    .from(marketplaceReviews)
    .where(eq(marketplaceReviews.assetId, validated.assetId));

  await db
    .update(marketplaceAssets)
    .set({
      rating: Math.round(Number(ratingAgg?.avgRating || 0) * 10) / 10,
      reviewCount: Number(ratingAgg?.reviewCount || 0),
    })
    .where(eq(marketplaceAssets.id, validated.assetId));

  revalidatePath(`/marketplace/${validated.assetId}`);
  return { success: true };
}
