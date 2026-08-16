import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Music2, Users, UserPlus } from "lucide-react";
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

interface CoBroadcaster {
  user_id: string;
  username?: string;
}

interface Props {
  channelId: string;
  channelOwnerId: string;
  userId: string;
}

export default function RadioBroadcasterPanel({ channelId, channelOwnerId, userId }: Props) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [coBroadcasters, setCoBroadcasters] = useState<CoBroadcaster[]>([]);
  const [q, setQ] = useState("");
  const isOwner = userId === channelOwnerId;

  const loadSongs = async () => {
    const { data } = await supabase
      .from("radio_songs")
      .select("*")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: false });
    setSongs((data as any) || []);
  };

  const loadCoBroadcasters = async () => {
    const { data } = await supabase
      .from("radio_channel_broadcasters" as any)
      .select("user_id")
      .eq("channel_id", channelId);
    const ids = ((data as any) || []).map((r: any) => r.user_id);
    if (ids.length === 0) return setCoBroadcasters([]);
    const { data: profs } = await supabase.from("profiles").select("id, username").in("id", ids);
    const map = new Map((profs || []).map((p: any) => [p.id, p.username]));
    setCoBroadcasters(ids.map((id: string) => ({ user_id: id, username: map.get(id) })));
  };

  useEffect(() => {
    loadSongs();
    loadCoBroadcasters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId]);

  const removeSong = async (s: Song) => {
    const { error } = await supabase.from("radio_songs").delete().eq("id", s.id);
    if (error) return toast.error(error.message);
    await supabase.storage.from("radio-audio").remove([s.audio_url]).catch(() => {});
    if (s.cover_url) await supabase.storage.from("radio-covers").remove([s.cover_url]).catch(() => {});
    toast.success("Song removed");
    loadSongs();
  };

  const addCoBroadcaster = async () => {
    if (!q.trim()) return;
    const { data: prof } = await supabase.from("profiles").select("id").eq("username", q.trim()).maybeSingle();
    if (!prof) return toast.error("User not found");
    const { error } = await supabase
      .from("radio_channel_broadcasters" as any)
      .insert({ channel_id: channelId, user_id: (prof as any).id, added_by: userId });
    if (error) return toast.error(error.message);
    toast.success("Added as channel broadcaster");
    setQ("");
    loadCoBroadcasters();
  };

  const removeCoBroadcaster = async (id: string) => {
    const { error } = await supabase
      .from("radio_channel_broadcasters" as any)
      .delete()
      .eq("channel_id", channelId)
      .eq("user_id", id);
    if (error) return toast.error(error.message);
    loadCoBroadcasters();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Music2 className="h-4 w-4" /> Songs on this channel
          </h3>
          <RadioUploadSongDialog userId={userId} channelId={channelId} onUploaded={loadSongs} />
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {songs.map((s) => (
            <div key={s.id} className="flex items-center gap-2 p-2 rounded-lg border border-border">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{s.title}</div>
                <div className="text-xs text-muted-foreground truncate">{s.artist || "—"}</div>
              </div>
              {(s.uploader_id === userId || isOwner) && (
                <Button size="icon" variant="ghost" onClick={() => removeSong(s)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          ))}
          {songs.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No songs uploaded</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="font-semibold text-sm mb-3">News (up to 50, one plays every 30 min)</h3>
        <RadioNewsManager userId={userId} channelId={channelId} />
      </div>

      {isOwner && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
            <Users className="h-4 w-4" /> Co-Broadcasters
          </h3>
          <div className="flex gap-2 mb-3">
            <Input placeholder="Username" value={q} onChange={(e) => setQ(e.target.value)} />
            <Button size="sm" onClick={addCoBroadcaster}>
              <UserPlus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {coBroadcasters.map((c) => (
              <div key={c.user_id} className="flex items-center gap-2 p-2 rounded-lg border border-border">
                <div className="flex-1 text-sm">{c.username || c.user_id}</div>
                {c.user_id !== channelOwnerId && (
                  <Button size="icon" variant="ghost" onClick={() => removeCoBroadcaster(c.user_id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
            {coBroadcasters.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">Just you so far</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
