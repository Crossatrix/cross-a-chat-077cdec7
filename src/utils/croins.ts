import { supabase } from "@/integrations/supabase/client";

// All Croin calls are proxied through our edge function so the CROINKEY
// stays server-side and an x-api-key header is added to every request.
const CROINS_PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/croins-proxy`;

async function callCroins(body: Record<string, unknown>): Promise<any> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { ok: false, data: {} };
  const res = await fetch(CROINS_PROXY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, data: await res.json().catch(() => ({})) };
}

/**
 * Get the Crossatrix user ID stored during login (for current user).
 * Falls back to the provided local user ID if not available.
 */
export const getCrossatrixUserId = (fallbackId?: string): string => {
  return localStorage.getItem("crossatrix_user_id") || fallbackId || "";
};

/**
 * Look up a user's Crossatrix ID from their local profile.
 * Used when crediting Croins to other users (e.g. video/post owners).
 */
export const lookupCrossatrixId = async (localUserId: string): Promise<string> => {
  try {
    const { data } = await supabase
      .from("profiles")
      .select("crossatrix_user_id")
      .eq("id", localUserId)
      .maybeSingle();
    return (data as any)?.crossatrix_user_id || localUserId;
  } catch {
    return localUserId;
  }
};

export const getBalance = async (userId: string): Promise<number> => {
  try {
    const { data } = await callCroins({ action: "balance", user_id: userId });
    return data?.balance ?? 0;
  } catch {
    return 0;
  }
};

export const creditCroins = async (localUserId: string, amount: number, description: string): Promise<boolean> => {
  try {
    const crossatrixId = await lookupCrossatrixId(localUserId);
    const { ok } = await callCroins({ action: "credit", user_id: crossatrixId, amount, description });
    return ok;
  } catch {
    return false;
  }
};

export const debitCroins = async (userId: string, amount: number, description: string): Promise<boolean> => {
  try {
    const { ok } = await callCroins({ action: "debit", user_id: userId, amount, description });
    return ok;
  } catch {
    return false;
  }
};

/**
 * Award croins for a video view milestone.
 * Longform (>= 3 min): 1 croin per 10 views
 * Short (< 3 min): 1 croin per 50 views
 */
export const checkViewMilestone = (newViewCount: number, isShort: boolean): boolean => {
  const threshold = isShort ? 50 : 10;
  return newViewCount > 0 && newViewCount % threshold === 0;
};
