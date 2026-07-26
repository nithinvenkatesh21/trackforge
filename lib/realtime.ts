import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy_key";

export const supabaseRealtime = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export function subscribeToUserNotifications(
  userId: string,
  onNotification: (payload: any) => void
) {
  const channel = supabaseRealtime
    .channel(`notifications:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        onNotification(payload.new);
      }
    )
    .subscribe();

  return () => {
    supabaseRealtime.removeChannel(channel);
  };
}

export function subscribeToProjectChat(
  projectId: string,
  onMessage: (payload: any) => void
) {
  const channel = supabaseRealtime
    .channel(`project_chat:${projectId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `project_id=eq.${projectId}`,
      },
      (payload) => {
        onMessage(payload.new);
      }
    )
    .subscribe();

  return () => {
    supabaseRealtime.removeChannel(channel);
  };
}

export function trackPresence(
  channelName: string,
  userState: { userId: string; name: string; avatarUrl?: string },
  onSync: (presenceState: any) => void
) {
  const channel = supabaseRealtime.channel(channelName);

  channel
    .on("presence", { event: "sync" }, () => {
      onSync(channel.presenceState());
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track(userState);
      }
    });

  return () => {
    channel.untrack();
    supabaseRealtime.removeChannel(channel);
  };
}
