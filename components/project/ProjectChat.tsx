"use client";

import { useEffect, useState, useRef } from "react";
import { MessageSquare, Send } from "lucide-react";
import { sendProjectMessage } from "@/lib/actions/messages";
import { subscribeToProjectChat } from "@/lib/realtime";
import { toast } from "sonner";

interface MessageItem {
  id: string;
  senderId: string;
  senderName: string | null;
  content: string;
  createdAt: Date;
}

interface ProjectChatProps {
  projectId: string;
  currentUserId: string;
  initialMessages: MessageItem[];
}

export function ProjectChat({
  projectId,
  currentUserId,
  initialMessages,
}: ProjectChatProps) {
  const [messagesList, setMessagesList] = useState<MessageItem[]>(initialMessages);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!projectId) return;

    // Realtime channel subscription
    const unsubscribe = subscribeToProjectChat(projectId, (newMessage) => {
      setMessagesList((prev) => [...prev, newMessage]);
    });

    return () => {
      unsubscribe();
    };
  }, [projectId]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesList]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setIsSending(true);
    try {
      await sendProjectMessage(projectId, inputText.trim());
      setInputText("");
    } catch (err: any) {
      toast.error(err.message || "Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="glass-panel p-5 rounded-xl space-y-4 flex flex-col h-80">
      <div className="flex items-center space-x-2 border-b border-zinc-800 pb-2">
        <MessageSquare className="w-4 h-4 text-emerald-400" />
        <h3 className="font-bold text-white text-sm">Live Project Chat</h3>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
        {messagesList.length === 0 ? (
          <div className="text-center py-10 text-zinc-500">
            No project messages yet. Say hello to your collaborators!
          </div>
        ) : (
          messagesList.map((msg, idx) => {
            const isMe = msg.senderId === currentUserId;
            return (
              <div
                key={msg.id || idx}
                className={`flex flex-col max-w-[80%] ${
                  isMe ? "ml-auto items-end" : "items-start"
                }`}
              >
                <span className="text-[10px] text-zinc-500 mb-0.5">
                  {msg.senderName || "Collaborator"}
                </span>
                <div
                  className={`p-2.5 rounded-xl ${
                    isMe
                      ? "bg-emerald-500 text-zinc-950 font-semibold"
                      : "bg-zinc-900 border border-zinc-800 text-zinc-200"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            );
          })
        )}
        <div ref={chatBottomRef} />
      </div>

      <form onSubmit={handleSendMessage} className="flex space-x-2 pt-2 border-t border-zinc-800">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type message to team..."
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          disabled={isSending || !inputText.trim()}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-lg text-xs transition flex items-center space-x-1 disabled:opacity-50 cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
}
