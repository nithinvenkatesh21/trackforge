"use server";

import { listPublicProjects } from "@/lib/queries/projects";

export async function fetchPublicProjects(genre?: string, neededRole?: string) {
  return await listPublicProjects(genre, neededRole);
}
