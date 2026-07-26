"use server";

import { requireUser } from "@/lib/auth";
import { octokit, ghOwner, ghRepo, sanitizePath } from "@/lib/github";
import { revalidatePath } from "next/cache";

export async function getRepoInfo() {
  await requireUser();
  try {
    const { data } = await octokit.rest.repos.get({
      owner: ghOwner,
      repo: ghRepo,
    });

    return {
      name: data.name,
      fullName: data.full_name,
      defaultBranch: data.default_branch,
      description: data.description,
      stars: data.stargazers_count,
      forks: data.forks_count,
      openIssues: data.open_issues_count,
      htmlUrl: data.html_url,
    };
  } catch (error: any) {
    console.error("getRepoInfo error:", error);
    return {
      name: ghRepo,
      fullName: `${ghOwner}/${ghRepo}`,
      defaultBranch: "main",
      description: "TrackForge audio metadata repository",
      stars: 0,
      forks: 0,
      openIssues: 0,
      htmlUrl: `https://github.com/${ghOwner}/${ghRepo}`,
      isPlaceholder: true,
    };
  }
}

export async function listRepoContents(path = "") {
  await requireUser();
  const cleanPath = sanitizePath(path);

  try {
    const { data } = await octokit.rest.repos.getContent({
      owner: ghOwner,
      repo: ghRepo,
      path: cleanPath,
    });

    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((item) => ({
      name: item.name,
      path: item.path,
      sha: item.sha,
      size: item.size,
      type: item.type, // 'file' | 'dir'
      downloadUrl: item.download_url,
    }));
  } catch (error) {
    console.error("listRepoContents error:", error);
    return [];
  }
}

export async function getFileContents(path: string) {
  await requireUser();
  const cleanPath = sanitizePath(path);

  try {
    const { data } = await octokit.rest.repos.getContent({
      owner: ghOwner,
      repo: ghRepo,
      path: cleanPath,
    });

    if (Array.isArray(data) || !("content" in data)) {
      throw new Error("Target path is a directory, not a file");
    }

    const content = Buffer.from(data.content, "base64").toString("utf-8");

    return {
      name: data.name,
      path: data.path,
      sha: data.sha,
      size: data.size,
      content,
    };
  } catch (error: any) {
    throw new Error(error.message || "Failed to fetch file content from GitHub");
  }
}

export async function pushFilesToRepo(input: {
  commitMessage: string;
  files: { path: string; content: string }[];
}) {
  await requireUser();

  if (input.files.length === 0) {
    throw new Error("No files to commit");
  }

  if (input.files.length > 25) {
    throw new Error("Cannot commit more than 25 files in a single push");
  }

  try {
    for (const f of input.files) {
      const cleanPath = sanitizePath(f.path);
      let existingSha: string | undefined;

      try {
        const { data } = await octokit.rest.repos.getContent({
          owner: ghOwner,
          repo: ghRepo,
          path: cleanPath,
        });

        if (!Array.isArray(data) && "sha" in data) {
          existingSha = data.sha;
        }
      } catch (e) {
        // File doesn't exist yet, proceed with create
      }

      await octokit.rest.repos.createOrUpdateFileContents({
        owner: ghOwner,
        repo: ghRepo,
        path: cleanPath,
        message: input.commitMessage,
        content: Buffer.from(f.content).toString("base64"),
        sha: existingSha,
      });
    }

    revalidatePath("/integrations");
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message || "Failed to push commit to GitHub");
  }
}

export async function deleteFileFromRepo(path: string, commitMessage: string, sha: string) {
  await requireUser();
  const cleanPath = sanitizePath(path);

  try {
    await octokit.rest.repos.deleteFile({
      owner: ghOwner,
      repo: ghRepo,
      path: cleanPath,
      message: commitMessage,
      sha,
    });

    revalidatePath("/integrations");
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message || "Failed to delete file from GitHub");
  }
}
