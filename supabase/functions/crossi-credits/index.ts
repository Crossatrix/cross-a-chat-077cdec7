import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const auth = req.headers.get("Authorization") || "";
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
  const url = `https://hqibtbdovjcocqgwqwbw.supabase.co/functions/v1/credits-api?key=${encodeURIComponent(Deno.env.get("CROSSI_CREDITS_KEY") || "")}&email=${encodeURIComponent(user.email || "")}`;
  const r = await fetch(url);
  const text = await r.text();
  return new Response(r.ok ? text : JSON.stringify({ error: "CROSSI_CREDITS_ERROR", detail: text }), { status: r.ok ? 200 : 502, headers: { ...cors, "Content-Type": "application/json" } });
});
