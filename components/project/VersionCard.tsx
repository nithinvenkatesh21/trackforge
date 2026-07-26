"use client";

import { GitFork, Star, Package, Clock, FileAudio, Play } from "lucide-react";
import { pinRelease } from "@/lib/actions/versions";
import { toast } from "sonner";

interface VersionCardProps {
  version: {
    id: string;
    versionNumber: number;
    fileName: string;
    notes: string | null;
    isBundle: boolean;
    isPinnedRelease: boolean;
    createdAt: Date;
    uploader: {
      name: string | null;
      imageUrl: string | null;
    };
    audioUrl: string | null;
    commentCount: number;
    fileCount: number;
  };
  isSelected: boolean;
  onSelect: () => void;
  onFork: () => void;
  isOwner?: boolean;
}

export function VersionCard({
  version,
  isSelected,
  onSelect,
  onFork,
  isOwner,
}: VersionCardProps) {
  const handlePin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await pinRelease(version.id);
      toast.success(`Pinned version v${version.versionNumber} as official release!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to pin release");
    }
  };

  return (
    <div
      onClick={onSelect}
      className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
        isSelected
          ? "bg-zinc-900/90 border-emerald-500 shadow-lg shadow-emerald-500/10"
          : "bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/60"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-lg font-bold text-emerald-400 font-mono">
            v{version.versionNumber}
          </span>
          <h4 className="font-semibold text-white truncate max-w-[200px]">
            {version.fileName}
          </h4>
        </div>

        <div className="flex items-center space-x-2">
          {version.isPinnedRelease && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-medium flex items-center space-x-1">
              <Star className="w-3 h-3 fill-current" />
              <span>Pinned Release</span>
            </span>
          )}

          {version.isBundle && (
            <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-medium flex items-center space-x-1">
              <Package className="w-3 h-3" />
              <span>Bundle</span>
            </span>
          )}
        </div>
      </div>

      {version.notes && (
        <p className="text-xs text-zinc-400 mt-2 line-clamp-2">{version.notes}</p>
      )}

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-800/60 text-xs text-zinc-500">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-[9px]">
            {version.uploader.name?.[0] || "U"}
          </div>
          <span>{version.uploader.name || "Collaborator"}</span>
        </div>

        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1">
            <FileAudio className="w-3.5 h-3.5 text-zinc-400" />
            <span>{version.fileCount} files</span>
          </span>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onFork();
            }}
            className="px-2 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 font-medium flex items-center space-x-1 text-[11px] transition cursor-pointer"
          >
            <GitFork className="w-3 h-3" />
            <span>Fork</span>
          </button>

          {isOwner && !version.isPinnedRelease && (
            <button
              onClick={handlePin}
              className="p-1 text-zinc-400 hover:text-amber-400 transition cursor-pointer"
              title="Pin as official release"
            >
              <Star className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
