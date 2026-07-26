"use client";

import { useEffect, useState } from "react";
import { trackPresence } from "@/lib/realtime";
import { Users } from "lucide-react";

interface PresenceAvatarsProps {
  projectId: string;
  currentUser: {
    id: string;
    name: string | null;
    avatarUrl?: string | null;
  };
}

export function PresenceAvatars({ projectId, currentUser }: PresenceAvatarsProps) {
  const [presentUsers, setPresentUsers] = useState<any[]>([]);

  useEffect(() => {
    if (!projectId || !currentUser.id) return;

    const channelName = `project_presence:${projectId}`;
    const unsubscribe = trackPresence(
      channelName,
      {
        userId: currentUser.id,
        name: currentUser.name || "Collaborator",
        avatarUrl: currentUser.avatarUrl || undefined,
      },
      (presenceState) => {
        const usersList: any[] = [];
        Object.values(presenceState).forEach((presences: any) => {
          presences.forEach((p: any) => {
            usersList.push(p);
          });
        });
        setPresentUsers(usersList);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [projectId, currentUser]);

  return (
    <div className="flex items-center space-x-2 text-xs text-zinc-400 bg-zinc-900/60 border border-zinc-800 px-3 py-1.5 rounded-full">
      <Users className="w-3.5 h-3.5 text-emerald-400" />
      <span className="hidden sm:inline">Active Now:</span>
      <div className="flex -space-x-1.5">
        {presentUsers.slice(0, 4).map((u, i) => (
          <div
            key={i}
            className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center font-bold text-[9px] uppercase"
            title={u.name}
          >
            {u.name?.[0] || "U"}
          </div>
        ))}
      </div>
      {presentUsers.length > 4 && (
        <span className="text-[10px] text-zinc-500 font-mono">+{presentUsers.length - 4}</span>
      )}
    </div>
  );
}
