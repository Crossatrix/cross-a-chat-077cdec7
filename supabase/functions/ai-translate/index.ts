import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const MODEL = "inclusionai/ling-3.0-flash:free";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { text, target } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "Missing text" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const lang = typeof target === "string" && target.trim() ? target.trim().slice(0, 40) : "English";

    const key = Deno.env.get("OPENROUTER_KEY");
    if (!key) {
      return new Response(JSON.stringify({ error: "Missing OpenRouter key" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sys = `You are a translation engine. Translate the user's text into ${lang}. Output ONLY the translation, preserving line breaks, emoji codes like :name:, formatting characters and URLs exactly. No notes, no quotes, no explanations.`;

    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: text.slice(0, 8000) },
        ],
        temperature: 0.2,
        max_tokens: 1200,
      }),
    });

    if (!r.ok) {
      const t = await r.text();
      return new Response(JSON.stringify({ error: "AI failed", detail: t }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await r.json();
    const translation = json?.choices?.[0]?.message?.content?.trim() || "";
    return new Response(JSON.stringify({ translation }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
