import Link from "next/link";
import { notFound } from "next/navigation";
import { getVersionById } from "@/lib/queries/versions";
import { AudioPlayerWithComments } from "@/components/project/AudioPlayerWithComments";
import { Music, Share2, Sparkles } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ versionId: string }>;
}) {
  const { versionId } = await params;
  const version = await getVersionById(versionId);

  if (!version) {
    return { title: "Version Not Found — TrackForge" };
  }

  return {
    title: `${version.fileName} (v${version.versionNumber}) — TrackForge Audio Release`,
    description: version.notes || `Audio revision on ${version.projectTitle}`,
    openGraph: {
      title: `${version.fileName} (v${version.versionNumber})`,
      description: version.notes || `Listen to version v${version.versionNumber} on TrackForge`,
    },
  };
}

export default async function PublicVersionSharePage({
  params,
}: {
  params: Promise<{ versionId: string }>;
}) {
  const { versionId } = await params;
  const version = await getVersionById(versionId);

  if (!version) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col justify-between selection:bg-emerald-500 selection:text-zinc-950">
      {/* Read-only Share Header */}
      <header className="border-b border-zinc-800/80 glass-panel px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 via-cyan-500 to-purple-600 flex items-center justify-center font-black text-zinc-950 text-sm">
            TF
          </div>
          <span className="font-bold tracking-tight text-white text-base">TrackForge Share</span>
        </Link>

        <Link
          href="/auth/sign-in"
          className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition cursor-pointer"
        >
          Sign In to TrackForge
        </Link>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl w-full mx-auto p-6 space-y-6 flex-1 my-auto">
        <div className="glass-panel p-8 rounded-2xl border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-xl font-bold font-mono text-emerald-400">
                v{version.versionNumber}
              </span>
              <h1 className="text-2xl font-extrabold text-white">{version.fileName}</h1>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              {version.projectTitle}
            </span>
          </div>

          {version.notes && <p className="text-xs text-zinc-400">{version.notes}</p>}
        </div>

        {/* Read-Only Waveform Player */}
        <AudioPlayerWithComments
          versionId={version.id}
          projectId={version.projectId}
          audioUrl={version.audioUrl}
          initialPeaks={version.waveform?.peaks as number[] | undefined}
          comments={[]}
          versionNumber={version.versionNumber}
        />
      </main>

      {/* Footer link */}
      <footer className="border-t border-zinc-900 py-6 text-center text-xs text-zinc-500">
        Created & Shared via{" "}
        <Link href="/" className="text-emerald-400 hover:underline">
          TrackForge Audio Version Control
        </Link>
      </footer>
    </div>
  );
}
