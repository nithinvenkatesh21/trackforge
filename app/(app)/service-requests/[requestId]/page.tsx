"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchServiceRequestById } from "@/lib/actions/client-queries";
import {
  applyToServiceRequest,
  acceptServiceApplication,
} from "@/lib/actions/service-requests";
import { releaseMilestone, completeMilestone } from "@/lib/actions/milestones";
import { Briefcase, ArrowLeft, CheckCircle, Clock, ShieldCheck, Send } from "lucide-react";
import { toast } from "sonner";

export default function ServiceRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = params.requestId as string;

  const [request, setRequest] = useState<any | null>(null);
  const [proposal, setProposal] = useState("");
  const [proposedPrice, setProposedPrice] = useState("100");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadRequest = async () => {
    try {
      const data = await fetchServiceRequestById(requestId);
      setRequest(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadRequest();
  }, [requestId]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposal.trim()) return;

    setIsSubmitting(true);
    try {
      await applyToServiceRequest({
        requestId,
        proposal: proposal.trim(),
        proposedPrice: parseInt(proposedPrice, 10) || 100,
      });

      toast.success("Proposal submitted!");
      setProposal("");
      loadRequest();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit proposal");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptApp = async (appId: string) => {
    try {
      await acceptServiceApplication(appId);
      toast.success("Application accepted & milestone created!");
      loadRequest();
    } catch (err: any) {
      toast.error(err.message || "Failed to accept application");
    }
  };

  const handleReleaseMilestone = async (mId: string) => {
    try {
      await releaseMilestone(mId);
      toast.success("Milestone credits released to freelancer!");
      loadRequest();
    } catch (err: any) {
      toast.error(err.message || "Failed to release milestone");
    }
  };

  const handleCompleteMilestone = async (mId: string) => {
    try {
      await completeMilestone(mId);
      toast.success("Gig marked as complete!");
      loadRequest();
    } catch (err: any) {
      toast.error(err.message || "Failed to mark complete");
    }
  };

  if (!request) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button
        onClick={() => router.back()}
        className="text-xs text-zinc-400 hover:text-white flex items-center space-x-1 transition cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Gig Board</span>
      </button>

      {/* Gig Header */}
      <div className="glass-panel p-8 rounded-2xl border border-zinc-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
              {request.type.replace("_", " ")}
            </span>
            <h1 className="text-3xl font-extrabold text-white tracking-tight mt-2">{request.title}</h1>
            <p className="text-xs text-zinc-400">Posted by {request.creator.name || "Producer"}</p>
          </div>

          <div className="text-right">
            <div className="text-2xl font-black text-emerald-400 font-mono">
              {request.budgetMin} - {request.budgetMax} CR
            </div>
            <span className="text-xs text-zinc-500 font-semibold uppercase">{request.status}</span>
          </div>
        </div>

        <p className="text-sm text-zinc-300 leading-relaxed border-t border-zinc-800/80 pt-4">
          {request.description}
        </p>
      </div>

      {/* Escrow Milestone Status */}
      {request.milestones && request.milestones.length > 0 && (
        <div className="glass-panel p-6 rounded-2xl border border-emerald-500/30 space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>Escrow Milestones</span>
          </h3>

          <div className="space-y-3">
            {request.milestones.map((m: any) => (
              <div key={m.id} className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-white">{m.amount} Credits Escrow</div>
                  <div className="text-xs text-zinc-400">Status: <span className="text-emerald-400 font-semibold uppercase">{m.status}</span></div>
                </div>

                <div className="flex items-center space-x-2">
                  {m.status === "pending" && (
                    <button
                      onClick={() => handleReleaseMilestone(m.id)}
                      className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs cursor-pointer"
                    >
                      Release Escrow Payout
                    </button>
                  )}

                  {m.status === "released" && (
                    <button
                      onClick={() => handleCompleteMilestone(m.id)}
                      className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs cursor-pointer"
                    >
                      Mark Gig Completed
                    </button>
                  )}

                  {m.status === "completed" && (
                    <span className="px-3 py-1 rounded bg-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center space-x-1">
                      <CheckCircle className="w-4 h-4" />
                      <span>Completed</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Proposals List & Apply Form */}
      <div className="glass-panel p-6 rounded-2xl border border-zinc-800 space-y-6">
        <h3 className="text-lg font-bold text-white">Proposals & Applications ({request.applications.length})</h3>

        {request.status === "open" && (
          <form onSubmit={handleApply} className="space-y-4 text-xs bg-zinc-900/60 p-4 rounded-xl border border-zinc-800">
            <h4 className="font-bold text-zinc-200">Submit Your Proposal</h4>
            <div>
              <textarea
                rows={3}
                required
                value={proposal}
                onChange={(e) => setProposal(e.target.value)}
                placeholder="Explain your audio engineering background, turn-around time, and DAW setup..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="flex items-center space-x-3">
              <input
                type="number"
                required
                value={proposedPrice}
                onChange={(e) => setProposedPrice(e.target.value)}
                placeholder="Price in Credits"
                className="w-40 bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white font-mono"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs cursor-pointer flex items-center space-x-1"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Proposal</span>
              </button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {request.applications.map((app: any) => (
            <div key={app.id} className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 flex items-start justify-between space-x-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-sm text-white">{app.applicantName || "Applicant"}</span>
                  <span className="text-emerald-400 font-mono font-bold text-xs">{app.proposedPrice} CR</span>
                </div>
                <p className="text-xs text-zinc-300">{app.proposal}</p>
              </div>

              {request.status === "open" && app.status === "pending" && (
                <button
                  onClick={() => handleAcceptApp(app.id)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs cursor-pointer"
                >
                  Accept Proposal
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
