import { db } from "@/lib/db";
import {
  projectCollaborators,
  projectCollaboratorRoles,
  collabRequests,
  users,
  projects,
} from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getDownloadUrl } from "@/lib/storage";

export async function getProjectCollaborators(projectId: string) {
  const members = await db
    .select({
      id: projectCollaborators.id,
      userId: projectCollaborators.userId,
      createdAt: projectCollaborators.createdAt,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        imageUrl: users.imageUrl,
        creatorRoles: users.creatorRoles,
      },
      role: projectCollaboratorRoles.role,
    })
    .from(projectCollaborators)
    .innerJoin(users, eq(projectCollaborators.userId, users.id))
    .leftJoin(
      projectCollaboratorRoles,
      and(
        eq(projectCollaboratorRoles.projectId, projectId),
        eq(projectCollaboratorRoles.userId, projectCollaborators.userId)
      )
    )
    .where(eq(projectCollaborators.projectId, projectId));

  return Promise.all(
    members.map(async (m) => ({
      ...m,
      user: {
        ...m.user,
        avatarUrl: m.user.imageUrl ? await getDownloadUrl(m.user.imageUrl) : null,
      },
    }))
  );
}

export async function getMyCollabRequests(userId: string) {
  const requests = await db
    .select({
      id: collabRequests.id,
      projectId: collabRequests.projectId,
      fromUserId: collabRequests.fromUserId,
      toUserId: collabRequests.toUserId,
      creatorRole: collabRequests.creatorRole,
      message: collabRequests.message,
      status: collabRequests.status,
      createdAt: collabRequests.createdAt,
      projectTitle: projects.title,
      fromUserName: users.name,
      fromUserImage: users.imageUrl,
    })
    .from(collabRequests)
    .innerJoin(projects, eq(collabRequests.projectId, projects.id))
    .innerJoin(users, eq(collabRequests.fromUserId, users.id))
    .where(
      and(
        eq(collabRequests.toUserId, userId),
        eq(collabRequests.status, "pending")
      )
    )
    .orderBy(desc(collabRequests.createdAt));

  return Promise.all(
    requests.map(async (r) => ({
      ...r,
      fromUserAvatar: r.fromUserImage ? await getDownloadUrl(r.fromUserImage) : null,
    }))
  );
}
