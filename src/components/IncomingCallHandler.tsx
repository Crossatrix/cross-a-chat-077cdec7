import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLanguage } from "@/contexts/LanguageContext";

interface IncomingCall {
  id: string;
  conversationId: string;
  fromUserId: string;
  callerUsername: string;
  callerAvatar?: string;
}

interface IncomingCallHandlerProps {
  userId: string;
  onAcceptCall: (conversationId: string, callerId: string) => void;
}

export const IncomingCallHandler = ({ userId, onAcceptCall }: IncomingCallHandlerProps) => {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const { t } = useLanguage();

  const checkForIncomingCalls = useCallback(async () => {
    if (!userId) return;

    try {
      // Look for recent offer signals (within last 30 seconds) addressed to this user
      const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();
      
      const { data: signals, error } = await supabase
        .from("call_signals")
        .select("*")
        .eq("to_user_id", userId)
        .eq("signal_type", "offer")
        .gte("created_at", thirtySecondsAgo)
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) {
        console.error("Error checking for incoming calls:", error);
        return;
      }

      if (signals && signals.length > 0) {
        const signal = signals[0];
        
        // Check if we already have this call displayed
        if (incomingCall?.id === signal.id) return;

        // Fetch caller's profile
        const { data: callerProfile } = await supabase
          .from("profiles")
          .select("username, avatar_url")
          .eq("id", signal.from_user_id)
          .single();

        setIncomingCall({
          id: signal.id,
          conversationId: signal.conversation_id,
          fromUserId: signal.from_user_id,
          callerUsername: callerProfile?.username || "Unknown",
          callerAvatar: callerProfile?.avatar_url || undefined,
        });
      }
    } catch (error) {
      console.error("Error in checkForIncomingCalls:", error);
    }
  }, [userId, incomingCall?.id]);

  useEffect(() => {
    if (!userId) return;

    // Check immediately on mount
    checkForIncomingCalls();

    // Then check every 10 seconds
    const interval = setInterval(checkForIncomingCalls, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [userId, checkForIncomingCalls]);

  const handleAccept = () => {
    if (incomingCall) {
      onAcceptCall(incomingCall.conversationId, incomingCall.fromUserId);
      setIncomingCall(null);
    }
  };

  const handleDecline = async () => {
    if (incomingCall) {
      // Send decline signal
      await supabase.from("call_signals").insert({
        conversation_id: incomingCall.conversationId,
        from_user_id: userId,
        to_user_id: incomingCall.fromUserId,
        signal_type: "decline",
        signal_data: JSON.stringify({ declined: true }),
      });
      setIncomingCall(null);
    }
  };

  if (!incomingCall) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="bg-card border rounded-2xl p-8 shadow-2xl max-w-sm w-full mx-4 animate-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center gap-6">
          {/* Caller Avatar with pulse animation */}
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
            <Avatar className="h-24 w-24 border-4 border-primary">
              <AvatarImage src={incomingCall.callerAvatar} />
              <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                {incomingCall.callerUsername.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Caller info */}
          <div className="text-center">
            <h3 className="text-xl font-semibold">{incomingCall.callerUsername}</h3>
            <p className="text-muted-foreground animate-pulse">{t("incomingCall")}</p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-6">
            <Button
              onClick={handleDecline}
              size="icon"
              variant="destructive"
              className="h-16 w-16 rounded-full shadow-lg hover:scale-105 transition-transform"
            >
              <PhoneOff className="h-7 w-7" />
            </Button>
            
            <Button
              onClick={handleAccept}
              size="icon"
              className="h-16 w-16 rounded-full bg-green-500 hover:bg-green-600 shadow-lg hover:scale-105 transition-transform"
            >
              <Phone className="h-7 w-7" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
