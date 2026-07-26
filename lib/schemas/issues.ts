import { z } from "zod";

export const issueStatusSchema = z.enum([
  "open",
  "in_progress",
  "resolved",
  "closed",
]);

export const createIssueSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title cannot exceed 100 characters"),
  description: z
    .string()
    .min(5, "Description must be at least 5 characters")
    .max(2000, "Description cannot exceed 2000 characters"),
  tags: z.array(z.string()).max(10).optional(),
  versionId: z.string().uuid().optional().nullable(),
  timestampSeconds: z.number().min(0).optional().nullable(),
});

export const createIssueReplySchema = z.object({
  issueId: z.string().uuid("Invalid issue ID"),
  content: z
    .string()
    .min(1, "Reply content cannot be empty")
    .max(2000, "Reply content cannot exceed 2000 characters"),
  parentReplyId: z.string().uuid().optional().nullable(),
});

export type CreateIssueInput = z.infer<typeof createIssueSchema>;
export type CreateIssueReplyInput = z.infer<typeof createIssueReplySchema>;
