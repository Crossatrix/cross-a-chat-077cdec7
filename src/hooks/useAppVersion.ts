import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useAppVersion = () => {
  const [version, setVersion] = useState<string>("");

  useEffect(() => {
    const fetchVersion = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "app_version")
        .single();
      if (data) setVersion(data.value);
    };

    fetchVersion();

    const channel = supabase
      .channel("app-version")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "app_settings" },
        (payload: any) => {
          if (payload.new.key === "app_version") {
            setVersion(payload.new.value);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return version;
};
