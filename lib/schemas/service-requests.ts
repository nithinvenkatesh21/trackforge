import { z } from "zod";

export const serviceRequestTypeSchema = z.enum([
  "mix",
  "master",
  "vocal_feature",
  "instrumental_addon",
]);

export const createServiceRequestSchema = z.object({
  projectId: z.string().uuid().optional().nullable(),
  type: serviceRequestTypeSchema,
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title cannot exceed 100 characters"),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(2000, "Description cannot exceed 2000 characters"),
  budgetMin: z.number().int().min(0, "Minimum budget must be non-negative"),
  budgetMax: z.number().int().min(0, "Maximum budget must be non-negative"),
  deadline: z.string().or(z.date()).optional().nullable(),
}).refine((data) => data.budgetMax >= data.budgetMin, {
  message: "Maximum budget must be greater than or equal to minimum budget",
  path: ["budgetMax"],
});

export const createServiceApplicationSchema = z.object({
  requestId: z.string().uuid(),
  proposal: z
    .string()
    .min(10, "Proposal must be at least 10 characters")
    .max(2000, "Proposal cannot exceed 2000 characters"),
  proposedPrice: z.number().int().min(1, "Proposed price must be at least 1 credit"),
});

export type CreateServiceRequestInput = z.infer<typeof createServiceRequestSchema>;
export type CreateServiceApplicationInput = z.infer<typeof createServiceApplicationSchema>;
