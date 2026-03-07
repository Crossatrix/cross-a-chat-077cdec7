import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import ChangelogDialog from "@/components/ChangelogDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageSquare, Trash2 } from "lucide-react";
import StaffBadge from "@/components/StaffBadge";
import { formatMessageText, useEmojiLoader } from "@/utils/textFormatting";
import { useAppVersion } from "@/hooks/useAppVersion";
import { useUnseenChangelog } from "@/hooks/useUnseenChangelog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Conversation {
  id: string;
  updated_at: string;
  is_group: boolean;
  is_ai_chat: boolean;
  name?: string;
  group_image_url?: string;
  isKicked?: boolean;
  otherUser?: {
    id: string;
    username: string;
    avatar_url?: string;
    last_seen?: string;
  };
  participantCount?: number;
  lastMessage?: string;
}

interface ConversationsListProps {
  currentUserId: string;
  onSelectConversation: (conversationId: string, displayName: string, isGroup: boolean) => void;
  selectedConversationId: string | null;
  onDeleteConversation: (conversationId: string) => void;
}

const ConversationsList = ({ 
  currentUserId, 
  onSelectConversation,
  selectedConversationId,
  onDeleteConversation
}: ConversationsListProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [deletingConversationId, setDeletingConversationId] = useState<string | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  useEmojiLoader();
  const version = useAppVersion();
  const { hasUnseen, markSeen } = useUnseenChangelog(currentUserId);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [changelogOpen, setChangelogOpen] = useState(false);

  useEffect(() => {
    if (!currentUserId) return;

    const fetchConversations = async () => {
      // Fetch all conversation participants for this user (including kicked)
      const { data: participantData } = await supabase
        .from("conversation_participants")
        .select(`
          conversation_id,
          kicked_at,
          conversations!inner(id, updated_at, is_group, is_ai_chat, name, group_image_url)
        `)
        .eq("user_id", currentUserId);

      if (!participantData) return;

      const conversationIds = participantData.map((p: any) => p.conversation_id);
      if (conversationIds.length === 0) {
        setConversations([]);
        return;
      }

      // Create a map of kicked status
      const kickedMap = new Map();
      participantData.forEach((p: any) => {
        kickedMap.set(p.conversation_id, !!p.kicked_at);
      });

      // Get participant counts
      const { data: participantCounts } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .in("conversation_id", conversationIds);

      const countMap = new Map();
      participantCounts?.forEach((p: any) => {
        countMap.set(p.conversation_id, (countMap.get(p.conversation_id) || 0) + 1);
      });

      // Get other participants
      const { data: otherParticipants } = await supabase
        .from("conversation_participants")
        .select("conversation_id, user_id")
        .in("conversation_id", conversationIds)
        .neq("user_id", currentUserId);

      // Fetch usernames for other participants
      const otherUserIds = Array.from(new Set((otherParticipants || []).map((p: any) => p.user_id)));
      const { data: otherProfiles } = otherUserIds.length
        ? await supabase
            .from("profiles")
            .select("id, username, avatar_url, last_seen")
            .in("id", otherUserIds)
        : { data: [] as any[] };
      const userMap = new Map((otherProfiles || []).map((pr: any) => [pr.id, { username: pr.username, avatar_url: pr.avatar_url, last_seen: pr.last_seen }]));

      // Get last messages for each conversation
      const { data: lastMessages } = await supabase
        .from("messages")
        .select("conversation_id, content, created_at")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: false });

      const conversationsMap = new Map();
      participantData.forEach((p: any) => {
        const conv = p.conversations;
        conversationsMap.set(p.conversation_id, {
          id: p.conversation_id,
          updated_at: conv.updated_at,
          is_group: conv.is_group,
          is_ai_chat: conv.is_ai_chat,
          name: conv.name,
          group_image_url: conv.group_image_url,
          participantCount: countMap.get(p.conversation_id) || 0,
          isKicked: kickedMap.get(p.conversation_id) || false,
        });
      });

      // For 1-on-1 chats, set otherUser
      otherParticipants?.forEach((p: any) => {
        const conv = conversationsMap.get(p.conversation_id);
        if (conv && !conv.is_group) {
          const userInfo = userMap.get(p.user_id);
          conv.otherUser = {
            id: p.user_id,
            username: userInfo?.username || "Unknown",
            avatar_url: userInfo?.avatar_url,
            last_seen: userInfo?.last_seen,
          };
        }
      });

      // Add last message to each conversation
      const lastMessageMap = new Map();
      lastMessages?.forEach((msg: any) => {
        if (!lastMessageMap.has(msg.conversation_id)) {
          lastMessageMap.set(msg.conversation_id, msg.content);
        }
      });

      conversationsMap.forEach((conv, id) => {
        conv.lastMessage = lastMessageMap.get(id);
      });

      const sortedConversations = Array.from(conversationsMap.values())
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

      // Add AI bot placeholder at the top if no AI chats exist
      const hasAIChats = sortedConversations.some(c => c.is_ai_chat);
      if (!hasAIChats) {
        const AI_BOT_ID = '00000000-0000-0000-0000-000000000000';
        const aiPlaceholder: Conversation = {
          id: 'ai-chat',
          updated_at: new Date().toISOString(),
          is_group: false,
          is_ai_chat: true,
          otherUser: {
            id: AI_BOT_ID,
            username: 'CrossChatAI',
            avatar_url: undefined,
          },
          lastMessage: undefined,
        };
        setConversations([aiPlaceholder, ...sortedConversations]);
      } else {
        setConversations(sortedConversations);
      }
    };

    fetchConversations();

    // Fetch unread counts
    const fetchUnreadCounts = async () => {
      const { data: participantData } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", currentUserId);

      if (!participantData) return;

      const conversationIds = participantData.map((p: any) => p.conversation_id);
      if (conversationIds.length === 0) return;

      // Get all messages in user's conversations
      const { data: messages } = await supabase
        .from("messages")
        .select("id, conversation_id, user_id")
        .in("conversation_id", conversationIds)
        .neq("user_id", currentUserId);

      if (!messages) return;

      const messageIds = messages.map(m => m.id);
      if (messageIds.length === 0) return;

      // Get read receipts for current user
      const { data: reads } = await supabase
        .from("message_reads")
        .select("message_id")
        .in("message_id", messageIds)
        .eq("user_id", currentUserId);

      const readMessageIds = new Set((reads || []).map(r => r.message_id));
      
      const counts: Record<string, number> = {};
      messages.forEach(msg => {
        if (!readMessageIds.has(msg.id)) {
          counts[msg.conversation_id] = (counts[msg.conversation_id] || 0) + 1;
        }
      });

      setUnreadCounts(counts);
    };

    fetchUnreadCounts();

    // Subscribe to new messages and read receipts to refresh conversations
    const channel = supabase
      .channel("conversations-updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        () => {
          fetchConversations();
          fetchUnreadCounts();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "message_reads",
        },
        () => {
          fetchUnreadCounts();
        }
      )
      .subscribe();

    // Track online users presence
    const presenceChannel = supabase
      .channel('online-users')
      .on('presence', { event: 'sync' }, () => {
        const presenceState = presenceChannel.presenceState();
        const online = new Set<string>();
        Object.values(presenceState).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            if (presence.user_id) {
              online.add(presence.user_id);
            }
          });
        });
        setOnlineUsers(online);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        setOnlineUsers((prev) => {
          const updated = new Set(prev);
          newPresences.forEach((presence: any) => {
            if (presence.user_id) {
              updated.add(presence.user_id);
            }
          });
          return updated;
        });
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        setOnlineUsers((prev) => {
          const updated = new Set(prev);
          leftPresences.forEach((presence: any) => {
            if (presence.user_id) {
              updated.delete(presence.user_id);
            }
          });
          return updated;
        });
        // Refresh conversations to update last_seen times
        fetchConversations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(presenceChannel);
    };
  }, [currentUserId]);

  return (
    <div className="w-full md:w-80 border-r border-border bg-card flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-base md:text-lg font-semibold">Chats</h2>
          {version && (
            <button
              onClick={() => {
                setChangelogOpen(true);
                markSeen();
              }}
              className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-primary transition-colors"
            >
              v{version}
              {hasUnseen && (
                <span className="px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold uppercase animate-pulse">
                  NEW
                </span>
              )}
            </button>
          )}
        </div>
      </div>
      <ScrollArea className="flex-1">
        {conversations.length > 0 && (
          <div className="space-y-0.5 p-2">
            {conversations.map((conv) => {
              const displayName = conv.is_ai_chat
                ? (conv.name || "CrossChatAI")
                : conv.is_group 
                  ? conv.name || "Group Chat" 
                  : conv.otherUser?.username || "Unknown";
              const avatarSrc = conv.is_group 
                ? (conv.group_image_url || "") 
                : (conv.otherUser?.avatar_url || "");
              const avatarFallback = conv.is_ai_chat
                ? "🤖"
                : conv.is_group 
                  ? "👥" 
                  : (conv.otherUser?.username?.charAt(0).toUpperCase() || "?");
              
              const hasUnread = (unreadCounts[conv.id] || 0) > 0;
              const isOnline = conv.otherUser && onlineUsers.has(conv.otherUser.id);
              
              const getLastSeenText = () => {
                if (conv.is_ai_chat || conv.is_group) return null;
                if (!conv.otherUser) return null;
                if (isOnline) return "Online";
                if (!conv.otherUser.last_seen) return "Offline";
                
                const lastSeen = new Date(conv.otherUser.last_seen);
                const now = new Date();
                const diffMs = now.getTime() - lastSeen.getTime();
                const diffMins = Math.floor(diffMs / 60000);
                const diffHours = Math.floor(diffMs / 3600000);
                const diffDays = Math.floor(diffMs / 86400000);
                
                if (diffMins < 1) return "Just now";
                if (diffMins < 60) return `${diffMins}m ago`;
                if (diffHours < 24) return `${diffHours}h ago`;
                if (diffDays < 7) return `${diffDays}d ago`;
                return "Offline";
              };

              const lastSeenText = getLastSeenText();
              
              return (
                <div key={conv.id} className="relative group">
                  <Button
                    variant={selectedConversationId === conv.id ? "secondary" : "ghost"}
                    className={`w-full justify-start gap-3 h-auto py-3 pr-12 overflow-hidden ${hasUnread ? 'border-2 border-[#39ff14] bg-[#39ff14]/10' : ''} ${conv.isKicked ? 'opacity-60' : ''}`}
                    onClick={() => onSelectConversation(conv.id, displayName, conv.is_group)}
                  >
                    <div className="relative shrink-0">
                      <Avatar className={`h-10 w-10 border-2 ${conv.isKicked ? 'border-destructive' : 'border-primary'}`}>
                        <AvatarImage src={avatarSrc} alt={displayName} />
                        <AvatarFallback className="bg-secondary text-foreground">
                          {avatarFallback}
                        </AvatarFallback>
                      </Avatar>
                      {conv.isKicked && (
                        <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive border-2 border-card flex items-center justify-center">
                          <span className="text-[8px] text-destructive-foreground">✕</span>
                        </div>
                      )}
                      {isOnline && !conv.is_ai_chat && !conv.is_group && !conv.isKicked && (
                        <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-card" />
                      )}
                    </div>
                    <div className="flex-1 text-left overflow-hidden min-w-0 max-w-full">
                      <div className="flex items-center gap-2">
                        <div className={`font-medium truncate flex items-center gap-1 ${conv.isKicked ? 'line-through text-muted-foreground' : ''}`}>
                          {displayName}
                          {conv.otherUser && !conv.is_ai_chat && <StaffBadge userId={conv.otherUser.id} size={14} />}
                        </div>
                        {conv.isKicked && (
                          <span className="text-xs text-destructive font-medium shrink-0">Removed</span>
                        )}
                        {!conv.isKicked && lastSeenText && (
                          <div className={`text-xs shrink-0 ${isOnline ? 'text-green-500 font-medium' : 'text-muted-foreground'}`}>
                            {lastSeenText}
                          </div>
                        )}
                      </div>
                      {conv.is_group && conv.participantCount && !conv.isKicked && (
                        <div className="text-xs text-muted-foreground truncate">
                          {conv.participantCount} members
                        </div>
                      )}
                      {conv.isKicked ? (
                        <div className="text-xs text-destructive truncate mt-1">
                          You were removed from this group
                        </div>
                      ) : conv.lastMessage && (
                        <div className="text-xs text-muted-foreground truncate mt-1 max-w-[60vw] md:max-w-full">
                          {formatMessageText(conv.lastMessage)}
                        </div>
                      )}
                    </div>
                  </Button>
                  {!conv.is_ai_chat && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingConversationId(conv.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
      
      <AlertDialog open={!!deletingConversationId} onOpenChange={(open) => !open && setDeletingConversationId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chat</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this chat? This will remove all messages and media. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingConversationId) {
                  onDeleteConversation(deletingConversationId);
                  setDeletingConversationId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ChangelogDialog open={changelogOpen} onOpenChange={setChangelogOpen} />
    </div>
  );
};

export default ConversationsList;
