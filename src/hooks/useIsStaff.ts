import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const STAFF_ROLES = ["moderator_lite", "moderator", "elder_moderator", "admin"];

let cached: boolean | null = null;

export function useIsStaff() {
  const [isStaff, setIsStaff] = useState(cached ?? false);

  useEffect(() => {
    let active = true;
    const run = async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) {
        cached = false;
        if (active) setIsStaff(false);
        return;
      }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      const staff = (data || []).some((r: any) => STAFF_ROLES.includes(r.role));
      cached = staff;
      if (active) setIsStaff(staff);
    };
    run();
    return () => { active = false; };
  }, []);

  return isStaff;
}

export default useIsStaff;
