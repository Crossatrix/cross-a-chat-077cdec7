import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Music as MusicIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import MusicUploadDialog from "./MusicUploadDialog";
import MusicCard, { MusicTrack } from "./MusicCard";

interface Props {
  currentUserId: string;
  onCreatorClick?: (id: string) => void;
}

const MusicFeed = ({ currentUserId, onCreatorClick }: Props) => {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetch(); }, []);

  const fetch = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("music_tracks")
      .select("*, profiles!music_tracks_user_id_fkey(username, avatar_url)")
      .order("created_at", { ascending: false })
      .limit(100);
    setTracks((data || []) as unknown as MusicTrack[]);
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
              <MusicCard key={t.id} track={t} currentUserId={currentUserId}
                onCreatorClick={onCreatorClick} onDeleted={fetch} />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default MusicFeed;
