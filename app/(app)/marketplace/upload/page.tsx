"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createMarketplaceAsset } from "@/lib/actions/marketplace";
import { Upload, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function MarketplaceUploadPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assetFile, setAssetFile] = useState<File | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "loop" as any,
    genre: "",
    bpm: "",
    key: "",
    price: "50",
    licenseType: "Royalty Free (Commercial)",
    tags: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetFile || !formData.title.trim()) {
      toast.error("Please provide asset title and file");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Upload asset file to R2
      const presignRes = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: assetFile.name,
          fileType: assetFile.type || "application/zip",
          fileSize: assetFile.size,
          category: "marketplace",
        }),
      });

      const { uploadUrl, key: fileKey } = await presignRes.json();

      await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": assetFile.type || "application/zip" },
        body: assetFile,
      });

      // 2. Upload preview file if attached
      let previewKey: string | undefined;
      if (previewFile) {
        const prevPresign = await fetch("/api/uploads/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: previewFile.name,
            fileType: previewFile.type || "audio/mpeg",
            fileSize: previewFile.size,
            category: "audio",
          }),
        });
        const { uploadUrl: prevUrl, key: pKey } = await prevPresign.json();
        await fetch(prevUrl, {
          method: "PUT",
          headers: { "Content-Type": previewFile.type || "audio/mpeg" },
          body: previewFile,
        });
        previewKey = pKey;
      }

      // 3. Create Marketplace asset
      const asset = await createMarketplaceAsset({
        title: formData.title.trim(),
        description: formData.description.trim(),
        type: formData.type,
        genre: formData.genre.trim() || undefined,
        bpm: formData.bpm ? parseInt(formData.bpm, 10) : undefined,
        key: formData.key.trim() || undefined,
        price: parseInt(formData.price, 10) || 0,
        licenseType: formData.licenseType,
        fileKey,
        previewKey: previewKey || undefined,
        tags: formData.tags ? formData.tags.split(",").map((t) => t.trim()) : [],
      });

      toast.success("Asset listed on Marketplace!");
      router.push(`/marketplace/${asset.id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to list asset");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button
        onClick={() => router.back()}
        className="text-xs text-zinc-400 hover:text-white flex items-center space-x-1 transition cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Marketplace</span>
      </button>

      <div className="glass-panel p-8 rounded-2xl border border-zinc-800 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">List Audio Asset on Marketplace</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Set your price in credits, upload your loop, preset pack, or acapella, and earn credits from purchases.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-zinc-300 mb-1">Asset Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Analog Synth Presets Vol. 1"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-300 mb-1">Description *</label>
            <textarea
              rows={3}
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed description of what's included in the download pack..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">Asset Type *</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-purple-500"
              >
                <option value="loop">Loop</option>
                <option value="acapella">Acapella</option>
                <option value="drumkit">Drumkit</option>
                <option value="preset">Preset Pack</option>
                <option value="midi_pack">MIDI Pack</option>
                <option value="sound_fx">Sound FX</option>
                <option value="bundle">Bundle</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-zinc-300 mb-1">Price (Credits) *</label>
              <input
                type="number"
                min="0"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-purple-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">Genre</label>
              <input
                type="text"
                value={formData.genre}
                onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                placeholder="R&B"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">BPM</label>
              <input
                type="number"
                value={formData.bpm}
                onChange={(e) => setFormData({ ...formData, bpm: e.target.value })}
                placeholder="120"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">Key</label>
              <input
                type="text"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                placeholder="F# Minor"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-zinc-300 mb-1">Asset Package File (ZIP/Audio) *</label>
            <input
              type="file"
              required
              onChange={(e) => setAssetFile(e.target.files?.[0] || null)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-300 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-purple-500/20 file:text-purple-300"
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-300 mb-1">Audio Preview File (MP3/WAV, optional)</label>
            <input
              type="file"
              accept="audio/*"
              onChange={(e) => setPreviewFile(e.target.files?.[0] || null)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-300 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-purple-500/20 file:text-purple-300"
            />
          </div>

          <div className="pt-3 border-t border-zinc-800 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 rounded-lg bg-zinc-900 text-zinc-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !assetFile || !formData.title.trim()}
              className="px-6 py-2 rounded-lg bg-purple-500 hover:bg-purple-400 text-zinc-950 font-bold transition flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading to R2...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Publish Asset</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
