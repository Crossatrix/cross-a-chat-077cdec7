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
  const { data: state } = await supabase
    .from("radio_now_playing")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  // ---- Song rotation ----
  let songNeedsUpdate = false;
  let currentSong: any = null;
  if (state?.song_id && state.started_at) {
    const { data: song } = await supabase
      .from("radio_songs")
      .select("id, duration_seconds")
      .eq("id", state.song_id)
      .maybeSingle();
    if (song) {
      const endAt = new Date(state.started_at).getTime() + (song.duration_seconds || 180) * 1000;
      if (now >= endAt) songNeedsUpdate = true;
      else currentSong = song;
    } else {
      songNeedsUpdate = true;
    }
  } else {
    songNeedsUpdate = true;
  }

  const patch: any = { updated_at: new Date().toISOString() };

  if (songNeedsUpdate) {
    const { data: songs } = await supabase.from("radio_songs").select("id");
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
    const { data: news } = await supabase.from("radio_news").select("text");
    if (news && news.length > 0) {
      const item = news[Math.floor(Math.random() * news.length)];
      patch.news_text = item.text;
      patch.news_started_at = new Date().toISOString();
    }
  }

  if (Object.keys(patch).length > 1) {
    await supabase.from("radio_now_playing").update(patch).eq("id", 1);
  }

  return new Response(JSON.stringify({ ok: true, patch }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
