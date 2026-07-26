"use server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { comments, versions, notifications } from "@/lib/db/schema";
import { createCommentSchema, CreateCommentInput } from "@/lib/schemas/comments";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createComment(input: CreateCommentInput) {
  const user = await requireUser();
  const validated = createCommentSchema.parse(input);

  const [newComment] = await db
    .insert(comments)
    .values({
      versionId: validated.versionId,
      projectId: validated.projectId,
      authorId: user.id,
      content: validated.content,
      parentCommentId: validated.parentCommentId || null,
      timestampSeconds: validated.timestampSeconds ?? null,
    })
    .returning();

  if (!newComment) {
    throw new Error("Failed to create comment");
  }

  // Get version uploader to notify
  const [version] = await db
    .select()
    .from(versions)
    .where(eq(versions.id, validated.versionId))
    .limit(1);

  if (version && version.uploaderId !== user.id) {
    const timestampStr = validated.timestampSeconds !== undefined && validated.timestampSeconds !== null
      ? ` at ${Math.floor(validated.timestampSeconds / 60)}:${String(
          Math.floor(validated.timestampSeconds % 60)
        ).padStart(2, "0")}`
      : "";

    await db.insert(notifications).values({
      userId: version.uploaderId,
      type: "comment_added",
      title: "New Comment on Version",
      message: `${user.name || "A user"} left a comment${timestampStr} on version v${version.versionNumber}.`,
      projectId: validated.projectId,
      versionId: validated.versionId,
      commentId: newComment.id,
      fromUserId: user.id,
    });
  }

  revalidatePath(`/projects/${validated.projectId}`);
  return newComment;
}
