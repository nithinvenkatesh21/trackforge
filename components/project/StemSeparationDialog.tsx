"use client";

import { useState } from "react";
import { Sparkles, X, Loader2, Info } from "lucide-react";
import { separateAudioStems } from "@/lib/actions/stems";
import { validateNamingPattern } from "@/lib/utils/stem-naming";
import { toast } from "sonner";

interface StemSeparationDialogProps {
  versionId: string;
  fileName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function StemSeparationDialog({
  versionId,
  fileName,
  isOpen,
  onClose,
}: StemSeparationDialogProps) {
  const [namingPattern, setNamingPattern] = useState("{trackname}_v{version}_{stemtype}.mp3");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (namingPattern) {
      const check = validateNamingPattern(namingPattern);
      if (!check.valid) {
        toast.error(check.error || "Invalid stem naming pattern");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await separateAudioStems(versionId, namingPattern.trim() || undefined);
      toast.success("AI Demucs stem separation job enqueued! 4 stems will appear in version files.");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to enqueue stem separation");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-md rounded-2xl p-6 border border-zinc-800 space-y-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold text-white flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-emerald-400" />
          <span>AI Stem Separation (Demucs)</span>
        </h3>

        <p className="text-xs text-zinc-400">
          Separate <span className="text-white font-semibold">{fileName}</span> into 4 distinct audio stem tracks: Vocals, Drums, Bass, and Other.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-zinc-300 mb-1">
              Stem File Naming Pattern
            </label>
            <input
              type="text"
              value={namingPattern}
              onChange={(e) => setNamingPattern(e.target.value)}
              placeholder="{trackname}_v{version}_{stemtype}.mp3"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-emerald-500"
            />
            <div className="flex items-start space-x-1.5 text-[10px] text-zinc-500 mt-1.5">
              <Info className="w-3 h-3 text-cyan-400 flex-shrink-0 mt-0.5" />
              <span>Required token: &#123;stemtype&#125;. Optional: &#123;trackname&#125;, &#123;version&#125;.</span>
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-800 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-zinc-900 text-zinc-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-zinc-950 font-bold transition flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer shadow-md shadow-emerald-500/10"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enqueueing Job...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Start Separation</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
