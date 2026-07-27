import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getMyProjects, getCollaboratingProjects } from "@/lib/queries/projects";
import { Plus, Music, Users, FolderGit2, LogIn } from "lucide-react";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  // If user is not signed in, render sign-in prompt card instead of blank screen
  if (!user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="glass-panel p-10 rounded-2xl text-center space-y-6 max-w-md w-full border border-zinc-800 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
            <Music className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-white">Welcome to TrackForge</h2>
            <p className="text-sm text-zinc-400">
              Sign in to manage your audio projects, stem revisions, and collaborative sessions.
            </p>
          </div>
          <Link
            href="/auth/sign-in"
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm transition flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In to Continue</span>
          </Link>
        </div>
      </div>
    );
  }

  const myProjects = await getMyProjects(user.id);
  const collabProjects = await getCollaboratingProjects(user.id);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Welcome back, <span className="gradient-text">{user.name || "Creator"}</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Manage your audio projects, stem revisions, and collaborative sessions.
          </p>
        </div>

        <Link
          href="/projects/new"
          className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm transition flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </Link>
      </div>

      {/* My Projects Section */}
      <section className="space-y-4">
        <div className="flex items-center space-x-2">
          <FolderGit2 className="w-5 h-5 text-emerald-400" />
          <h2 className="text-xl font-bold text-white">My Projects ({myProjects.length})</h2>
        </div>

        {myProjects.length === 0 ? (
          <div className="glass-panel p-10 rounded-2xl text-center space-y-4 border border-zinc-800">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
              <Music className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">You haven't created any projects yet</h3>
              <p className="text-xs text-zinc-400">Start a new project to upload stem versions and collaborate.</p>
            </div>
            <Link
              href="/projects/new"
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-emerald-500 text-zinc-950 font-semibold text-xs hover:bg-emerald-400 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Project</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myProjects.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="glass-panel p-5 rounded-2xl border border-zinc-800 hover:border-emerald-500/50 hover:bg-zinc-900/80 transition group space-y-4 block"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-white group-hover:text-emerald-400 transition truncate max-w-[220px]">
                      {p.title}
                    </h3>
                    <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5">
                      {p.description || "No description"}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {p.status}
                  </span>
                </div>

                <div className="flex items-center space-x-2 text-xs text-zinc-400">
                  {p.genre && (
                    <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                      {p.genre}
                    </span>
                  )}
                  {p.bpm && (
                    <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                      {p.bpm} BPM
                    </span>
                  )}
                  {p.key && (
                    <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                      Key: {p.key}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-zinc-800 text-xs text-zinc-500">
                  <span>{p.versionCount} versions</span>
                  <span>{p.collaboratorCount} collaborators</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Collaborating Projects Section */}
      <section className="space-y-4 pt-4">
        <div className="flex items-center space-x-2">
          <Users className="w-5 h-5 text-cyan-400" />
          <h2 className="text-xl font-bold text-white">Collaborating On ({collabProjects.length})</h2>
        </div>

        {collabProjects.length === 0 ? (
          <div className="glass-panel p-8 rounded-2xl text-center space-y-2 border border-zinc-800 text-xs text-zinc-400">
            You're not collaborating on any projects yet. Check out the{" "}
            <Link href="/explore" className="text-cyan-400 underline">
              Explore
            </Link>{" "}
            page to find open projects looking for collaborators!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {collabProjects.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="glass-panel p-5 rounded-2xl border border-zinc-800 hover:border-cyan-500/50 hover:bg-zinc-900/80 transition group space-y-4 block"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-white group-hover:text-cyan-400 transition truncate max-w-[220px]">
                      {p.title}
                    </h3>
                    <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5">
                      By {p.creatorName || "Producer"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-zinc-800 text-xs text-zinc-500">
                  <span>{p.versionCount} versions</span>
                  <span>{p.collaboratorCount} collaborators</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
