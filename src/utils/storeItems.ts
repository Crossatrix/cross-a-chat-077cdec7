import { supabase } from "@/integrations/supabase/client";
import { debitCroins, getBalance, getCrossatrixUserId } from "./croins";

export const checkCreatorProStatus = async (userId: string): Promise<boolean> => {
  const { data } = await supabase
    .from("creator_pro_subscriptions" as any)
    .select("expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return false;
  return new Date((data as any).expires_at) > new Date();
};

export const purchaseCreatorPro = async (userId: string): Promise<{ success: boolean; message: string }> => {
  const crossatrixId = getCrossatrixUserId(userId);
  const balance = await getBalance(crossatrixId);

  if (balance < 80) {
    return { success: false, message: `Not enough Croins! You have ${balance}, need 80.` };
  }

  const debited = await debitCroins(crossatrixId, 80, "Creator Pro - 1 month");
  if (!debited) {
    return { success: false, message: "Failed to debit Croins." };
  }

  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 1);

  const { data: existing } = await supabase
    .from("creator_pro_subscriptions" as any)
    .select("id, expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    const currentExpiry = new Date((existing as any).expires_at);
    const base = currentExpiry > new Date() ? currentExpiry : new Date();
    const newExpiry = new Date(base);
    newExpiry.setMonth(newExpiry.getMonth() + 1);

    await supabase
      .from("creator_pro_subscriptions" as any)
      .update({ expires_at: newExpiry.toISOString(), purchased_at: new Date().toISOString() })
      .eq("id", (existing as any).id);
  } else {
    await supabase
      .from("creator_pro_subscriptions" as any)
      .insert({ user_id: userId, expires_at: expiresAt.toISOString() });
  }

  return { success: true, message: "Welcome to Creator Pro! 🎬" };
};

export const purchaseExtraAICredits = async (userId: string, creditPacks: number): Promise<{ success: boolean; message: string }> => {
  const cost = creditPacks * 10;
  const creditsToAdd = creditPacks * 10;
  const crossatrixId = getCrossatrixUserId(userId);
  const balance = await getBalance(crossatrixId);

  if (balance < cost) {
    return { success: false, message: `Not enough Croins! You have ${balance}, need ${cost}.` };
  }

  const debited = await debitCroins(crossatrixId, cost, `${creditsToAdd} extra AI credits`);
  if (!debited) return { success: false, message: "Failed to debit Croins." };

  // Add credits to ai_credits table
  const { data: current } = await supabase.rpc('get_or_reset_ai_credits', { p_user_id: userId });
  const currentCredits = current ?? 0;

  await supabase
    .from("ai_credits")
    .update({ credits_remaining: currentCredits + creditsToAdd })
    .eq("user_id", userId);

  // Track purchase
  await supabase
    .from("ai_credit_purchases" as any)
    .insert({ user_id: userId, credits_amount: creditsToAdd, croins_spent: cost });

  return { success: true, message: `Added ${creditsToAdd} AI credits! 🤖` };
};

export const purchaseExtraAIChat = async (userId: string): Promise<{ success: boolean; message: string }> => {
  const cost = 10;
  const crossatrixId = getCrossatrixUserId(userId);
  const balance = await getBalance(crossatrixId);

  if (balance < cost) {
    return { success: false, message: `Not enough Croins! You have ${balance}, need ${cost}.` };
  }

  const debited = await debitCroins(crossatrixId, cost, "1 extra AI chat slot");
  if (!debited) return { success: false, message: "Failed to debit Croins." };

  // Track purchase
  await supabase
    .from("ai_credit_purchases" as any)
    .insert({ user_id: userId, chats_amount: 1, croins_spent: cost });

  return { success: true, message: "Unlocked 1 extra AI chat! 💬" };
};
