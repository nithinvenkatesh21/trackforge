"use server";

import { getUserById, searchUsers } from "@/lib/queries/users";
import { getBalance } from "@/lib/queries/credits";
import { getUserRatings } from "@/lib/queries/ratings";
import { getMarketplaceAssets, getMarketplaceAssetById } from "@/lib/queries/marketplace";
import { getOpenServiceRequests, getServiceRequestById } from "@/lib/queries/service-requests";
import { getProjectById } from "@/lib/queries/projects";
import { getVersionsByProject } from "@/lib/queries/versions";
import { getIssuesByProject } from "@/lib/queries/issues";
import { getProjectCollaborators } from "@/lib/queries/collaborators";

export async function fetchUserData(userId: string) {
  const [user, balance, ratings] = await Promise.all([
    getUserById(userId),
    getBalance(userId),
    getUserRatings(userId),
  ]);
  return { user, balance: balance.balance, ratings };
}

export async function fetchMarketplaceAssets(type?: string, search?: string) {
  return await getMarketplaceAssets({
    type: type as any,
    search: search,
  });
}

export async function fetchMarketplaceAssetById(assetId: string) {
  return await getMarketplaceAssetById(assetId);
}

export async function fetchOpenServiceRequests() {
  return await getOpenServiceRequests();
}

export async function fetchServiceRequestById(requestId: string) {
  return await getServiceRequestById(requestId);
}

export async function fetchProjectById(projectId: string) {
  return await getProjectById(projectId);
}

export async function fetchVersionsByProject(projectId: string) {
  return await getVersionsByProject(projectId);
}

export async function fetchIssuesByProject(projectId: string) {
  return await getIssuesByProject(projectId);
}

export async function fetchProjectCollaborators(projectId: string) {
  return await getProjectCollaborators(projectId);
}

export async function fetchSearchUsers(query: string) {
  return await searchUsers(query);
}
