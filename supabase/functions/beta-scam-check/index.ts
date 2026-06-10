import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const OPENROUTER_KEY = Deno.env.get("OPENROUTER_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const joined = messages
      .slice(0, 5)
      .map((m: string, i: number) => `${i + 1}. ${String(m).slice(0, 500)}`)
      .join("\n");

    const system =
      "You are a scam / phishing / romance-scam / impersonation detector. " +
      "Read up to 5 chat messages from a stranger and judge if they show signs of a scam attempt " +
      "(asking for money, crypto, gift cards, links to suspicious sites, fake job offers, " +
      "investment opportunities, urgent requests, impersonation, sextortion, phishing, etc). " +
      "Respond ONLY in strict JSON like: " +
      '{"scam": true|false, "confidence": 0-100, "reason": "short user-facing warning"}';

    const body = {
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Messages from a new contact:\n${joined}` },
      ],
      max_tokens: 200,
      temperature: 0.2,
    };

    // Primary: Lovable AI Gateway (free, reliable)
    let raw = "";
    if (LOVABLE_API_KEY) {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...body, model: "google/gemini-2.5-flash" }),
      });
      if (res.ok) {
        const data = await res.json();
        raw = data?.choices?.[0]?.message?.content?.trim() || "";
      } else {
        console.error("lovable ai error", res.status, await res.text());
      }
    }

    // Fallback: OpenRouter
    if (!raw && OPENROUTER_KEY) {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://cross-a-chat.lovable.app",
          "X-Title": "Cross Chat Beta - Scam Detector",
        },
        body: JSON.stringify({ ...body, model: "google/gemini-2.0-flash-exp:free" }),
      });
      if (res.ok) {
        const data = await res.json();
        raw = data?.choices?.[0]?.message?.content?.trim() || "";
      } else {
        console.error("openrouter error", res.status, await res.text());
      }
    }

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    let parsed: any = { scam: false, confidence: 0, reason: "" };
    try {
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw || "{}");
    } catch {
      // ignore
    }
    return new Response(JSON.stringify({
      scam: !!parsed.scam,
      confidence: Number(parsed.confidence) || 0,
      reason: String(parsed.reason || ""),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
