import { Inngest } from "inngest";
import { db } from "@/lib/db";
import { versionWaveforms } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const inngest = new Inngest({ id: "trackforge" });

export const generateWaveformJob = (inngest.createFunction as any)(
  { id: "generate-waveform" },
  { event: "audio/waveform.requested" },
  async ({ event, step }: { event: any; step: any }) => {
    const { versionId } = event.data;

    await step.run("compute-audio-peaks", async () => {
      const dummyPeaks = Array.from({ length: 60 }, (_, i) =>
        Math.round((Math.sin(i * 0.25) * 0.45 + 0.5) * 100) / 100
      );

      await db
        .insert(versionWaveforms)
        .values({
          versionId,
          peaks: dummyPeaks,
          durationSeconds: 180,
          sampleRate: 44100,
        })
        .onConflictDoUpdate({
          target: versionWaveforms.versionId,
          set: { peaks: dummyPeaks },
        });

      return { success: true };
    });
  }
);
