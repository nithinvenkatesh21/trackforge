import { Activity, Clock } from "lucide-react";

export default function ActivityTabPage() {
  return (
    <div className="glass-panel p-8 rounded-xl border border-zinc-800 space-y-4">
      <h2 className="text-xl font-bold text-white flex items-center space-x-2">
        <Activity className="w-5 h-5 text-amber-400" />
        <span>Project Activity Log</span>
      </h2>
      <p className="text-xs text-zinc-400">
        Deterministic commit history and event trail for all versions, comments, and member updates in this workspace.
      </p>

      <div className="space-y-3 pt-4 border-t border-zinc-800/80">
        <div className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800 text-xs flex items-center justify-between">
          <span className="text-zinc-300 font-medium">Workspace session initialized</span>
          <span className="text-zinc-500 font-mono text-[10px]">Just now</span>
        </div>
      </div>
    </div>
  );
}
