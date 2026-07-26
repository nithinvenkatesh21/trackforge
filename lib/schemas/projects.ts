import { z } from "zod";

export const projectVisibilitySchema = z.enum(["public", "private"]);
export const projectStatusSchema = z.enum(["open", "in_progress", "final"]);
export const creatorRoleSchema = z.enum([
  "artist",
  "producer",
  "mixer",
  "engineer",
]);

export const createProjectSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title must be at most 100 characters"),
  description: z
    .string()
    .max(2000, "Description cannot exceed 2000 characters")
    .optional(),
  genre: z.string().max(50).optional(),
  bpm: z
    .number()
    .int()
    .min(20, "BPM must be at least 20")
    .max(300, "BPM cannot exceed 300")
    .optional()
    .nullable(),
  key: z.string().max(20).optional().nullable(),
  visibility: projectVisibilitySchema.optional(),
  status: projectStatusSchema.optional(),
  neededRoles: z.array(creatorRoleSchema).max(10).optional(),
  coverArtKey: z.string().optional().nullable(),
  defaultCoverIndex: z.number().int().min(0).optional(),
});

export const updateProjectSchema = createProjectSchema.partial();

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
