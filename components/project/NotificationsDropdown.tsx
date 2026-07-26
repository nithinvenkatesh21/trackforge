"use client";

import { useState, useEffect } from "react";
import { Bell, Check, CheckCheck } from "lucide-react";
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/lib/actions/notifications";
import { subscribeToUserNotifications } from "@/lib/realtime";
import { toast } from "sonner";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

interface NotificationsDropdownProps {
  userId: string;
  initialNotifications: NotificationItem[];
}

export function NotificationsDropdown({
  userId,
  initialNotifications,
}: NotificationsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notificationsList, setNotificationsList] = useState<NotificationItem[]>(
    initialNotifications
  );

  const unreadCount = notificationsList.filter((n) => !n.read).length;

  useEffect(() => {
    if (!userId) return;

    // Realtime subscription via Supabase Realtime channel
    const unsubscribe = subscribeToUserNotifications(userId, (newNotification) => {
      setNotificationsList((prev) => [newNotification, ...prev]);
      toast.info(newNotification.title, { description: newNotification.message });
    });

    return () => {
      unsubscribe();
    };
  }, [userId]);

  const handleMarkOne = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setNotificationsList((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAll = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotificationsList((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success("All notifications marked as read");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 transition relative cursor-pointer"
        aria-label="Toggle notifications menu"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-zinc-950 font-bold text-[10px] flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 glass-panel rounded-xl shadow-2xl p-4 space-y-3 z-50 border border-zinc-800">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <h3 className="font-semibold text-sm text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAll}
                className="text-xs text-emerald-400 hover:underline flex items-center space-x-1 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {notificationsList.length === 0 ? (
              <div className="text-center py-6 text-xs text-zinc-500">
                All caught up! No notifications yet.
              </div>
            ) : (
              notificationsList.map((n) => (
                <div
                  key={n.id}
                  className={`p-3 rounded-lg border text-xs space-y-1 transition ${
                    n.read
                      ? "bg-zinc-900/30 border-zinc-800/60 text-zinc-400"
                      : "bg-zinc-900/80 border-emerald-500/30 text-zinc-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-emerald-400">{n.title}</span>
                    {!n.read && (
                      <button
                        onClick={() => handleMarkOne(n.id)}
                        className="text-zinc-500 hover:text-emerald-400 p-0.5 cursor-pointer"
                        title="Mark read"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-zinc-300 line-clamp-2">{n.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
