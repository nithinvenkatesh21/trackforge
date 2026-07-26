"use server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  collabRequests,
  projectCollaborators,
  projectCollaboratorRoles,
  notifications,
  projects,
  users,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function sendInvite(input: {
  projectId: string;
  toUserId: string;
  creatorRole: "artist" | "producer" | "mixer" | "engineer";
  message?: string;
}) {
  const user = await requireUser();

  // Verify inviter is owner or producer
  const [roleRow] = await db
    .select()
    .from(projectCollaboratorRoles)
    .where(
      and(
        eq(projectCollaboratorRoles.projectId, input.projectId),
        eq(projectCollaboratorRoles.userId, user.id)
      )
    )
    .limit(1);

  if (!roleRow || (roleRow.role !== "owner" && roleRow.role !== "producer")) {
    throw new Error("Forbidden: Only owners and producers can invite collaborators");
  }

  // Create collab request
  const [request] = await db
    .insert(collabRequests)
    .values({
      projectId: input.projectId,
      fromUserId: user.id,
      toUserId: input.toUserId,
      creatorRole: input.creatorRole,
      message: input.message || null,
      status: "pending",
    })
    .returning();

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, input.projectId))
    .limit(1);

  // Send notification to invitee
  await db.insert(notifications).values({
    userId: input.toUserId,
    type: "collab_request",
    title: "Collaboration Invite",
    message: `${user.name || "A creator"} invited you to join "${project?.title}" as a ${input.creatorRole}.`,
    projectId: input.projectId,
    fromUserId: user.id,
  });

  revalidatePath(`/projects/${input.projectId}`);
  return request;
}

export async function acceptInvite(requestId: string) {
  const user = await requireUser();

  const [request] = await db
    .select()
    .from(collabRequests)
    .where(
      and(
        eq(collabRequests.id, requestId),
        eq(collabRequests.toUserId, user.id)
      )
    )
    .limit(1);

  if (!request) {
    throw new Error("Invite request not found or unauthorized");
  }

  // Insert accepting user to project_collaborators
  await db.insert(projectCollaborators).values({
    projectId: request.projectId,
    userId: user.id,
  }).onConflictDoNothing();

  // Insert role (matching request creatorRole)
  await db.insert(projectCollaboratorRoles).values({
    projectId: request.projectId,
    userId: user.id,
    role: request.creatorRole as any,
  }).onConflictDoNothing();

  // Update status to accepted
  await db
    .update(collabRequests)
    .set({ status: "accepted", updatedAt: new Date() })
    .where(eq(collabRequests.id, requestId));

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, request.projectId))
    .limit(1);

  // Notify inviter
  await db.insert(notifications).values({
    userId: request.fromUserId,
    type: "collab_accepted",
    title: "Invite Accepted",
    message: `${user.name || "User"} accepted your invitation to collaborate on "${project?.title}".`,
    projectId: request.projectId,
    fromUserId: user.id,
  });

  revalidatePath("/dashboard");
  revalidatePath(`/projects/${request.projectId}`);
  return { success: true };
}

export async function rejectInvite(requestId: string) {
  const user = await requireUser();

  const [request] = await db
    .select()
    .from(collabRequests)
    .where(
      and(
        eq(collabRequests.id, requestId),
        eq(collabRequests.toUserId, user.id)
      )
    )
    .limit(1);

  if (!request) {
    throw new Error("Invite request not found or unauthorized");
  }

  await db
    .update(collabRequests)
    .set({ status: "rejected", updatedAt: new Date() })
    .where(eq(collabRequests.id, requestId));

  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateCollaboratorRole(
  projectId: string,
  targetUserId: string,
  newRole: "owner" | "producer" | "engineer" | "mixer" | "artist" | "viewer"
) {
  const user = await requireUser();

  const [ownerRole] = await db
    .select()
    .from(projectCollaboratorRoles)
    .where(
      and(
        eq(projectCollaboratorRoles.projectId, projectId),
        eq(projectCollaboratorRoles.userId, user.id)
      )
    )
    .limit(1);

  if (!ownerRole || ownerRole.role !== "owner") {
    throw new Error("Forbidden: Only project owner can update collaborator roles");
  }

  await db
    .update(projectCollaboratorRoles)
    .set({ role: newRole })
    .where(
      and(
        eq(projectCollaboratorRoles.projectId, projectId),
        eq(projectCollaboratorRoles.userId, targetUserId)
      )
    );

  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}

export async function transferOwnership(projectId: string, newOwnerUserId: string) {
  const user = await requireUser();

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project || project.creatorId !== user.id) {
    throw new Error("Forbidden: Only current project owner can transfer ownership");
  }

  // Update project creatorId
  await db
    .update(projects)
    .set({ creatorId: newOwnerUserId, updatedAt: new Date() })
    .where(eq(projects.id, projectId));

  // Update new owner role to 'owner'
  await db
    .update(projectCollaboratorRoles)
    .set({ role: "owner" })
    .where(
      and(
        eq(projectCollaboratorRoles.projectId, projectId),
        eq(projectCollaboratorRoles.userId, newOwnerUserId)
      )
    );

  // Demote previous owner to 'producer'
  await db
    .update(projectCollaboratorRoles)
    .set({ role: "producer" })
    .where(
      and(
        eq(projectCollaboratorRoles.projectId, projectId),
        eq(projectCollaboratorRoles.userId, user.id)
      )
    );

  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}

export async function removeCollaborator(projectId: string, targetUserId: string) {
  const user = await requireUser();

  const [ownerRole] = await db
    .select()
    .from(projectCollaboratorRoles)
    .where(
      and(
        eq(projectCollaboratorRoles.projectId, projectId),
        eq(projectCollaboratorRoles.userId, user.id)
      )
    )
    .limit(1);

  if (!ownerRole || ownerRole.role !== "owner") {
    throw new Error("Forbidden: Only project owner can remove collaborators");
  }

  if (targetUserId === user.id) {
    throw new Error("Cannot remove yourself as project owner");
  }

  await db
    .delete(projectCollaborators)
    .where(
      and(
        eq(projectCollaborators.projectId, projectId),
        eq(projectCollaborators.userId, targetUserId)
      )
    );

  await db
    .delete(projectCollaboratorRoles)
    .where(
      and(
        eq(projectCollaboratorRoles.projectId, projectId),
        eq(projectCollaboratorRoles.userId, targetUserId)
      )
    );

  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}
