"use server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  versions,
  projectCollaborators,
  notifications,
  versionWaveforms,
  projects,
} from "@/lib/db/schema";
import {
  createVersionSchema,
  forkVersionSchema,
  CreateVersionInput,
  ForkVersionInput,
} from "@/lib/schemas/versions";
import { eq, and, ne, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createVersion(input: CreateVersionInput) {
  const user = await requireUser();
  const validated = createVersionSchema.parse(input);

  // Check collaborator status
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
    throw new Error("Forbidden: Only project collaborators can upload versions");
  }

  // Calculate next version_number per project
  const [{ value: currentCount }] = await db
    .select({ value: count() })
    .from(versions)
    .where(eq(versions.projectId, validated.projectId));

  const nextVersionNumber = Number(currentCount) + 1;

  const [newVersion] = await db
    .insert(versions)
    .values({
      projectId: validated.projectId,
      parentVersionId: validated.parentVersionId || null,
      fileKey: validated.fileKey || null,
      fileName: validated.fileName,
      fileSize: validated.fileSize || null,
      uploaderId: user.id,
      notes: validated.notes || null,
      versionNumber: nextVersionNumber,
      isBundle: validated.isBundle || false,
    })
    .returning();

  if (!newVersion) {
    throw new Error("Failed to create version");
  }

  // Generate simulated/default waveform peaks (60 samples between 0.1 and 0.95)
  // In production, Inngest background job computes exact decoded audio peak data
  const dummyPeaks = Array.from({ length: 60 }, (_, i) =>
    Math.round((Math.sin(i * 0.3) * 0.4 + 0.5) * 100) / 100
  );

  await db.insert(versionWaveforms).values({
    versionId: newVersion.id,
    peaks: dummyPeaks,
    durationSeconds: 180, // Default 3 min placeholder until decoded
    sampleRate: 44100,
  }).onConflictDoNothing();

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
      type: "version_uploaded",
      title: "New Version Uploaded",
      message: `${user.name || "A collaborator"} uploaded version v${nextVersionNumber} to "${project?.title || "Project"}".`,
      projectId: validated.projectId,
      versionId: newVersion.id,
      fromUserId: user.id,
    });
  }

  revalidatePath(`/projects/${validated.projectId}`);
  return newVersion;
}

export async function forkVersion(input: ForkVersionInput) {
  const user = await requireUser();
  const validated = forkVersionSchema.parse(input);

  const [sourceVersion] = await db
    .select()
    .from(versions)
    .where(eq(versions.id, validated.versionId))
    .limit(1);

  if (!sourceVersion) {
    throw new Error("Source version not found");
  }

  return createVersion({
    projectId: sourceVersion.projectId,
    parentVersionId: sourceVersion.id,
    fileKey: sourceVersion.fileKey,
    fileName: `${sourceVersion.fileName} (forked)`,
    fileSize: sourceVersion.fileSize,
    notes: `Forked from Version ${sourceVersion.versionNumber}${
      validated.notes ? `: ${validated.notes}` : ""
    }`,
    isBundle: sourceVersion.isBundle,
  });
}

export async function pinRelease(versionId: string) {
  const user = await requireUser();

  const [targetVersion] = await db
    .select()
    .from(versions)
    .where(eq(versions.id, versionId))
    .limit(1);

  if (!targetVersion) {
    throw new Error("Version not found");
  }

  // Check project owner permission
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, targetVersion.projectId))
    .limit(1);

  if (project?.creatorId !== user.id) {
    throw new Error("Forbidden: Only project owner can pin release version");
  }

  // Unpin all other versions in the project
  await db
    .update(versions)
    .set({ isPinnedRelease: false })
    .where(eq(versions.projectId, targetVersion.projectId));

  // Pin target version
  await db
    .update(versions)
    .set({ isPinnedRelease: true })
    .where(eq(versions.id, versionId));

  revalidatePath(`/projects/${targetVersion.projectId}`);
  return { success: true };
}
