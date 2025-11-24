import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";

interface Conversation {
  id: string;
  updated_at: string;
  is_group: boolean;
  name?: string;
  otherUser?: {
    id: string;
    username: string;
    avatar_url?: string;
  };
  participantCount?: number;
  lastMessage?: string;
}

interface ConversationsListProps {
  currentUserId: string;
  onSelectConversation: (conversationId: string, displayName: string, isGroup: boolean) => void;
  selectedConversationId: string | null;
}

const ConversationsList = ({ 
  currentUserId, 
  onSelectConversation,
  selectedConversationId 
}: ConversationsListProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    if (!currentUserId) return;

    const fetchConversations = async () => {
      const { data: participantData } = await supabase
        .from("conversation_participants")
        .select(`
          conversation_id,
          conversations!inner(id, updated_at, is_group, name)
        `)
        .eq("user_id", currentUserId);

      if (!participantData) return;

      const conversationIds = participantData.map((p: any) => p.conversation_id);
      if (conversationIds.length === 0) {
        setConversations([]);
        return;
      }

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
            .select("id, username, avatar_url")
            .in("id", otherUserIds)
        : { data: [] as any[] };
      const userMap = new Map((otherProfiles || []).map((pr: any) => [pr.id, { username: pr.username, avatar_url: pr.avatar_url }]));

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
          name: conv.name,
          participantCount: countMap.get(p.conversation_id) || 0,
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

      setConversations(sortedConversations);
    };

    fetchConversations();

    // Subscribe to new messages to refresh conversations
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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  return (
    <div className="w-full md:w-80 border-r border-border bg-card flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border shrink-0">
        <h2 className="text-base md:text-lg font-semibold">Chats</h2>
      </div>
      <ScrollArea className="flex-1">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs mt-1">Click on a username to start chatting</p>
          </div>
        ) : (
          <div className="space-y-0.5 p-2">
            {conversations.map((conv) => {
              const displayName = conv.is_group 
                ? conv.name || "Group Chat" 
                : conv.otherUser?.username || "Unknown";
              const avatarSrc = conv.is_group ? "" : (conv.otherUser?.avatar_url || "");
              const avatarFallback = conv.is_group 
                ? "👥" 
                : (conv.otherUser?.username?.charAt(0).toUpperCase() || "?");
              
              return (
                <Button
                  key={conv.id}
                  variant={selectedConversationId === conv.id ? "secondary" : "ghost"}
                  className="w-full justify-start gap-3 h-auto py-3"
                  onClick={() => onSelectConversation(conv.id, displayName, conv.is_group)}
                >
                  <Avatar className="h-10 w-10 border-2 border-primary shrink-0">
                    <AvatarImage src={avatarSrc} alt={displayName} />
                    <AvatarFallback className="bg-secondary text-foreground">
                      {avatarFallback}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left overflow-hidden min-w-0">
                    <div className="font-medium truncate">{displayName}</div>
                    {conv.is_group && conv.participantCount && (
                      <div className="text-xs text-muted-foreground">
                        {conv.participantCount} members
                      </div>
                    )}
                    {conv.lastMessage && (
                      <div className="text-xs text-muted-foreground truncate mt-1">
                        {conv.lastMessage}
                      </div>
                    )}
                  </div>
                </Button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default ConversationsList;
