import Link from "next/link";
import dynamic from "next/dynamic";
import { GitBranch, Sparkles, AudioWaveform, ShieldCheck, ShoppingBag, ArrowRight } from "lucide-react";

const ThreeLandingHero = dynamic(
  () => import("@/components/project/ThreeLandingHero").then((mod) => mod.ThreeLandingHero),
  { ssr: false }
);

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col justify-between selection:bg-emerald-500 selection:text-zinc-950">
      {/* Navbar */}
      <header className="border-b border-zinc-800/80 glass-panel sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 via-cyan-500 to-purple-600 flex items-center justify-center font-black text-zinc-950 text-lg shadow-lg shadow-emerald-500/20">
            TF
          </div>
          <span className="font-bold tracking-tight text-lg text-white">TrackForge</span>
        </div>

        <div className="flex items-center space-x-4">
          <Link
            href="/auth/sign-in"
            className="text-sm text-zinc-300 hover:text-white transition font-medium"
          >
            Sign In
          </Link>
          <Link
            href="/auth/sign-up"
            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm transition shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl mx-auto px-6 py-16 text-center space-y-12">
        <div className="space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Git for Music Production & Audio Version Control</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight">
            Collaborate, version, and monetize your audio projects with <span className="gradient-text">deterministic control.</span>
          </h1>

          <p className="text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Stop losing track of mix revisions across Drive links and voice notes. TrackForge provides timestamped audio feedback, AI stem separation, an asset marketplace, and escrowed gig payouts.
          </p>
        </div>

        {/* Hero CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-500 via-cyan-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-bold text-base transition shadow-xl shadow-emerald-500/20 flex items-center justify-center space-x-2 cursor-pointer"
          >
            <span>Open Dashboard</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/explore"
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-semibold text-base transition flex items-center justify-center cursor-pointer"
          >
            Explore Public Projects
          </Link>
        </div>

        {/* Dynamic Canvas Hero Spectrum Scene */}
        <div className="pt-6">
          <ThreeLandingHero />
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10 text-left">
          <div className="glass-panel p-6 rounded-2xl border border-zinc-800 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <GitBranch className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white">Audio Version Tree</h3>
            <p className="text-sm text-zinc-400">
              Fork revisions, pin official release commits, and visually navigate your project tree without duplicating raw files.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-zinc-800 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
              <AudioWaveform className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white">Waveform Feedback</h3>
            <p className="text-sm text-zinc-400">
              Seek dynamically on pre-computed peak data and anchor comments to exact seconds directly on the waveform.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-zinc-800 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white">Marketplace & Escrow</h3>
            <p className="text-sm text-zinc-400">
              Sell presets, acapellas, and drum kits in credits. Post mixing/mastering requests with milestone releases.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-8 px-6 text-center text-xs text-zinc-500">
        <p>© 2026 TrackForge — Built with Next.js 15, Drizzle ORM, Supabase & Cloudflare R2.</p>
      </footer>
    </div>
  );
}
