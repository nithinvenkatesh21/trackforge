import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

export const ratelimit =
  redisUrl && redisToken
    ? new Ratelimit({
        redis: new Redis({
          url: redisUrl,
          token: redisToken,
        }),
        limiter: Ratelimit.slidingWindow(10, "10 s"), // 10 requests per 10 seconds
        analytics: true,
      })
    : null;

export async function checkRateLimit(identifier: string) {
  if (!ratelimit) return { success: true };
  return await ratelimit.limit(identifier);
}
