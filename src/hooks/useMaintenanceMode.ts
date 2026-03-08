import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useMaintenanceMode = () => {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const check = useCallback(async () => {
    try {
      // Check maintenance_mode setting
      const { data: modeData } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "maintenance_mode")
        .single();

      const enabled = modeData?.value === "true";

      if (enabled) {
        // Check if maintenance has expired
        const { data: untilData } = await supabase
          .from("app_settings")
          .select("value")
          .eq("key", "maintenance_until")
          .single();

        if (untilData?.value) {
          const until = new Date(untilData.value);
          if (until <= new Date()) {
            // Maintenance expired, disable it
            setIsMaintenanceMode(false);
            setLoading(false);
            return;
          }
        }
      }

      setIsMaintenanceMode(enabled);

      // Check if user is admin
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.rpc("is_app_admin", { _user_id: user.id });
        setIsAdmin(!!data);
      }
    } catch {
      // If we can't check, assume not in maintenance
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    check();

    // Listen for changes to app_settings
    const channel = supabase
      .channel("maintenance-mode")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings" },
        (payload: any) => {
          if (payload.new?.key === "maintenance_mode") {
            check();
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [check]);

  return { isMaintenanceMode, isAdmin, loading };
};
