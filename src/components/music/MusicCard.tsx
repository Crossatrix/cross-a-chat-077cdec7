import { useState, useEffect, useRef } from "react";
import { Play, Pause, ThumbsUp, ThumbsDown, Music as MusicIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { creditCroins } from "@/utils/croins";
import StaffBadge from "@/components/StaffBadge";
import CreatorBadge from "@/components/video/CreatorBadge";
import FeaturedAvatar from "@/components/video/FeaturedAvatar";
import ShareLinkButton from "@/components/ShareLinkButton";

export interface MusicTrack {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  audio_url: string;
  cover_url: string | null;
  duration: number;
  plays_count: number;
  likes_count: number;
  dislikes_count: number;
  created_at: string;
  profiles: { username: string; avatar_url: string | null };
}

interface Props {
  track: MusicTrack;
  currentUserId: string;
  onCreatorClick?: (id: string) => void;
  onDeleted?: () => void;
}

const MusicCard = ({ track, currentUserId, onCreatorClick, onDeleted }: Props) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [liked, setLiked] = useState<boolean | null>(null);
  const [likes, setLikes] = useState(track.likes_count);
  const [dislikes, setDislikes] = useState(track.dislikes_count);
  const [played, setPlayed] = useState(false);

  useEffect(() => { fetchLike(); }, [track.id]);

  const fetchLike = async () => {
    const { data } = await supabase.from("music_likes").select("is_like")
      .eq("track_id", track.id).eq("user_id", currentUserId).maybeSingle();
    if (data) setLiked((data as any).is_like);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
      if (!played) {
        setPlayed(true);
        supabase.from("music_tracks").update({ plays_count: track.plays_count + 1 } as any).eq("id", track.id);
      }
    }
  };

  const onTime = () => {
    if (!audioRef.current) return;
    const d = audioRef.current.duration || track.duration || 1;
    setProgress((audioRef.current.currentTime / d) * 100);
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = (audioRef.current.duration || track.duration) * pct;
  };

  const vote = async (isLike: boolean) => {
    if (liked === isLike) {
      await supabase.from("music_likes").delete().eq("track_id", track.id).eq("user_id", currentUserId);
      if (isLike) setLikes(l => Math.max(0, l - 1)); else setDislikes(d => Math.max(0, d - 1));
      setLiked(null);
      await supabase.from("music_tracks").update({
        likes_count: isLike ? Math.max(0, likes - 1) : likes,
        dislikes_count: !isLike ? Math.max(0, dislikes - 1) : dislikes,
      } as any).eq("id", track.id);
    } else {
      const { error } = await supabase.from("music_likes").upsert(
        { track_id: track.id, user_id: currentUserId, is_like: isLike } as any,
        { onConflict: "track_id,user_id" }
      );
      if (error) { toast.error("Failed to vote"); return; }
      let nl = likes, nd = dislikes;
      if (liked === true) nl--;
      if (liked === false) nd--;
      if (isLike) nl++; else nd++;
      if (isLike && liked === null && track.user_id !== currentUserId) {
        creditCroins(track.user_id, 1, "Like on music track");
      }
      setLikes(nl); setDislikes(nd); setLiked(isLike);
      await supabase.from("music_tracks").update({ likes_count: nl, dislikes_count: nd } as any).eq("id", track.id);
    }
  };

  const handleDelete = async () => {
    const { error } = await supabase.from("music_tracks").delete().eq("id", track.id);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("Track deleted");
    onDeleted?.();
  };

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden">
      <audio ref={audioRef} src={track.audio_url}
        onTimeUpdate={onTime}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setProgress(0); }}
      />
      <div className="flex gap-3 p-3">
        <div className="relative shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-muted">
          {track.cover_url ? (
            <img src={track.cover_url} alt={track.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/30 to-secondary/30">
              <MusicIcon className="h-8 w-8 text-primary" />
            </div>
          )}
          <button onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/60 transition-colors">
            {playing ? <Pause className="h-7 w-7 text-white" /> : <Play className="h-7 w-7 text-white" />}
          </button>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold truncate">{track.title}</h3>
          <div className="flex items-center gap-1 mt-0.5">
            <FeaturedAvatar
              userId={track.user_id}
              avatarUrl={track.profiles.avatar_url}
              username={track.profiles.username}
              avatarClassName="h-5 w-5"
              fallbackClassName="bg-secondary text-foreground text-[10px]"
              className="cursor-pointer"
              onClick={() => onCreatorClick?.(track.user_id)}
            />
            <StaffBadge userId={track.user_id} size={12} />
            <CreatorBadge userId={track.user_id} size={12} />
            <span className="text-xs text-muted-foreground truncate cursor-pointer hover:underline"
              onClick={() => onCreatorClick?.(track.user_id)}>
              {track.profiles.username}
            </span>
          </div>
          {track.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{track.description}</p>}
          {/* Progress bar */}
          <div className="mt-2 cursor-pointer" onClick={seek}>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
              <span>{fmtTime((audioRef.current?.currentTime) || 0)}</span>
              <span>{fmtTime(track.duration)}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 px-2 py-1.5 border-t border-border">
        <Button variant="ghost" size="sm" className={`gap-1 text-xs ${liked === true ? "text-primary" : "text-muted-foreground"}`}
          onClick={() => vote(true)}>
          <ThumbsUp className="h-3.5 w-3.5" />{likes > 0 && likes}
        </Button>
        <Button variant="ghost" size="sm" className={`gap-1 text-xs ${liked === false ? "text-destructive" : "text-muted-foreground"}`}
          onClick={() => vote(false)}>
          <ThumbsDown className="h-3.5 w-3.5" />{dislikes > 0 && dislikes}
        </Button>
        <span className="ml-auto text-[11px] text-muted-foreground">{track.plays_count} plays</span>
        {track.user_id === currentUserId && (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={handleDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default MusicCard;
