import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { StaffRole } from "@/utils/roleConfig";
import adminIcon from "@/assets/roles/admin.jpeg";
import elderModIcon from "@/assets/roles/elder_moderator.jpeg";
import moderatorIcon from "@/assets/roles/moderator.jpeg";
import modLiteIcon from "@/assets/roles/moderator_lite.jpeg";
import officialIcon from "@/assets/roles/official_notifications.png";

const NOTIFICATIONS_SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000001";

type BadgeRole = StaffRole | "official";

const ROLE_ICONS: Record<BadgeRole, string> = {
  admin: adminIcon,
  elder_moderator: elderModIcon,
  moderator: moderatorIcon,
  moderator_lite: modLiteIcon,
  official: officialIcon,
};

const ROLE_PRIORITY: StaffRole[] = ["admin", "elder_moderator", "moderator", "moderator_lite"];

// Cache roles globally to avoid repeated queries
const roleCache = new Map<string, StaffRole | null>();

interface StaffBadgeProps {
  userId: string;
  size?: number;
}

const StaffBadge = ({ userId, size = 16 }: StaffBadgeProps) => {
  const [role, setRole] = useState<StaffRole | null>(roleCache.get(userId) ?? null);
  const [loaded, setLoaded] = useState(roleCache.has(userId));

  useEffect(() => {
    if (roleCache.has(userId)) {
      setRole(roleCache.get(userId)!);
      setLoaded(true);
      return;
    }

    const fetchRole = async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      let highest: StaffRole | null = null;
      if (data && data.length > 0) {
        for (const level of ROLE_PRIORITY) {
          if (data.some((r) => r.role === level)) {
            highest = level;
            break;
          }
        }
      }
      roleCache.set(userId, highest);
      setRole(highest);
      setLoaded(true);
    };

    fetchRole();
  }, [userId]);

  if (!loaded || !role) return null;

  return (
    <img
      src={ROLE_ICONS[role]}
      alt={role}
      width={size}
      height={size}
      className="inline-block rounded-full"
      title={role.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
    />
  );
};

export default StaffBadge;
