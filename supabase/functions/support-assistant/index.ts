import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const MODEL = "inclusionai/ling-3.0-flash:free";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const question = typeof body?.question === "string" ? body.question.trim() : "";
    if (!question || question.length > 1000) {
      return new Response(JSON.stringify({ error: "Please provide a question (max 1000 characters)." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const key = Deno.env.get("OPENROUTER_KEY");
    if (!key) {
      return new Response(JSON.stringify({ error: "AI is not configured." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: pages } = await supabase
      .from("support_pages")
      .select("id,parent_id,title,content,sort_order")
      .order("sort_order", { ascending: true });

    const all = pages || [];
    const chapters = all.filter((p: any) => !p.parent_id);
    const parts: string[] = [];
    for (const c of chapters) {
      parts.push(`# ${c.title}\n${c.content || ""}`);
      for (const s of all.filter((p: any) => p.parent_id === c.id)) {
        parts.push(`## ${s.title}\n${s.content || ""}`);
      }
    }
    const context = parts.join("\n\n").slice(0, 20000);

    const sys = `You are the Cross Chat Support Assistant. Answer ONLY using the support pages below. Be concise and friendly.
If the answer is not in the support pages, reply exactly: "I couldn't find this in the support pages. Please email cross.a.trix.chat@hotmail.com and our team will help you."

SUPPORT PAGES:
${context || "(no support pages available)"}`;

    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: question },
        ],
        temperature: 0.2,
        max_tokens: 700,
      }),
    });

    if (!r.ok) {
      const detail = await r.text();
      return new Response(JSON.stringify({ error: "AI request failed", detail }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await r.json();
    const answer = json?.choices?.[0]?.message?.content?.trim() || "";
    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
