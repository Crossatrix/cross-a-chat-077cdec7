import { supabase } from "@/integrations/supabase/client";
import { debitCroins, getBalance, getCrossatrixUserId } from "./croins";

export const isPreviewDomain = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.location.hostname.startsWith("preview--");
};

export const checkBetaStatus = async (userId: string): Promise<boolean> => {
  const { data } = await supabase
    .from("beta_subscriptions" as any)
    .select("expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return false;
  return new Date((data as any).expires_at) > new Date();
};

export const BETA_PRICE = 50;

export const purchaseBeta = async (userId: string): Promise<{ success: boolean; message: string }> => {
  const crossatrixId = getCrossatrixUserId(userId);
  const balance = await getBalance(crossatrixId);

  if (balance < BETA_PRICE) {
    return { success: false, message: `Not enough Croins! You have ${balance}, need ${BETA_PRICE}.` };
  }

  const debited = await debitCroins(crossatrixId, BETA_PRICE, "Cross Chat Beta - 1 month");
  if (!debited) return { success: false, message: "Failed to debit Croins." };

  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 1);

  const { data: existing } = await supabase
    .from("beta_subscriptions" as any)
    .select("id, expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    const cur = new Date((existing as any).expires_at);
    const base = cur > new Date() ? cur : new Date();
    const newExp = new Date(base);
    newExp.setMonth(newExp.getMonth() + 1);
    await supabase
      .from("beta_subscriptions" as any)
      .update({ expires_at: newExp.toISOString(), purchased_at: new Date().toISOString() })
      .eq("id", (existing as any).id);
  } else {
    await supabase
      .from("beta_subscriptions" as any)
      .insert({ user_id: userId, expires_at: expiresAt.toISOString() });
  }

  return { success: true, message: "Welcome to Cross Chat Beta! 🧪" };
};
