"use client";

import { useState, useEffect } from "react";
import {
  getRepoInfo,
  listRepoContents,
  getFileContents,
  pushFilesToRepo,
  deleteFileFromRepo,
} from "@/lib/actions/integrations";
import { GitPullRequest, Folder, FileText, Plus, Trash2, Code, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function IntegrationsPage() {
  const [repo, setRepo] = useState<any | null>(null);
  const [contents, setContents] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<any | null>(null);
  const [filePath, setFilePath] = useState("stems/v1-metadata.json");
  const [fileContent, setFileContent] = useState(
    JSON.stringify({ track: "Midnight Horizon", bpm: 140, key: "C Minor" }, null, 2)
  );
  const [commitMsg, setCommitMsg] = useState("feat: update track metadata");
  const [isCommitting, setIsCommitting] = useState(false);

  const loadRepoData = async () => {
    try {
      const info = await getRepoInfo();
      setRepo(info);
      const list = await listRepoContents("");
      setContents(list);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadRepoData();
  }, []);

  const handleSelectFile = async (item: any) => {
    if (item.type === "file") {
      try {
        const fileData = await getFileContents(item.path);
        setSelectedFile(fileData);
      } catch (err: any) {
        toast.error(err.message || "Failed to fetch file content");
      }
    }
  };

  const handlePushCommit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!filePath.trim() || !fileContent.trim()) return;

    setIsCommitting(true);
    try {
      await pushFilesToRepo({
        commitMessage: commitMsg.trim(),
        files: [{ path: filePath.trim(), content: fileContent }],
      });
      toast.success("Committed to GitHub successfully!");
      loadRepoData();
    } catch (err: any) {
      toast.error(err.message || "Failed to push commit");
    } finally {
      setIsCommitting(false);
    }
  };

  const handleDeleteFile = async (fileToDelete: any) => {
    if (!confirm(`Delete ${fileToDelete.path} from GitHub repository?`)) return;

    try {
      await deleteFileFromRepo(
        fileToDelete.path,
        `delete: remove ${fileToDelete.name}`,
        fileToDelete.sha
      );
      toast.success("File deleted from GitHub");
      setSelectedFile(null);
      loadRepoData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete file");
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-zinc-800 pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center space-x-2">
          <GitPullRequest className="w-8 h-8 text-emerald-400" />
          <span>GitHub Synchronization</span>
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Export audio metadata, stem manifests, and track session JSON artifacts to your linked GitHub repository.
        </p>
      </div>

      {/* Repo Info Card */}
      {repo && (
        <div className="glass-panel p-6 rounded-2xl border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white font-mono">{repo.fullName}</h2>
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
              Branch: {repo.defaultBranch}
            </span>
          </div>
          <p className="text-xs text-zinc-400">{repo.description}</p>
        </div>
      )}

      {/* Grid: Repository File Tree & Viewer */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-5 glass-panel p-5 rounded-2xl border border-zinc-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Folder className="w-4 h-4 text-emerald-400" />
            <span>Repository Tree</span>
          </h3>

          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {contents.length === 0 ? (
              <div className="text-xs text-zinc-500 py-4 text-center">
                Repository empty or token unconfigured. Commit your first metadata file below!
              </div>
            ) : (
              contents.map((item) => (
                <div
                  key={item.sha}
                  onClick={() => handleSelectFile(item)}
                  className={`p-2 rounded-lg text-xs flex items-center justify-between cursor-pointer transition ${
                    selectedFile?.path === item.path
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "hover:bg-zinc-900 text-zinc-300"
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    {item.type === "dir" ? (
                      <Folder className="w-4 h-4 text-amber-400" />
                    ) : (
                      <FileText className="w-4 h-4 text-emerald-400" />
                    )}
                    <span className="truncate">{item.name}</span>
                  </div>
                  <span className="text-[10px] text-zinc-500">{item.size} B</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="md:col-span-7 glass-panel p-5 rounded-2xl border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Code className="w-4 h-4 text-cyan-400" />
              <span>File Viewer ({selectedFile?.name || "None"})</span>
            </h3>

            {selectedFile && (
              <button
                onClick={() => handleDeleteFile(selectedFile)}
                className="px-2.5 py-1 rounded bg-red-500/20 text-red-300 border border-red-500/40 text-xs font-semibold hover:bg-red-500/30 transition flex items-center space-x-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete File</span>
              </button>
            )}
          </div>

          {selectedFile ? (
            <pre className="p-4 rounded-xl bg-zinc-950 font-mono text-xs text-emerald-400 border border-zinc-900 max-h-72 overflow-auto whitespace-pre-wrap">
              {selectedFile.content}
            </pre>
          ) : (
            <div className="py-16 text-center text-xs text-zinc-500">
              Select a file from the repository tree on the left to view contents.
            </div>
          )}
        </div>
      </div>

      {/* Commit Composer Form */}
      <div className="glass-panel p-6 rounded-2xl border border-zinc-800 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center space-x-2">
          <Plus className="w-4 h-4 text-emerald-400" />
          <span>Commit Audio Metadata / Artifacts to GitHub</span>
        </h3>

        <form onSubmit={handlePushCommit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">
                Repository File Path *
              </label>
              <input
                type="text"
                required
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                placeholder="stems/v1-manifest.json"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-zinc-300 mb-1">
                Commit Message *
              </label>
              <input
                type="text"
                required
                value={commitMsg}
                onChange={(e) => setCommitMsg(e.target.value)}
                placeholder="feat: add track stems metadata"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-zinc-300 mb-1">
              File Content (JSON / Text) *
            </label>
            <textarea
              rows={5}
              required
              value={fileContent}
              onChange={(e) => setFileContent(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-emerald-400 font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isCommitting}
              className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              {isCommitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Pushing to GitHub...</span>
                </>
              ) : (
                <>
                  <GitPullRequest className="w-4 h-4" />
                  <span>Push Commit</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
