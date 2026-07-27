"use client";

import { SignUp, SignOutButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { LogOut, LayoutDashboard } from "lucide-react";

export default function SignUpPage() {
  const { isSignedIn, isLoaded } = useUser();

  if (isLoaded && isSignedIn) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 text-white">
        <div className="glass-panel p-8 rounded-2xl border border-zinc-800 text-center space-y-6 max-w-md w-full shadow-2xl">
          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-white">Already Signed In</h2>
            <p className="text-xs text-zinc-400">
              You are currently authenticated. Go to your dashboard or sign out to switch accounts.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Link
              href="/dashboard"
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm transition flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Go to Dashboard</span>
            </Link>

            <SignOutButton redirectUrl="/auth/sign-in">
              <button className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold text-xs transition flex items-center justify-center space-x-2 cursor-pointer">
                <LogOut className="w-4 h-4 text-red-400" />
                <span>Sign Out / Switch Account</span>
              </button>
            </SignOutButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 text-white">
      <div className="w-full max-w-md flex flex-col items-center justify-center space-y-4">
        <SignUp
          fallbackRedirectUrl="/dashboard"
          signInUrl="/auth/sign-in"
          appearance={{
            elements: {
              card: "glass-panel border-zinc-800 shadow-2xl",
              headerTitle: "text-white font-bold",
              headerSubtitle: "text-zinc-400",
              formButtonPrimary:
                "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold",
            },
          }}
        />
      </div>
    </div>
  );
}
