"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchMarketplaceAssets } from "@/lib/actions/client-queries";
import { ShoppingBag, Search, Plus, Star, Download, Sparkles } from "lucide-react";

export default function MarketplacePage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [loading, setLoading] = useState(true);

  const loadAssets = async () => {
    try {
      setLoading(true);
      const data = await fetchMarketplaceAssets(
        selectedType || undefined,
        search || undefined
      );
      setAssets(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, [search, selectedType]);

  const featuredAssets = assets.filter((a) => a.featured);

  return (
    <div className="space-y-8">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center space-x-2">
            <ShoppingBag className="w-8 h-8 text-purple-400" />
            <span>Audio Marketplace</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Discover and purchase loops, acapellas, presets, MIDI packs, and DAW bundles in credits.
          </p>
        </div>

        <Link
          href="/marketplace/upload"
          className="px-5 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-zinc-950 font-bold text-sm transition flex items-center justify-center space-x-2 shadow-lg shadow-purple-500/20 cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>List Audio Asset</span>
        </Link>
      </div>

      {/* Featured Carousel / Section */}
      {featuredAssets.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm uppercase tracking-wider">
            <Sparkles className="w-4 h-4 fill-current" />
            <span>Featured Audio Releases</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredAssets.slice(0, 6).map((asset) => (
              <Link
                key={asset.id}
                href={`/marketplace/${asset.id}`}
                className="glass-panel p-5 rounded-2xl border border-amber-500/30 hover:border-amber-500/60 transition group space-y-4 block relative overflow-hidden"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      {asset.type}
                    </span>
                    <h3 className="font-bold text-lg text-white group-hover:text-amber-400 transition mt-2 truncate max-w-[200px]">
                      {asset.title}
                    </h3>
                  </div>
                  <span className="text-lg font-extrabold text-emerald-400 font-mono">
                    {asset.price} CR
                  </span>
                </div>

                <p className="text-xs text-zinc-400 line-clamp-2">{asset.description}</p>

                <div className="flex items-center justify-between pt-3 border-t border-zinc-800 text-xs text-zinc-500">
                  <span className="flex items-center space-x-1">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
                    <span>{asset.rating} ({asset.reviewCount})</span>
                  </span>
                  <span>{asset.downloads} downloads</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assets, tags, genres..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs overflow-x-auto w-full sm:w-auto">
          {["", "loop", "acapella", "drumkit", "preset", "midi_pack", "bundle"].map((t) => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`px-3 py-1.5 rounded-lg font-semibold uppercase text-[11px] transition cursor-pointer ${
                selectedType === t
                  ? "bg-purple-500 text-zinc-950 font-bold"
                  : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              {t || "All Types"}
            </button>
          ))}
        </div>
      </div>

      {/* Asset Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {assets.map((asset) => (
          <Link
            key={asset.id}
            href={`/marketplace/${asset.id}`}
            className="glass-panel p-5 rounded-2xl border border-zinc-800 hover:border-purple-500/50 hover:bg-zinc-900/80 transition group space-y-4 block"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/10 text-purple-300 border border-purple-500/30">
                  {asset.type}
                </span>
                <h3 className="font-bold text-lg text-white group-hover:text-purple-400 transition mt-2 truncate max-w-[200px]">
                  {asset.title}
                </h3>
              </div>
              <span className="text-base font-extrabold text-emerald-400 font-mono">
                {asset.price} CR
              </span>
            </div>

            <p className="text-xs text-zinc-400 line-clamp-2">{asset.description}</p>

            <div className="flex items-center justify-between pt-3 border-t border-zinc-800 text-xs text-zinc-500">
              <span className="flex items-center space-x-1">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
                <span>{asset.rating}</span>
              </span>
              <span className="flex items-center space-x-1">
                <Download className="w-3.5 h-3.5 text-zinc-400" />
                <span>{asset.downloads}</span>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
