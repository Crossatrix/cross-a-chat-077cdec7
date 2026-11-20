// Server-side purchase of paid subscriptions: debits Croins and writes the subscription row.
// Clients can no longer write subscription rows directly.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const CROINS_API = "https://digjxtmzafzcgytgcwmb.supabase.co/functions/v1/croins";
const CROINKEY = Deno.env.get("CROINKEY") || "";

const PLANS: Record<string, { table: string; price: number; label: string }> = {
  pro: { table: "pro_subscriptions", price: 50, label: "Cross Chat Pro - 1 month" },
  creator_pro: { table: "creator_pro_subscriptions", price: 80, label: "Creator Pro - 1 month" },
  beta: { table: "beta_subscriptions", price: 50, label: "Cross Chat Beta - 1 month" },
};

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function croins(body: Record<string, unknown>) {
  const res = await fetch(CROINS_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": CROINKEY },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, data: await res.json().catch(() => ({})) };
}

const addMonth = (from: Date) => { const d = new Date(from); d.setMonth(d.getMonth() + 1); return d; };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: u } = await admin.auth.getUser(token);
    const user = u?.user;
    if (!user) return json({ success: false, message: "Please sign in again." }, 401);

    const body = await req.json().catch(() => ({}));
    const kind = String(body?.kind || "");

    const { data: prof } = await admin.from("profiles").select("crossatrix_user_id").eq("id", user.id).maybeSingle();
    const payerId = (prof?.crossatrix_user_id as string) || user.id;

    let table: string, price: number, label: string;
    let match: Record<string, string> = { user_id: user.id };
    let extra: Record<string, unknown> = {};
    let creatorId: string | null = null;

    if (kind === "channel") {
      const membershipId = String(body?.membershipId || "");
      const { data: m } = await admin.from("channel_memberships").select("id, creator_id, name, price_croins").eq("id", membershipId).maybeSingle();
      if (!m) return json({ success: false, message: "Membership not found." }, 404);
      if (m.creator_id === user.id) return json({ success: false, message: "You can't subscribe to your own channel." }, 400);
      table = "channel_subscriptions"; price = m.price_croins; label = `Membership: ${m.name}`;
      creatorId = m.creator_id;
      match = { user_id: user.id, creator_id: m.creator_id };
      extra = { membership_id: m.id };
    } else if (PLANS[kind]) {
      ({ table, price, label } = PLANS[kind]);
    } else {
      return json({ success: false, message: "Unknown plan." }, 400);
    }

    const bal = await croins({ action: "balance", user_id: payerId });
    const balance = Number(bal.data?.balance ?? 0);
    if (balance < price) return json({ success: false, message: `Not enough Croins! You have ${balance}, need ${price}.` });

    const debit = await croins({ action: "debit", user_id: payerId, amount: price, description: label });
    if (!debit.ok) return json({ success: false, message: "Failed to debit Croins." });

    if (creatorId) {
      const { data: cp } = await admin.from("profiles").select("crossatrix_user_id").eq("id", creatorId).maybeSingle();
      await croins({ action: "credit", user_id: (cp?.crossatrix_user_id as string) || creatorId, amount: price, description: "Membership from user" });
    }

    let q = admin.from(table).select("id, expires_at");
    for (const [k, v] of Object.entries(match)) q = q.eq(k, v);
    const { data: existing } = await q.maybeSingle();
    const now = new Date();
    if (existing) {
      const cur = new Date(existing.expires_at);
      await admin.from(table).update({
        ...extra, expires_at: addMonth(cur > now ? cur : now).toISOString(), purchased_at: now.toISOString(),
      }).eq("id", existing.id);
    } else {
      await admin.from(table).insert({ ...match, ...extra, expires_at: addMonth(now).toISOString() });
    }
    return json({ success: true });
  } catch (e) {
    console.error("purchase-subscription error", e);
    return json({ success: false, message: "Purchase failed. Please try again." }, 500);
  }
});
