"use client";

import { useState } from "react";
import { VersionCard } from "./VersionCard";
import { GitBranch, Layers } from "lucide-react";

interface VersionItem {
  id: string;
  projectId: string;
  parentVersionId: string | null;
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
}

interface VersionTreeViewProps {
  versions: VersionItem[];
  selectedVersionId: string | null;
  onSelectVersion: (version: VersionItem) => void;
  onForkVersion: (version: VersionItem) => void;
  isOwner?: boolean;
}

export function VersionTreeView({
  versions,
  selectedVersionId,
  onSelectVersion,
  onForkVersion,
  isOwner,
}: VersionTreeViewProps) {
  const [expandAll, setExpandAll] = useState(true);

  if (versions.length === 0) {
    return (
      <div className="glass-panel p-10 rounded-xl text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
          <GitBranch className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-white">No versions uploaded yet</h3>
        <p className="text-sm text-zinc-400 max-w-sm mx-auto">
          Upload your first track or stem bundle to start building the version control tree.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center space-x-2 text-sm text-zinc-400">
          <Layers className="w-4 h-4 text-emerald-400" />
          <span>Version Tree ({versions.length} commits)</span>
        </div>
        <button
          onClick={() => setExpandAll(!expandAll)}
          className="text-xs text-zinc-400 hover:text-white transition cursor-pointer"
        >
          {expandAll ? "Collapse Tree" : "Expand Tree"}
        </button>
      </div>

      <div className="space-y-3 relative before:absolute before:left-6 before:top-4 before:bottom-4 before:w-0.5 before:bg-gradient-to-b before:from-emerald-500/40 before:via-cyan-500/40 before:to-purple-500/40 pl-6">
        {versions.map((v) => {
          const isFork = Boolean(v.parentVersionId);

          return (
            <div key={v.id} className="relative">
              {/* Branch connecting node edge */}
              <div
                className={`absolute -left-6 top-6 w-5 h-0.5 ${
                  isFork ? "bg-cyan-500/60" : "bg-emerald-500/60"
                }`}
              />
              <VersionCard
                version={v}
                isSelected={v.id === selectedVersionId}
                onSelect={() => onSelectVersion(v)}
                onFork={() => onForkVersion(v)}
                isOwner={isOwner}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
