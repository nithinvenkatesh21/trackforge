"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getMarketplaceAssetById } from "@/lib/queries/marketplace";
import { purchaseAsset, createAssetReview } from "@/lib/actions/marketplace";
import { ShoppingBag, Star, Download, Play, Pause, ArrowLeft, Check, Lock } from "lucide-react";
import { toast } from "sonner";

export default function AssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const assetId = params.assetId as string;

  const [asset, setAsset] = useState<any | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioObj, setAudioObj] = useState<HTMLAudioElement | null>(null);
  const [stars, setStars] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [isPurchasing, setIsPurchasing] = useState(false);

  useEffect(() => {
    getMarketplaceAssetById(assetId).then((data) => {
      setAsset(data);
      if (data?.previewUrl) {
        setAudioObj(new Audio(data.previewUrl));
      }
    });
  }, [assetId]);

  const togglePreview = () => {
    if (!audioObj) return;

    if (isPlaying) {
      audioObj.pause();
      setIsPlaying(false);
    } else {
      audioObj.play();
      setIsPlaying(true);
    }
  };

  const handlePurchase = async () => {
    setIsPurchasing(true);
    try {
      await purchaseAsset(assetId);
      toast.success("Asset purchased successfully!");
      const updated = await getMarketplaceAssetById(assetId);
      setAsset(updated);
    } catch (err: any) {
      toast.error(err.message || "Failed to purchase asset");
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAssetReview({
        assetId,
        stars,
        comment: reviewComment.trim() || undefined,
      });
      toast.success("Review posted!");
      setReviewComment("");
      const updated = await getMarketplaceAssetById(assetId);
      setAsset(updated);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit review");
    }
  };

  if (!asset) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button
        onClick={() => router.back()}
        className="text-xs text-zinc-400 hover:text-white flex items-center space-x-1 transition cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Marketplace</span>
      </button>

      {/* Asset Hero Panel */}
      <div className="glass-panel p-8 rounded-2xl border border-zinc-800 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/40">
                {asset.type}
              </span>
              {asset.genre && (
                <span className="px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-300">
                  {asset.genre}
                </span>
              )}
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">{asset.title}</h1>
            <p className="text-xs text-zinc-400">Listed by {asset.creator.name || "Creator"}</p>
          </div>

          <div className="space-y-3 text-right">
            <div className="text-3xl font-black text-emerald-400 font-mono">{asset.price} CR</div>
            <button
              onClick={handlePurchase}
              disabled={isPurchasing}
              className="w-full md:w-auto px-8 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-extrabold text-sm transition shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
            >
              Purchase Asset
            </button>
          </div>
        </div>

        {/* Preview Audio Controls */}
        {asset.previewUrl && (
          <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={togglePreview}
                className="w-10 h-10 rounded-full bg-purple-500 hover:bg-purple-400 text-zinc-950 flex items-center justify-center font-bold transition cursor-pointer"
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
              </button>
              <span className="text-xs font-semibold text-zinc-200">
                {isPlaying ? "Playing audio preview..." : "Listen to audio preview"}
              </span>
            </div>
          </div>
        )}

        <p className="text-sm text-zinc-300 leading-relaxed border-t border-zinc-800/80 pt-4">
          {asset.description}
        </p>

        {/* License & Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-zinc-800/80 text-xs">
          <div>
            <span className="text-zinc-500 block">License</span>
            <span className="font-semibold text-zinc-200">{asset.licenseType}</span>
          </div>
          <div>
            <span className="text-zinc-500 block">Rating</span>
            <span className="font-semibold text-zinc-200 flex items-center space-x-1">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
              <span>{asset.rating} / 5</span>
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block">Downloads</span>
            <span className="font-semibold text-zinc-200">{asset.downloads}</span>
          </div>
          {asset.downloadUrl && (
            <div className="col-span-2 sm:col-span-1">
              <a
                href={asset.downloadUrl}
                download
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Asset</span>
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Review Form & Customer Reviews */}
      <div className="glass-panel p-6 rounded-2xl border border-zinc-800 space-y-6">
        <h3 className="text-lg font-bold text-white">Reviews ({asset.reviews.length})</h3>

        <form onSubmit={handleReview} className="space-y-3 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-zinc-400 font-semibold">Stars:</span>
            {[1, 2, 3, 4, 5].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setStars(num)}
                className={`p-1 cursor-pointer ${num <= stars ? "text-amber-400" : "text-zinc-600"}`}
              >
                <Star className="w-4 h-4 fill-current" />
              </button>
            ))}
          </div>

          <textarea
            rows={2}
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            placeholder="Write your review of this loop or preset pack..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
          />

          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-purple-500 hover:bg-purple-400 text-zinc-950 font-bold transition cursor-pointer"
          >
            Submit Review
          </button>
        </form>

        <div className="space-y-3 border-t border-zinc-800 pt-4">
          {asset.reviews.map((r: any) => (
            <div key={r.id} className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/80 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-200">{r.reviewerName || "Customer"}</span>
                <span className="text-amber-400 font-bold">{r.stars} ★</span>
              </div>
              {r.comment && <p className="text-zinc-400">{r.comment}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
