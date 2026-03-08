import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const NOTIFICATIONS_USER_ID = "00000000-0000-0000-0000-000000000001";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Extract user from JWT (already verified by Supabase gateway)
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const payload = JSON.parse(atob(token.split(".")[1]));
    const userId = payload.sub;

    const { creatorId, videoTitle } = await req.json();

    if (creatorId !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure Notifications profile exists
    const { data: notifProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", NOTIFICATIONS_USER_ID)
      .single();

    if (!notifProfile) {
      await supabase.from("profiles").insert({
        id: NOTIFICATIONS_USER_ID,
        username: "Notifications",
        avatar_url: null,
        show_online_status: false,
      });
    }

    // Get creator's username
    const { data: creatorProfile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", creatorId)
      .single();

    const creatorName = creatorProfile?.username || "Someone you follow";

    // Get all followers of this creator
    const { data: followers } = await supabase
      .from("video_follows")
      .select("follower_id")
      .eq("following_id", creatorId);

    if (!followers || followers.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;

    for (const follower of followers) {
      const followerId = follower.follower_id;

      // Find existing conversation between Notifications user and this follower
      const { data: existingConvo } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", NOTIFICATIONS_USER_ID);

      let conversationId: string | null = null;

      if (existingConvo && existingConvo.length > 0) {
        const convoIds = existingConvo.map((c) => c.conversation_id);
        const { data: match } = await supabase
          .from("conversation_participants")
          .select("conversation_id")
          .eq("user_id", followerId)
          .in("conversation_id", convoIds);

        if (match && match.length > 0) {
          // Verify it's a 1:1 (not group) conversation
          for (const m of match) {
            const { data: convo } = await supabase
              .from("conversations")
              .select("id, is_group")
              .eq("id", m.conversation_id)
              .eq("is_group", false)
              .single();
            if (convo) {
              conversationId = convo.id;
              break;
            }
          }
        }
      }

      // Create conversation if none exists
      if (!conversationId) {
        const { data: newConvo } = await supabase
          .from("conversations")
          .insert({
            is_group: false,
            created_by: NOTIFICATIONS_USER_ID,
          })
          .select("id")
          .single();

        if (!newConvo) continue;
        conversationId = newConvo.id;

        await supabase.from("conversation_participants").insert([
          { conversation_id: conversationId, user_id: NOTIFICATIONS_USER_ID },
          { conversation_id: conversationId, user_id: followerId },
        ]);
      }

      // Send notification message
      const message = `📹 **${creatorName}** just uploaded a new video: **${videoTitle}**`;

      await supabase.from("messages").insert({
        conversation_id: conversationId,
        user_id: NOTIFICATIONS_USER_ID,
        content: message,
      });

      // Update conversation timestamp
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);

      sent++;
    }

    return new Response(JSON.stringify({ sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-followers error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
