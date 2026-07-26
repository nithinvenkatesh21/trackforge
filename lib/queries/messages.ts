import { db } from "@/lib/db";
import { messages, users } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { getDownloadUrl } from "@/lib/storage";

export async function getProjectMessages(projectId: string, limitCount = 50) {
  const msgRows = await db
    .select({
      id: messages.id,
      projectId: messages.projectId,
      senderId: messages.senderId,
      content: messages.content,
      createdAt: messages.createdAt,
      senderName: users.name,
      senderImage: users.imageUrl,
    })
    .from(messages)
    .innerJoin(users, eq(messages.senderId, users.id))
    .where(eq(messages.projectId, projectId))
    .orderBy(asc(messages.createdAt))
    .limit(limitCount);

  return Promise.all(
    msgRows.map(async (m) => ({
      ...m,
      senderAvatar: m.senderImage ? await getDownloadUrl(m.senderImage) : null,
    }))
  );
}
