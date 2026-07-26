"use server";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { audioPlaybacks } from "@/lib/db/schema";

export async function recordPlayback(input: {
  versionId: string;
  timestampSeconds?: number;
  durationSeconds?: number;
  completed?: boolean;
}) {
  const user = await getCurrentUser();

  await db.insert(audioPlaybacks).values({
    versionId: input.versionId,
    userId: user?.id || null,
    timestampSeconds: input.timestampSeconds ?? null,
    durationSeconds: input.durationSeconds ?? null,
    completed: input.completed || false,
  });

  return { success: true };
}
