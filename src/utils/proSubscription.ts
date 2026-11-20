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
  const { data, error } = await supabase.functions.invoke("purchase-subscription", {
    body: { kind: "pro" },
  });
  if (error || !data?.success) {
    return { success: false, message: data?.message || "Purchase failed. Please try again." };
  }
  return { success: true, message: "Welcome to Cross Chat Pro! 🎉" };
};
