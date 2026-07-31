import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Public/private VAPID key pair identifying this server to push services
// (Google/Mozilla/etc). The public half is also embedded in the client
// (src/utils/notifications.ts) so the browser can create a matching
// subscription. These are not secret in the way an API key is -- they only
// let push services route messages to this server -- but the private key
// must never be exposed to the client.
const VAPID_PUBLIC_KEY = "BGy1EHCRFfAeLdSP5lxo6ukzpD7ZwUdokPp-tuQmfwTLwPULS4Z49RPnvhI3m4bN4r_W_fXdbepoi3s41l5O1h4";
const VAPID_PRIVATE_KEY = "RQZIx2YI6zC2lZA3rwNkkTpMHFOoG3aqMKx_UK4i0-M";

webpush.setVapidDetails(
  "mailto:support@cross-a-chat.lovable.app",
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { messageId, conversationId, senderId } = await req.json();

    if (!messageId || !conversationId || !senderId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load the message content + sender name for the notification body.
    const { data: message } = await supabase
      .from("messages")
      .select("content, image_url, voice_url, video_url")
      .eq("id", messageId)
      .maybeSingle();

    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", senderId)
      .maybeSingle();

    const senderName = senderProfile?.username || "Someone";
    const body = message?.content || "Sent a media file";

    // Everyone else in the conversation should be notified.
    const { data: participants } = await supabase
      .from("conversation_participants")
      .select("user_id")
      .eq("conversation_id", conversationId)
      .neq("user_id", senderId);

    if (!participants || participants.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recipientIds = participants.map((p) => p.user_id);

    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth")
      .in("user_id", recipientIds);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.stringify({
      title: `💬 ${senderName}`,
      body,
      tag: `message-${conversationId}`,
      data: {
        type: "message",
        conversationId,
        url: "/",
      },
    });

    let sent = 0;
    const staleSubscriptionIds: string[] = [];

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload
          );
          sent++;
        } catch (err) {
          // 404/410 means the subscription is no longer valid (user
          // uninstalled, cleared site data, revoked permission, etc).
          const status = (err as { statusCode?: number })?.statusCode;
          if (status === 404 || status === 410) {
            staleSubscriptionIds.push(sub.id);
          } else {
            console.error("Push send error:", err);
          }
        }
      })
    );

    if (staleSubscriptionIds.length > 0) {
      await supabase.from("push_subscriptions").delete().in("id", staleSubscriptionIds);
    }

    return new Response(JSON.stringify({ sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-push error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
