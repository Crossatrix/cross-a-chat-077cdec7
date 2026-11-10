import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const BASE = "https://crossicloud.lovable.app/api/public/v1";

const Body = z.object({
  action: z.enum(["list", "download"]),
  crossatrix_token: z.string().min(10).max(8192),
  crossatrix_user_id: z.string().uuid(),
  folder_id: z.string().uuid().optional().nullable(),
  file_id: z.string().uuid().optional(),
});

const json = (p: unknown, status = 200) =>
  new Response(JSON.stringify(p), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") || "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await sb.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) return json({ error: "Not signed in" }, 401);

    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: "Invalid request" }, 400);
    const b = parsed.data;
    const apiKey = Deno.env.get("CROSSI_CLOUD_API_KEY");
    if (!apiKey) return json({ error: "Crossi Cloud is not configured" }, 500);
    const headers = {
      "X-API-Key": apiKey,
      "X-Crossatrix-User-Id": b.crossatrix_user_id,
      Authorization: `Bearer ${b.crossatrix_token}`,
    };

    if (b.action === "list") {
      const url = new URL(`${BASE}/files`);
      if (b.folder_id) url.searchParams.set("folder_id", b.folder_id);
      const r = await fetch(url, { headers });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) return json({ error: data.error || "Crossi Cloud error", status: r.status }, r.status === 401 ? 401 : 502);
      return json(data);
    }

    if (!b.file_id) return json({ error: "file_id required" }, 400);
    const r = await fetch(`${BASE}/files/${b.file_id}`, { headers });
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      return json({ error: data.error || "Download failed", status: r.status }, r.status === 401 ? 401 : 502);
    }
    return new Response(r.body, {
      headers: { ...corsHeaders, "Content-Type": r.headers.get("Content-Type") || "application/octet-stream" },
    });
  } catch (e) {
    console.error(e);
    return json({ error: "Internal error" }, 500);
  }
});
