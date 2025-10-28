import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";

interface Conversation {
  id: string;
  updated_at: string;
  otherUser: {
    id: string;
    username: string;
  };
  lastMessage?: string;
}

interface ConversationsListProps {
  currentUserId: string;
  onSelectConversation: (conversationId: string, otherUsername: string) => void;
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
          conversations!inner(id, updated_at)
        `)
        .eq("user_id", currentUserId);

      if (!participantData) return;

      const conversationIds = participantData.map((p: any) => p.conversation_id);

      // Get other participants
      const { data: otherParticipants } = await supabase
        .from("conversation_participants")
        .select("conversation_id, user_id, profiles!inner(username)")
        .in("conversation_id", conversationIds)
        .neq("user_id", currentUserId);

      const conversationsMap = new Map();
      participantData.forEach((p: any) => {
        conversationsMap.set(p.conversation_id, {
          id: p.conversation_id,
          updated_at: p.conversations.updated_at,
        });
      });

      otherParticipants?.forEach((p: any) => {
        const conv = conversationsMap.get(p.conversation_id);
        if (conv) {
          conv.otherUser = {
            id: p.user_id,
            username: p.profiles.username,
          };
        }
      });

      setConversations(Array.from(conversationsMap.values()));
    };

    fetchConversations();
  }, [currentUserId]);

  return (
    <div className="w-80 border-r border-border bg-card">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold">Conversations</h2>
      </div>
      <ScrollArea className="h-[calc(100vh-8rem)]">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs mt-1">Click on a username to start chatting</p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {conversations.map((conv) => (
              <Button
                key={conv.id}
                variant={selectedConversationId === conv.id ? "secondary" : "ghost"}
                className="w-full justify-start gap-3 h-auto py-3"
                onClick={() => onSelectConversation(conv.id, conv.otherUser?.username || "Unknown")}
              >
                <Avatar className="h-10 w-10 border-2 border-primary">
                  <AvatarFallback className="bg-secondary text-foreground">
                    {conv.otherUser?.username?.charAt(0).toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <div className="font-medium">{conv.otherUser?.username || "Unknown"}</div>
                </div>
              </Button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default ConversationsList;
