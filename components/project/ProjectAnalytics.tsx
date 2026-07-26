"use client";

import { useEffect, useState } from "react";
import { getAudioAnalytics } from "@/lib/queries/analytics";
import { BarChart3, Users, Play, Clock, Flame } from "lucide-react";

interface ProjectAnalyticsProps {
  versionId: string;
}

export function ProjectAnalytics({ versionId }: ProjectAnalyticsProps) {
  const [analytics, setAnalytics] = useState<any | null>(null);

  useEffect(() => {
    if (!versionId) return;
    getAudioAnalytics(versionId).then(setAnalytics);
  }, [versionId]);

  if (!analytics) return null;

  return (
    <div className="glass-panel p-6 rounded-xl space-y-6">
      <div className="flex items-center space-x-2 border-b border-zinc-800 pb-3">
        <BarChart3 className="w-5 h-5 text-emerald-400" />
        <h3 className="font-bold text-white text-base">Version Playback Analytics</h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div className="p-3.5 rounded-lg bg-zinc-900/60 border border-zinc-800 space-y-1">
          <span className="text-zinc-400 flex items-center space-x-1">
            <Play className="w-3.5 h-3.5 text-emerald-400" />
            <span>Total Plays</span>
          </span>
          <span className="text-lg font-bold font-mono text-white block">
            {analytics.totalPlays}
          </span>
        </div>

        <div className="p-3.5 rounded-lg bg-zinc-900/60 border border-zinc-800 space-y-1">
          <span className="text-zinc-400 flex items-center space-x-1">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span>Listeners</span>
          </span>
          <span className="text-lg font-bold font-mono text-white block">
            {analytics.uniqueListeners}
          </span>
        </div>

        <div className="p-3.5 rounded-lg bg-zinc-900/60 border border-zinc-800 space-y-1">
          <span className="text-zinc-400 flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Avg Listen Time</span>
          </span>
          <span className="text-lg font-bold font-mono text-white block">
            {analytics.avgDurationSeconds}s
          </span>
        </div>

        <div className="p-3.5 rounded-lg bg-zinc-900/60 border border-zinc-800 space-y-1">
          <span className="text-zinc-400 flex items-center space-x-1">
            <Flame className="w-3.5 h-3.5 text-purple-400" />
            <span>Completion Rate</span>
          </span>
          <span className="text-lg font-bold font-mono text-white block">
            {analytics.completionPercentage}%
          </span>
        </div>
      </div>

      {/* Replay Heatmap Section */}
      {analytics.mostReplayedSections && analytics.mostReplayedSections.length > 0 && (
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center space-x-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Most Replayed Sections (10s Buckets)</span>
          </h4>

          <div className="space-y-2">
            {analytics.mostReplayedSections.map((sec: any, idx: number) => (
              <div
                key={idx}
                className="p-2.5 rounded-lg bg-zinc-900/40 border border-zinc-800 flex items-center justify-between text-xs font-mono"
              >
                <span className="text-cyan-400">
                  {sec.startTimeSeconds}s - {sec.endTimeSeconds}s
                </span>
                <span className="text-emerald-400 font-bold">{sec.replays} replays</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
