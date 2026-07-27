"use server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  projects,
  projectCollaborators,
  projectCollaboratorRoles,
  notifications,
  users,
} from "@/lib/db/schema";
import {
  createProjectSchema,
  updateProjectSchema,
  CreateProjectInput,
  UpdateProjectInput,
} from "@/lib/schemas/projects";
import { eq, and, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";

function serializeProject(p: any) {
  if (!p) return null;
  return {
    id: String(p.id),
    title: String(p.title || ""),
    description: p.description ? String(p.description) : null,
    genre: p.genre ? String(p.genre) : null,
    bpm: p.bpm ? Number(p.bpm) : null,
    key: p.key ? String(p.key) : null,
    creatorId: String(p.creatorId || ""),
    visibility: String(p.visibility || "public"),
    status: String(p.status || "open"),
    neededRoles: Array.isArray(p.neededRoles) ? p.neededRoles : [],
    coverArtKey: p.coverArtKey ? String(p.coverArtKey) : null,
    defaultCoverIndex: p.defaultCoverIndex ? Number(p.defaultCoverIndex) : 0,
    createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : new Date().toISOString(),
  };
}

export async function createProject(input: CreateProjectInput) {
  try {
    const user = await requireUser();
    const validated = createProjectSchema.parse(input);

    // Ensure we have a valid Postgres user row ID
    let creatorId = user.id;
    if (!creatorId || creatorId === "00000000-0000-0000-0000-000000000000") {
      let [existingUser] = await db
        .select({ id: users.id, clerkId: users.clerkId })
        .from(users)
        .where(eq(users.clerkId, user.clerkId))
        .limit(1);

      if (!existingUser) {
        const [newUser] = await db
          .insert(users)
          .values({
            clerkId: user.clerkId,
            email: user.email || `${user.clerkId}@user.clerk`,
            name: user.name || "Creator",
            imageUrl: user.imageUrl || null,
            role: "user",
          })
          .onConflictDoNothing()
          .returning({ id: users.id, clerkId: users.clerkId });

        existingUser =
          newUser ||
          (
            await db
              .select({ id: users.id, clerkId: users.clerkId })
              .from(users)
              .where(eq(users.clerkId, user.clerkId))
              .limit(1)
          )[0];
      }

      if (existingUser) {
        creatorId = existingUser.id;
      }
    }

    const [newProject] = await db
      .insert(projects)
      .values({
        title: validated.title,
        description: validated.description || null,
        genre: validated.genre || null,
        bpm: validated.bpm || null,
        key: validated.key || null,
        creatorId,
        visibility: validated.visibility || "public",
        status: validated.status || "open",
        neededRoles: validated.neededRoles || [],
        coverArtKey: validated.coverArtKey || null,
        defaultCoverIndex: validated.defaultCoverIndex ?? 0,
      })
      .returning();

    if (!newProject) {
      return { success: false, error: "Failed to create project record in database" };
    }

    // Add owner to project_collaborators and project_collaborator_roles
    try {
      await db.insert(projectCollaborators).values({
        projectId: newProject.id,
        userId: creatorId,
      });

      await db.insert(projectCollaboratorRoles).values({
        projectId: newProject.id,
        userId: creatorId,
        role: "owner",
      });
    } catch (collabErr) {
      console.error("Error adding project collaborator record:", collabErr);
    }

    revalidatePath("/dashboard");
    revalidatePath("/explore");

    return {
      success: true,
      project: serializeProject(newProject),
    };
  } catch (error: any) {
    console.error("createProject server action error:", error);
    return { success: false, error: error?.message || "Failed to create project" };
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
      return { success: false, error: "Forbidden: Only project owners and producers can update settings" };
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
    return { success: true, project: serializeProject(updated) };
  } catch (error: any) {
    console.error("updateProject server action error:", error);
    return { success: false, error: error?.message || "Failed to update project" };
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
      return { success: false, error: "Project not found" };
    }

    if (project.creatorId !== user.id) {
      return { success: false, error: "Forbidden: Only project owner can delete project" };
    }

    // Single DELETE statement — ON DELETE CASCADE handles all child rows
    await db.delete(projects).where(eq(projects.id, projectId));

    revalidatePath("/dashboard");
    revalidatePath("/explore");
    return { success: true };
  } catch (error: any) {
    console.error("deleteProject server action error:", error);
    return { success: false, error: error?.message || "Failed to delete project" };
  }
}
