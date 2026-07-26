import { db } from "@/lib/db";
import {
  serviceRequests,
  serviceApplications,
  milestones,
  users,
  projects,
} from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { getDownloadUrl } from "@/lib/storage";

export async function getOpenServiceRequests() {
  const requests = await db
    .select({
      id: serviceRequests.id,
      projectId: serviceRequests.projectId,
      creatorId: serviceRequests.creatorId,
      type: serviceRequests.type,
      title: serviceRequests.title,
      description: serviceRequests.description,
      budgetMin: serviceRequests.budgetMin,
      budgetMax: serviceRequests.budgetMax,
      deadline: serviceRequests.deadline,
      status: serviceRequests.status,
      createdAt: serviceRequests.createdAt,
      creatorName: users.name,
      creatorImage: users.imageUrl,
      applicationCount: sql<number>`(
        SELECT COUNT(*)::int FROM ${serviceApplications} WHERE ${serviceApplications.requestId} = ${serviceRequests.id}
      )`,
    })
    .from(serviceRequests)
    .innerJoin(users, eq(serviceRequests.creatorId, users.id))
    .where(eq(serviceRequests.status, "open"))
    .orderBy(desc(serviceRequests.createdAt));

  return Promise.all(
    requests.map(async (r) => ({
      ...r,
      creatorAvatar: r.creatorImage ? await getDownloadUrl(r.creatorImage) : null,
    }))
  );
}

export async function getServiceRequestById(requestId: string) {
  const [reqRow] = await db
    .select({
      id: serviceRequests.id,
      projectId: serviceRequests.projectId,
      creatorId: serviceRequests.creatorId,
      type: serviceRequests.type,
      title: serviceRequests.title,
      description: serviceRequests.description,
      budgetMin: serviceRequests.budgetMin,
      budgetMax: serviceRequests.budgetMax,
      deadline: serviceRequests.deadline,
      status: serviceRequests.status,
      acceptedApplicationId: serviceRequests.acceptedApplicationId,
      createdAt: serviceRequests.createdAt,
      creator: {
        id: users.id,
        name: users.name,
        imageUrl: users.imageUrl,
        creatorRoles: users.creatorRoles,
      },
    })
    .from(serviceRequests)
    .innerJoin(users, eq(serviceRequests.creatorId, users.id))
    .where(eq(serviceRequests.id, requestId))
    .limit(1);

  if (!reqRow) return null;

  const applications = await db
    .select({
      id: serviceApplications.id,
      requestId: serviceApplications.requestId,
      applicantId: serviceApplications.applicantId,
      proposal: serviceApplications.proposal,
      proposedPrice: serviceApplications.proposedPrice,
      status: serviceApplications.status,
      createdAt: serviceApplications.createdAt,
      applicantName: users.name,
      applicantImage: users.imageUrl,
    })
    .from(serviceApplications)
    .innerJoin(users, eq(serviceApplications.applicantId, users.id))
    .where(eq(serviceApplications.requestId, requestId))
    .orderBy(desc(serviceApplications.createdAt));

  const milestoneList = await db
    .select()
    .from(milestones)
    .where(eq(milestones.requestId, requestId));

  return {
    ...reqRow,
    creator: {
      ...reqRow.creator,
      avatarUrl: reqRow.creator.imageUrl
        ? await getDownloadUrl(reqRow.creator.imageUrl)
        : null,
    },
    applications,
    milestones: milestoneList,
  };
}
