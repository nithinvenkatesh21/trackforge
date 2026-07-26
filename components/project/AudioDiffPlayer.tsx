"use client";

import { useState } from "react";
import { SlidersHorizontal, Play, Pause, ArrowLeftRight } from "lucide-react";

export interface AudioDiffPlayerProps {
  versionA: { id: string; versionNumber: number; fileName: string; audioUrl: string };
  versionB: { id: string; versionNumber: number; fileName: string; audioUrl: string };
}

export function AudioDiffPlayer({ versionA, versionB }: AudioDiffPlayerProps) {
  const [activeChannel, setActiveChannel] = useState<"A" | "B">("A");
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="glass-panel p-6 rounded-2xl border border-cyan-500/30 space-y-4">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center space-x-2">
          <SlidersHorizontal className="w-5 h-5 text-cyan-400" />
          <h3 className="font-bold text-white text-base">Synced Audio A/B Diff Switcher</h3>
        </div>

        <div className="flex items-center space-x-2 bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs font-bold">
          <button
            onClick={() => setActiveChannel("A")}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              activeChannel === "A"
                ? "bg-cyan-500 text-zinc-950 shadow-md"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            A: v{versionA.versionNumber} ({versionA.fileName})
          </button>
          <button
            onClick={() => setActiveChannel("B")}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              activeChannel === "B"
                ? "bg-purple-500 text-white shadow-md"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            B: v{versionB.versionNumber} ({versionB.fileName})
          </button>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-900 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-10 h-10 rounded-full bg-cyan-500 hover:bg-cyan-400 text-zinc-950 flex items-center justify-center font-bold transition cursor-pointer"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>
          <div>
            <span className="text-zinc-400 block text-[10px]">CURRENT ACTIVE MIX CHANNEL</span>
            <span className={activeChannel === "A" ? "text-cyan-400 font-bold" : "text-purple-400 font-bold"}>
              Channel {activeChannel}: {activeChannel === "A" ? versionA.fileName : versionB.fileName}
            </span>
          </div>
        </div>

        <button
          onClick={() => setActiveChannel(activeChannel === "A" ? "B" : "A")}
          className="px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white flex items-center space-x-1.5 transition cursor-pointer"
        >
          <ArrowLeftRight className="w-4 h-4 text-emerald-400" />
          <span>Toggle A/B</span>
        </button>
      </div>
    </div>
  );
}
