"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { getProjectCollaborators } from "@/lib/queries/collaborators";
import { searchUsers } from "@/lib/queries/users";
import { sendInvite, removeCollaborator } from "@/lib/actions/collaborators";
import { Users, UserPlus, Search, Shield, Trash2, X } from "lucide-react";
import { toast } from "sonner";

export default function CollaboratorsTabPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [selectedRole, setSelectedRole] = useState<"artist" | "producer" | "mixer" | "engineer">("artist");
  const [inviteMessage, setInviteMessage] = useState("");

  const loadCollaborators = async () => {
    try {
      const data = await getProjectCollaborators(projectId);
      setCollaborators(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadCollaborators();
  }, [projectId]);

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      searchUsers(searchQuery).then(setSearchResults);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) {
      toast.error("Please search and select a user to invite");
      return;
    }

    try {
      await sendInvite({
        projectId,
        toUserId: selectedUser.id,
        creatorRole: selectedRole,
        message: inviteMessage.trim() || undefined,
      });

      toast.success(`Invitation sent to ${selectedUser.name || selectedUser.email}!`);
      setShowInviteModal(false);
      setSelectedUser(null);
      setSearchQuery("");
      setInviteMessage("");
    } catch (err: any) {
      toast.error(err.message || "Failed to send invite");
    }
  };

  const handleRemove = async (userId: string) => {
    try {
      await removeCollaborator(projectId, userId);
      toast.success("Collaborator removed");
      loadCollaborators();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove collaborator");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
          <Users className="w-5 h-5 text-purple-400" />
          <span>Project Team ({collaborators.length})</span>
        </h2>

        <button
          onClick={() => setShowInviteModal(true)}
          className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-zinc-950 font-bold text-xs transition flex items-center space-x-1.5 cursor-pointer shadow-md shadow-purple-500/10"
        >
          <UserPlus className="w-4 h-4" />
          <span>Invite Collaborator</span>
        </button>
      </div>

      {/* Collaborator Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {collaborators.map((c) => (
          <div
            key={c.id}
            className="glass-panel p-4 rounded-xl border border-zinc-800 flex items-center justify-between space-x-3"
          >
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center font-bold text-sm uppercase">
                {c.user.name?.[0] || "U"}
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-sm text-white truncate">
                  {c.user.name || "Collaborator"}
                </h4>
                <div className="flex items-center space-x-2 text-[11px] text-zinc-400">
                  <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 font-semibold uppercase text-[10px]">
                    {c.role || "member"}
                  </span>
                </div>
              </div>
            </div>

            {c.role !== "owner" && (
              <button
                onClick={() => handleRemove(c.userId)}
                className="p-1.5 text-zinc-500 hover:text-red-400 transition cursor-pointer"
                title="Remove collaborator"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 border border-zinc-800 space-y-4 relative">
            <button
              onClick={() => setShowInviteModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <UserPlus className="w-5 h-5 text-purple-400" />
              <span>Invite Collaborator</span>
            </h3>

            <form onSubmit={handleSendInvite} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-zinc-300 mb-1">
                  Search User by Name or Email
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Type name or email..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Search Results Dropdown */}
                {searchResults.length > 0 && (
                  <div className="mt-2 bg-zinc-900 border border-zinc-800 rounded-lg p-2 max-h-36 overflow-y-auto space-y-1">
                    {searchResults.map((u) => (
                      <div
                        key={u.id}
                        onClick={() => {
                          setSelectedUser(u);
                          setSearchQuery(u.name || u.email);
                          setSearchResults([]);
                        }}
                        className="p-2 hover:bg-zinc-800 rounded cursor-pointer flex items-center justify-between text-xs"
                      >
                        <span className="font-semibold text-white">{u.name || "User"}</span>
                        <span className="text-zinc-500 text-[10px]">{u.email}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 mb-1">
                  Assign Project Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="artist">Artist</option>
                  <option value="producer">Producer</option>
                  <option value="mixer">Mixer</option>
                  <option value="engineer">Engineer</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 mb-1">
                  Personal Invitation Message (optional)
                </label>
                <textarea
                  rows={2}
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  placeholder="Hey! Join the project session..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="pt-2 border-t border-zinc-800 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 rounded-lg bg-zinc-900 text-zinc-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedUser}
                  className="px-5 py-2 rounded-lg bg-purple-500 hover:bg-purple-400 text-zinc-950 font-bold transition disabled:opacity-50 cursor-pointer"
                >
                  Send Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
