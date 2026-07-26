"use server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { milestones, serviceRequests, notifications } from "@/lib/db/schema";
import { deductCredits, addCredits } from "@/lib/actions/credits";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function releaseMilestone(milestoneId: string) {
  const user = await requireUser();

  const [milestone] = await db
    .select()
    .from(milestones)
    .where(eq(milestones.id, milestoneId))
    .limit(1);

  if (!milestone) {
    throw new Error("Milestone not found");
  }

  const [request] = await db
    .select()
    .from(serviceRequests)
    .where(eq(serviceRequests.id, milestone.requestId))
    .limit(1);

  if (!request || request.creatorId !== user.id) {
    throw new Error("Forbidden: Only service request creator can release milestone funds");
  }

  if (milestone.status !== "pending") {
    throw new Error("Milestone is already released or completed");
  }

  // Deduct from poster (checks balance)
  await deductCredits(
    user.id,
    milestone.amount,
    `Milestone escrow release for gig: ${request.title}`,
    milestone.id
  );

  // Credit applicant
  await addCredits(
    milestone.applicantId,
    milestone.amount,
    `Milestone payout for gig: ${request.title}`,
    milestone.id
  );

  // Update milestone status
  await db
    .update(milestones)
    .set({
      status: "released",
      releaseDate: new Date(),
    })
    .where(eq(milestones.id, milestoneId));

  // Notify applicant
  await db.insert(notifications).values({
    userId: milestone.applicantId,
    type: "milestone_released",
    title: "Milestone Released!",
    message: `${user.name || "Poster"} released ${milestone.amount} credits for milestone on "${request.title}".`,
    fromUserId: user.id,
  });

  revalidatePath(`/service-requests/${request.id}`);
  return { success: true };
}

export async function completeMilestone(milestoneId: string) {
  const user = await requireUser();

  const [milestone] = await db
    .select()
    .from(milestones)
    .where(eq(milestones.id, milestoneId))
    .limit(1);

  if (!milestone) {
    throw new Error("Milestone not found");
  }

  const [request] = await db
    .select()
    .from(serviceRequests)
    .where(eq(serviceRequests.id, milestone.requestId))
    .limit(1);

  if (!request) {
    throw new Error("Service request not found");
  }

  if (user.id !== request.creatorId && user.id !== milestone.applicantId) {
    throw new Error("Forbidden: Only request poster or applicant can complete milestone");
  }

  await db
    .update(milestones)
    .set({ status: "completed" })
    .where(eq(milestones.id, milestoneId));

  // Mark parent service request as completed
  await db
    .update(serviceRequests)
    .set({ status: "completed", updatedAt: new Date() })
    .where(eq(serviceRequests.id, request.id));

  // Notify both parties
  const otherPartyId = user.id === request.creatorId ? milestone.applicantId : request.creatorId;

  await db.insert(notifications).values({
    userId: otherPartyId,
    type: "milestone_completed",
    title: "Gig Completed!",
    message: `Milestone for gig "${request.title}" was marked as completed. Please leave a rating!`,
    fromUserId: user.id,
  });

  revalidatePath(`/service-requests/${request.id}`);
  return { success: true };
}
