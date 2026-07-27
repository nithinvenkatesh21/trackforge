import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";

const isUuid = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) &&
  id !== "00000000-0000-0000-0000-000000000000";

export async function getNotifications(userId: string, limitCount = 30) {
  if (!isUuid(userId)) return [];

  try {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limitCount);
  } catch (err) {
    console.error("getNotifications query error:", err);
    return [];
  }
}

export async function getUnreadNotificationCount(userId: string) {
  if (!isUuid(userId)) return 0;

  try {
    const unread = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.read, false)
        )
      );

    return unread.length;
  } catch (err) {
    console.error("getUnreadNotificationCount error:", err);
    return 0;
  }
}
