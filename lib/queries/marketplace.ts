import { db } from "@/lib/db";
import {
  marketplaceAssets,
  marketplacePurchases,
  marketplaceReviews,
  users,
} from "@/lib/db/schema";
import { eq, and, desc, sql, ilike, or } from "drizzle-orm";
import { getDownloadUrl } from "@/lib/storage";

export async function getMarketplaceAssets(filters?: {
  type?: string;
  genre?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  featuredOnly?: boolean;
}) {
  const query = db
    .select({
      id: marketplaceAssets.id,
      creatorId: marketplaceAssets.creatorId,
      title: marketplaceAssets.title,
      description: marketplaceAssets.description,
      type: marketplaceAssets.type,
      genre: marketplaceAssets.genre,
      bpm: marketplaceAssets.bpm,
      key: marketplaceAssets.key,
      price: marketplaceAssets.price,
      licenseType: marketplaceAssets.licenseType,
      fileKey: marketplaceAssets.fileKey,
      previewKey: marketplaceAssets.previewKey,
      coverImageKey: marketplaceAssets.coverImageKey,
      tags: marketplaceAssets.tags,
      downloads: marketplaceAssets.downloads,
      rating: marketplaceAssets.rating,
      reviewCount: marketplaceAssets.reviewCount,
      featured: marketplaceAssets.featured,
      createdAt: marketplaceAssets.createdAt,
      creatorName: users.name,
      creatorImage: users.imageUrl,
    })
    .from(marketplaceAssets)
    .innerJoin(users, eq(marketplaceAssets.creatorId, users.id))
    .orderBy(desc(marketplaceAssets.createdAt));

  let results = await query;

  if (filters?.type) {
    results = results.filter((a) => a.type === filters.type);
  }
  if (filters?.genre) {
    results = results.filter(
      (a) => a.genre?.toLowerCase() === filters.genre?.toLowerCase()
    );
  }
  if (filters?.minPrice !== undefined) {
    results = results.filter((a) => a.price >= filters.minPrice!);
  }
  if (filters?.maxPrice !== undefined) {
    results = results.filter((a) => a.price <= filters.maxPrice!);
  }
  if (filters?.featuredOnly) {
    results = results.filter((a) => a.featured);
  }
  if (filters?.search) {
    const term = filters.search.toLowerCase();
    results = results.filter(
      (a) =>
        a.title.toLowerCase().includes(term) ||
        a.description.toLowerCase().includes(term) ||
        a.tags?.some((t) => t.toLowerCase().includes(term))
    );
  }

  return Promise.all(
    results.map(async (asset) => ({
      ...asset,
      previewUrl: asset.previewKey ? await getDownloadUrl(asset.previewKey) : null,
      coverUrl: asset.coverImageKey
        ? await getDownloadUrl(asset.coverImageKey)
        : null,
    }))
  );
}

export async function getMarketplaceAssetById(assetId: string) {
  const [asset] = await db
    .select({
      id: marketplaceAssets.id,
      creatorId: marketplaceAssets.creatorId,
      title: marketplaceAssets.title,
      description: marketplaceAssets.description,
      type: marketplaceAssets.type,
      genre: marketplaceAssets.genre,
      bpm: marketplaceAssets.bpm,
      key: marketplaceAssets.key,
      price: marketplaceAssets.price,
      licenseType: marketplaceAssets.licenseType,
      fileKey: marketplaceAssets.fileKey,
      previewKey: marketplaceAssets.previewKey,
      coverImageKey: marketplaceAssets.coverImageKey,
      tags: marketplaceAssets.tags,
      downloads: marketplaceAssets.downloads,
      rating: marketplaceAssets.rating,
      reviewCount: marketplaceAssets.reviewCount,
      featured: marketplaceAssets.featured,
      createdAt: marketplaceAssets.createdAt,
      creator: {
        id: users.id,
        name: users.name,
        imageUrl: users.imageUrl,
        creatorRoles: users.creatorRoles,
      },
    })
    .from(marketplaceAssets)
    .innerJoin(users, eq(marketplaceAssets.creatorId, users.id))
    .where(eq(marketplaceAssets.id, assetId))
    .limit(1);

  if (!asset) return null;

  const previewUrl = asset.previewKey ? await getDownloadUrl(asset.previewKey) : null;
  const coverUrl = asset.coverImageKey ? await getDownloadUrl(asset.coverImageKey) : null;
  const downloadUrl = asset.fileKey ? await getDownloadUrl(asset.fileKey) : null;

  // Fetch reviews
  const reviewList = await db
    .select({
      id: marketplaceReviews.id,
      stars: marketplaceReviews.stars,
      comment: marketplaceReviews.comment,
      createdAt: marketplaceReviews.createdAt,
      reviewerName: users.name,
      reviewerImage: users.imageUrl,
    })
    .from(marketplaceReviews)
    .innerJoin(users, eq(marketplaceReviews.reviewerId, users.id))
    .where(eq(marketplaceReviews.assetId, assetId))
    .orderBy(desc(marketplaceReviews.createdAt));

  return {
    ...asset,
    previewUrl,
    coverUrl,
    downloadUrl,
    reviews: reviewList,
  };
}

export async function getMyPurchases(userId: string) {
  const purchases = await db
    .select({
      id: marketplacePurchases.id,
      assetId: marketplacePurchases.assetId,
      price: marketplacePurchases.price,
      createdAt: marketplacePurchases.createdAt,
      asset: marketplaceAssets,
    })
    .from(marketplacePurchases)
    .innerJoin(
      marketplaceAssets,
      eq(marketplacePurchases.assetId, marketplaceAssets.id)
    )
    .where(eq(marketplacePurchases.userId, userId))
    .orderBy(desc(marketplacePurchases.createdAt));

  return Promise.all(
    purchases.map(async (p) => ({
      ...p,
      asset: {
        ...p.asset,
        coverUrl: p.asset.coverImageKey
          ? await getDownloadUrl(p.asset.coverImageKey)
          : null,
        downloadUrl: p.asset.fileKey
          ? await getDownloadUrl(p.asset.fileKey)
          : null,
      },
    }))
  );
}
