"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getOpenServiceRequests } from "@/lib/queries/service-requests";
import { createServiceRequest } from "@/lib/actions/service-requests";
import { Briefcase, Plus, Clock, Coins, X } from "lucide-react";
import { toast } from "sonner";

export default function ServiceRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [showPostModal, setShowPostModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"mix" | "master" | "vocal_feature" | "instrumental_addon">("mix");
  const [budgetMin, setBudgetMin] = useState("50");
  const [budgetMax, setBudgetMax] = useState("200");

  const loadRequests = async () => {
    try {
      const data = await getOpenServiceRequests();
      setRequests(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handlePostRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    try {
      await createServiceRequest({
        title: title.trim(),
        description: description.trim(),
        type,
        budgetMin: parseInt(budgetMin, 10) || 0,
        budgetMax: parseInt(budgetMax, 10) || 0,
      });

      toast.success("Service request posted!");
      setShowPostModal(false);
      setTitle("");
      setDescription("");
      loadRequests();
    } catch (err: any) {
      toast.error(err.message || "Failed to post request");
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center space-x-2">
            <Briefcase className="w-8 h-8 text-amber-400" />
            <span>Service Requests & Gig Board</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Hire mixing engineers, mastering pros, vocalists, and instrumentalists with milestone credit escrow.
          </p>
        </div>

        <button
          onClick={() => setShowPostModal(true)}
          className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-sm transition flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Post a Gig Request</span>
        </button>
      </div>

      {/* Requests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {requests.map((req) => (
          <Link
            key={req.id}
            href={`/service-requests/${req.id}`}
            className="glass-panel p-5 rounded-2xl border border-zinc-800 hover:border-amber-500/50 hover:bg-zinc-900/80 transition group space-y-4 block"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  {req.type.replace("_", " ")}
                </span>
                <h3 className="font-bold text-lg text-white group-hover:text-amber-400 transition mt-2 truncate max-w-[220px]">
                  {req.title}
                </h3>
              </div>
              <span className="text-base font-extrabold text-emerald-400 font-mono">
                {req.budgetMin}-{req.budgetMax} CR
              </span>
            </div>

            <p className="text-xs text-zinc-400 line-clamp-2">{req.description}</p>

            <div className="flex items-center justify-between pt-3 border-t border-zinc-800 text-xs text-zinc-500">
              <span>By {req.creatorName || "Producer"}</span>
              <span>{req.applicationCount} proposals</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Post Modal */}
      {showPostModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg rounded-2xl p-6 border border-zinc-800 space-y-4 relative">
            <button
              onClick={() => setShowPostModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <Briefcase className="w-5 h-5 text-amber-400" />
              <span>Post New Service Gig</span>
            </h3>

            <form onSubmit={handlePostRequest} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Gig Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Need Vocal Mixing & Tuning for Trap Song"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Gig Category *</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="mix">Mixing</option>
                  <option value="master">Mastering</option>
                  <option value="vocal_feature">Vocal Feature</option>
                  <option value="instrumental_addon">Instrumental Add-on</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Job Description & Stems Overview *</label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your song, references, deliverables required..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">Min Budget (CR)</label>
                  <input
                    type="number"
                    value={budgetMin}
                    onChange={(e) => setBudgetMin(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">Max Budget (CR)</label>
                  <input
                    type="number"
                    value={budgetMax}
                    onChange={(e) => setBudgetMax(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-800 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowPostModal(false)}
                  className="px-4 py-2 rounded-lg bg-zinc-900 text-zinc-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold transition cursor-pointer"
                >
                  Post Gig
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
