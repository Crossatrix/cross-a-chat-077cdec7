import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if ((user.email || "").toLowerCase() !== "cross.a.trix.owner@hotmail.com") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();
    const action = body.action || "create";

    if (action === "create") {
      const { username, persona, system_prompt, avatar_url, reply_chats, comment_posts } = body;
      if (!username || !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        return new Response(JSON.stringify({ error: "Invalid username" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const email = `bot+${username.toLowerCase()}@bots.cross-a-chat.local`;
      const password = crypto.randomUUID() + crypto.randomUUID();
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { username },
      });
      if (createErr || !created.user) {
        return new Response(JSON.stringify({ error: createErr?.message || "Create failed" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const botId = created.user.id;
      // Profile may have been auto-created via trigger; ensure avatar/username
      await admin.from("profiles").upsert({
        id: botId, username, avatar_url: avatar_url || null,
      } as any);
      const { error: botErr } = await admin.from("bots").insert({
        id: botId,
        persona: persona || "A friendly Cross Chat user.",
        system_prompt: system_prompt || "",
        active: true,
        reply_chats: reply_chats !== false,
        comment_posts: comment_posts !== false,
        created_by: user.id,
      });
      if (botErr) {
        return new Response(JSON.stringify({ error: botErr.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ ok: true, id: botId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      const { id } = body;
      if (!id) return new Response(JSON.stringify({ error: "id required" }), { status: 400, headers: corsHeaders });
      await admin.from("bots").delete().eq("id", id);
      await admin.auth.admin.deleteUser(id);
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "run_now") {
      // Trigger one tick immediately, authenticated with the service role key
      const url = `${SUPABASE_URL}/functions/v1/bots-tick`;
      fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
      }).catch(() => {});
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
