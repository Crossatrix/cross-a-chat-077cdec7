import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStaffRole, StaffRole } from "@/utils/roleConfig";

/** Current user's highest staff role (null if not staff). */
export function useStaffRole() {
  const [role, setRole] = useState<StaffRole | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return;
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      if (active) setRole(getStaffRole((data || []) as { role: string }[]));
    })();
    return () => { active = false; };
  }, []);

  return role;
}

export default useStaffRole;
