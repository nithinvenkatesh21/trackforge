"use server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function markNotificationAsRead(notificationId: string) {
  const user = await requireUser();

  await db
    .update(notifications)
    .set({ read: true })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, user.id)
      )
    );

  revalidatePath("/");
  return { success: true };
}

export async function markAllNotificationsAsRead() {
  const user = await requireUser();

  await db
    .update(notifications)
    .set({ read: true })
    .where(eq(notifications.userId, user.id));

  revalidatePath("/");
  return { success: true };
}
