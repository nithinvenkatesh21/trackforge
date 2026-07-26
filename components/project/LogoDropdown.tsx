"use client";

import { useState } from "react";
import Link from "next/link";
import { LayoutDashboard, Compass, ShoppingBag, Briefcase, GitPullRequest, ChevronDown } from "lucide-react";

export interface LogoDropdownProps {
  currentPath?: string;
}

export function LogoDropdown({ currentPath }: LogoDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2.5 group cursor-pointer"
        aria-label="Toggle Navigation Menu"
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 via-cyan-500 to-purple-600 flex items-center justify-center font-black text-zinc-950 text-sm shadow-md group-hover:scale-105 transition">
          TF
        </div>
        <span className="font-bold tracking-tight text-white text-base">TrackForge</span>
        <ChevronDown className="w-4 h-4 text-zinc-400 group-hover:text-white transition" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-56 glass-panel rounded-xl shadow-2xl p-2 space-y-1 z-50 border border-zinc-800 text-xs font-semibold">
          <Link
            href="/dashboard"
            onClick={() => setIsOpen(false)}
            className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-zinc-900 text-zinc-300 hover:text-white transition"
          >
            <LayoutDashboard className="w-4 h-4 text-emerald-400" />
            <span>Dashboard</span>
          </Link>
          <Link
            href="/explore"
            onClick={() => setIsOpen(false)}
            className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-zinc-900 text-zinc-300 hover:text-white transition"
          >
            <Compass className="w-4 h-4 text-cyan-400" />
            <span>Explore Projects</span>
          </Link>
          <Link
            href="/marketplace"
            onClick={() => setIsOpen(false)}
            className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-zinc-900 text-zinc-300 hover:text-white transition"
          >
            <ShoppingBag className="w-4 h-4 text-purple-400" />
            <span>Marketplace</span>
          </Link>
          <Link
            href="/service-requests"
            onClick={() => setIsOpen(false)}
            className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-zinc-900 text-zinc-300 hover:text-white transition"
          >
            <Briefcase className="w-4 h-4 text-amber-400" />
            <span>Gig Board</span>
          </Link>
          <Link
            href="/integrations"
            onClick={() => setIsOpen(false)}
            className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-zinc-900 text-zinc-300 hover:text-white transition"
          >
            <GitPullRequest className="w-4 h-4 text-emerald-400" />
            <span>GitHub Sync</span>
          </Link>
        </div>
      )}
    </div>
  );
}
