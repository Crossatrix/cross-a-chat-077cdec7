import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CROINS_API = "https://digjxtmzafzcgytgcwmb.supabase.co/functions/v1/croins";
const CROINKEY = Deno.env.get("CROINKEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// Per-call hard cap on amounts. Legitimate flows credit 1-5 croins per event.
const MAX_AMOUNT_PER_CALL = 100;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Require a valid Supabase user JWT
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: claimsErr } = await sb.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const action = String(body?.action || "");
    const amount = Number(body?.amount ?? 0);

    // Validate amount for write actions
    if ((action === "credit" || action === "debit")) {
      if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT_PER_CALL) {
        return new Response(JSON.stringify({ error: "Invalid amount" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const res = await fetch(CROINS_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CROINKEY,
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
