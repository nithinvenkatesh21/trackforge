"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { getUserById } from "@/lib/queries/users";
import { getSelfUser } from "@/lib/actions/get-self";
import { getBalance } from "@/lib/queries/credits";
import { getUserRatings } from "@/lib/queries/ratings";
import { updateProfile } from "@/lib/actions/users";
import { adminAddCredits } from "@/lib/actions/credits";
import { User, Star, Coins, Music, Edit3, Save, X, Plus } from "lucide-react";
import { toast } from "sonner";

export default function ProfilePage() {
  const params = useParams();
  const targetUserId = params.userId as string;

  const [profileUser, setProfileUser] = useState<any | null>(null);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [creditBalance, setCreditBalance] = useState<number>(0);
  const [ratings, setRatings] = useState<any[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAdminTopupModal, setShowAdminTopupModal] = useState(false);

  // Edit form state
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [daw, setDaw] = useState("");
  const [genres, setGenres] = useState("");

  // Admin top-up state
  const [topupAmount, setTopupAmount] = useState("100");

  const loadData = async () => {
    try {
      const u = await getUserById(targetUserId);
      setProfileUser(u);
      if (u) {
        setName(u.name || "");
        setBio(u.bio || "");
        setDaw(u.daw || "");
        setGenres(u.genres ? u.genres.join(", ") : "");
      }

      const me = await getSelfUser();
      setCurrentUser(me);

      const bal = await getBalance(targetUserId);
      setCreditBalance(bal.balance);

      const rList = await getUserRatings(targetUserId);
      setRatings(rList);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, [targetUserId]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile({
        name: name.trim() || undefined,
        bio: bio.trim() || undefined,
        daw: daw.trim() || undefined,
        genres: genres ? genres.split(",").map((g) => g.trim()) : [],
      });
      toast.success("Profile updated!");
      setShowEditModal(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    }
  };

  const handleAdminTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminAddCredits(targetUserId, parseInt(topupAmount, 10) || 100);
      toast.success(`Added ${topupAmount} credits!`);
      setShowAdminTopupModal(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to add credits");
    }
  };

  if (!profileUser) return null;

  const isSelf = currentUser?.id === profileUser.id;
  const isAdmin = currentUser?.role === "admin";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header */}
      <div className="glass-panel p-8 rounded-2xl border border-zinc-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-500 via-cyan-500 to-purple-600 p-0.5 shadow-xl">
              <div className="w-full h-full rounded-full bg-zinc-950 flex items-center justify-center font-bold text-2xl text-emerald-400 uppercase">
                {profileUser.name?.[0] || "U"}
              </div>
            </div>

            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-extrabold text-white">{profileUser.name || "Creator"}</h1>
                {profileUser.role === "admin" && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    Admin
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400">{profileUser.email}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-bold text-sm flex items-center space-x-2">
              <Coins className="w-4 h-4" />
              <span>{creditBalance} Credits</span>
            </div>

            {isSelf && (
              <button
                onClick={() => setShowEditModal(true)}
                className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white transition cursor-pointer"
                title="Edit Profile"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}

            {isAdmin && (
              <button
                onClick={() => setShowAdminTopupModal(true)}
                className="px-3 py-2 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 font-semibold text-xs transition cursor-pointer"
              >
                + Admin Top-up
              </button>
            )}
          </div>
        </div>

        {/* Bio & Disciplines */}
        {profileUser.bio && <p className="text-xs text-zinc-300 leading-relaxed">{profileUser.bio}</p>}

        <div className="flex flex-wrap gap-4 pt-4 border-t border-zinc-800 text-xs">
          {profileUser.daw && (
            <div>
              <span className="text-zinc-500 block">DAW</span>
              <span className="font-semibold text-zinc-200">{profileUser.daw}</span>
            </div>
          )}
          {profileUser.genres && profileUser.genres.length > 0 && (
            <div>
              <span className="text-zinc-500 block">Genres</span>
              <span className="font-semibold text-zinc-200">{profileUser.genres.join(", ")}</span>
            </div>
          )}
          <div>
            <span className="text-zinc-500 block">Reputation</span>
            <span className="font-semibold text-zinc-200 flex items-center space-x-1">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
              <span>{profileUser.rating} ({profileUser.totalRatings} ratings)</span>
            </span>
          </div>
        </div>
      </div>

      {/* Ratings History */}
      <div className="glass-panel p-6 rounded-2xl border border-zinc-800 space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center space-x-2">
          <Star className="w-5 h-5 text-amber-400 fill-current" />
          <span>Collaborator Ratings ({ratings.length})</span>
        </h3>

        <div className="space-y-3">
          {ratings.length === 0 ? (
            <div className="text-xs text-zinc-500">No ratings left for this user yet.</div>
          ) : (
            ratings.map((r) => (
              <div key={r.id} className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800 text-xs space-y-1">
                <div className="flex items-center justify-between font-semibold">
                  <span className="text-zinc-200">{r.fromUserName || "Collaborator"}</span>
                  <span className="text-amber-400 font-bold">{r.stars} ★</span>
                </div>
                {r.comment && <p className="text-zinc-400">{r.comment}</p>}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 border border-zinc-800 space-y-4 relative">
            <button onClick={() => setShowEditModal(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-white cursor-pointer">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white">Edit Profile Settings</h3>

            <form onSubmit={handleUpdateProfile} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Display Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Bio</label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Primary DAW</label>
                <input
                  type="text"
                  value={daw}
                  onChange={(e) => setDaw(e.target.value)}
                  placeholder="Logic Pro, Ableton Live, FL Studio..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Genres (comma-separated)</label>
                <input
                  type="text"
                  value={genres}
                  onChange={(e) => setGenres(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="pt-2 border-t border-zinc-800 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 rounded-lg bg-zinc-900 text-zinc-300 cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold cursor-pointer">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Topup Modal */}
      {showAdminTopupModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-sm rounded-2xl p-6 border border-zinc-800 space-y-4 relative">
            <button onClick={() => setShowAdminTopupModal(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-white cursor-pointer">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white">Admin Credit Top-up</h3>

            <form onSubmit={handleAdminTopup} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Credits Amount</label>
                <input
                  type="number"
                  required
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white font-mono"
                />
              </div>

              <div className="pt-2 border-t border-zinc-800 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowAdminTopupModal(false)} className="px-4 py-2 rounded-lg bg-zinc-900 text-zinc-300 cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 rounded-lg bg-purple-500 hover:bg-purple-400 text-zinc-950 font-bold cursor-pointer">
                  Add Credits
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
