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

export const purchaseMembership = async (
  userId: string,
  membership: ChannelMembership,
): Promise<{ success: boolean; message: string }> => {
  if (userId === membership.creator_id) {
    return { success: false, message: "You can't subscribe to your own channel." };
  }
  const crossatrixId = getCrossatrixUserId(userId);
  const balance = await getBalance(crossatrixId);
  if (balance < membership.price_croins) {
    return { success: false, message: `Not enough Croins! Need ${membership.price_croins}, have ${balance}.` };
  }
  const ok = await debitCroins(crossatrixId, membership.price_croins, `Membership: ${membership.name}`);
  if (!ok) return { success: false, message: "Failed to debit Croins." };

  // Credit creator
  await creditCroins(membership.creator_id, membership.price_croins, `Membership from user`);

  const expires = new Date();
  expires.setMonth(expires.getMonth() + 1);

  const { data: existing } = await supabase
    .from("channel_subscriptions" as any)
    .select("id, expires_at")
    .eq("user_id", userId)
    .eq("creator_id", membership.creator_id)
    .maybeSingle();

  if (existing) {
    const cur = new Date((existing as any).expires_at);
    const base = cur > new Date() ? cur : new Date();
    const newExp = new Date(base);
    newExp.setMonth(newExp.getMonth() + 1);
    await supabase.from("channel_subscriptions" as any).update({
      membership_id: membership.id,
      expires_at: newExp.toISOString(),
      purchased_at: new Date().toISOString(),
    }).eq("id", (existing as any).id);
  } else {
    await supabase.from("channel_subscriptions" as any).insert({
      user_id: userId,
      creator_id: membership.creator_id,
      membership_id: membership.id,
      expires_at: expires.toISOString(),
    });
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
