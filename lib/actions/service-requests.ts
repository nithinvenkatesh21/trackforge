"use server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  serviceRequests,
  serviceApplications,
  milestones,
  notifications,
} from "@/lib/db/schema";
import {
  createServiceRequestSchema,
  createServiceApplicationSchema,
  CreateServiceRequestInput,
  CreateServiceApplicationInput,
} from "@/lib/schemas/service-requests";
import { eq, and, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createServiceRequest(input: CreateServiceRequestInput) {
  const user = await requireUser();
  const validated = createServiceRequestSchema.parse(input);

  const [reqRow] = await db
    .insert(serviceRequests)
    .values({
      projectId: validated.projectId || null,
      creatorId: user.id,
      type: validated.type,
      title: validated.title,
      description: validated.description,
      budgetMin: validated.budgetMin,
      budgetMax: validated.budgetMax,
      deadline: validated.deadline ? new Date(validated.deadline) : null,
      status: "open",
    })
    .returning();

  revalidatePath("/explore");
  revalidatePath("/service-requests");
  return reqRow;
}

export async function applyToServiceRequest(input: CreateServiceApplicationInput) {
  const user = await requireUser();
  const validated = createServiceApplicationSchema.parse(input);

  const [request] = await db
    .select()
    .from(serviceRequests)
    .where(eq(serviceRequests.id, validated.requestId))
    .limit(1);

  if (!request) {
    throw new Error("Service request not found");
  }

  if (request.status !== "open") {
    throw new Error("Service request is no longer open for applications");
  }

  if (request.creatorId === user.id) {
    throw new Error("Cannot apply to your own service request");
  }

  const [application] = await db
    .insert(serviceApplications)
    .values({
      requestId: validated.requestId,
      applicantId: user.id,
      proposal: validated.proposal,
      proposedPrice: validated.proposedPrice,
      status: "pending",
    })
    .returning();

  // Notify poster
  await db.insert(notifications).values({
    userId: request.creatorId,
    type: "application_received",
    title: "New Service Application Received",
    message: `${user.name || "An applicant"} applied to your gig "${request.title}" with a proposal of ${validated.proposedPrice} credits.`,
    fromUserId: user.id,
  });

  revalidatePath(`/service-requests/${validated.requestId}`);
  return application;
}

export async function acceptServiceApplication(applicationId: string) {
  const user = await requireUser();

  const [appRow] = await db
    .select()
    .from(serviceApplications)
    .where(eq(serviceApplications.id, applicationId))
    .limit(1);

  if (!appRow) {
    throw new Error("Application not found");
  }

  const [request] = await db
    .select()
    .from(serviceRequests)
    .where(eq(serviceRequests.id, appRow.requestId))
    .limit(1);

  if (!request || request.creatorId !== user.id) {
    throw new Error("Unauthorized: Only service request creator can accept applications");
  }

  // Accept target application
  await db
    .update(serviceApplications)
    .set({ status: "accepted" })
    .where(eq(serviceApplications.id, applicationId));

  // Reject sibling applications
  const siblings = await db
    .select()
    .from(serviceApplications)
    .where(
      and(
        eq(serviceApplications.requestId, appRow.requestId),
        ne(serviceApplications.id, applicationId)
      )
    );

  for (const s of siblings) {
    await db
      .update(serviceApplications)
      .set({ status: "rejected" })
      .where(eq(serviceApplications.id, s.id));

    await db.insert(notifications).values({
      userId: s.applicantId,
      type: "application_rejected",
      title: "Application Status Update",
      message: `Your application for "${request.title}" was not selected.`,
      fromUserId: user.id,
    });
  }

  // Update request status
  await db
    .update(serviceRequests)
    .set({
      status: "in_progress",
      acceptedApplicationId: applicationId,
      updatedAt: new Date(),
    })
    .where(eq(serviceRequests.id, appRow.requestId));

  // Insert pending milestone
  await db.insert(milestones).values({
    requestId: appRow.requestId,
    applicationId: appRow.id,
    applicantId: appRow.applicantId,
    amount: appRow.proposedPrice,
    status: "pending",
  });

  // Notify accepted applicant
  await db.insert(notifications).values({
    userId: appRow.applicantId,
    type: "application_accepted",
    title: "Application Accepted!",
    message: `Your application for "${request.title}" was accepted! Milestone created for ${appRow.proposedPrice} credits.`,
    fromUserId: user.id,
  });

  revalidatePath(`/service-requests/${appRow.requestId}`);
  return { success: true };
}
