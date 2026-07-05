import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import ModImg from "@/components/ModImg";
import creatorIcon from "@/assets/roles/creator.png";
import verifiedCreatorIcon from "@/assets/roles/verified_creator.png";
import verifiedCreatorPlusIcon from "@/assets/roles/verified_creator_plus.png";

type CreatorStatus = "creator" | "verified" | "verified_plus";

const STATUS_ICONS: Record<CreatorStatus, string> = {
  creator: creatorIcon,
  verified: verifiedCreatorIcon,
  verified_plus: verifiedCreatorPlusIcon,
};

const STATUS_LABELS: Record<CreatorStatus, string> = {
  creator: "Creator",
  verified: "Verified Creator",
  verified_plus: "Verified Creator+",
};

// Global cache
const creatorCache = new Map<string, CreatorStatus | null>();

interface CreatorBadgeProps {
  userId: string;
  size?: number;
}

const CreatorBadge = ({ userId, size = 16 }: CreatorBadgeProps) => {
  const [status, setStatus] = useState<CreatorStatus | null>(creatorCache.get(userId) ?? null);
  const [loaded, setLoaded] = useState(creatorCache.has(userId));

  useEffect(() => {
    if (creatorCache.has(userId)) {
      setStatus(creatorCache.get(userId)!);
      setLoaded(true);
      return;
    }

    const fetch = async () => {
      const { data } = await supabase
        .from("creator_verifications")
        .select("status")
        .eq("user_id", userId)
        .maybeSingle();

      const s = (data?.status as CreatorStatus) ?? null;
      creatorCache.set(userId, s);
      setStatus(s);
      setLoaded(true);
    };

    fetch();
  }, [userId]);

  if (!loaded || !status) return null;

  return (
    <ModImg
      src={STATUS_ICONS[status]}
      alt={STATUS_LABELS[status]}
      width={size}
      height={size}
      className="inline-block rounded-full"
      title={STATUS_LABELS[status]}
    />
  );
};

// Export cache invalidation for when status changes
export const invalidateCreatorCache = (userId: string) => {
  creatorCache.delete(userId);
};

export default CreatorBadge;
