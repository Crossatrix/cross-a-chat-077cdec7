import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Music as MusicIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import MusicUploadDialog from "./MusicUploadDialog";
import MusicCard, { MusicTrack } from "./MusicCard";

interface Props {
  currentUserId: string;
  onCreatorClick?: (id: string) => void;
  deepLinkTrackId?: string | null;
  onDeepLinkConsumed?: () => void;
}

const MusicFeed = ({ currentUserId, onCreatorClick, deepLinkTrackId, onDeepLinkConsumed }: Props) => {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetch(); }, []);

  useEffect(() => {
    if (!deepLinkTrackId) return;
    setTimeout(() => {
      const el = document.getElementById(`music-${deepLinkTrackId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-primary");
        setTimeout(() => el.classList.remove("ring-2", "ring-primary"), 2500);
      }
      onDeepLinkConsumed?.();
    }, 600);
  }, [deepLinkTrackId, tracks.length]);

  const fetch = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("music_tracks")
      .select("*, profiles!music_tracks_user_id_fkey(username, avatar_url)")
      .order("created_at", { ascending: false })
      .limit(100);
    const { filterAccessibleMembersOnly } = await import("@/utils/memberships");
    const filtered = await filterAccessibleMembersOnly((data || []) as any, currentUserId);
    setTracks(filtered as unknown as MusicTrack[]);
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-2">
          <MusicIcon className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-primary">Music</h2>
        </div>
        <MusicUploadDialog userId={currentUserId} onUploaded={fetch} />
      </div>
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <MusicIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No music yet</h3>
            <p className="text-sm text-muted-foreground">Be the first to upload a track!</p>
          </div>
        ) : (
          <div className="space-y-3 p-3">
            {tracks.map((t) => (
              <div id={`music-${t.id}`} key={t.id} className="rounded-xl transition-shadow">
                <MusicCard track={t} currentUserId={currentUserId}
                  onCreatorClick={onCreatorClick} onDeleted={fetch} />
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default MusicFeed;
