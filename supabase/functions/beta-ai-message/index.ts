import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENROUTER_KEY = Deno.env.get("OPENROUTER_KEY")!;
const MODEL = "nvidia/nemotron-3-super-120b-a12b:free";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { prompt, context } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "prompt required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const system =
      "You are an AI that drafts a single short chat message on behalf of the user. " +
      "Output ONLY the message text (no quotes, no explanation, no prefix). " +
      "Match a natural, friendly chat tone. Keep under 300 characters.";

    const userMsg = context
      ? `Conversation context:\n${context}\n\nWrite a message that: ${prompt}`
      : `Write a message that: ${prompt}`;

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://cross-a-chat.lovable.app",
        "X-Title": "Cross Chat Beta - AI Message",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMsg },
        ],
        max_tokens: 200,
        temperature: 0.8,
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      console.error("openrouter error", res.status, t);
      return new Response(JSON.stringify({ error: "AI failed" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await res.json();
    const message = data?.choices?.[0]?.message?.content?.trim() || "";
    return new Response(JSON.stringify({ message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
