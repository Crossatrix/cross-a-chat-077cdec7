import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import ModImg from "@/components/ModImg";
import type { StaffRole } from "@/utils/roleConfig";
import adminIcon from "@/assets/roles/admin.png";
import elderModIcon from "@/assets/roles/elder_moderator.png";
import moderatorIcon from "@/assets/roles/moderator.png";
import modLiteIcon from "@/assets/roles/moderator_lite.png";
import officialIcon from "@/assets/roles/official_notifications.png";
import proBadgeIcon from "@/assets/pro-badge.png";

const NOTIFICATIONS_SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000001";

type BadgeRole = StaffRole | "official" | "pro";

const ROLE_ICONS: Record<BadgeRole, string> = {
  admin: adminIcon,
  elder_moderator: elderModIcon,
  moderator: moderatorIcon,
  moderator_lite: modLiteIcon,
  official: officialIcon,
  pro: proBadgeIcon,
};

const ROLE_PRIORITY: StaffRole[] = ["admin", "elder_moderator", "moderator", "moderator_lite"];

// Cache roles globally to avoid repeated queries
const roleCache = new Map<string, BadgeRole | null>();
const officialCache = new Map<string, boolean>();
const proCache = new Map<string, boolean>();

interface StaffBadgeProps {
  userId: string;
  size?: number;
}

const StaffBadge = ({ userId, size = 16 }: StaffBadgeProps) => {
  const [badges, setBadges] = useState<BadgeRole[]>([]);
  const [loaded, setLoaded] = useState(
    userId === NOTIFICATIONS_SYSTEM_USER_ID || (roleCache.has(userId) && officialCache.has(userId) && proCache.has(userId))
  );

  useEffect(() => {
    if (userId === NOTIFICATIONS_SYSTEM_USER_ID) {
      setBadges(["official"]);
      setLoaded(true);
      return;
    }

    if (roleCache.has(userId) && officialCache.has(userId) && proCache.has(userId)) {
      const result: BadgeRole[] = [];
      const cachedRole = roleCache.get(userId);
      if (cachedRole) result.push(cachedRole);
      if (officialCache.get(userId)) result.push("official");
      if (proCache.get(userId)) result.push("pro");
      setBadges(result);
      setLoaded(true);
      return;
    }

    const fetchBadges = async () => {
      const [rolesRes, officialRes, proRes, creatorProRes] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase.from("official_accounts").select("id").eq("user_id", userId).maybeSingle(),
        supabase.from("pro_subscriptions" as any).select("expires_at").eq("user_id", userId).maybeSingle(),
        supabase.from("creator_pro_subscriptions" as any).select("expires_at").eq("user_id", userId).maybeSingle(),
      ]);

      const result: BadgeRole[] = [];

      // Staff role
      let highest: StaffRole | null = null;
      if (rolesRes.data && rolesRes.data.length > 0) {
        for (const level of ROLE_PRIORITY) {
          if (rolesRes.data.some((r) => r.role === level)) {
            highest = level;
            break;
          }
        }
      }
      roleCache.set(userId, highest);
      if (highest) result.push(highest);

      // Official badge
      const isOfficial = !!officialRes.data;
      officialCache.set(userId, isOfficial);
      if (isOfficial) result.push("official");

      // Pro badge (from either pro_subscriptions or creator_pro_subscriptions)
      const isPro = (proRes.data && new Date((proRes.data as any).expires_at) > new Date()) ||
        (creatorProRes.data && new Date((creatorProRes.data as any).expires_at) > new Date());
      proCache.set(userId, !!isPro);
      if (isPro) result.push("pro");

      setBadges(result);
      setLoaded(true);
    };

    fetchBadges();
  }, [userId]);

  if (!loaded || badges.length === 0) return null;

  return (
    <span className="inline-flex items-center gap-0.5">
      {badges.map((badge) => (
        <ModImg
          key={badge}
          src={ROLE_ICONS[badge]}
          alt={badge === "official" ? "Official" : badge === "pro" ? "Pro" : badge}
          width={size}
          height={size}
          className="inline-block rounded-full"
          title={badge === "official" ? "Official Account" : badge === "pro" ? "Cross Chat Pro" : badge.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
        />
      ))}
    </span>
  );
};

export default StaffBadge;
