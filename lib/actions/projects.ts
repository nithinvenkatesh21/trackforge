"use server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  projects,
  projectCollaborators,
  projectCollaboratorRoles,
  notifications,
} from "@/lib/db/schema";
import {
  createProjectSchema,
  updateProjectSchema,
  CreateProjectInput,
  UpdateProjectInput,
} from "@/lib/schemas/projects";
import { eq, and, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createProject(input: CreateProjectInput) {
  try {
    const user = await requireUser();
    const validated = createProjectSchema.parse(input);

    const [newProject] = await db
      .insert(projects)
      .values({
        title: validated.title,
        description: validated.description || null,
        genre: validated.genre || null,
        bpm: validated.bpm || null,
        key: validated.key || null,
        creatorId: user.id,
        visibility: validated.visibility || "public",
        status: validated.status || "open",
        neededRoles: validated.neededRoles || [],
        coverArtKey: validated.coverArtKey || null,
        defaultCoverIndex: validated.defaultCoverIndex ?? 0,
      })
      .returning();

    if (!newProject) {
      throw new Error("Failed to create project record");
    }

    // Add owner to project_collaborators and project_collaborator_roles
    try {
      await db.insert(projectCollaborators).values({
        projectId: newProject.id,
        userId: user.id,
      });

      await db.insert(projectCollaboratorRoles).values({
        projectId: newProject.id,
        userId: user.id,
        role: "owner",
      });
    } catch (collabErr) {
      console.error("Error adding project collaborator record:", collabErr);
    }

    revalidatePath("/dashboard");
    revalidatePath("/explore");
    return newProject;
  } catch (error: any) {
    console.error("createProject server action error:", error);
    throw new Error(error?.message || "Failed to create project");
  }
}

export async function updateProject(
  projectId: string,
  input: UpdateProjectInput
) {
  try {
    const user = await requireUser();
    const validated = updateProjectSchema.parse(input);

    // Check owner or producer role
    const [roleRow] = await db
      .select()
      .from(projectCollaboratorRoles)
      .where(
        and(
          eq(projectCollaboratorRoles.projectId, projectId),
          eq(projectCollaboratorRoles.userId, user.id)
        )
      )
      .limit(1);

    if (!roleRow || (roleRow.role !== "owner" && roleRow.role !== "producer")) {
      throw new Error("Forbidden: Only project owners and producers can update settings");
    }

    const [updated] = await db
      .update(projects)
      .set({
        ...validated,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId))
      .returning();

    // Notify other collaborators
    try {
      const collaborators = await db
        .select()
        .from(projectCollaborators)
        .where(
          and(
            eq(projectCollaborators.projectId, projectId),
            ne(projectCollaborators.userId, user.id)
          )
        );

      for (const collab of collaborators) {
        await db.insert(notifications).values({
          userId: collab.userId,
          type: "project_updated",
          title: "Project Updated",
          message: `${user.name || "A collaborator"} updated settings for project "${updated?.title}".`,
          projectId: projectId,
          fromUserId: user.id,
        });
      }
    } catch (notifErr) {
      console.error("Error creating project update notification:", notifErr);
    }

    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/dashboard");
    return updated;
  } catch (error: any) {
    console.error("updateProject server action error:", error);
    throw new Error(error?.message || "Failed to update project");
  }
}

export async function deleteProject(projectId: string) {
  try {
    const user = await requireUser();

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      throw new Error("Project not found");
    }

    if (project.creatorId !== user.id) {
      throw new Error("Forbidden: Only project owner can delete project");
    }

    // Single DELETE statement — ON DELETE CASCADE handles all child rows
    await db.delete(projects).where(eq(projects.id, projectId));

    revalidatePath("/dashboard");
    revalidatePath("/explore");
    return { success: true };
  } catch (error: any) {
    console.error("deleteProject server action error:", error);
    throw new Error(error?.message || "Failed to delete project");
  }
}
