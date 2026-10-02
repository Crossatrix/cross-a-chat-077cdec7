import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NEWS_INTERVAL_MS = 30 * 60 * 1000; // every 30 min

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const now = Date.now();

  // Called by listeners' players when a song/news is due (no background timer).
  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }
  const onlyChannel = typeof body?.channelId === "string" ? body.channelId : null;
  const { data: channels } = onlyChannel
    ? await supabase.from("radio_channels").select("id").eq("id", onlyChannel)
    : await supabase.from("radio_channels").select("id");
  const results: any[] = [];

  for (const channel of channels || []) {
    const channelId = channel.id;

    const { data: state } = await supabase
      .from("radio_now_playing")
      .select("*")
      .eq("channel_id", channelId)
      .maybeSingle();

    // ---- Song rotation ----
    let songNeedsUpdate = false;
    if (state?.song_id && state.started_at) {
      const { data: song } = await supabase
        .from("radio_songs")
        .select("id, duration_seconds")
        .eq("id", state.song_id)
        .eq("channel_id", channelId)
        .maybeSingle();
      if (song) {
        const endAt = new Date(state.started_at).getTime() + (song.duration_seconds || 180) * 1000;
        if (now >= endAt) songNeedsUpdate = true;
      } else {
        songNeedsUpdate = true;
      }
    } else {
      songNeedsUpdate = true;
    }

    const patch: any = { updated_at: new Date().toISOString() };

    if (songNeedsUpdate) {
      const { data: songs } = await supabase.from("radio_songs").select("id").eq("channel_id", channelId);
      if (songs && songs.length > 0) {
        const pick = songs[Math.floor(Math.random() * songs.length)];
        // avoid immediate repeat if possible
        const chosen = songs.length > 1 && pick.id === state?.song_id
          ? songs[(songs.findIndex((s) => s.id === pick.id) + 1) % songs.length]
          : pick;
        patch.song_id = chosen.id;
        patch.started_at = new Date().toISOString();
      }
    }

    // ---- News rotation (every 30 min) ----
    const lastNews = state?.news_started_at ? new Date(state.news_started_at).getTime() : 0;
    if (now - lastNews >= NEWS_INTERVAL_MS) {
      const { data: news } = await supabase.from("radio_news").select("text").eq("channel_id", channelId);
      if (news && news.length > 0) {
        const item = news[Math.floor(Math.random() * news.length)];
        patch.news_text = item.text;
        patch.news_started_at = new Date().toISOString();
      }
    }

    if (Object.keys(patch).length > 1) {
      if (state) {
        // Guard against several listeners advancing at the same moment
        let q = supabase.from("radio_now_playing").update(patch).eq("channel_id", channelId);
        q = state.updated_at ? q.eq("updated_at", state.updated_at) : q;
        await q;
      } else {
        await supabase.from("radio_now_playing").insert({ channel_id: channelId, ...patch });
      }
    }

    results.push({ channelId, patch });
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
