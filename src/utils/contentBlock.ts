import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ContentBlockInfo {
  blocked: boolean;
  reason: string | null;
  expires_at: string | null;
}

export async function getContentBlock(userId: string): Promise<ContentBlockInfo> {
  const { data } = await (supabase as any)
    .from("user_content_blocks")
    .select("reason, expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return { blocked: false, reason: null, expires_at: null };
  if (data.expires_at && new Date(data.expires_at) <= new Date()) {
    return { blocked: false, reason: null, expires_at: null };
  }
  return { blocked: true, reason: data.reason ?? null, expires_at: data.expires_at ?? null };
}

/** Returns true when the user IS blocked (and shows a toast). */
export async function assertNotBlocked(userId: string): Promise<boolean> {
  const info = await getContentBlock(userId);
  if (info.blocked) {
    const when = info.expires_at
      ? `until ${new Date(info.expires_at).toLocaleString()}`
      : "permanently";
    toast.error(`You're blocked from posting ${when}${info.reason ? ` — ${info.reason}` : ""}`);
    return true;
  }
  return false;
}
