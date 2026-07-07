import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Trash2, Music2 } from "lucide-react";
import { toast } from "sonner";
import RadioUploadSongDialog from "./RadioUploadSongDialog";
import RadioNewsManager from "./RadioNewsManager";

interface Song {
  id: string;
  title: string;
  artist: string | null;
  uploader_id: string;
  audio_url: string;
  cover_url: string | null;
  duration_seconds: number;
}

export default function RadioBroadcasterPanel({ userId }: { userId: string }) {
  const [songs, setSongs] = useState<Song[]>([]);

  const load = async () => {
    const { data } = await supabase
      .from("radio_songs")
      .select("*")
      .eq("uploader_id", userId)
      .order("created_at", { ascending: false });
    setSongs((data as any) || []);
  };

  useEffect(() => {
    load();
  }, [userId]);

  const remove = async (s: Song) => {
    const { error } = await supabase.from("radio_songs").delete().eq("id", s.id);
    if (error) return toast.error(error.message);
    await supabase.storage.from("radio-audio").remove([s.audio_url]).catch(() => {});
    if (s.cover_url) await supabase.storage.from("radio-covers").remove([s.cover_url]).catch(() => {});
    toast.success("Song removed");
    load();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Music2 className="h-4 w-4" /> My Songs
          </h3>
          <RadioUploadSongDialog userId={userId} onUploaded={load} />
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {songs.map((s) => (
            <div key={s.id} className="flex items-center gap-2 p-2 rounded-lg border border-border">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{s.title}</div>
                <div className="text-xs text-muted-foreground truncate">{s.artist || "—"}</div>
              </div>
              <Button size="icon" variant="ghost" onClick={() => remove(s)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          {songs.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No songs uploaded</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="font-semibold text-sm mb-3">News (up to 50, one plays every 30 min)</h3>
        <RadioNewsManager userId={userId} />
      </div>
    </div>
  );
}
