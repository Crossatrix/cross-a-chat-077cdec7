import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import ModImg from "@/components/ModImg";
import { getModBadgesForUsername, onModsUpdated, type ModBadge } from "@/utils/mods";
import type { StaffRole } from "@/utils/roleConfig";
import adminIcon from "@/assets/roles/admin.png";
import elderModIcon from "@/assets/roles/elder_moderator.png";
import moderatorIcon from "@/assets/roles/moderator.png";
import modLiteIcon from "@/assets/roles/moderator_lite.png";
import officialIcon from "@/assets/roles/official_notifications.png";
import proBadgeIcon from "@/assets/pro-badge.png";
import radioBroadcasterIcon from "@/assets/roles/radio_broadcaster.png";

const NOTIFICATIONS_SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000001";

type BadgeRole = StaffRole | "official" | "pro" | "radiobroadcaster";

const ROLE_ICONS: Record<BadgeRole, string> = {
  admin: adminIcon,
  elder_moderator: elderModIcon,
  moderator: moderatorIcon,
  moderator_lite: modLiteIcon,
  official: officialIcon,
  pro: proBadgeIcon,
  radiobroadcaster: radioBroadcasterIcon,
};

const ROLE_PRIORITY: StaffRole[] = ["admin", "elder_moderator", "moderator", "moderator_lite"];

// Cache roles globally to avoid repeated queries
const roleCache = new Map<string, BadgeRole | null>();
const officialCache = new Map<string, boolean>();
const proCache = new Map<string, boolean>();
const radioCache = new Map<string, boolean>();
const usernameCache = new Map<string, string | null>();


interface StaffBadgeProps {
  userId: string;
  size?: number;
}

const StaffBadge = ({ userId, size = 16 }: StaffBadgeProps) => {
  const [badges, setBadges] = useState<BadgeRole[]>([]);
  const [modBadges, setModBadges] = useState<ModBadge[]>([]);
  const [loaded, setLoaded] = useState(
    userId === NOTIFICATIONS_SYSTEM_USER_ID || (roleCache.has(userId) && officialCache.has(userId) && proCache.has(userId))
  );

  useEffect(() => {
    if (userId === NOTIFICATIONS_SYSTEM_USER_ID) {
      setBadges(["official"]);
      setLoaded(true);
      return;
    }

    if (roleCache.has(userId) && officialCache.has(userId) && proCache.has(userId) && radioCache.has(userId)) {
      const result: BadgeRole[] = [];
      const cachedRole = roleCache.get(userId);
      if (cachedRole) result.push(cachedRole);
      if (officialCache.get(userId)) result.push("official");
      if (proCache.get(userId)) result.push("pro");
      if (radioCache.get(userId)) result.push("radiobroadcaster");
      setBadges(result);
      setLoaded(true);
      return;
    }

    const fetchBadges = async () => {
      const [rolesRes, officialRes, proRes, creatorProRes, radioRes] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase.from("official_accounts").select("id").eq("user_id", userId).maybeSingle(),
        supabase.from("pro_subscriptions" as any).select("expires_at").eq("user_id", userId).maybeSingle(),
        supabase.from("creator_pro_subscriptions" as any).select("expires_at").eq("user_id", userId).maybeSingle(),
        supabase.from("radio_broadcasters" as any).select("user_id").eq("user_id", userId).maybeSingle(),
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

      // Radio broadcaster
      const isRadio = !!radioRes.data;
      radioCache.set(userId, isRadio);
      if (isRadio) result.push("radiobroadcaster");

      setBadges(result);
      setLoaded(true);
    };

    fetchBadges();
  }, [userId]);


  useEffect(() => {
    let active = true;
    const apply = (username: string | null) => {
      if (active) setModBadges(getModBadgesForUsername(username));
    };
    const load = async () => {
      if (usernameCache.has(userId)) return apply(usernameCache.get(userId)!);
      const { data } = await supabase.from("profiles").select("username").eq("id", userId).maybeSingle();
      const uname = data?.username ?? null;
      usernameCache.set(userId, uname);
      apply(uname);
    };
    load();
    const off = onModsUpdated(() => apply(usernameCache.get(userId) ?? null));
    return () => { active = false; off(); };
  }, [userId]);

  if (!loaded || (badges.length === 0 && modBadges.length === 0)) return null;

  return (
    <span className="inline-flex items-center gap-0.5">
      {badges.map((badge) => (
        <ModImg
          key={badge}
          src={ROLE_ICONS[badge]}
          alt={badge === "official" ? "Official" : badge === "pro" ? "Pro" : badge === "radiobroadcaster" ? "Radio Broadcaster" : badge}
          width={size}
          height={size}
          className="inline-block rounded-full"
          title={badge === "official" ? "Official Account" : badge === "pro" ? "Cross Chat Pro" : badge === "radiobroadcaster" ? "Radio Broadcaster" : badge.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}

        />
      ))}
      {modBadges.map((b) => (
        <img
          key={b.uuid}
          src={b.dataUrl}
          alt="Badge"
          width={size}
          height={size}
          className="inline-block rounded-full"
        />
      ))}
    </span>
  );
};

export default StaffBadge;
