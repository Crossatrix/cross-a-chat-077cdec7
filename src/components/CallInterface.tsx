import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff } from "lucide-react";
import { toast } from "sonner";

interface CallInterfaceProps {
  conversationId: string;
  userId: string;
  otherUserId: string;
  onEndCall: () => void;
}

export const CallInterface = ({ conversationId, userId, otherUserId, onEndCall }: CallInterfaceProps) => {
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isConnecting, setIsConnecting] = useState(true);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    initializeCall();
    return () => {
      cleanupCall();
    };
  }, []);

  const initializeCall = async () => {
    try {
      // Get local media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create peer connection
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
        ],
      });

      peerConnectionRef.current = pc;

      // Add local tracks to peer connection
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Handle remote stream
      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
        setIsConnecting(false);
      };

      // Handle ICE candidates
      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          await supabase.from("call_signals").insert({
            conversation_id: conversationId,
            from_user_id: userId,
            to_user_id: otherUserId,
            signal_type: "ice-candidate",
            signal_data: JSON.stringify(event.candidate),
          });
        }
      };

      // Subscribe to signals
      const channel = supabase
        .channel(`call-${conversationId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "call_signals",
            filter: `to_user_id=eq.${userId}`,
          },
          async (payload) => {
            const signal = payload.new;
            
            if (signal.signal_type === "offer") {
              const offer = JSON.parse(signal.signal_data);
              await pc.setRemoteDescription(offer);
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              
              await supabase.from("call_signals").insert({
                conversation_id: conversationId,
                from_user_id: userId,
                to_user_id: otherUserId,
                signal_type: "answer",
                signal_data: JSON.stringify(answer),
              });
            } else if (signal.signal_type === "answer") {
              const answer = JSON.parse(signal.signal_data);
              await pc.setRemoteDescription(answer);
            } else if (signal.signal_type === "ice-candidate") {
              const candidate = JSON.parse(signal.signal_data);
              await pc.addIceCandidate(candidate);
            }
          }
        )
        .subscribe();

      channelRef.current = channel;

      // Create offer if initiating
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      await supabase.from("call_signals").insert({
        conversation_id: conversationId,
        from_user_id: userId,
        to_user_id: otherUserId,
        signal_type: "offer",
        signal_data: JSON.stringify(offer),
      });

    } catch (error) {
      console.error("Error initializing call:", error);
      toast.error("Failed to start call");
      onEndCall();
    }
  };

  const cleanupCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <div className="relative h-full flex flex-col">
        {/* Remote video */}
        <div className="flex-1 bg-black relative">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          {isConnecting && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <p className="text-white text-lg">Connecting...</p>
            </div>
          )}
        </div>

        {/* Local video */}
        <div className="absolute top-4 right-4 w-32 h-32 md:w-48 md:h-48 bg-black rounded-lg overflow-hidden shadow-lg border-2 border-white">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        </div>

        {/* Controls */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4">
          <Button
            onClick={toggleAudio}
            size="icon"
            variant={isAudioEnabled ? "default" : "destructive"}
            className="h-14 w-14 rounded-full"
          >
            {isAudioEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
          </Button>
          
          <Button
            onClick={toggleVideo}
            size="icon"
            variant={isVideoEnabled ? "default" : "destructive"}
            className="h-14 w-14 rounded-full"
          >
            {isVideoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
          </Button>
          
          <Button
            onClick={() => {
              cleanupCall();
              onEndCall();
            }}
            size="icon"
            variant="destructive"
            className="h-14 w-14 rounded-full"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  );
};
