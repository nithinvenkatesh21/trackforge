"use client";

import { useState } from "react";
import { Share2, Check, Copy } from "lucide-react";
import { toast } from "sonner";

interface ShareLinkButtonProps {
  versionId: string;
  versionNumber: number;
}

export function ShareLinkButton({ versionId, versionNumber }: ShareLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const shareUrl = `${origin}/share/v/${versionId}`;

    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success(`Share link for v${versionNumber} copied to clipboard!`);

    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <button
      onClick={handleCopy}
      className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs transition flex items-center space-x-1.5 cursor-pointer"
      title="Copy share link for Discord/Slack/iMessage"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
      <span>Share v{versionNumber}</span>
    </button>
  );
}
