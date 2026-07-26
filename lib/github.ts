import { Octokit } from "@octokit/rest";

export const ghOwner = process.env.GH_OWNER || "trackforge";
export const ghRepo = process.env.GH_REPO || "trackforge-artifacts";

export function getOctokit(userToken?: string) {
  const token = userToken || process.env.GITHUB_TOKEN;
  return new Octokit({
    auth: token,
  });
}

export const octokit = getOctokit();

export function sanitizePath(path: string) {
  if (!path) return "";
  // Reject path traversal attacks
  if (path.includes("..") || path.startsWith("/") || path.includes("\\")) {
    throw new Error("Invalid repository path");
  }
  return path;
}
