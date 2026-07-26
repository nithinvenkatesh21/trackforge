import { db } from "@/lib/db";
import { audioPlaybacks, users } from "@/lib/db/schema";
import { eq, sql, desc, count } from "drizzle-orm";

export async function getAudioAnalytics(versionId: string) {
  const [totals] = await db
    .select({
      totalPlays: count(),
      uniqueListeners: sql<number>`COUNT(DISTINCT ${audioPlaybacks.userId})::int`,
      avgDuration: sql<number>`COALESCE(AVG(${audioPlaybacks.durationSeconds}), 0)::float`,
      completionRate: sql<number>`COALESCE(AVG(CASE WHEN ${audioPlaybacks.completed} THEN 1 ELSE 0 END), 0)::float`,
    })
    .from(audioPlaybacks)
    .where(eq(audioPlaybacks.versionId, versionId));

  const topListeners = await db
    .select({
      userId: audioPlaybacks.userId,
      userName: users.name,
      userImage: users.imageUrl,
      playCount: count(),
    })
    .from(audioPlaybacks)
    .leftJoin(users, eq(audioPlaybacks.userId, users.id))
    .where(eq(audioPlaybacks.versionId, versionId))
    .groupBy(audioPlaybacks.userId, users.name, users.imageUrl)
    .orderBy(desc(count()))
    .limit(5);

  // 10-second bucket heatmap for most replayed sections
  const replayedBuckets = await db
    .select({
      bucketIndex: sql<number>`COALESCE(width_bucket(${audioPlaybacks.timestampSeconds}, 0, 300, 30), 1)::int`,
      playCount: count(),
    })
    .from(audioPlaybacks)
    .where(eq(audioPlaybacks.versionId, versionId))
    .groupBy(sql`width_bucket(${audioPlaybacks.timestampSeconds}, 0, 300, 30)`)
    .orderBy(desc(count()))
    .limit(10);

  return {
    totalPlays: Number(totals?.totalPlays || 0),
    uniqueListeners: Number(totals?.uniqueListeners || 0),
    avgDurationSeconds: Math.round(Number(totals?.avgDuration || 0)),
    completionPercentage: Math.round(Number(totals?.completionRate || 0) * 100),
    topListeners,
    mostReplayedSections: replayedBuckets.map((b) => ({
      startTimeSeconds: (b.bucketIndex - 1) * 10,
      endTimeSeconds: b.bucketIndex * 10,
      replays: Number(b.playCount),
    })),
  };
}
