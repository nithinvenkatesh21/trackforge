import { db } from "@/lib/db";
import { issues, issueReplies, users, versions } from "@/lib/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { getDownloadUrl } from "@/lib/storage";

export async function getIssuesByProject(projectId: string) {
  const issueRows = await db
    .select({
      id: issues.id,
      projectId: issues.projectId,
      creatorId: issues.creatorId,
      title: issues.title,
      description: issues.description,
      status: issues.status,
      tags: issues.tags,
      versionId: issues.versionId,
      timestampSeconds: issues.timestampSeconds,
      createdAt: issues.createdAt,
      updatedAt: issues.updatedAt,
      creator: {
        id: users.id,
        name: users.name,
        imageUrl: users.imageUrl,
      },
      versionNumber: versions.versionNumber,
    })
    .from(issues)
    .innerJoin(users, eq(issues.creatorId, users.id))
    .leftJoin(versions, eq(issues.versionId, versions.id))
    .where(eq(issues.projectId, projectId))
    .orderBy(desc(issues.createdAt));

  return Promise.all(
    issueRows.map(async (issue) => {
      const replies = await db
        .select({
          id: issueReplies.id,
          issueId: issueReplies.issueId,
          authorId: issueReplies.authorId,
          content: issueReplies.content,
          parentReplyId: issueReplies.parentReplyId,
          createdAt: issueReplies.createdAt,
          authorName: users.name,
          authorImage: users.imageUrl,
        })
        .from(issueReplies)
        .innerJoin(users, eq(issueReplies.authorId, users.id))
        .where(eq(issueReplies.issueId, issue.id))
        .orderBy(asc(issueReplies.createdAt));

      return {
        ...issue,
        creator: {
          ...issue.creator,
          avatarUrl: issue.creator.imageUrl
            ? await getDownloadUrl(issue.creator.imageUrl)
            : null,
        },
        replies,
        replyCount: replies.length,
      };
    })
  );
}
