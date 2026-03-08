import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatMessageText } from "@/utils/textFormatting";
import ReactionPicker from "./ReactionPicker";
import { SmilePlus } from "lucide-react";

interface Reaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  is_custom: boolean;
}

interface MessageReactionsProps {
  messageId: string;
  currentUserId: string | undefined;
  conversationId: string | null;
}

interface GroupedReaction {
  emoji: string;
  is_custom: boolean;
  count: number;
  userIds: string[];
  reacted: boolean;
}

const MessageReactions = ({ messageId, currentUserId, conversationId }: MessageReactionsProps) => {
  const [reactions, setReactions] = useState<Reaction[]>([]);

  const fetchReactions = async () => {
    const { data } = await supabase
      .from("message_reactions")
      .select("*")
      .eq("message_id", messageId);
    if (data) setReactions(data as Reaction[]);
  };

  useEffect(() => {
    fetchReactions();
  }, [messageId]);

  // Realtime
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`reactions-${messageId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_reactions", filter: `message_id=eq.${messageId}` },
        () => fetchReactions()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [messageId, conversationId]);

  const grouped = useMemo<GroupedReaction[]>(() => {
    const map = new Map<string, GroupedReaction>();
    reactions.forEach((r) => {
      const existing = map.get(r.emoji);
      if (existing) {
        existing.count++;
        existing.userIds.push(r.user_id);
        if (r.user_id === currentUserId) existing.reacted = true;
      } else {
        map.set(r.emoji, {
          emoji: r.emoji,
          is_custom: r.is_custom,
          count: 1,
          userIds: [r.user_id],
          reacted: r.user_id === currentUserId,
        });
      }
    });
    return Array.from(map.values());
  }, [reactions, currentUserId]);

  const handleToggle = async (emoji: string, isCustom: boolean) => {
    if (!currentUserId) return;
    const existing = reactions.find((r) => r.user_id === currentUserId && r.emoji === emoji);
    if (existing) {
      await supabase.from("message_reactions").delete().eq("id", existing.id);
    } else {
      await supabase.from("message_reactions").insert({
        message_id: messageId,
        user_id: currentUserId,
        emoji,
        is_custom: isCustom,
      });
    }
  };

  const handleNewReaction = async (emoji: string, isCustom: boolean) => {
    await handleToggle(emoji, isCustom);
  };

  if (grouped.length === 0 && !currentUserId) return null;

  return (
    <div className="flex items-center gap-1 flex-wrap mt-0.5">
      {grouped.map((g) => (
        <button
          key={g.emoji}
          onClick={() => handleToggle(g.emoji, g.is_custom)}
          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-colors ${
            g.reacted
              ? "bg-primary/20 border-primary/40 text-primary"
              : "bg-muted/50 border-border hover:bg-muted"
          }`}
        >
          {g.is_custom ? (
            <span className="inline-flex">{formatMessageText(g.emoji)}</span>
          ) : (
            <span>{g.emoji}</span>
          )}
          <span className="font-medium">{g.count}</span>
        </button>
      ))}
      {currentUserId && (
        <ReactionPicker onReact={handleNewReaction}>
          <button className="inline-flex items-center p-1 rounded-full hover:bg-muted border border-transparent hover:border-border transition-colors">
            <SmilePlus className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </ReactionPicker>
      )}
    </div>
  );
};

export default MessageReactions;
