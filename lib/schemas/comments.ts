import { z } from "zod";

export const createCommentSchema = z.object({
  versionId: z.string().uuid("Invalid version ID"),
  projectId: z.string().uuid("Invalid project ID"),
  content: z
    .string()
    .min(1, "Comment content cannot be empty")
    .max(2000, "Comment content cannot exceed 2000 characters"),
  parentCommentId: z.string().uuid("Invalid parent comment ID").optional().nullable(),
  timestampSeconds: z.number().min(0, "Timestamp must be non-negative").optional().nullable(),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
