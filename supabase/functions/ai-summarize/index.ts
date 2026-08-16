import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const MODEL = "openrouter/owl-alpha";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { text, kind } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "Missing text" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const key = Deno.env.get("OPENROUTER_KEY");
    if (!key) {
      return new Response(JSON.stringify({ error: "Missing OpenRouter key" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sys = `You summarize a SINGLE ${kind || "item"} provided by the user. Output 1-3 short sentences capturing only the key points of the exact text given. Do not invent context, do not assume there are other messages, do not reference a conversation as a whole. No greetings or meta commentary.`;
    const userMsg = `Summarize ONLY this single ${kind || "item"} (treat it as standalone, ignore any imagined surrounding context):\n\n"""\n${text.slice(0, 12000)}\n"""`;

    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: userMsg },
        ],
        temperature: 0.4,
        max_tokens: 300,
      }),
    });

    if (!r.ok) {
      const t = await r.text();
      return new Response(JSON.stringify({ error: "AI failed", detail: t }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await r.json();
    const summary = json?.choices?.[0]?.message?.content?.trim() || "(no summary)";
    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
