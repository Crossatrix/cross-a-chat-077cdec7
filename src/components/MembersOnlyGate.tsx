import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hasAllowedMembershipTier } from "@/utils/creatorEmojis";

interface Props {
  creatorId: string;
  currentUserId: string;
  membersOnly: boolean;
  allowedMembershipIds?: string[] | null;
  onCreatorClick?: (id: string) => void;
  children: React.ReactNode;
}

const MembersOnlyGate = ({ creatorId, currentUserId, membersOnly, allowedMembershipIds, onCreatorClick, children }: Props) => {
  const [allowed, setAllowed] = useState(!membersOnly);
  const [checked, setChecked] = useState(!membersOnly);

  useEffect(() => {
    if (!membersOnly) { setAllowed(true); setChecked(true); return; }
    hasAllowedMembershipTier(currentUserId, creatorId, allowedMembershipIds).then(ok => {
      setAllowed(ok); setChecked(true);
    });
  }, [creatorId, currentUserId, membersOnly, JSON.stringify(allowedMembershipIds || [])]);

  if (!checked) return null;
  if (allowed) return <>{children}</>;

  const tierSpecific = !!(allowedMembershipIds && allowedMembershipIds.length > 0);

  return (
    <div className="relative w-full aspect-video bg-card border border-border rounded-lg flex flex-col items-center justify-center gap-3 p-6 text-center">
      <Lock className="h-10 w-10 text-primary" />
      <h3 className="font-bold">Members Only</h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        {tierSpecific
          ? "This content is exclusive to specific membership tiers. Upgrade to unlock."
          : "This content is exclusive to channel members. Subscribe to unlock."}
      </p>
      <Button size="sm" onClick={() => onCreatorClick?.(creatorId)}>View Memberships</Button>
    </div>
  );
};

export default MembersOnlyGate;
