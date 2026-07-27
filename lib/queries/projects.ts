import { db } from "@/lib/db";
import {
  projects,
  projectCollaborators,
  versions,
  users,
} from "@/lib/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { getDownloadUrl } from "@/lib/storage";

export async function getProjectById(projectId: string) {
  if (!isUuid(projectId)) return null;

  try {
    const [project] = await db
      .select({
        id: projects.id,
        title: projects.title,
        description: projects.description,
        genre: projects.genre,
        bpm: projects.bpm,
        key: projects.key,
        creatorId: projects.creatorId,
        visibility: projects.visibility,
        status: projects.status,
        neededRoles: projects.neededRoles,
        coverArtKey: projects.coverArtKey,
        defaultCoverIndex: projects.defaultCoverIndex,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        creator: {
          id: users.id,
          name: users.name,
          imageUrl: users.imageUrl,
          creatorRoles: users.creatorRoles,
        },
      })
      .from(projects)
      .innerJoin(users, eq(projects.creatorId, users.id))
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) return null;

    const coverUrl = project.coverArtKey
      ? await getDownloadUrl(project.coverArtKey)
      : null;

    return {
      ...project,
      coverUrl,
    };
  } catch (err) {
    console.error("getProjectById query error:", err);
    return null;
  }
}



const isUuid = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) &&
  id !== "00000000-0000-0000-0000-000000000000";

export async function getMyProjects(userId: string) {
  if (!isUuid(userId)) return [];

  try {
    const userProjects = await db
      .select({
        id: projects.id,
        title: projects.title,
        description: projects.description,
        genre: projects.genre,
        bpm: projects.bpm,
        key: projects.key,
        creatorId: projects.creatorId,
        visibility: projects.visibility,
        status: projects.status,
        neededRoles: projects.neededRoles,
        coverArtKey: projects.coverArtKey,
        defaultCoverIndex: projects.defaultCoverIndex,
        createdAt: projects.createdAt,
        versionCount: sql<number>`(
          SELECT COUNT(*)::int FROM ${versions} WHERE ${versions.projectId} = ${projects.id}
        )`,
        collaboratorCount: sql<number>`(
          SELECT COUNT(*)::int FROM ${projectCollaborators} WHERE ${projectCollaborators.projectId} = ${projects.id}
        )`,
      })
      .from(projects)
      .innerJoin(
        projectCollaborators,
        and(
          eq(projectCollaborators.projectId, projects.id),
          eq(projectCollaborators.userId, userId)
        )
      )
      .where(eq(projects.creatorId, userId))
      .orderBy(desc(projects.createdAt));

    return Promise.all(
      userProjects.map(async (p) => ({
        ...p,
        coverUrl: p.coverArtKey ? await getDownloadUrl(p.coverArtKey) : null,
      }))
    );
  } catch (err) {
    console.error("getMyProjects query error:", err);
    return [];
  }
}

export async function getCollaboratingProjects(userId: string) {
  if (!isUuid(userId)) return [];

  try {
    const collabProjects = await db
      .select({
        id: projects.id,
        title: projects.title,
        description: projects.description,
        genre: projects.genre,
        bpm: projects.bpm,
        key: projects.key,
        creatorId: projects.creatorId,
        visibility: projects.visibility,
        status: projects.status,
        neededRoles: projects.neededRoles,
        coverArtKey: projects.coverArtKey,
        defaultCoverIndex: projects.defaultCoverIndex,
        createdAt: projects.createdAt,
        creatorName: users.name,
        creatorImage: users.imageUrl,
        versionCount: sql<number>`(
          SELECT COUNT(*)::int FROM ${versions} WHERE ${versions.projectId} = ${projects.id}
        )`,
        collaboratorCount: sql<number>`(
          SELECT COUNT(*)::int FROM ${projectCollaborators} WHERE ${projectCollaborators.projectId} = ${projects.id}
        )`,
      })
      .from(projects)
      .innerJoin(users, eq(projects.creatorId, users.id))
      .innerJoin(
        projectCollaborators,
        and(
          eq(projectCollaborators.projectId, projects.id),
          eq(projectCollaborators.userId, userId)
        )
      )
      .where(sql`${projects.creatorId} != ${userId}`)
      .orderBy(desc(projects.createdAt));

    return Promise.all(
      collabProjects.map(async (p) => ({
        ...p,
        coverUrl: p.coverArtKey ? await getDownloadUrl(p.coverArtKey) : null,
      }))
    );
  } catch (err) {
    console.error("getCollaboratingProjects query error:", err);
    return [];
  }
}

export async function listPublicProjects(genre?: string, neededRole?: string) {
  let query = db
    .select({
      id: projects.id,
      title: projects.title,
      description: projects.description,
      genre: projects.genre,
      bpm: projects.bpm,
      key: projects.key,
      creatorId: projects.creatorId,
      visibility: projects.visibility,
      status: projects.status,
      neededRoles: projects.neededRoles,
      coverArtKey: projects.coverArtKey,
      defaultCoverIndex: projects.defaultCoverIndex,
      createdAt: projects.createdAt,
      creatorName: users.name,
      creatorImage: users.imageUrl,
      versionCount: sql<number>`(
        SELECT COUNT(*)::int FROM ${versions} WHERE ${versions.projectId} = ${projects.id}
      )`,
    })
    .from(projects)
    .innerJoin(users, eq(projects.creatorId, users.id))
    .where(eq(projects.visibility, "public"))
    .orderBy(desc(projects.createdAt));

  const results = await query;

  let filtered = results;
  if (genre) {
    filtered = filtered.filter(
      (p) => p.genre?.toLowerCase() === genre.toLowerCase()
    );
  }
  if (neededRole) {
    filtered = filtered.filter(
      (p) => p.neededRoles && p.neededRoles.includes(neededRole)
    );
  }

  return Promise.all(
    filtered.map(async (p) => ({
      ...p,
      coverUrl: p.coverArtKey ? await getDownloadUrl(p.coverArtKey) : null,
    }))
  );
}
