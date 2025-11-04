import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import UserActionsMenu from "./UserActionsMenu";

interface Message {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  image_url?: string;
  profiles: {
    username: string;
  };
}

interface MessageListProps {
  messages: Message[];
  currentUserId: string | undefined;
  currentUserDbId: string | undefined;
}

const MessageList = ({ messages, currentUserId, currentUserDbId }: MessageListProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <ScrollArea className="flex-1 p-2 md:p-4" ref={scrollRef}>
      <div className="space-y-2 md:space-y-4">
        {messages.map((message) => {
          const isCurrentUser = message.profiles?.username === currentUserId;
          return (
            <div
              key={message.id}
              className={`flex gap-3 ${isCurrentUser ? "flex-row-reverse" : "flex-row"}`}
            >
              <div className="flex items-start gap-1 md:gap-2">
                <Avatar className="h-6 w-6 md:h-8 md:w-8 border-2 border-primary">
                  <AvatarFallback className="bg-secondary text-foreground text-[10px] md:text-xs">
                    {message.profiles?.username?.charAt(0).toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                {!isCurrentUser && currentUserDbId && (
                  <UserActionsMenu
                    userId={message.user_id}
                    username={message.profiles?.username || "Unknown"}
                    currentUserId={currentUserDbId}
                  />
                )}
              </div>
              <div className={`flex flex-col ${isCurrentUser ? "items-end" : "items-start"}`}>
                <span className="text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">
                  {message.profiles?.username || "Unknown"}
                </span>
                <div
                  className={`rounded-2xl px-2 py-1 md:px-4 md:py-2 max-w-[70vw] md:max-w-xs break-words text-sm md:text-base ${
                    isCurrentUser
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-card-foreground border border-border"
                  }`}
                >
                  {message.image_url && (
                    <img
                      src={message.image_url}
                      alt="Shared image"
                      className="rounded-lg max-w-full h-auto mb-2 cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(message.image_url, '_blank')}
                    />
                  )}
                  {message.content && <div>{message.content}</div>}
                </div>
                <span className="text-[10px] md:text-xs text-muted-foreground mt-0.5 md:mt-1">
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