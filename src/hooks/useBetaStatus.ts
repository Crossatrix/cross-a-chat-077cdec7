import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useBetaStatus = (userId: string | undefined): boolean => {
  const [isBeta, setIsBeta] = useState(false);

  useEffect(() => {
    if (!userId) {
      setIsBeta(false);
      return;
    }
    let cancelled = false;
    const check = async () => {
      const { data } = await supabase
        .from("beta_subscriptions" as any)
        .select("expires_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (cancelled) return;
      const active = !!data && new Date((data as any).expires_at) > new Date();
      setIsBeta(active);
    };
    check();
    const id = setInterval(check, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [userId]);

  return isBeta;
};
