"use client";

import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.js";
import { Play, Pause, MessageSquare, Volume2, VolumeX, Sparkles, Send } from "lucide-react";
import { createComment } from "@/lib/actions/comments";
import { recordPlayback } from "@/lib/actions/analytics";
import { toast } from "sonner";

interface CommentItem {
  id: string;
  authorName: string | null;
  authorImage: string | null;
  content: string;
  timestampSeconds: number | null;
  createdAt: Date;
}

interface AudioPlayerWithCommentsProps {
  versionId: string;
  projectId: string;
  audioUrl: string | null;
  initialPeaks?: number[];
  comments: CommentItem[];
  versionNumber: number;
}

export function AudioPlayerWithComments({
  versionId,
  projectId,
  audioUrl,
  initialPeaks,
  comments,
  versionNumber,
}: AudioPlayerWithCommentsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<RegionsPlugin | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [commentContent, setCommentContent] = useState("");
  const [useTimestamp, setUseTimestamp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !audioUrl) return;

    const regions = RegionsPlugin.create();
    regionsRef.current = regions;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "#374151",
      progressColor: "#10b981",
      cursorColor: "#06b6d4",
      height: 80,
      barWidth: 2,
      barGap: 2,
      barRadius: 2,
      url: audioUrl,
      peaks: initialPeaks && initialPeaks.length > 0 ? [initialPeaks] : undefined,
      plugins: [regions],
    });

    wavesurferRef.current = ws;

    ws.on("ready", () => {
      setDuration(ws.getDuration());
    });

    ws.on("timeupdate", (time) => {
      setCurrentTime(time);
    });

    ws.on("play", () => {
      setIsPlaying(true);
      recordPlayback({ versionId, timestampSeconds: ws.getCurrentTime() });
    });

    ws.on("pause", () => {
      setIsPlaying(false);
    });

    ws.on("finish", () => {
      setIsPlaying(false);
      recordPlayback({ versionId, durationSeconds: ws.getDuration(), completed: true });
    });

    // Render region markers for timestamped comments
    comments.forEach((c) => {
      if (c.timestampSeconds !== null && c.timestampSeconds !== undefined) {
        regions.addRegion({
          start: c.timestampSeconds,
          end: Math.min(c.timestampSeconds + 2, ws.getDuration() || 180),
          color: "rgba(6, 182, 212, 0.4)",
          drag: false,
          resize: false,
        });
      }
    });

    regions.on("region-clicked", (region) => {
      ws.setTime(region.start);
      ws.play();
    });

    return () => {
      ws.destroy();
    };
  }, [audioUrl, versionId]);

  const togglePlay = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause();
    }
  };

  const toggleMute = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.setMuted(!isMuted);
      setIsMuted(!isMuted);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim()) return;

    setIsSubmitting(true);
    try {
      await createComment({
        versionId,
        projectId,
        content: commentContent.trim(),
        timestampSeconds: useTimestamp ? currentTime : null,
      });

      setCommentContent("");
      toast.success("Comment posted!");
    } catch (err: any) {
      toast.error(err.message || "Failed to post comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-panel rounded-xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
            v{versionNumber}
          </div>
          <div>
            <h3 className="font-semibold text-white">Interactive Waveform Player</h3>
            <p className="text-xs text-zinc-400">Seek, inspect peaks, and comment at exact timestamps</p>
          </div>
        </div>
        <div className="text-right font-mono text-sm text-zinc-400">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>

      {/* Waveform container */}
      <div className="relative py-2 px-1 bg-zinc-900/60 rounded-lg border border-zinc-800">
        {!audioUrl ? (
          <div className="h-20 flex items-center justify-center text-zinc-500 text-sm">
            No audio file attached to this version
          </div>
        ) : (
          <div ref={containerRef} className="w-full cursor-pointer" />
        )}
      </div>

      {/* Transport Controls */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center space-x-3">
          <button
            onClick={togglePlay}
            disabled={!audioUrl}
            className="w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 flex items-center justify-center font-bold transition shadow-lg shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
            aria-label={isPlaying ? "Pause audio" : "Play audio"}
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>
          <button
            onClick={toggleMute}
            disabled={!audioUrl}
            className="p-2.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 transition cursor-pointer"
            aria-label={isMuted ? "Unmute audio" : "Mute audio"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>

        <button
          onClick={() => setUseTimestamp(!useTimestamp)}
          className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition flex items-center space-x-1.5 cursor-pointer ${
            useTimestamp
              ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
              : "bg-zinc-800/60 border-zinc-700 text-zinc-400 hover:text-white"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Tag at {formatTime(currentTime)}</span>
        </button>
      </div>

      {/* Comment Input */}
      <form onSubmit={handlePostComment} className="flex space-x-2 pt-2">
        <input
          type="text"
          value={commentContent}
          onChange={(e) => setCommentContent(e.target.value)}
          placeholder={
            useTimestamp
              ? `Add feedback anchored at ${formatTime(currentTime)}...`
              : "Leave a general version comment..."
          }
          className="flex-1 bg-zinc-900 border border-zinc-700/80 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition"
        />
        <button
          type="submit"
          disabled={isSubmitting || !commentContent.trim()}
          className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold rounded-lg text-sm transition flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
        >
          <Send className="w-4 h-4" />
          <span>Post</span>
        </button>
      </form>

      {/* Timestamped & General Comments */}
      <div className="space-y-3 pt-4 border-t border-zinc-800">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center space-x-2">
          <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
          <span>Version Feedback ({comments.length})</span>
        </h4>

        {comments.length === 0 ? (
          <p className="text-xs text-zinc-500 py-2">No comments on this version yet. Be the first to leave feedback!</p>
        ) : (
          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
            {comments.map((c) => (
              <div
                key={c.id}
                className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/80 flex items-start space-x-3 text-xs"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold uppercase text-[10px]">
                  {c.authorName?.[0] || "U"}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-200">{c.authorName || "User"}</span>
                    {c.timestampSeconds !== null && c.timestampSeconds !== undefined && (
                      <button
                        onClick={() => {
                          if (wavesurferRef.current) {
                            wavesurferRef.current.setTime(c.timestampSeconds!);
                            wavesurferRef.current.play();
                          }
                        }}
                        className="px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded text-[10px] font-mono hover:bg-cyan-500/20 transition cursor-pointer"
                      >
                        @{formatTime(c.timestampSeconds)}
                      </button>
                    )}
                  </div>
                  <p className="text-zinc-300 mt-1">{c.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
