import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Msg { id: string; user_id: string; message: string; croins_gift: number; username?: string }

/** Floating chat feed shown over the streamer's own preview. */
const StreamerChatOverlay = ({ streamId }: { streamId: string }) => {
  const [msgs, setMsgs] = useState<Msg[]>([]);

  useEffect(() => {
    const names = new Map<string, string>();
    const hydrate = async (list: Msg[]) => {
      const missing = [...new Set(list.map(m => m.user_id).filter(id => !names.has(id)))];
      if (missing.length) {
        const { data } = await supabase.from("profiles").select("id, username, creator_username").in("id", missing);
        (data || []).forEach((p: any) => names.set(p.id, p.creator_username || p.username));
      }
      return list.map(m => ({ ...m, username: names.get(m.user_id) || "user" }));
    };

    (async () => {
      const { data } = await supabase.from("livestream_chat").select("id, user_id, message, croins_gift")
        .eq("stream_id", streamId).order("created_at", { ascending: false }).limit(15);
      setMsgs(await hydrate(((data || []) as Msg[]).reverse()));
    })();

    const ch = supabase.channel(`live-overlay-${streamId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "livestream_chat", filter: `stream_id=eq.${streamId}` },
        async (payload: any) => {
          const [m] = await hydrate([payload.new as Msg]);
          setMsgs(prev => [...prev, m].slice(-15));
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [streamId]);

  return (
    <div className="pointer-events-none absolute left-2 bottom-2 w-[min(85%,22rem)] max-h-[45%] overflow-hidden flex flex-col justify-end gap-1">
      {msgs.map(m => (
        <div key={m.id} className="bg-black/60 text-white rounded-lg px-2 py-1 text-xs break-words animate-in fade-in slide-in-from-bottom-1">
          <span data-no-translate className="font-semibold text-primary mr-1">{m.username}</span>
          {m.croins_gift > 0 && <span className="text-primary font-bold mr-1">🪙{m.croins_gift}</span>}
          <span data-no-translate>{m.message}</span>
        </div>
      ))}
    </div>
  );
};

export default StreamerChatOverlay;
