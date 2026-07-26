import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md flex justify-center">
        <SignUp
          appearance={{
            elements: {
              card: "glass-panel border-zinc-800 shadow-2xl",
              headerTitle: "text-white font-bold",
              headerSubtitle: "text-zinc-400",
              formButtonPrimary: "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold",
            },
          }}
        />
      </div>
    </div>
  );
}
