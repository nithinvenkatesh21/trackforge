import { z } from "zod";

export const marketplaceAssetTypeSchema = z.enum([
  "loop",
  "acapella",
  "drumkit",
  "preset",
  "midi_pack",
  "sound_fx",
  "bundle",
]);

export const createMarketplaceAssetSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title cannot exceed 100 characters"),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(2000, "Description cannot exceed 2000 characters"),
  type: marketplaceAssetTypeSchema,
  genre: z.string().max(50).optional().nullable(),
  bpm: z.number().int().min(20).max(300).optional().nullable(),
  key: z.string().max(20).optional().nullable(),
  price: z.number().int().min(0, "Price must be non-negative"),
  licenseType: z.string().min(1, "License type is required").max(100),
  fileKey: z.string().min(1, "Asset file is required"),
  previewKey: z.string().optional().nullable(),
  coverImageKey: z.string().optional().nullable(),
  tags: z.array(z.string()).max(10).optional(),
});

export const updateMarketplaceAssetSchema = createMarketplaceAssetSchema.partial();

export const createReviewSchema = z.object({
  assetId: z.string().uuid(),
  stars: z.number().int().min(1, "Rating must be at least 1 star").max(5, "Rating cannot exceed 5 stars"),
  comment: z.string().max(1000).optional().nullable(),
});

export type CreateMarketplaceAssetInput = z.infer<typeof createMarketplaceAssetSchema>;
export type UpdateMarketplaceAssetInput = z.infer<typeof updateMarketplaceAssetSchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
