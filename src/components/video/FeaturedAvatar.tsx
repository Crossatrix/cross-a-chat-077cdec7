import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
}

const FeaturedAvatar = ({ userId, avatarUrl, username, className = "", avatarClassName = "h-16 w-16 sm:h-20 sm:w-20" }: FeaturedAvatarProps) => {
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
      <Avatar className={avatarClassName}>
        <AvatarImage src={avatarUrl || ""} />
        <AvatarFallback className="bg-secondary text-foreground text-xl">
          {username?.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
    );
  }

  return (
    <div className={`relative inline-flex items-center justify-center overflow-visible ${className}`}>
      <img
        src={TIER_EFFECTS[tier]}
        alt={`${tier} effect`}
        className="absolute w-[340%] h-[340%] object-contain pointer-events-none z-0"
        style={{
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -54%)",
          filter: "drop-shadow(0 0 8px rgba(255,255,255,0.2))",
        }}
      />
      <Avatar className={`${avatarClassName} relative z-10`}>
        <AvatarImage src={avatarUrl || ""} />
        <AvatarFallback className="bg-secondary text-foreground text-xl">
          {username?.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
    </div>
  );
};

export default FeaturedAvatar;
