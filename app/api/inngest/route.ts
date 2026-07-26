import { serve } from "inngest/next";
import { inngest, generateWaveformJob } from "@/lib/jobs/waveform";
import { separateStemsJob } from "@/lib/jobs/stems";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [generateWaveformJob, separateStemsJob],
});
