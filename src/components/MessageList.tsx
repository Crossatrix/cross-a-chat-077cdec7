import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import UserActionsMenu from "./UserActionsMenu";
import TypingIndicator from "./TypingIndicator";

interface Message {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  image_url?: string;
  voice_url?: string;
  video_url?: string;
  profiles: {
    username: string;
    avatar_url?: string;
  };
}

interface MessageListProps {
  messages: Message[];
  currentUserId: string | undefined;
  currentUserDbId: string | undefined;
  onDeleteMessage: (messageId: string, imageUrl?: string, voiceUrl?: string, videoUrl?: string) => void;
  typingUsers?: { userId: string; username: string }[];
}

const MessageList = ({ messages, currentUserId, currentUserDbId, onDeleteMessage, typingUsers = [] }: MessageListProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typingUsers]);

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
                  <AvatarImage src={message.profiles?.avatar_url || ""} alt={message.profiles?.username} />
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
              <div className={`flex flex-col ${isCurrentUser ? "items-end" : "items-start"} flex-1`}>
                <div className="flex items-center gap-2 mb-0.5 md:mb-1">
                  <span className="text-[10px] md:text-xs text-muted-foreground">
                    {message.profiles?.username || "Unknown"}
                  </span>
                  {isCurrentUser && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteMessage(message.id, message.image_url, message.voice_url, message.video_url)}
                      className="h-4 w-4 p-0 hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  )}
                </div>
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
                  {message.video_url && (
                    <video
                      controls
                      src={message.video_url}
                      className="rounded-lg max-w-full h-auto mb-2"
                      preload="metadata"
                    />
                  )}
                  {message.voice_url && (
                    <audio
                      controls
                      src={message.voice_url}
                      className="w-full max-w-xs"
                      preload="metadata"
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
        {typingUsers.map((user) => (
          <TypingIndicator key={user.userId} username={user.username} />
        ))}
      </div>
    </ScrollArea>
  );
};

export default MessageList;