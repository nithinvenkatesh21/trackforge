"use client";

import { FolderHeart, Lock, Globe } from "lucide-react";

export interface MarketplaceCollectionsViewProps {
  collections: any[];
  onSelectCollection?: (col: any) => void;
}

export function MarketplaceCollectionsView({
  collections,
  onSelectCollection,
}: MarketplaceCollectionsViewProps) {
  if (!collections || collections.length === 0) {
    return (
      <div className="text-center py-8 text-xs text-zinc-500 glass-panel rounded-xl">
        No asset collections created yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {collections.map((col) => (
        <div
          key={col.id}
          onClick={() => onSelectCollection?.(col)}
          className="glass-panel p-4 rounded-xl border border-zinc-800 hover:border-purple-500/50 hover:bg-zinc-900/80 transition cursor-pointer space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FolderHeart className="w-4 h-4 text-purple-400 group-hover:scale-110 transition" />
              <h4 className="font-bold text-sm text-white group-hover:text-purple-300 transition truncate max-w-[150px]">
                {col.name}
              </h4>
            </div>
            {col.isPublic ? (
              <span className="text-[10px] text-emerald-400 flex items-center space-x-0.5">
                <Globe className="w-3 h-3" />
                <span>Public</span>
              </span>
            ) : (
              <span className="text-[10px] text-zinc-500 flex items-center space-x-0.5">
                <Lock className="w-3 h-3" />
                <span>Private</span>
              </span>
            )}
          </div>

          {col.description && (
            <p className="text-xs text-zinc-400 line-clamp-2">{col.description}</p>
          )}

          <div className="text-[10px] text-zinc-500 pt-2 border-t border-zinc-800 font-mono">
            {col.assetIds?.length || 0} Assets in collection
          </div>
        </div>
      ))}
    </div>
  );
}
