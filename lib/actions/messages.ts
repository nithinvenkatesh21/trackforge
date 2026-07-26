"use server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { messages, projectCollaborators } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function sendProjectMessage(projectId: string, content: string) {
  const user = await requireUser();

  if (!content || !content.trim()) {
    throw new Error("Message content cannot be empty");
  }

  // Verify collaborator
  const [collab] = await db
    .select()
    .from(projectCollaborators)
    .where(
      and(
        eq(projectCollaborators.projectId, projectId),
        eq(projectCollaborators.userId, user.id)
      )
    )
    .limit(1);

  if (!collab) {
    throw new Error("Forbidden: Only project collaborators can post chat messages");
  }

  const [newMessage] = await db
    .insert(messages)
    .values({
      projectId,
      senderId: user.id,
      content: content.trim(),
    })
    .returning();

  revalidatePath(`/projects/${projectId}`);
  return newMessage;
}
