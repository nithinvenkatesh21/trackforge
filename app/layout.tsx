import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrackForge — Audio Version Control & Music Collaboration Platform",
  description:
    "TrackForge gives creators Git-like version control for audio projects, AI stem separation, wavesurfer feedback, marketplace assets, and milestone service requests.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        theme: dark as any,
        variables: {
          colorPrimary: "#10b981",
        },
      } as any}
    >
      <html lang="en" className="dark">
        <body className="bg-zinc-950 text-white antialiased">
          {children}
          <Toaster position="bottom-right" theme="dark" richColors />
        </body>
      </html>
    </ClerkProvider>
  );
}
