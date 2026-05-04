import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Gem } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sendCroinsGift, getActiveMembership, type CreatorEmoji } from "@/utils/memberships";

interface ChatRow {
  id: string;
  stream_id: string;
  user_id: string;
  message: string;
  croins_gift: number;
  created_at: string;
  username?: string;
  avatar_url?: string | null;
}

interface Props {
  streamId: string;
  streamerId: string;
  currentUserId: string;
  emojis: CreatorEmoji[];
  onOpenGift: () => void;
}

const LiveChat = ({ streamId, streamerId, currentUserId, emojis, onOpenGift }: Props) => {
  const [messages, setMessages] = useState<ChatRow[]>([]);
  const [text, setText] = useState("");
  const [activeMembershipId, setActiveMembershipId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("livestream_chat" as any)
        .select("*")
        .eq("stream_id", streamId)
        .order("created_at", { ascending: true })
        .limit(100);
      if (mounted && data) {
        const rows = data as any as ChatRow[];
        await hydrate(rows);
      }
      const mid = await getActiveMembership(currentUserId, streamerId);
      if (mounted) setActiveMembershipId(mid);
    })();

    const ch = supabase
      .channel(`live-chat-${streamId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "livestream_chat", filter: `stream_id=eq.${streamId}` },
        async (payload: any) => {
          const row = payload.new as ChatRow;
          await hydrate([row]);
        }
      )
      .subscribe();

    return () => { mounted = false; supabase.removeChannel(ch); };
  }, [streamId, currentUserId, streamerId]);

  const hydrate = async (rows: ChatRow[]) => {
    const ids = Array.from(new Set(rows.map(r => r.user_id)));
    const { data: profs } = await supabase.from("profiles").select("id, username, avatar_url").in("id", ids);
    const map = new Map((profs || []).map((p: any) => [p.id, p]));
    const enriched = rows.map(r => ({
      ...r,
      username: (map.get(r.user_id) as any)?.username || "User",
      avatar_url: (map.get(r.user_id) as any)?.avatar_url ?? null,
    }));
    setMessages(prev => {
      const all = [...prev, ...enriched];
      const seen = new Set<string>();
      const dedup = all.filter(m => seen.has(m.id) ? false : (seen.add(m.id), true));
      return dedup.slice(-200);
    });
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 50);
  };

  const canUseEmoji = (e: CreatorEmoji) => {
    if (currentUserId === streamerId) return true;
    if (!e.membership_id) return true;
    return e.membership_id === activeMembershipId;
  };

  const renderMessage = (msg: string) => {
    // Replace :name: with creator emoji image when allowed
    const parts = msg.split(/(:[a-zA-Z0-9_]+:)/g);
    return parts.map((part, i) => {
      const m = part.match(/^:([a-zA-Z0-9_]+):$/);
      if (m) {
        const e = emojis.find(em => em.name === m[1]);
        if (e) {
          return <img key={i} src={e.image_url} alt={e.name} className="inline-block w-5 h-5 align-middle mx-0.5" />;
        }
      }
      return <span key={i}>{part}</span>;
    });
  };

  const send = async () => {
    const t = text.trim();
    if (!t) return;
    // Validate emojis used
    const usedNames = (t.match(/:([a-zA-Z0-9_]+):/g) || []).map(s => s.slice(1, -1));
    for (const n of usedNames) {
      const e = emojis.find(em => em.name === n);
      if (e && !canUseEmoji(e)) {
        toast.error(`Emoji :${n}: requires a membership.`);
        return;
      }
    }
    setText("");
    const { error } = await supabase.from("livestream_chat" as any).insert({
      stream_id: streamId, user_id: currentUserId, message: t, croins_gift: 0,
    });
    if (error) toast.error("Failed to send");
  };

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-3 py-2 border-b border-border text-xs font-semibold text-muted-foreground">Live chat</div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-1 text-sm">
        {messages.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No messages yet — say hi!</p>
        ) : messages.map(m => (
          <div key={m.id} className={`px-2 py-1 rounded ${m.croins_gift > 0 ? "bg-yellow-500/20 border border-yellow-500/40" : ""}`}>
            <span className="font-semibold text-primary mr-1.5">{m.username}:</span>
            <span className="break-words">{renderMessage(m.message)}</span>
            {m.croins_gift > 0 && (
              <span className="ml-2 inline-flex items-center gap-0.5 text-yellow-500 font-bold">
                <Gem className="h-3 w-3" /> {m.croins_gift}
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="p-2 border-t border-border flex items-center gap-1.5">
        <Input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") send(); }}
          placeholder="Say something..."
          maxLength={300}
          className="h-9 text-sm"
        />
        <Button size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={onOpenGift} title="Send Croins">
          <Gem className="h-4 w-4 text-yellow-500" />
        </Button>
        <Button size="icon" className="h-9 w-9 shrink-0" onClick={send}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default LiveChat;
