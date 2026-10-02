import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Radio, X, MicOff, VideoOff, Mic, Video as VideoIcon, MonitorUp, MonitorOff } from "lucide-react";
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
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const screenSupported = typeof navigator !== "undefined" && !!(navigator.mediaDevices as any)?.getDisplayMedia;

  useEffect(() => {
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const send = (payload: any) => {
      channel?.send({ type: "broadcast", event: "sig", payload: { ...payload, from: userId } });
    };

    const createPeerForViewer = async (viewerId: string) => {
      const existing = peersRef.current.get(viewerId);
      if (existing) { existing.close(); peersRef.current.delete(viewerId); }
      const pc = new RTCPeerConnection(ICE);
      peersRef.current.set(viewerId, pc);
      streamRef.current?.getTracks().forEach(t => pc.addTrack(t, streamRef.current!));
      pc.onicecandidate = (ev) => {
        if (ev.candidate) send({ type: "ice", to: viewerId, data: ev.candidate.toJSON() });
      };
      pc.onconnectionstatechange = () => {
        if (peersRef.current.get(viewerId) !== pc) return;
        if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
          peersRef.current.delete(viewerId);
        }
        setViewerCount(Array.from(peersRef.current.values()).filter(p => p.connectionState === "connected").length);
      };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      send({ type: "offer", to: viewerId, data: { type: offer.type, sdp: offer.sdp } });
    };

    (async () => {
      try {
        const ms = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!mounted) { ms.getTracks().forEach(t => t.stop()); return; }
        cameraStreamRef.current = ms;
        streamRef.current = ms;
        if (videoRef.current) videoRef.current.srcObject = ms;
      } catch (e: any) {
        setError("Camera/mic access denied");
        return;
      }

      channel = supabase
        .channel(`live-${streamId}`, { config: { broadcast: { self: false } } })
        .on("broadcast", { event: "sig" }, async ({ payload }: any) => {
          if (!payload || payload.from === userId) return;
          if (payload.type === "takedown") {
            toast.error("Your stream was taken down by staff");
            onEnd();
            return;
          }
          if (payload.type === "join") {
            await createPeerForViewer(payload.from);
            return;
          }
          if (payload.to !== userId) return;
          const pc = peersRef.current.get(payload.from);
          if (!pc) return;
          if (payload.type === "answer") {
            try { await pc.setRemoteDescription(payload.data); } catch {}
          } else if (payload.type === "ice") {
            try { await pc.addIceCandidate(payload.data); } catch {}
          }
        })
        .subscribe((status) => {
          // Ask any waiting viewers to (re)join
          if (status === "SUBSCRIBED") send({ type: "host_ready" });
        });
    })();

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
      streamRef.current?.getTracks().forEach(t => t.stop());
      cameraStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
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

  const replaceVideoTrack = async (newTrack: MediaStreamTrack) => {
    peersRef.current.forEach(pc => {
      const sender = pc.getSenders().find(s => s.track?.kind === "video");
      if (sender) sender.replaceTrack(newTrack).catch(() => {});
    });
  };

  const toggleScreenShare = async () => {
    if (sharing) {
      // Stop screen, restore camera
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
      const camTrack = cameraStreamRef.current?.getVideoTracks()[0];
      if (camTrack) await replaceVideoTrack(camTrack);
      if (videoRef.current && cameraStreamRef.current) videoRef.current.srcObject = cameraStreamRef.current;
      streamRef.current = cameraStreamRef.current;
      setSharing(false);
      return;
    }
    try {
      const display = await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: false });
      screenStreamRef.current = display;
      const screenTrack = display.getVideoTracks()[0];
      await replaceVideoTrack(screenTrack);
      // Build a combined stream (screen video + camera audio) for preview
      const combined = new MediaStream();
      combined.addTrack(screenTrack);
      cameraStreamRef.current?.getAudioTracks().forEach(t => combined.addTrack(t));
      if (videoRef.current) videoRef.current.srcObject = combined;
      streamRef.current = combined;
      screenTrack.onended = () => toggleScreenShare();
      setSharing(true);
    } catch {
      // user cancelled
    }
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
        {screenSupported && (
          <Button variant={sharing ? "default" : "secondary"} size="icon" onClick={toggleScreenShare} title="Share screen">
            {sharing ? <MonitorOff className="h-5 w-5" /> : <MonitorUp className="h-5 w-5" />}
          </Button>
        )}
      </div>
    </div>
  );
};

export default LiveBroadcaster;
