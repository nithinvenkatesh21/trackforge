import { db } from "@/lib/db";
import { comments, users } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

export async function getCommentsByVersion(versionId: string) {
  return await db
    .select({
      id: comments.id,
      versionId: comments.versionId,
      projectId: comments.projectId,
      authorId: comments.authorId,
      content: comments.content,
      parentCommentId: comments.parentCommentId,
      timestampSeconds: comments.timestampSeconds,
      createdAt: comments.createdAt,
      author: {
        id: users.id,
        name: users.name,
        imageUrl: users.imageUrl,
      },
    })
    .from(comments)
    .innerJoin(users, eq(comments.authorId, users.id))
    .where(eq(comments.versionId, versionId))
    .orderBy(asc(comments.createdAt));
}
