"use client";

import { Music } from "lucide-react";

export interface ProjectCoverArtProps {
  coverUrl?: string | null;
  defaultCoverIndex?: number;
  title: string;
  size?: "sm" | "md" | "lg";
}

const DEFAULT_GRADIENTS = [
  "from-emerald-500 via-cyan-500 to-purple-600",
  "from-purple-600 via-pink-500 to-amber-500",
  "from-blue-600 via-indigo-500 to-emerald-400",
  "from-amber-500 via-orange-600 to-red-500",
  "from-teal-500 via-emerald-600 to-cyan-400",
];

export function ProjectCoverArt({
  coverUrl,
  defaultCoverIndex = 0,
  title,
  size = "md",
}: ProjectCoverArtProps) {
  const sizeClasses = {
    sm: "w-10 h-10 rounded-lg text-xs",
    md: "w-16 h-16 rounded-xl text-base",
    lg: "w-24 h-24 rounded-2xl text-2xl",
  }[size];

  if (coverUrl) {
    return (
      <img
        src={coverUrl}
        alt={title}
        className={`${sizeClasses} object-cover border border-zinc-800 shadow-md`}
      />
    );
  }

  const gradient =
    DEFAULT_GRADIENTS[defaultCoverIndex % DEFAULT_GRADIENTS.length] || DEFAULT_GRADIENTS[0];

  return (
    <div
      className={`${sizeClasses} bg-gradient-to-tr ${gradient} p-0.5 shadow-md flex items-center justify-center font-black text-zinc-950 uppercase`}
    >
      <div className="w-full h-full rounded-[inherit] bg-zinc-950/80 backdrop-blur-xs flex items-center justify-center font-bold text-white">
        {title ? title[0] : <Music className="w-4 h-4" />}
      </div>
    </div>
  );
}
