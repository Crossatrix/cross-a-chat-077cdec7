import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Radio, X, MicOff, VideoOff, Mic, Video as VideoIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  streamId: string;
  userId: string;
  onEnd: () => void;
}

const ICE = { iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }] };

/**
 * Broadcaster: captures camera+mic, listens for viewer_join signals,
 * creates a peer connection per viewer, sends offer, receives answer + ICE.
 */
const LiveBroadcaster = ({ streamId, userId, onEnd }: Props) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const [viewerCount, setViewerCount] = useState(0);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      try {
        const ms = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!mounted) { ms.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = ms;
        if (videoRef.current) videoRef.current.srcObject = ms;
      } catch (e: any) {
        setError("Camera/mic access denied");
        return;
      }

      // Subscribe to incoming signals (viewer joins, answers, ICE)
      channel = supabase
        .channel(`livestream-${streamId}-host`)
        .on("postgres_changes", {
          event: "INSERT", schema: "public", table: "livestream_signals",
          filter: `stream_id=eq.${streamId}`,
        }, async (payload: any) => {
          const sig = payload.new;
          if (sig.from_user_id === userId) return;

          if (sig.signal_type === "viewer_join") {
            await createPeerForViewer(sig.from_user_id);
          } else if (sig.to_user_id === userId && sig.signal_type === "answer") {
            const pc = peersRef.current.get(sig.from_user_id);
            if (pc) await pc.setRemoteDescription(JSON.parse(sig.signal_data));
          } else if (sig.to_user_id === userId && sig.signal_type === "ice") {
            const pc = peersRef.current.get(sig.from_user_id);
            if (pc) {
              try { await pc.addIceCandidate(JSON.parse(sig.signal_data)); } catch {}
            }
          }
        })
        .subscribe();
    })();

    const createPeerForViewer = async (viewerId: string) => {
      if (peersRef.current.has(viewerId)) return;
      const pc = new RTCPeerConnection(ICE);
      peersRef.current.set(viewerId, pc);
      streamRef.current?.getTracks().forEach(t => pc.addTrack(t, streamRef.current!));
      pc.onicecandidate = (ev) => {
        if (ev.candidate) {
          supabase.from("livestream_signals").insert({
            stream_id: streamId, from_user_id: userId, to_user_id: viewerId,
            signal_type: "ice", signal_data: JSON.stringify(ev.candidate),
          } as any);
        }
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") setViewerCount(c => c + 1);
        if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
          setViewerCount(c => Math.max(0, c - 1));
          peersRef.current.delete(viewerId);
        }
      };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await supabase.from("livestream_signals").insert({
        stream_id: streamId, from_user_id: userId, to_user_id: viewerId,
        signal_type: "offer", signal_data: JSON.stringify(offer),
      } as any);
    };

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
      streamRef.current?.getTracks().forEach(t => t.stop());
      peersRef.current.forEach(p => p.close());
      peersRef.current.clear();
    };
  }, [streamId, userId]);

  // Update viewer_count periodically
  useEffect(() => {
    const interval = setInterval(() => {
      supabase.from("livestreams").update({ viewer_count: viewerCount } as any).eq("id", streamId);
    }, 5000);
    return () => clearInterval(interval);
  }, [viewerCount, streamId]);

  const toggleMute = () => {
    const audio = streamRef.current?.getAudioTracks()[0];
    if (audio) { audio.enabled = !audio.enabled; setMuted(!audio.enabled); }
  };
  const toggleCam = () => {
    const video = streamRef.current?.getVideoTracks()[0];
    if (video) { video.enabled = !video.enabled; setCamOff(!video.enabled); }
  };

  const endStream = async () => {
    await supabase.from("livestreams").update({
      status: "ended", ended_at: new Date().toISOString(),
    } as any).eq("id", streamId);
    toast.success("Stream ended");
    onEnd();
  };

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center text-white p-6">
        <p className="mb-4">{error}</p>
        <Button onClick={onEnd}>Close</Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between p-3 bg-black/70 text-white">
        <div className="flex items-center gap-2">
          <span className="bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
            <Radio className="h-3 w-3" /> LIVE
          </span>
          <span className="text-sm">{viewerCount} viewer{viewerCount !== 1 ? "s" : ""}</span>
        </div>
        <Button variant="destructive" size="sm" onClick={endStream}>
          <X className="h-4 w-4 mr-1" /> End Stream
        </Button>
      </div>
      <video ref={videoRef} autoPlay muted playsInline className="flex-1 w-full object-contain bg-black" />
      <div className="flex items-center justify-center gap-3 p-4 bg-black/70">
        <Button variant={muted ? "destructive" : "secondary"} size="icon" onClick={toggleMute}>
          {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>
        <Button variant={camOff ? "destructive" : "secondary"} size="icon" onClick={toggleCam}>
          {camOff ? <VideoOff className="h-5 w-5" /> : <VideoIcon className="h-5 w-5" />}
        </Button>
      </div>
    </div>
  );
};

export default LiveBroadcaster;
