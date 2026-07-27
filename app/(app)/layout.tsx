import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getNotifications } from "@/lib/queries/notifications";
import { getBalance } from "@/lib/queries/credits";
import { LogoDropdown } from "@/components/project/LogoDropdown";
import { NotificationsDropdown } from "@/components/project/NotificationsDropdown";
import { UserButton } from "@clerk/nextjs";
import { LayoutDashboard, Compass, ShoppingBag, Briefcase, GitPullRequest, Coins } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user = null;
  let userNotifications: any[] = [];
  let creditRow = { balance: 100 };

  try {
    user = await getCurrentUser();
  } catch (err) {
    console.error("AppLayout getCurrentUser error:", err);
  }

  if (user) {
    try {
      userNotifications = await getNotifications(user.id, 20);
    } catch (err) {
      console.error("AppLayout getNotifications error:", err);
    }

    try {
      creditRow = await getBalance(user.id);
    } catch (err) {
      console.error("AppLayout getBalance error:", err);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col selection:bg-emerald-500 selection:text-zinc-950">
      {/* Top Navbar */}
      <header className="border-b border-zinc-800/80 glass-panel sticky top-0 z-50 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          {/* Brand Logo Dropdown */}
          <LogoDropdown />

          <nav className="hidden md:flex items-center space-x-1 text-xs font-semibold text-zinc-400">
            <Link
              href="/dashboard"
              className="px-3 py-2 rounded-lg hover:text-white hover:bg-zinc-900 transition flex items-center space-x-2"
            >
              <LayoutDashboard className="w-4 h-4 text-emerald-400" />
              <span>Dashboard</span>
            </Link>
            <Link
              href="/explore"
              className="px-3 py-2 rounded-lg hover:text-white hover:bg-zinc-900 transition flex items-center space-x-2"
            >
              <Compass className="w-4 h-4 text-cyan-400" />
              <span>Explore</span>
            </Link>
            <Link
              href="/marketplace"
              className="px-3 py-2 rounded-lg hover:text-white hover:bg-zinc-900 transition flex items-center space-x-2"
            >
              <ShoppingBag className="w-4 h-4 text-purple-400" />
              <span>Marketplace</span>
            </Link>
            <Link
              href="/service-requests"
              className="px-3 py-2 rounded-lg hover:text-white hover:bg-zinc-900 transition flex items-center space-x-2"
            >
              <Briefcase className="w-4 h-4 text-amber-400" />
              <span>Gigs Board</span>
            </Link>
            <Link
              href="/integrations"
              className="px-3 py-2 rounded-lg hover:text-white hover:bg-zinc-900 transition flex items-center space-x-2"
            >
              <GitPullRequest className="w-4 h-4 text-emerald-400" />
              <span>GitHub</span>
            </Link>
          </nav>
        </div>

        <div className="flex items-center space-x-4">
          {/* Credit balance badge */}
          {user && (
            <Link
              href={`/profile/${user.id}`}
              className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center space-x-1.5 hover:bg-emerald-500/20 transition cursor-pointer"
            >
              <Coins className="w-3.5 h-3.5" />
              <span>{creditRow.balance} CR</span>
            </Link>
          )}

          {/* Notifications dropdown */}
          {user && (
            <NotificationsDropdown
              userId={user.id}
              initialNotifications={userNotifications}
            />
          )}

          {/* Profile & User Badge */}
          {user ? (
            <div className="flex items-center space-x-3 bg-zinc-900/80 border border-zinc-800/80 rounded-xl px-3 py-1.5">
              <Link
                href={`/profile/${user.id}`}
                className="flex items-center space-x-2 hover:opacity-80 transition cursor-pointer"
                title="View Profile"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-xs font-bold">
                  {user.name ? user.name[0].toUpperCase() : "C"}
                </div>
                <span className="text-xs font-bold text-white truncate max-w-[120px]">
                  {user.name || "Creator"}
                </span>
              </Link>
              <UserButton showName={false} />
            </div>
          ) : (
            <Link
              href="/auth/sign-in"
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition shadow-md shadow-emerald-500/20"
            >
              Sign In
            </Link>
          )}
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6">{children}</main>
    </div>
  );
}
