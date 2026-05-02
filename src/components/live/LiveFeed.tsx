import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Radio, Loader2, Eye, ThumbsUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import LiveViewer, { Livestream } from "./LiveViewer";
import LiveBroadcaster from "./LiveBroadcaster";
import GoLiveDialog from "./GoLiveDialog";
import StaffBadge from "@/components/StaffBadge";
import CreatorBadge from "@/components/video/CreatorBadge";
import FeaturedAvatar from "@/components/video/FeaturedAvatar";

interface Props {
  currentUserId: string;
  onCreatorClick?: (id: string) => void;
}

const LiveFeed = ({ currentUserId, onCreatorClick }: Props) => {
  const [streams, setStreams] = useState<Livestream[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Livestream | null>(null);
  const [broadcastingId, setBroadcastingId] = useState<string | null>(null);

  useEffect(() => { fetch(); }, []);

  const fetch = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("livestreams")
      .select("*, profiles!livestreams_user_id_fkey(username, avatar_url)")
      .eq("status", "live")
      .order("started_at", { ascending: false })
      .limit(50);
    setStreams((data || []) as unknown as Livestream[]);
    setLoading(false);
  };

  if (broadcastingId) {
    return <LiveBroadcaster streamId={broadcastingId} userId={currentUserId}
      onEnd={() => { setBroadcastingId(null); fetch(); }} />;
  }
  if (selected) {
    return <LiveViewer stream={selected} currentUserId={currentUserId}
      onBack={() => { setSelected(null); fetch(); }} onCreatorClick={onCreatorClick} />;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-2">
          <Radio className="h-5 w-5 text-destructive" />
          <h2 className="text-lg font-bold text-primary">Live</h2>
        </div>
        <GoLiveDialog userId={currentUserId} onLiveStart={(id) => setBroadcastingId(id)} />
      </div>
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : streams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <Radio className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No one's live right now</h3>
            <p className="text-sm text-muted-foreground">Be the first to go live!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-3">
            {streams.map((s) => (
              <button key={s.id} onClick={() => setSelected(s)}
                className="rounded-xl overflow-hidden border border-border bg-card hover:border-primary/50 transition-colors text-left">
                <div className="relative aspect-video bg-gradient-to-br from-destructive/30 to-primary/30 flex items-center justify-center">
                  <Radio className="h-10 w-10 text-white/80" />
                  <span className="absolute top-1.5 left-1.5 bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                    LIVE
                  </span>
                  <span className="absolute bottom-1.5 right-1.5 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                    <Eye className="h-3 w-3" />{s.viewer_count}
                  </span>
                </div>
                <div className="p-2.5 flex gap-2">
                  <FeaturedAvatar userId={s.user_id} avatarUrl={s.profiles.avatar_url} username={s.profiles.username}
                    avatarClassName="h-8 w-8 shrink-0" fallbackClassName="bg-secondary text-foreground text-xs"
                    className="shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold line-clamp-2 leading-tight">{s.title}</h3>
                    <div className="flex items-center gap-1 mt-1">
                      <StaffBadge userId={s.user_id} size={12} />
                      <CreatorBadge userId={s.user_id} size={12} />
                      <span className="text-xs text-muted-foreground truncate">{s.profiles.username}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-0.5"><ThumbsUp className="h-3 w-3" />{s.likes_count}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default LiveFeed;
