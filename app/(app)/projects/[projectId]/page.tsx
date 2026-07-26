"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { getVersionsByProject } from "@/lib/queries/versions";
import { createVersion, forkVersion } from "@/lib/actions/versions";
import { VersionTreeView } from "@/components/project/VersionTreeView";
import { AudioPlayerWithComments } from "@/components/project/AudioPlayerWithComments";
import { FileTreeView } from "@/components/project/FileTreeView";
import { ShareLinkButton } from "@/components/project/ShareLinkButton";
import { Upload, Plus, GitFork, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function VersionsTabPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [versions, setVersions] = useState<any[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [isBundle, setIsBundle] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Fork modal state
  const [forkTargetVersion, setForkTargetVersion] = useState<any | null>(null);
  const [forkNotes, setForkNotes] = useState("");

  const loadVersions = async () => {
    try {
      const data = await getVersionsByProject(projectId);
      setVersions(data);
      if (data.length > 0 && !selectedVersion) {
        setSelectedVersion(data[0]);
      }
    } catch (err) {
      console.error("Failed to load versions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVersions();
  }, [projectId]);

  const handleUploadVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please select an audio or ZIP bundle file");
      return;
    }

    setIsUploading(true);

    try {
      // 1. Get presigned R2 upload URL
      const presignRes = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type || "audio/mpeg",
          fileSize: file.size,
          category: isBundle ? "bundle" : "audio",
        }),
      });

      if (!presignRes.ok) {
        const errJson = await presignRes.json();
        throw new Error(errJson.error || "Failed to get presigned upload URL");
      }

      const { uploadUrl, key } = await presignRes.json();

      // 2. PUT directly to R2
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "audio/mpeg" },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload file to Cloudflare R2 storage");
      }

      // 3. Create version record
      const newVer = await createVersion({
        projectId,
        fileKey: key,
        fileName: file.name,
        fileSize: file.size,
        notes: notes.trim() || undefined,
        isBundle,
      });

      toast.success("Version uploaded successfully!");
      setShowUploadModal(false);
      setFile(null);
      setNotes("");
      loadVersions();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload version");
    } finally {
      setIsUploading(false);
    }
  };

  const handleForkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forkTargetVersion) return;

    try {
      await forkVersion({
        versionId: forkTargetVersion.id,
        notes: forkNotes.trim() || undefined,
      });
      toast.success(`Forked from version v${forkTargetVersion.versionNumber}!`);
      setForkTargetVersion(null);
      setForkNotes("");
      loadVersions();
    } catch (err: any) {
      toast.error(err.message || "Failed to fork version");
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex items-center justify-center text-zinc-500">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Version Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h2 className="text-xl font-bold text-white">Project Revisions</h2>
          {selectedVersion && (
            <ShareLinkButton
              versionId={selectedVersion.id}
              versionNumber={selectedVersion.versionNumber}
            />
          )}
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition flex items-center space-x-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Version</span>
        </button>
      </div>

      {/* Main Grid: Tree View Left, Player & Asset List Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5">
          <VersionTreeView
            versions={versions}
            selectedVersionId={selectedVersion?.id || null}
            onSelectVersion={(v) => setSelectedVersion(v)}
            onForkVersion={(v) => setForkTargetVersion(v)}
          />
        </div>

        <div className="lg:col-span-7 space-y-6">
          {selectedVersion ? (
            <>
              <AudioPlayerWithComments
                versionId={selectedVersion.id}
                projectId={projectId}
                audioUrl={selectedVersion.audioUrl}
                initialPeaks={selectedVersion.waveform?.peaks}
                comments={selectedVersion.comments || []}
                versionNumber={selectedVersion.versionNumber}
              />

              <FileTreeView
                versionId={selectedVersion.id}
                files={selectedVersion.files || []}
                audioUrl={selectedVersion.audioUrl}
              />
            </>
          ) : (
            <div className="glass-panel p-12 rounded-xl text-center text-xs text-zinc-500">
              Select a version from the tree on the left to play audio and view files.
            </div>
          )}
        </div>
      </div>

      {/* Upload Version Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg rounded-2xl p-6 border border-zinc-800 space-y-5 relative">
            <button
              onClick={() => setShowUploadModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <Upload className="w-5 h-5 text-emerald-400" />
              <span>Upload New Version</span>
            </h3>

            <form onSubmit={handleUploadVersion} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-zinc-300 mb-1">
                  Audio or DAW Bundle File *
                </label>
                <input
                  type="file"
                  accept="audio/*,.zip,.flp,.als,.logicx,.ptx,.cpr,.rpp,.song,.aup"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-300 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-emerald-500/20 file:text-emerald-300"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 mb-1">
                  Commit Notes / Change Details
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Added sidechain compression, updated vocal lead EQ..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isBundle"
                  checked={isBundle}
                  onChange={(e) => setIsBundle(e.target.checked)}
                  className="rounded bg-zinc-900 border-zinc-800 text-emerald-500 focus:ring-0"
                />
                <label htmlFor="isBundle" className="text-zinc-300 cursor-pointer">
                  Mark as multi-file DAW bundle export
                </label>
              </div>

              <div className="pt-3 border-t border-zinc-800 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !file}
                  className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold transition flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Uploading to R2...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Upload Version</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fork Modal */}
      {forkTargetVersion && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 border border-zinc-800 space-y-4 relative">
            <button
              onClick={() => setForkTargetVersion(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <GitFork className="w-5 h-5 text-cyan-400" />
              <span>Fork Version v{forkTargetVersion.versionNumber}</span>
            </h3>

            <form onSubmit={handleForkSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-zinc-300 mb-1">
                  Fork Reason / Branch Notes
                </label>
                <textarea
                  rows={3}
                  value={forkNotes}
                  onChange={(e) => setForkNotes(e.target.value)}
                  placeholder="e.g. Alternate acoustic mix branch..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition"
                />
              </div>

              <div className="pt-2 border-t border-zinc-800 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setForkTargetVersion(null)}
                  className="px-4 py-2 rounded-lg bg-zinc-900 text-zinc-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <GitFork className="w-4 h-4" />
                  <span>Confirm Fork</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
