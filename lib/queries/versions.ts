import { db } from "@/lib/db";
import {
  versions,
  users,
  comments,
  projectFiles,
  versionWaveforms,
  projects,
} from "@/lib/db/schema";
import { eq, desc, asc, and } from "drizzle-orm";
import { getDownloadUrl } from "@/lib/storage";

export async function getVersionsByProject(projectId: string) {
  const versionRows = await db
    .select({
      id: versions.id,
      projectId: versions.projectId,
      parentVersionId: versions.parentVersionId,
      fileKey: versions.fileKey,
      fileName: versions.fileName,
      fileSize: versions.fileSize,
      uploaderId: versions.uploaderId,
      notes: versions.notes,
      versionNumber: versions.versionNumber,
      isBundle: versions.isBundle,
      isPinnedRelease: versions.isPinnedRelease,
      createdAt: versions.createdAt,
      uploader: {
        id: users.id,
        name: users.name,
        imageUrl: users.imageUrl,
        creatorRoles: users.creatorRoles,
      },
    })
    .from(versions)
    .innerJoin(users, eq(versions.uploaderId, users.id))
    .where(eq(versions.projectId, projectId))
    .orderBy(desc(versions.versionNumber));

  return Promise.all(
    versionRows.map(async (v) => {
      const audioUrl = v.fileKey ? await getDownloadUrl(v.fileKey) : null;

      // Fetch waveform
      const [waveform] = await db
        .select()
        .from(versionWaveforms)
        .where(eq(versionWaveforms.versionId, v.id))
        .limit(1);

      // Fetch version files
      const files = await db
        .select()
        .from(projectFiles)
        .where(eq(projectFiles.versionId, v.id));

      const filesWithUrls = await Promise.all(
        files.map(async (f) => ({
          ...f,
          downloadUrl: f.fileKey ? await getDownloadUrl(f.fileKey) : null,
        }))
      );

      // Fetch comments
      const commentList = await db
        .select({
          id: comments.id,
          versionId: comments.versionId,
          projectId: comments.projectId,
          authorId: comments.authorId,
          content: comments.content,
          parentCommentId: comments.parentCommentId,
          timestampSeconds: comments.timestampSeconds,
          createdAt: comments.createdAt,
          authorName: users.name,
          authorImage: users.imageUrl,
        })
        .from(comments)
        .innerJoin(users, eq(comments.authorId, users.id))
        .where(eq(comments.versionId, v.id))
        .orderBy(asc(comments.createdAt));

      return {
        ...v,
        audioUrl,
        waveform: waveform || null,
        files: filesWithUrls,
        fileCount: filesWithUrls.length,
        comments: commentList,
        commentCount: commentList.length,
      };
    })
  );
}

export async function getVersionById(versionId: string) {
  const [v] = await db
    .select({
      id: versions.id,
      projectId: versions.projectId,
      parentVersionId: versions.parentVersionId,
      fileKey: versions.fileKey,
      fileName: versions.fileName,
      fileSize: versions.fileSize,
      uploaderId: versions.uploaderId,
      notes: versions.notes,
      versionNumber: versions.versionNumber,
      isBundle: versions.isBundle,
      isPinnedRelease: versions.isPinnedRelease,
      createdAt: versions.createdAt,
      uploader: {
        id: users.id,
        name: users.name,
        imageUrl: users.imageUrl,
        creatorRoles: users.creatorRoles,
      },
    })
    .from(versions)
    .innerJoin(users, eq(versions.uploaderId, users.id))
    .where(eq(versions.id, versionId))
    .limit(1);

  if (!v) return null;

  const audioUrl = v.fileKey ? await getDownloadUrl(v.fileKey) : null;

  const [waveform] = await db
    .select()
    .from(versionWaveforms)
    .where(eq(versionWaveforms.versionId, v.id))
    .limit(1);

  const files = await db
    .select()
    .from(projectFiles)
    .where(eq(projectFiles.versionId, v.id));

  const filesWithUrls = await Promise.all(
    files.map(async (f) => ({
      ...f,
      downloadUrl: f.fileKey ? await getDownloadUrl(f.fileKey) : null,
    }))
  );

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, v.projectId))
    .limit(1);

  return {
    ...v,
    audioUrl,
    waveform: waveform || null,
    files: filesWithUrls,
    projectTitle: project?.title || "Project",
    projectVisibility: project?.visibility || "public",
  };
}
