import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Service-role client: bypasses RLS since this endpoint is intentionally
// public / unauthenticated read-only access to already-public content data.
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Normalize a profiles join (or null) into a simple creator object.
function creatorOf(row: any) {
  const p = row?.profiles;
  if (!p) return null;
  return { id: p.id ?? row.user_id ?? null, username: p.username ?? null };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  const url = new URL(req.url);
  const action = (url.searchParams.get("action") || "").toLowerCase();

  try {
    switch (action) {
      case "video": {
        const { data, error } = await admin
          .from("videos")
          .select(
            "id, title, description, views_count, likes_count, dislikes_count, comments_count, created_at, user_id, profiles(id, username)"
          )
          .order("created_at", { ascending: false });
        if (error) throw error;

        const videos = (data || []).map((v: any) => ({
          id: v.id,
          title: v.title,
          description: v.description ?? null,
          view_count: v.views_count,
          like_count: v.likes_count,
          dislike_count: v.dislikes_count,
          comment_count: v.comments_count,
          created_at: v.created_at,
          creator: creatorOf(v),
        }));

        return json({ action: "video", count: videos.length, videos });
      }

      case "song": {
        // music_tracks = user-uploaded songs. Deliberately excludes radio_songs
        // (the rotating radio-station playlist), per requirements.
        const { data, error } = await admin
          .from("music_tracks")
          .select(
            "id, title, description, plays_count, likes_count, dislikes_count, duration, category, created_at, user_id, profiles(id, username)"
          )
          .order("created_at", { ascending: false });
        if (error) throw error;

        const songs = (data || []).map((s: any) => ({
          id: s.id,
          title: s.title,
          description: s.description ?? null,
          view_count: s.plays_count,
          like_count: s.likes_count,
          dislike_count: s.dislikes_count,
          duration: s.duration,
          category: s.category,
          created_at: s.created_at,
          creator: creatorOf(s),
        }));

        return json({ action: "song", count: songs.length, songs });
      }

      case "livestream": {
        const { data, error } = await admin
          .from("livestreams")
          .select(
            "id, title, description, viewer_count, likes_count, dislikes_count, status, category, started_at, ended_at, created_at, user_id, profiles(id, username)"
          )
          .order("created_at", { ascending: false });
        if (error) throw error;

        const livestreams = (data || []).map((l: any) => ({
          id: l.id,
          title: l.title,
          description: l.description ?? null,
          view_count: l.viewer_count,
          like_count: l.likes_count,
          dislike_count: l.dislikes_count,
          status: l.status,
          category: l.category,
          started_at: l.started_at,
          ended_at: l.ended_at,
          created_at: l.created_at,
          creator: creatorOf(l),
        }));

        return json({ action: "livestream", count: livestreams.length, livestreams });
      }

      case "post": {
        const { data, error } = await admin
          .from("posts")
          .select(
            "id, content, poll_question, poll_options, likes_count, dislikes_count, comments_count, created_at, user_id, profiles(id, username)"
          )
          .order("created_at", { ascending: false });
        if (error) throw error;

        const posts = (data || []).map((p: any) => ({
          id: p.id,
          description: p.content ?? null,
          like_count: p.likes_count,
          dislike_count: p.dislikes_count,
          comment_count: p.comments_count,
          poll_question: p.poll_question ?? null,
          poll_options: p.poll_options ?? null,
          created_at: p.created_at,
          creator: creatorOf(p),
        }));

        return json({ action: "post", count: posts.length, posts });
      }

      default:
        return json(
          {
            error: "Invalid or missing action. Use one of: video, song, livestream, post",
          },
          400
        );
    }
  } catch (err) {
    console.error("data-api error:", err);
    return json({ error: "Internal error" }, 500);
  }
});
