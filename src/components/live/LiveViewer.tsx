import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Radio, ThumbsUp, ThumbsDown, Loader2, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { creditCroins } from "@/utils/croins";
import StaffBadge from "@/components/StaffBadge";
import CreatorBadge from "@/components/video/CreatorBadge";
import FeaturedAvatar from "@/components/video/FeaturedAvatar";
import LiveChat from "./LiveChat";
import SendCroinsDialog from "./SendCroinsDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CreatorEmoji } from "@/utils/memberships";

export interface Livestream {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string;
  adults_only: boolean;
  status: string;
  thumbnail_url: string | null;
  viewer_count: number;
  likes_count: number;
  dislikes_count: number;
  started_at: string;
  profiles: { username: string; avatar_url: string | null };
}

interface Props {
  stream: Livestream;
  currentUserId: string;
  onBack: () => void;
  onCreatorClick?: (id: string) => void;
}

const ICE = { iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }] };

const LiveViewer = ({ stream, currentUserId, onBack, onCreatorClick }: Props) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [connected, setConnected] = useState(false);
  const [ended, setEnded] = useState(stream.status === "ended");
  const [liked, setLiked] = useState<boolean | null>(null);
  const [likes, setLikes] = useState(stream.likes_count);
  const [dislikes, setDislikes] = useState(stream.dislikes_count);
  const [quality, setQuality] = useState<"low" | "medium" | "high">("high");
  const [giftOpen, setGiftOpen] = useState(false);
  const [emojis, setEmojis] = useState<CreatorEmoji[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("creator_emojis" as any).select("*").eq("creator_id", stream.user_id);
      setEmojis((data || []) as any);
    })();
  }, [stream.user_id]);

  // Apply quality bandwidth limit on the receiver
  useEffect(() => {
    const pc = pcRef.current;
    if (!pc) return;
    const cap = quality === "low" ? 250_000 : quality === "medium" ? 800_000 : 2_500_000;
    pc.getReceivers().forEach((r) => {
      try {
        const params = (r as any).getParameters?.() || {};
        params.encodings = params.encodings || [{}];
        params.encodings[0].maxBitrate = cap;
        (r as any).setParameters?.(params).catch(() => {});
      } catch {}
    });
    if (videoRef.current) {
      videoRef.current.style.imageRendering = quality === "low" ? "pixelated" : "auto";
    }
  }, [quality, connected]);

  useEffect(() => {
    if (ended) return;
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const pc = new RTCPeerConnection(ICE);
    pcRef.current = pc;

    pc.ontrack = (ev) => {
      if (videoRef.current && ev.streams[0]) {
        videoRef.current.srcObject = ev.streams[0];
        setConnected(true);
      }
    };
    pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        supabase.from("livestream_signals").insert({
          stream_id: stream.id, from_user_id: currentUserId, to_user_id: stream.user_id,
          signal_type: "ice", signal_data: JSON.stringify(ev.candidate),
        } as any);
      }
    };

    channel = supabase
      .channel(`livestream-${stream.id}-viewer-${currentUserId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "livestream_signals",
        filter: `stream_id=eq.${stream.id}`,
      }, async (payload: any) => {
        const sig = payload.new;
        if (sig.to_user_id !== currentUserId) return;
        if (sig.from_user_id !== stream.user_id) return;

        if (sig.signal_type === "offer") {
          await pc.setRemoteDescription(JSON.parse(sig.signal_data));
          const ans = await pc.createAnswer();
          await pc.setLocalDescription(ans);
          await supabase.from("livestream_signals").insert({
            stream_id: stream.id, from_user_id: currentUserId, to_user_id: stream.user_id,
            signal_type: "answer", signal_data: JSON.stringify(ans),
          } as any);
        } else if (sig.signal_type === "ice") {
          try { await pc.addIceCandidate(JSON.parse(sig.signal_data)); } catch {}
        }
      })
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "livestreams",
        filter: `id=eq.${stream.id}`,
      }, (payload: any) => {
        if (payload.new.status === "ended") setEnded(true);
      })
      .subscribe(async () => {
        // Tell broadcaster we joined
        await supabase.from("livestream_signals").insert({
          stream_id: stream.id, from_user_id: currentUserId, to_user_id: null,
          signal_type: "viewer_join", signal_data: "join",
        } as any);
      });

    fetchLike();

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
      pc.close();
    };
  }, [stream.id, ended]);

  const fetchLike = async () => {
    const { data } = await supabase.from("livestream_likes").select("is_like")
      .eq("stream_id", stream.id).eq("user_id", currentUserId).maybeSingle();
    if (data) setLiked((data as any).is_like);
  };

  const vote = async (isLike: boolean) => {
    if (liked === isLike) {
      await supabase.from("livestream_likes").delete().eq("stream_id", stream.id).eq("user_id", currentUserId);
      if (isLike) setLikes(l => Math.max(0, l - 1)); else setDislikes(d => Math.max(0, d - 1));
      setLiked(null);
      await supabase.from("livestreams").update({
        likes_count: isLike ? Math.max(0, likes - 1) : likes,
        dislikes_count: !isLike ? Math.max(0, dislikes - 1) : dislikes,
      } as any).eq("id", stream.id);
    } else {
      const { error } = await supabase.from("livestream_likes").upsert(
        { stream_id: stream.id, user_id: currentUserId, is_like: isLike } as any,
        { onConflict: "stream_id,user_id" }
      );
      if (error) { toast.error("Failed to vote"); return; }
      let nl = likes, nd = dislikes;
      if (liked === true) nl--;
      if (liked === false) nd--;
      if (isLike) nl++; else nd++;
      if (isLike && liked === null && stream.user_id !== currentUserId) {
        creditCroins(stream.user_id, 1, "Like on livestream");
      }
      setLikes(nl); setDislikes(nd); setLiked(isLike);
      await supabase.from("livestreams").update({ likes_count: nl, dislikes_count: nd } as any).eq("id", stream.id);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center gap-2 p-3 border-b border-border bg-card shrink-0">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
        <span className="bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
          <Radio className="h-3 w-3" /> {ended ? "ENDED" : "LIVE"}
        </span>
        <span className="text-xs text-muted-foreground ml-auto">{stream.viewer_count} watching</span>
      </div>

      <div className="relative bg-black aspect-video">
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-contain" />
        {!connected && !ended && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-2">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="text-sm">Connecting to stream...</span>
          </div>
        )}
        {ended && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white">
            <span className="text-lg font-semibold">Stream has ended</span>
          </div>
        )}
      </div>

      <div className="p-3 space-y-2">
        <h2 className="text-base font-bold">{stream.title}</h2>
        {stream.description && <p className="text-sm text-muted-foreground">{stream.description}</p>}
        <div className="flex items-center gap-2">
          <FeaturedAvatar
            userId={stream.user_id}
            avatarUrl={stream.profiles.avatar_url}
            username={stream.profiles.username}
            avatarClassName="h-7 w-7"
            fallbackClassName="bg-secondary text-foreground text-xs"
            className="cursor-pointer"
            onClick={() => onCreatorClick?.(stream.user_id)}
          />
          <StaffBadge userId={stream.user_id} size={14} />
          <CreatorBadge userId={stream.user_id} size={14} />
          <span className="text-sm font-medium cursor-pointer hover:underline"
            onClick={() => onCreatorClick?.(stream.user_id)}>
            {stream.profiles.username}
          </span>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Button variant={liked === true ? "default" : "outline"} size="sm" className="gap-1" onClick={() => vote(true)}>
            <ThumbsUp className="h-4 w-4" />{likes}
          </Button>
          <Button variant={liked === false ? "destructive" : "outline"} size="sm" className="gap-1" onClick={() => vote(false)}>
            <ThumbsDown className="h-4 w-4" />{dislikes}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LiveViewer;
