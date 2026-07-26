"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { listPublicProjects } from "@/lib/queries/projects";
import { Compass, Music, Users, Search, FolderGit2 } from "lucide-react";

export default function ExplorePage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [genreFilter, setGenreFilter] = useState("");
  const [neededRoleFilter, setNeededRoleFilter] = useState("");

  const loadProjects = async () => {
    try {
      const data = await listPublicProjects(
        genreFilter || undefined,
        neededRoleFilter || undefined
      );
      setProjects(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [genreFilter, neededRoleFilter]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-zinc-800 pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center space-x-2">
          <Compass className="w-8 h-8 text-cyan-400" />
          <span>Explore Public Music Projects</span>
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Discover open collaborative tracks looking for vocalists, producers, mixers, and engineers.
        </p>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3 text-xs w-full sm:w-auto">
          <span className="text-zinc-400 font-semibold">Filter by Role Needed:</span>
          <select
            value={neededRoleFilter}
            onChange={(e) => setNeededRoleFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Roles</option>
            <option value="artist">Artist / Vocalist</option>
            <option value="producer">Producer</option>
            <option value="mixer">Mixer</option>
            <option value="engineer">Engineer</option>
          </select>
        </div>

        <div className="flex items-center space-x-2 text-xs overflow-x-auto w-full sm:w-auto">
          {["", "Hip Hop", "Trap", "R&B", "Pop", "Electronic", "Rock"].map((g) => (
            <button
              key={g}
              onClick={() => setGenreFilter(g)}
              className={`px-3 py-1.5 rounded-lg font-semibold uppercase text-[11px] transition cursor-pointer ${
                genreFilter === g
                  ? "bg-cyan-500 text-zinc-950 font-bold"
                  : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              {g || "All Genres"}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/projects/${p.id}`}
            className="glass-panel p-5 rounded-2xl border border-zinc-800 hover:border-cyan-500/50 hover:bg-zinc-900/80 transition group space-y-4 block"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-lg text-white group-hover:text-cyan-400 transition truncate max-w-[200px]">
                  {p.title}
                </h3>
                <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5">
                  By {p.creatorName || "Producer"}
                </p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                {p.status}
              </span>
            </div>

            <p className="text-xs text-zinc-400 line-clamp-2">{p.description || "No description provided."}</p>

            {p.neededRoles && p.neededRoles.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {p.neededRoles.map((role: string) => (
                  <span
                    key={role}
                    className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10px] uppercase font-semibold"
                  >
                    + {role}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-zinc-800 text-xs text-zinc-500">
              <span>{p.versionCount} versions</span>
              <span>{p.genre || "Music"}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
