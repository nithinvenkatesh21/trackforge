"use server";

import { requireUser } from "@/lib/auth";
import { inngest } from "@/lib/jobs/waveform";
import { validateNamingPattern } from "@/lib/utils/stem-naming";
import { revalidatePath } from "next/cache";

export async function separateAudioStems(versionId: string, namingPattern?: string) {
  const user = await requireUser();

  if (namingPattern) {
    const check = validateNamingPattern(namingPattern);
    if (!check.valid) {
      throw new Error(check.error || "Invalid stem naming pattern");
    }
  }

  await inngest.send({
    name: "stems/requested",
    data: {
      versionId,
      userId: user.id,
      namingPattern: namingPattern || null,
    },
  });

  revalidatePath(`/projects`);
  return { success: true, message: "Stem separation job enqueued" };
}
