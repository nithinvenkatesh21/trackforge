"use client";

import { File, Download, Music, FileCode, Package, Sparkles } from "lucide-react";
import { separateAudioStems } from "@/lib/actions/stems";
import { toast } from "sonner";

interface ProjectFileItem {
  id: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number | null;
  downloadUrl: string | null;
}

interface FileTreeViewProps {
  versionId: string;
  files: ProjectFileItem[];
  audioUrl?: string | null;
}

export function FileTreeView({ versionId, files, audioUrl }: FileTreeViewProps) {
  const handleTriggerStems = async () => {
    try {
      await separateAudioStems(versionId);
      toast.success("Stem separation job queued! Stems will appear automatically when finished.");
    } catch (err: any) {
      toast.error(err.message || "Failed to trigger stem separation");
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case "audio":
        return <Music className="w-4 h-4 text-emerald-400" />;
      case "midi":
        return <FileCode className="w-4 h-4 text-cyan-400" />;
      case "preset":
        return <Package className="w-4 h-4 text-purple-400" />;
      default:
        return <File className="w-4 h-4 text-zinc-400" />;
    }
  };

  return (
    <div className="glass-panel p-5 rounded-xl space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white text-sm flex items-center space-x-2">
          <Package className="w-4 h-4 text-emerald-400" />
          <span>Version Assets & Stems ({files.length})</span>
        </h3>

        {audioUrl && (
          <button
            onClick={handleTriggerStems}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-zinc-950 font-semibold text-xs transition flex items-center space-x-1.5 cursor-pointer shadow-md shadow-emerald-500/10"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Separate AI Stems</span>
          </button>
        )}
      </div>

      {files.length === 0 ? (
        <div className="text-center py-6 text-xs text-zinc-500">
          No secondary files attached to this version yet. Trigger stem separation or upload a bundle!
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {files.map((file) => (
            <div
              key={file.id}
              className="p-2.5 rounded-lg bg-zinc-900/50 border border-zinc-800/80 flex items-center justify-between text-xs"
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                {getFileIcon(file.fileType)}
                <span className="font-medium text-zinc-200 truncate">
                  {file.fileName}
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                  {file.fileType}
                </span>
              </div>

              {file.downloadUrl && (
                <a
                  href={file.downloadUrl}
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition cursor-pointer"
                  title="Download File"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
