import { supabase } from "@/integrations/supabase/client";
import { debitCroins, getBalance, getCrossatrixUserId } from "./croins";

export const checkProStatus = async (userId: string): Promise<boolean> => {
  const { data } = await supabase
    .from("pro_subscriptions" as any)
    .select("expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return false;
  return new Date((data as any).expires_at) > new Date();
};

export const purchasePro = async (userId: string): Promise<{ success: boolean; message: string }> => {
  const crossatrixId = getCrossatrixUserId(userId);
  const balance = await getBalance(crossatrixId);

  if (balance < 50) {
    return { success: false, message: `Not enough Croins! You have ${balance}, need 50.` };
  }

  const debited = await debitCroins(crossatrixId, 50, "Cross Chat Pro - 1 month");
  if (!debited) {
    return { success: false, message: "Failed to debit Croins." };
  }

  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 1);

  // Check if existing subscription
  const { data: existing } = await supabase
    .from("pro_subscriptions" as any)
    .select("id, expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    // Extend from current expiry if still active
    const currentExpiry = new Date((existing as any).expires_at);
    const base = currentExpiry > new Date() ? currentExpiry : new Date();
    const newExpiry = new Date(base);
    newExpiry.setMonth(newExpiry.getMonth() + 1);

    await supabase
      .from("pro_subscriptions" as any)
      .update({ expires_at: newExpiry.toISOString(), purchased_at: new Date().toISOString() })
      .eq("id", (existing as any).id);
  } else {
    await supabase
      .from("pro_subscriptions" as any)
      .insert({ user_id: userId, expires_at: expiresAt.toISOString() });
  }

  return { success: true, message: "Welcome to Cross Chat Pro! 🎉" };
};
