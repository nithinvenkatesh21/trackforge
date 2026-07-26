"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled Application Error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
      <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center">
        <AlertCircle className="w-7 h-7" />
      </div>
      <h2 className="text-xl font-bold text-white">Something went wrong!</h2>
      <p className="text-xs text-zinc-400 max-w-md">{error.message || "An unexpected error occurred."}</p>
      <button
        onClick={() => reset()}
        className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-bold text-xs transition inline-flex items-center space-x-2 cursor-pointer"
      >
        <RefreshCw className="w-4 h-4 text-emerald-400" />
        <span>Try Again</span>
      </button>
    </div>
  );
}
