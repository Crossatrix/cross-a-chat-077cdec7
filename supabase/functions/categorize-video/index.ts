import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const MODEL = "openrouter/free";
const TEN_DAYS = 10 * 24 * 60 * 60 * 1000;
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json().catch(() => ({}));
    const videoId = typeof body.videoId === "string" ? body.videoId : null;
    const force = body.force === true;

    if (force) {
      const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
      const { data: u } = await admin.auth.getUser(token);
      if (!u?.user) return json({ error: "Not signed in" }, 401);
      const { data: ok } = await admin.rpc("is_elder_moderator_or_above", { _user_id: u.user.id });
      if (!ok) return json({ error: "Only elder moderators and admins can do this" }, 403);
    }

    const { data: cats } = await admin.from("video_categories").select("value, label");
    const allowed = (cats || []).map((c: any) => c.value as string);
    if (!allowed.length) return json({ error: "No categories" }, 500);

    let videos: any[] = [];
    const cutoff = new Date(Date.now() - TEN_DAYS).toISOString();
    if (videoId) {
      const { data } = await admin.from("videos").select("id, title, description, category, categories_analyzed_at").eq("id", videoId).maybeSingle();
      if (!data) return json({ error: "Video not found" }, 404);
      if (!force && data.categories_analyzed_at && data.categories_analyzed_at > cutoff) return json({ skipped: true });
      videos = [data];
    } else {
      const { data } = await admin.from("videos").select("id, title, description, category, categories_analyzed_at")
        .or(`categories_analyzed_at.is.null,categories_analyzed_at.lt.${cutoff}`)
        .order("categories_analyzed_at", { ascending: true, nullsFirst: true }).limit(10);
      videos = data || [];
    }

    const key = Deno.env.get("OPENROUTER_KEY");
    if (!key) return json({ error: "Missing AI key" }, 500);
    const list = (cats || []).map((c: any) => `${c.value} (${c.label})`).join(", ");
    const results: Record<string, string[]> = {};

    for (const v of videos) {
      const { data: comments } = await admin.from("video_comments").select("content").eq("video_id", v.id)
        .order("created_at", { ascending: false }).limit(20);
      const text = `Title: ${v.title}\nDescription: ${(v.description || "").slice(0, 2000)}\nComments:\n${(comments || []).map((c: any) => "- " + c.content.slice(0, 200)).join("\n")}`;
      const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: `Pick 1 to 5 categories that best describe the video, ONLY from this list of ids: ${list}. Reply with ONLY a comma-separated list of ids, most relevant first.` },
            { role: "user", content: text },
          ],
        }),
      });
      if (!r.ok) { console.error("AI error", r.status, await r.text()); continue; }
      const out: string = (await r.json())?.choices?.[0]?.message?.content || "";
      const picked = [...new Set(out.toLowerCase().split(/[^a-z0-9-]+/).filter((s) => allowed.includes(s)))].slice(0, 5);
      const final = picked.length ? picked : [v.category || "other"];
      await admin.from("videos").update({ ai_categories: final, categories_analyzed_at: new Date().toISOString() }).eq("id", v.id);
      results[v.id] = final;
    }
    return json({ results });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
