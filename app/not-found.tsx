import Link from "next/link";
import { Music, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
      <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
        <Music className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-extrabold tracking-tight">404 — Page Not Found</h1>
      <p className="text-sm text-zinc-400 max-w-sm">
        The project, audio version, or marketplace asset you're looking for does not exist or has been removed.
      </p>
      <Link
        href="/dashboard"
        className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition inline-flex items-center space-x-2"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Dashboard</span>
      </Link>
    </div>
  );
}
