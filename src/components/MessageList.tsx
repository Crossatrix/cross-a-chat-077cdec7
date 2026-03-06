import { useEffect, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Edit2, Check, X } from "lucide-react";
import UserActionsMenu from "./UserActionsMenu";
import TypingIndicator from "./TypingIndicator";
import StaffBadge from "./StaffBadge";
import { formatMessageText, useEmojiLoader } from "@/utils/textFormatting";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Message {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  image_url?: string;
  voice_url?: string;
  video_url?: string;
  updated_at?: string;
  is_system?: boolean;
  system_type?: string;
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
  onUpdateMessage?: (messageId: string, newContent: string) => void;
  typingUsers?: { userId: string; username: string }[];
  conversationId: string | null;
}

const MessageList = ({ messages, currentUserId, currentUserDbId, onDeleteMessage, onUpdateMessage, typingUsers = [], conversationId }: MessageListProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [readReceipts, setReadReceipts] = useState<Record<string, number>>({});
  useEmojiLoader(); // Load custom emojis for formatting

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typingUsers]);

  // Mark messages as read when viewing
  useEffect(() => {
    if (!currentUserDbId || !conversationId || messages.length === 0) return;

    const markMessagesAsRead = async () => {
      const unreadMessages = messages.filter(m => m.user_id !== currentUserDbId);
      
      for (const message of unreadMessages) {
        const { error } = await supabase
          .from('message_reads')
          .insert({
            message_id: message.id,
            user_id: currentUserDbId
          })
          .select()
          .single();
        
        // Ignore duplicate key errors (message already marked as read)
        if (error && !error.message.includes('duplicate key')) {
          console.error('Error marking message as read:', error);
        }
      }
    };

    markMessagesAsRead();
  }, [messages, currentUserDbId, conversationId]);

  // Subscribe to read receipts
  useEffect(() => {
    if (!conversationId) return;

    const fetchReadReceipts = async () => {
      const messageIds = messages.map(m => m.id);
      if (messageIds.length === 0) return;

      const { data } = await supabase
        .from('message_reads')
        .select('message_id')
        .in('message_id', messageIds);

      if (data) {
        const counts: Record<string, number> = {};
        data.forEach(read => {
          counts[read.message_id] = (counts[read.message_id] || 0) + 1;
        });
        setReadReceipts(counts);
      }
    };

    fetchReadReceipts();

    const channel = supabase
      .channel(`read-receipts-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_reads',
        },
        () => {
          fetchReadReceipts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, messages]);

  const handleEditMessage = (message: Message) => {
    setEditingMessageId(message.id);
    setEditContent(message.content);
  };

  const handleSaveEdit = async (messageId: string) => {
    if (!editContent.trim()) {
      toast.error("Message cannot be empty");
      return;
    }

    try {
      const { error } = await supabase
        .from('messages')
        .update({ content: editContent })
        .eq('id', messageId);

      if (error) throw error;

      if (onUpdateMessage) {
        onUpdateMessage(messageId, editContent);
      }
      
      setEditingMessageId(null);
      setEditContent("");
      toast.success("Message updated");
    } catch (error) {
      console.error('Error updating message:', error);
      toast.error("Failed to update message");
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditContent("");
  };

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.round((today.getTime() - msgDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) {
      return date.toLocaleDateString(undefined, { weekday: "long" });
    }
    return date.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", year: "2-digit" });
  };

  return (
    <ScrollArea className="flex-1 p-2 md:p-4" ref={scrollRef}>
      <div className="space-y-2 md:space-y-4">
        {messages.map((message, index) => {
          const isCurrentUser = message.profiles?.username === currentUserId;
          const currentDateLabel = getDateLabel(message.created_at);
          const prevDateLabel = index > 0 ? getDateLabel(messages[index - 1].created_at) : null;
          const showDateSeparator = currentDateLabel !== prevDateLabel;
          
          // Render system messages differently
          if (message.is_system) {
            return (
              <div key={message.id}>
                {showDateSeparator && (
                  <div className="flex justify-center my-3">
                    <div className="bg-muted/50 text-muted-foreground text-xs md:text-sm px-3 py-1 rounded-full border border-border">
                      {currentDateLabel}
                    </div>
                  </div>
                )}
                <div className="flex justify-center my-2">
                  <div className="bg-muted/50 text-muted-foreground text-xs md:text-sm px-3 py-1 rounded-full border border-border">
                    {formatMessageText(message.content)}
                  </div>
                </div>
              </div>
            );
          }
          
          return (
            <div key={message.id}>
              {showDateSeparator && (
                <div className="flex justify-center my-3">
                  <div className="bg-muted/50 text-muted-foreground text-xs md:text-sm px-3 py-1 rounded-full border border-border">
                    {currentDateLabel}
                  </div>
                </div>
              )}
              <div
                className={`flex gap-3 ${isCurrentUser ? "flex-row-reverse" : "flex-row"}`}
              >
              <div className="flex items-start gap-1 md:gap-2">
                <Avatar className="h-6 w-6 md:h-8 md:w-8 border-2 border-primary">
                  <AvatarImage src={message.profiles?.avatar_url || ""} alt={message.profiles?.username} />
                  <AvatarFallback className="bg-secondary text-foreground text-[10px] md:text-xs">
                    {message.profiles?.username?.charAt(0).toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                {!isCurrentUser && currentUserDbId && conversationId && (
                  <UserActionsMenu
                    userId={message.user_id}
                    username={message.profiles?.username || "Unknown"}
                    currentUserId={currentUserDbId}
                    conversationId={conversationId}
                  />
                )}
              </div>
              <div className={`flex flex-col ${isCurrentUser ? "items-end" : "items-start"} flex-1`}>
                <div className="flex items-center gap-2 mb-0.5 md:mb-1">
                  <span className="text-[10px] md:text-xs text-muted-foreground flex items-center gap-1">
                    <StaffBadge userId={message.user_id} size={14} />
                    {message.profiles?.username || "Unknown"}
                  </span>
                  {isCurrentUser && (
                    <>
                      {!message.image_url && !message.voice_url && !message.video_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditMessage(message)}
                          className="h-4 w-4 p-0 hover:bg-primary/10"
                        >
                          <Edit2 className="h-3 w-3 text-primary" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteMessage(message.id, message.image_url, message.voice_url, message.video_url)}
                        className="h-4 w-4 p-0 hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
                {editingMessageId === message.id ? (
                  <div className="flex items-center gap-2 w-full max-w-[70vw] md:max-w-xs">
                    <Input
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSaveEdit(message.id);
                        } else if (e.key === 'Escape') {
                          handleCancelEdit();
                        }
                      }}
                      className="flex-1 text-sm"
                      autoFocus
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSaveEdit(message.id)}
                      className="h-6 w-6 p-0"
                    >
                      <Check className="h-4 w-4 text-green-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelEdit}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ) : (
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
                    {message.content && <div>{formatMessageText(message.content)}</div>}
                  </div>
                )}
                <div className="flex items-center gap-2 mt-0.5 md:mt-1">
                  <span className="text-[10px] md:text-xs text-muted-foreground">
                    {new Date(message.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {message.updated_at && message.updated_at !== message.created_at && (
                      <span className="ml-1 opacity-70">(edited)</span>
                    )}
                  </span>
                  {isCurrentUser && readReceipts[message.id] > 0 && (
                    <span className="text-[10px] md:text-xs text-green-500">
                      ✓✓ Read by {readReceipts[message.id]}
                    </span>
                  )}
                </div>
              </div>
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