import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getProjectById } from "@/lib/queries/projects";
import { getProjectCollaborators } from "@/lib/queries/collaborators";
import { PresenceAvatars } from "@/components/project/PresenceAvatars";
import { GitBranch, AlertCircle, Users, Settings, Activity, Music } from "lucide-react";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await getCurrentUser();
  const project = await getProjectById(projectId);

  if (!project) {
    notFound();
  }

  const collaborators = await getProjectCollaborators(projectId);

  return (
    <div className="space-y-6">
      {/* Sticky Hero Header */}
      <div className="glass-panel p-6 rounded-2xl border border-zinc-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-extrabold text-white tracking-tight">
                {project.title}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                {project.status}
              </span>
            </div>
            {project.description && (
              <p className="text-xs text-zinc-400">{project.description}</p>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {user && (
              <PresenceAvatars
                projectId={projectId}
                currentUser={{
                  id: user.id,
                  name: user.name,
                  avatarUrl: user.imageUrl,
                }}
              />
            )}
          </div>
        </div>

        {/* Metadata Chips & Needed Roles */}
        <div className="flex flex-wrap items-center gap-2 text-xs pt-2 border-t border-zinc-800/60">
          {project.genre && (
            <span className="px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300">
              🎵 {project.genre}
            </span>
          )}
          {project.bpm && (
            <span className="px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono">
              ⏱ {project.bpm} BPM
            </span>
          )}
          {project.key && (
            <span className="px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono">
              🎹 {project.key}
            </span>
          )}

          {project.neededRoles && project.neededRoles.length > 0 && (
            <div className="flex items-center space-x-1.5 ml-auto">
              <span className="text-[11px] text-zinc-500">Looking for:</span>
              {project.neededRoles.map((r) => (
                <span
                  key={r}
                  className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[10px] uppercase font-semibold"
                >
                  {r}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center space-x-2 border-b border-zinc-800 pb-2 text-xs font-semibold overflow-x-auto">
        <Link
          href={`/projects/${projectId}`}
          className="px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white flex items-center space-x-2 transition hover:border-emerald-500/50"
        >
          <GitBranch className="w-4 h-4 text-emerald-400" />
          <span>Versions Tree</span>
        </Link>
        <Link
          href={`/projects/${projectId}/issues`}
          className="px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white flex items-center space-x-2 transition hover:border-cyan-500/50"
        >
          <AlertCircle className="w-4 h-4 text-cyan-400" />
          <span>Issues</span>
        </Link>
        <Link
          href={`/projects/${projectId}/collaborators`}
          className="px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white flex items-center space-x-2 transition hover:border-purple-500/50"
        >
          <Users className="w-4 h-4 text-purple-400" />
          <span>Collaborators ({collaborators.length})</span>
        </Link>
        <Link
          href={`/projects/${projectId}/activity`}
          className="px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white flex items-center space-x-2 transition hover:border-amber-500/50"
        >
          <Activity className="w-4 h-4 text-amber-400" />
          <span>Activity</span>
        </Link>
        <Link
          href={`/projects/${projectId}/settings`}
          className="px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white flex items-center space-x-2 transition hover:border-zinc-700"
        >
          <Settings className="w-4 h-4 text-zinc-400" />
          <span>Settings</span>
        </Link>
      </div>

      <div>{children}</div>
    </div>
  );
}
