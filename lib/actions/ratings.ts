"use server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ratings, users } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createRating(input: {
  toUserId: string;
  projectId?: string;
  serviceRequestId?: string;
  stars: number;
  comment?: string;
}) {
  const user = await requireUser();

  if (input.stars < 1 || input.stars > 5) {
    throw new Error("Rating must be between 1 and 5 stars");
  }

  if (user.id === input.toUserId) {
    throw new Error("Cannot rate yourself");
  }

  await db.insert(ratings).values({
    fromUserId: user.id,
    toUserId: input.toUserId,
    projectId: input.projectId || null,
    serviceRequestId: input.serviceRequestId || null,
    stars: input.stars,
    comment: input.comment || null,
  });

  // Recompute user running average
  const [agg] = await db
    .select({
      avgStars: sql<number>`AVG(${ratings.stars})`,
      totalCount: sql<number>`COUNT(*)`,
    })
    .from(ratings)
    .where(eq(ratings.toUserId, input.toUserId));

  await db
    .update(users)
    .set({
      rating: Math.round(Number(agg?.avgStars || 0) * 10) / 10,
      totalRatings: Number(agg?.totalCount || 0),
      updatedAt: new Date(),
    })
    .where(eq(users.id, input.toUserId));

  revalidatePath(`/profile/${input.toUserId}`);
  return { success: true };
}
