import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ModImg from "@/components/ModImg";
import fireEpic from "@/assets/effects/fire_epic.png";
import fireLegendary from "@/assets/effects/fire_legendary.png";
import fireMythic from "@/assets/effects/fire_mythic.png";

export type FeaturedTier = "epic" | "legendary" | "mythic";

const TIER_EFFECTS: Record<FeaturedTier, string> = {
  epic: fireEpic,
  legendary: fireLegendary,
  mythic: fireMythic,
};

// Global cache
const featuredCache = new Map<string, FeaturedTier | null>();

export const invalidateFeaturedCache = (userId: string) => {
  featuredCache.delete(userId);
};

interface FeaturedAvatarProps {
  userId: string;
  avatarUrl: string | null;
  username: string;
  className?: string;
  avatarClassName?: string;
  fallbackClassName?: string;
  onClick?: (e: React.MouseEvent) => void;
}

const FeaturedAvatar = ({
  userId,
  avatarUrl,
  username,
  className = "",
  avatarClassName = "h-16 w-16 sm:h-20 sm:w-20",
  fallbackClassName = "bg-secondary text-foreground text-xl",
  onClick,
}: FeaturedAvatarProps) => {
  const [tier, setTier] = useState<FeaturedTier | null>(featuredCache.get(userId) ?? null);
  const [loaded, setLoaded] = useState(featuredCache.has(userId));

  useEffect(() => {
    if (featuredCache.has(userId)) {
      setTier(featuredCache.get(userId)!);
      setLoaded(true);
      return;
    }

    const fetchTier = async () => {
      const { data } = await supabase
        .from("featured_creators")
        .select("tier")
        .eq("user_id", userId)
        .maybeSingle();

      const t = (data?.tier as FeaturedTier) ?? null;
      featuredCache.set(userId, t);
      setTier(t);
      setLoaded(true);
    };

    fetchTier();
  }, [userId]);

  if (!loaded || !tier) {
    return (
      <Avatar className={avatarClassName} onClick={onClick}>
        <AvatarImage src={avatarUrl || ""} />
        <AvatarFallback className={fallbackClassName}>
          {username?.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
    );
  }

  return (
    <div className={`relative inline-flex items-center justify-center overflow-visible ${className}`} onClick={onClick}>
      <ModImg
        src={TIER_EFFECTS[tier]}
        alt={`${tier} effect`}
        className="absolute w-[165%] h-[165%] object-contain pointer-events-none z-0"
        style={{
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />
      <Avatar className={`${avatarClassName} relative z-10 scale-[0.88]`}>
        <AvatarImage src={avatarUrl || ""} />
        <AvatarFallback className={fallbackClassName}>
          {username?.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
    </div>
  );
};

export default FeaturedAvatar;
