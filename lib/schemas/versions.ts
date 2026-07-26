import { z } from "zod";

export const createVersionSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  parentVersionId: z.string().uuid("Invalid parent version ID").optional().nullable(),
  fileKey: z.string().optional().nullable(),
  fileName: z.string().min(1, "File name is required"),
  fileSize: z.number().int().positive().optional().nullable(),
  notes: z.string().max(2000, "Notes cannot exceed 2000 characters").optional(),
  isBundle: z.boolean().default(false),
});

export const forkVersionSchema = z.object({
  versionId: z.string().uuid("Invalid version ID"),
  notes: z.string().max(2000, "Notes cannot exceed 2000 characters").optional(),
});

export type CreateVersionInput = z.infer<typeof createVersionSchema>;
export type ForkVersionInput = z.infer<typeof forkVersionSchema>;
