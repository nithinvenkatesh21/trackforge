"use server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  issues,
  issueReplies,
  projectCollaborators,
  notifications,
  projects,
} from "@/lib/db/schema";
import {
  createIssueSchema,
  createIssueReplySchema,
  CreateIssueInput,
  CreateIssueReplyInput,
} from "@/lib/schemas/issues";
import { eq, and, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createIssue(input: CreateIssueInput) {
  const user = await requireUser();
  const validated = createIssueSchema.parse(input);

  // Check project collaborator
  const [collab] = await db
    .select()
    .from(projectCollaborators)
    .where(
      and(
        eq(projectCollaborators.projectId, validated.projectId),
        eq(projectCollaborators.userId, user.id)
      )
    )
    .limit(1);

  if (!collab) {
    throw new Error("Forbidden: Only project collaborators can file issues");
  }

  const [newIssue] = await db
    .insert(issues)
    .values({
      projectId: validated.projectId,
      creatorId: user.id,
      title: validated.title,
      description: validated.description,
      status: "open",
      tags: validated.tags || [],
      versionId: validated.versionId || null,
      timestampSeconds: validated.timestampSeconds ?? null,
    })
    .returning();

  if (!newIssue) {
    throw new Error("Failed to create issue");
  }

  // Notify other collaborators
  const otherCollabs = await db
    .select()
    .from(projectCollaborators)
    .where(
      and(
        eq(projectCollaborators.projectId, validated.projectId),
        ne(projectCollaborators.userId, user.id)
      )
    );

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, validated.projectId))
    .limit(1);

  for (const c of otherCollabs) {
    await db.insert(notifications).values({
      userId: c.userId,
      type: "issue_created",
      title: "New Issue Filed",
      message: `${user.name || "A collaborator"} opened issue "${newIssue.title}" in "${project?.title || "Project"}".`,
      projectId: validated.projectId,
      issueId: newIssue.id,
      fromUserId: user.id,
    });
  }

  revalidatePath(`/projects/${validated.projectId}`);
  return newIssue;
}

export async function createIssueReply(input: CreateIssueReplyInput) {
  const user = await requireUser();
  const validated = createIssueReplySchema.parse(input);

  const [issue] = await db
    .select()
    .from(issues)
    .where(eq(issues.id, validated.issueId))
    .limit(1);

  if (!issue) {
    throw new Error("Issue not found");
  }

  const [reply] = await db
    .insert(issueReplies)
    .values({
      issueId: validated.issueId,
      authorId: user.id,
      content: validated.content,
      parentReplyId: validated.parentReplyId || null,
    })
    .returning();

  revalidatePath(`/projects/${issue.projectId}`);
  return reply;
}

export async function updateIssueStatus(
  issueId: string,
  status: "open" | "in_progress" | "resolved" | "closed"
) {
  const user = await requireUser();

  const [issue] = await db
    .select()
    .from(issues)
    .where(eq(issues.id, issueId))
    .limit(1);

  if (!issue) {
    throw new Error("Issue not found");
  }

  const [updated] = await db
    .update(issues)
    .set({ status, updatedAt: new Date() })
    .where(eq(issues.id, issueId))
    .returning();

  // Notify creator if status changed by another collaborator
  if (issue.creatorId !== user.id) {
    await db.insert(notifications).values({
      userId: issue.creatorId,
      type: "issue_updated",
      title: "Issue Status Changed",
      message: `${user.name || "A collaborator"} marked issue "${issue.title}" as ${status}.`,
      projectId: issue.projectId,
      issueId: issue.id,
      fromUserId: user.id,
    });
  }

  revalidatePath(`/projects/${issue.projectId}`);
  return updated;
}
