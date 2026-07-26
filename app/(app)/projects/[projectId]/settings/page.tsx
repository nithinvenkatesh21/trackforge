"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchProjectById } from "@/lib/actions/client-queries";
import { updateProject, deleteProject } from "@/lib/actions/projects";
import { Settings, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function SettingsTabPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    genre: "",
    bpm: "",
    key: "",
    status: "open" as any,
  });

  useEffect(() => {
    fetchProjectById(projectId).then((p) => {
      if (p) {
        setProject(p);
        setFormData({
          title: p.title || "",
          description: p.description || "",
          genre: p.genre || "",
          bpm: p.bpm ? String(p.bpm) : "",
          key: p.key || "",
          status: p.status || "open",
        });
      }
    });
  }, [projectId]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProject(projectId, {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        genre: formData.genre.trim() || undefined,
        bpm: formData.bpm ? parseInt(formData.bpm, 10) : undefined,
        key: formData.key.trim() || undefined,
        status: formData.status,
      });

      toast.success("Project settings updated!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update settings");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to permanently delete this project? This will cascade-delete all versions, files, and issues!")) {
      return;
    }

    try {
      await deleteProject(projectId);
      toast.success("Project deleted successfully");
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete project");
    }
  };

  if (!project) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="glass-panel p-6 rounded-2xl border border-zinc-800 space-y-6">
        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
          <Settings className="w-5 h-5 text-zinc-400" />
          <span>Project Configuration</span>
        </h2>

        <form onSubmit={handleUpdate} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-zinc-300 mb-1">
              Project Title
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-300 mb-1">
              Description / Creative Notes
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">Genre</label>
              <input
                type="text"
                value={formData.genre}
                onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">BPM</label>
              <input
                type="number"
                value={formData.bpm}
                onChange={(e) => setFormData({ ...formData, bpm: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">Key</label>
              <input
                type="text"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-zinc-300 mb-1">Project Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none"
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="final">Final / Completed</option>
            </select>
          </div>

          <div className="pt-3 border-t border-zinc-800 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold transition flex items-center space-x-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Settings</span>
            </button>
          </div>
        </form>
      </div>

      {/* Danger Zone */}
      <div className="glass-panel p-6 rounded-2xl border border-red-500/30 space-y-4">
        <h3 className="text-sm font-bold text-red-400 flex items-center space-x-2">
          <Trash2 className="w-4 h-4" />
          <span>Danger Zone</span>
        </h3>
        <p className="text-xs text-zinc-400">
          Deleting a project permanently deletes all versions, stem files, comments, issues, and chat history. This action cannot be undone.
        </p>
        <button
          onClick={handleDelete}
          className="px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 font-bold text-xs transition cursor-pointer"
        >
          Delete Project
        </button>
      </div>
    </div>
  );
}
