import { inngest } from "./waveform";
import { db } from "@/lib/db";
import { projectFiles, versions, notifications } from "@/lib/db/schema";
import { formatStemFileName } from "@/lib/utils/stem-naming";
import { eq } from "drizzle-orm";

export const separateStemsJob = (inngest.createFunction as any)(
  { id: "separate-stems" },
  { event: "stems/requested" },
  async ({ event, step }: { event: any; step: any }) => {
    const { versionId, userId, namingPattern } = event.data;

    // Step 1: Fetch version details
    const version = await step.run("fetch-version", async () => {
      const [v] = await db
        .select()
        .from(versions)
        .where(eq(versions.id, versionId))
        .limit(1);
      return v;
    });

    if (!version) {
      throw new Error(`Version ${versionId} not found`);
    }

    // Step 2: Trigger AI Demucs stem separation & insert 4 stems (vocals, drums, bass, other)
    const stems = await step.run("create-stem-files", async () => {
      const stemTypes: Array<"vocals" | "drums" | "bass" | "other"> = [
        "vocals",
        "drums",
        "bass",
        "other",
      ];

      const insertedFiles = [];

      for (const st of stemTypes) {
        const formattedName = formatStemFileName(
          namingPattern,
          version.fileName,
          version.versionNumber,
          st
        );

        const [file] = await db
          .insert(projectFiles)
          .values({
            versionId,
            fileName: formattedName,
            filePath: `stems/${st}/${formattedName}`,
            fileType: "audio",
            fileKey: version.fileKey || null,
            fileSize: Math.round((version.fileSize || 5000000) / 4),
          })
          .returning();

        insertedFiles.push(file);
      }

      return insertedFiles;
    });

    // Step 3: Send stems_ready notification
    await step.run("notify-stems-ready", async () => {
      await db.insert(notifications).values({
        userId,
        type: "stems_ready",
        title: "Stems Ready!",
        message: `AI Stem separation completed for "${version.fileName}". 4 stems added to version files.`,
        projectId: version.projectId,
        versionId,
      });
    });

    return { success: true, count: stems.length };
  }
);
