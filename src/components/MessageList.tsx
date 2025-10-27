import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Message {
  id: string;
  content: string;
  created_at: string;
  profiles: {
    username: string;
  };
}

interface MessageListProps {
  messages: Message[];
  currentUserId: string | undefined;
}

const MessageList = ({ messages, currentUserId }: MessageListProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <ScrollArea className="flex-1 p-4" ref={scrollRef}>
      <div className="space-y-4">
        {messages.map((message) => {
          const isCurrentUser = message.profiles?.username === currentUserId;
          return (
            <div
              key={message.id}
              className={`flex gap-3 ${isCurrentUser ? "flex-row-reverse" : "flex-row"}`}
            >
              <Avatar className="h-8 w-8 border-2 border-primary">
                <AvatarFallback className="bg-secondary text-foreground text-xs">
                  {message.profiles?.username?.charAt(0).toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <div className={`flex flex-col ${isCurrentUser ? "items-end" : "items-start"}`}>
                <span className="text-xs text-muted-foreground mb-1">
                  {message.profiles?.username || "Unknown"}
                </span>
                <div
                  className={`rounded-2xl px-4 py-2 max-w-xs break-words ${
                    isCurrentUser
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-card-foreground border border-border"
                  }`}
                >
                  {message.content}
                </div>
                <span className="text-xs text-muted-foreground mt-1">
                  {new Date(message.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
};

export default MessageList;