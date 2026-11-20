import { supabase } from "@/integrations/supabase/client";
import { creditCroins, debitCroins, getBalance, getCrossatrixUserId } from "./croins";

export interface ChannelMembership {
  id: string;
  creator_id: string;
  name: string;
  description: string | null;
  price_croins: number;
  perks: string | null;
}

export interface CreatorEmoji {
  id: string;
  creator_id: string;
  name: string;
  image_url: string;
  membership_id: string | null;
}

/** Returns the active membership_id the user has for a creator, or null. */
export const getActiveMembership = async (userId: string, creatorId: string): Promise<string | null> => {
  const { data } = await supabase
    .from("channel_subscriptions" as any)
    .select("membership_id, expires_at")
    .eq("user_id", userId)
    .eq("creator_id", creatorId)
    .maybeSingle();
  if (!data) return null;
  const d: any = data;
  if (new Date(d.expires_at) <= new Date()) return null;
  return d.membership_id as string;
};

/** Unsubscribe from a creator's channel membership */
export const unsubscribeMembership = async (
  userId: string,
  creatorId: string,
): Promise<{ success: boolean; message: string }> => {
  // Find the subscription row
  const { data: sub, error: fetchError } = await supabase
    .from("channel_subscriptions" as any)
    .select("id")
    .eq("user_id", userId)
    .eq("creator_id", creatorId)
    .maybeSingle();

  if (fetchError) {
    return { success: false, message: "Failed to find subscription." };
  }

  if (!sub) {
    return { success: false, message: "No active subscription found." };
  }

  const { error } = await supabase
    .from("channel_subscriptions" as any)
    .delete()
    .eq("id", (sub as any).id);

  if (error) {
    return { success: false, message: "Failed to unsubscribe: " + error.message };
  }

  return { success: true, message: "Unsubscribed successfully!" };
};

export const purchaseMembership = async (
  userId: string,
  membership: ChannelMembership,
): Promise<{ success: boolean; message: string }> => {
  if (userId === membership.creator_id) {
    return { success: false, message: "You can't subscribe to your own channel." };
  }
  const { data, error } = await supabase.functions.invoke("purchase-subscription", {
    body: { kind: "channel", membershipId: membership.id },
  });
  if (error || !data?.success) {
    return { success: false, message: data?.message || "Purchase failed. Please try again." };
  }
  return { success: true, message: `Welcome to ${membership.name}! 🎉` };
};

export const sendCroinsGift = async (
  fromUserId: string,
  toUserId: string,
  amount: number,
  context: string,
): Promise<{ success: boolean; message: string }> => {
  if (amount < 1) return { success: false, message: "Amount must be at least 1." };
  const crossatrixId = getCrossatrixUserId(fromUserId);
  const balance = await getBalance(crossatrixId);
  if (balance < amount) return { success: false, message: `Need ${amount}, have ${balance}.` };
  const ok = await debitCroins(crossatrixId, amount, `Gift: ${context}`);
  if (!ok) return { success: false, message: "Failed to debit Croins." };
  await creditCroins(toUserId, amount, `Gift received: ${context}`);
  return { success: true, message: `Sent ${amount} Croins! 💎` };
};

/**
 * Filter a list of items so users only see members-only content they have access to.
 * Items must have user_id (creator). Optional members_only and allowed_membership_ids.
 * The creator always sees their own content.
 */
export async function filterAccessibleMembersOnly<
  T extends { user_id: string; members_only?: boolean | null; allowed_membership_ids?: string[] | null },
>(items: T[], currentUserId: string): Promise<T[]> {
  const restricted = items.filter(i => i.members_only && i.user_id !== currentUserId);
  if (!restricted.length) return items;
  const creatorIds = Array.from(new Set(restricted.map(i => i.user_id)));
  const { data } = await supabase
    .from("channel_subscriptions" as any)
    .select("creator_id, membership_id, expires_at")
    .eq("user_id", currentUserId)
    .in("creator_id", creatorIds);
  const now = Date.now();
  const subs = new Map<string, string>();
  (data || []).forEach((s: any) => {
    if (new Date(s.expires_at).getTime() > now) subs.set(s.creator_id, s.membership_id);
  });
  return items.filter(i => {
    if (!i.members_only) return true;
    if (i.user_id === currentUserId) return true;
    const tier = subs.get(i.user_id);
    if (!tier) return false;
    const allowed = i.allowed_membership_ids;
    if (!allowed || allowed.length === 0) return true;
    return allowed.includes(tier);
  });
}
