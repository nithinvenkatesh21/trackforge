"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { getIssuesByProject } from "@/lib/queries/issues";
import { createIssue, createIssueReply, updateIssueStatus } from "@/lib/actions/issues";
import { AlertCircle, Plus, MessageSquare, CheckCircle, Clock, X, Tag } from "lucide-react";
import { toast } from "sonner";

export default function IssuesTabPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [issuesList, setIssuesList] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [replyInputs, setReplyInputs] = useState<{ [issueId: string]: string }>({});

  const loadIssues = async () => {
    try {
      const data = await getIssuesByProject(projectId);
      setIssuesList(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadIssues();
  }, [projectId]);

  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    try {
      await createIssue({
        projectId,
        title: title.trim(),
        description: description.trim(),
        tags: tags ? tags.split(",").map((t) => t.trim()) : [],
      });
      toast.success("Issue ticket opened!");
      setShowCreateModal(false);
      setTitle("");
      setDescription("");
      setTags("");
      loadIssues();
    } catch (err: any) {
      toast.error(err.message || "Failed to create issue");
    }
  };

  const handleSendReply = async (issueId: string) => {
    const text = replyInputs[issueId]?.trim();
    if (!text) return;

    try {
      await createIssueReply({
        issueId,
        content: text,
      });
      setReplyInputs({ ...replyInputs, [issueId]: "" });
      toast.success("Reply added!");
      loadIssues();
    } catch (err: any) {
      toast.error(err.message || "Failed to add reply");
    }
  };

  const handleStatusChange = async (issueId: string, status: any) => {
    try {
      await updateIssueStatus(issueId, status);
      toast.success(`Status updated to ${status}`);
      loadIssues();
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  const filteredIssues = issuesList.filter((i) => {
    if (activeFilter === "all") return true;
    return i.status === activeFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2 bg-zinc-900 border border-zinc-800 p-1 rounded-xl text-xs font-semibold">
          {(["all", "open", "in_progress", "resolved", "closed"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3 py-1.5 rounded-lg capitalize transition cursor-pointer ${
                activeFilter === filter
                  ? "bg-emerald-500 text-zinc-950 font-bold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {filter.replace("_", " ")}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition flex items-center space-x-1.5 cursor-pointer shadow-md shadow-cyan-500/10 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Issue Ticket</span>
        </button>
      </div>

      {/* Issues List */}
      {filteredIssues.length === 0 ? (
        <div className="glass-panel p-12 rounded-xl text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-zinc-500 mx-auto" />
          <h3 className="text-base font-bold text-white">No issues found</h3>
          <p className="text-xs text-zinc-400">
            No feedback issues match the selected filter. Open a new issue ticket to report mix or vocal fixes!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredIssues.map((issue) => (
            <div key={issue.id} className="glass-panel p-5 rounded-xl border border-zinc-800 space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="font-bold text-base text-white">{issue.title}</h3>
                    <select
                      value={issue.status}
                      onChange={(e) => handleStatusChange(issue.id, e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 text-cyan-400 text-xs rounded px-2 py-0.5 font-semibold capitalize focus:outline-none cursor-pointer"
                    >
                      <option value="open">open</option>
                      <option value="in_progress">in progress</option>
                      <option value="resolved">resolved</option>
                      <option value="closed">closed</option>
                    </select>
                  </div>
                  <p className="text-xs text-zinc-300">{issue.description}</p>
                </div>
              </div>

              {issue.tags && issue.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {issue.tags.map((tag: string, idx: number) => (
                    <span key={idx} className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px] flex items-center space-x-1">
                      <Tag className="w-2.5 h-2.5" />
                      <span>{tag}</span>
                    </span>
                  ))}
                </div>
              )}

              {/* Threaded Replies */}
              <div className="pt-3 border-t border-zinc-800/80 space-y-3">
                <div className="text-xs font-semibold text-zinc-400 flex items-center space-x-1">
                  <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Discussion ({issue.replyCount})</span>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {issue.replies.map((reply: any) => (
                    <div key={reply.id} className="p-2.5 rounded bg-zinc-900/60 text-xs space-y-1">
                      <div className="flex items-center justify-between font-semibold text-zinc-300">
                        <span>{reply.authorName || "Collaborator"}</span>
                      </div>
                      <p className="text-zinc-300">{reply.content}</p>
                    </div>
                  ))}
                </div>

                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={replyInputs[issue.id] || ""}
                    onChange={(e) => setReplyInputs({ ...replyInputs, [issue.id]: e.target.value })}
                    placeholder="Write a reply..."
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    onClick={() => handleSendReply(issue.id)}
                    className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs cursor-pointer"
                  >
                    Reply
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Issue Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg rounded-2xl p-6 border border-zinc-800 space-y-4 relative">
            <button onClick={() => setShowCreateModal(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-white cursor-pointer">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-cyan-400" />
              <span>Open Feedback Ticket</span>
            </h3>

            <form onSubmit={handleCreateIssue} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Issue Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Vocal sibilance around 2:15"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Description *</label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the requested edit, EQ tweak, or stem update..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="mixing, vocals, eq"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-2 border-t border-zinc-800 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 rounded-lg bg-zinc-900 text-zinc-300 cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold transition cursor-pointer">
                  Open Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
