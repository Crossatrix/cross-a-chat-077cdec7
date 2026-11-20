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
  const { data, error } = await supabase.functions.invoke("purchase-subscription", {
    body: { kind: "beta" },
  });
  if (error || !data?.success) {
    return { success: false, message: data?.message || "Purchase failed. Please try again." };
  }
  return { success: true, message: "Welcome to Cross Chat Beta! 🧪" };
};
