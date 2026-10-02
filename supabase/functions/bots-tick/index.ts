import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENROUTER_KEY = Deno.env.get("OPENROUTER_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MODEL = "openai/gpt-oss-20b:free";

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function callAI(system: string, user: string): Promise<string | null> {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://cross-a-chat.lovable.app",
        "X-Title": "Cross Chat Bots",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        max_tokens: 200,
        temperature: 0.9,
      }),
    });
    if (!res.ok) {
      console.error("OpenRouter error", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    const txt = data?.choices?.[0]?.message?.content?.trim();
    return txt || null;
  } catch (e) {
    console.error("AI call failed", e);
    return null;
  }
}

async function alreadyActed(botId: string, type: string, targetId: string): Promise<boolean> {
  const { data } = await sb.from("bot_actions").select("id")
    .eq("bot_id", botId).eq("action_type", type).eq("target_id", targetId).maybeSingle();
  return !!data;
}

async function recordAction(botId: string, type: string, targetId: string) {
  await sb.from("bot_actions").insert({ bot_id: botId, action_type: type, target_id: targetId });
}

async function runBot(bot: any, onlyConvId?: string) {
  const persona = bot.persona || "A friendly Cross Chat user.";
  const sysPrompt = `${bot.system_prompt || ""}\nYou are roleplaying as a real human user on Cross Chat. Keep replies short, casual, lowercase-ish, like a real chat user. Never reveal you are an AI or a bot. Persona: ${persona}`.trim();

  // 1) Reply to recent unread DMs sent to this bot
  if (bot.reply_chats) {
    let convIds: string[];
    if (onlyConvId) {
      convIds = [onlyConvId];
    } else {
      const { data: parts } = await sb.from("conversation_participants")
        .select("conversation_id").eq("user_id", bot.id);
      convIds = (parts || []).map((p: any) => p.conversation_id);
    }
    for (const convId of convIds.slice(0, 10)) {
      // Get last few messages in convo
      const { data: msgs } = await sb.from("messages")
        .select("id, user_id, content, created_at")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: false })
        .limit(8);
      if (!msgs || msgs.length === 0) continue;
      const last = msgs[0];
      // Only respond if last message is NOT from the bot
      if (last.user_id === bot.id) continue;
      // Avoid duplicate
      if (await alreadyActed(bot.id, "message", last.id)) continue;
      // Build short context
      const ctx = msgs.slice().reverse()
        .map((m: any) => `${m.user_id === bot.id ? "Me" : "Them"}: ${m.content}`)
        .join("\n");
      const reply = await callAI(sysPrompt, `Conversation so far:\n${ctx}\n\nWrite my next short chat reply as Me. One message only.`);
      if (reply) {
        await sb.from("messages").insert({
          conversation_id: convId, user_id: bot.id, content: reply.slice(0, 500),
        });
        await recordAction(bot.id, "message", last.id);
      }
    }
  }

  // 2) Comment on a random recent subcross post
  if (bot.comment_posts) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: posts } = await sb.from("subcross_posts")
      .select("id, title, content, user_id")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(20);
    const candidates = (posts || []).filter((p: any) => p.user_id !== bot.id);
    if (candidates.length > 0 && Math.random() < 0.7) {
      const p: any = candidates[Math.floor(Math.random() * candidates.length)];
      if (!(await alreadyActed(bot.id, "subcross_comment", p.id))) {
        const reply = await callAI(sysPrompt, `Post title: ${p.title}\nPost content: ${p.content || ""}\n\nWrite a short, natural human-style comment reacting to it. 1-2 sentences max.`);
        if (reply) {
          await sb.from("subcross_comments").insert({
            post_id: p.id, user_id: bot.id, content: reply.slice(0, 500),
          });
          await recordAction(bot.id, "subcross_comment", p.id);
        }
      }
    }

    // 3) Comment on random creator (profile) posts
    const { data: cposts } = await sb.from("posts")
      .select("id, content, user_id")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(20);
    const ccands = (cposts || []).filter((p: any) => p.user_id !== bot.id);
    if (ccands.length > 0 && Math.random() < 0.5) {
      const p: any = ccands[Math.floor(Math.random() * ccands.length)];
      if (!(await alreadyActed(bot.id, "post_comment", p.id))) {
        const reply = await callAI(sysPrompt, `A creator just posted:\n${p.content || ""}\n\nWrite a short, natural human-style comment. 1-2 sentences.`);
        if (reply) {
          await sb.from("post_comments").insert({
            post_id: p.id, user_id: bot.id, content: reply.slice(0, 500),
          });
          await recordAction(bot.id, "post_comment", p.id);
        }
      }
    }
  }

  await sb.from("bots").update({ last_run_at: new Date().toISOString() }).eq("id", bot.id);
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Event-driven: callers can only trigger work that is already due.
  // - mode "reply": fired by a DB trigger when someone messages a bot. Deduped per message.
  // - mode "comments": fired once a day by the scheduler. Each bot comments at most once per ~20h.
  // - service role (admin "run now"): runs everything.
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const isAdmin = token === SUPABASE_SERVICE_ROLE_KEY;
  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }
  const mode = body?.mode as string | undefined;

  try {
    if (mode === "reply") {
      const convId = String(body.conversationId || "");
      if (!convId) return json({ error: "conversationId required" }, 400);
      const { data: parts } = await sb.from("conversation_participants").select("user_id").eq("conversation_id", convId);
      const ids = (parts || []).map((p: any) => p.user_id);
      if (!ids.length) return json({ ok: true, acted: 0 });
      const { data: bots } = await sb.from("bots").select("*").eq("active", true).eq("reply_chats", true).in("id", ids);
      for (const b of bots || []) {
        try { await runBot({ ...b, comment_posts: false }, convId); } catch (e) { console.error("Bot failed", b.id, e); }
      }
      return json({ ok: true, acted: (bots || []).length });
    }

    if (mode === "comments" || isAdmin) {
      const { data: bots } = await sb.from("bots").select("*").eq("active", true);
      const cutoff = Date.now() - 20 * 60 * 60 * 1000;
      const due = (bots || []).filter((b: any) => isAdmin || !b.last_run_at || new Date(b.last_run_at).getTime() < cutoff);
      for (const b of due) {
        try { await runBot({ ...b, reply_chats: isAdmin ? b.reply_chats : false }); } catch (e) { console.error("Bot failed", b.id, e); }
      }
      return json({ ok: true, acted: due.length });
    }

    return json({ error: "Unauthorized" }, 401);
  } catch (e) {
    console.error(e);
    return json({ error: String(e) }, 500);
  }
});
