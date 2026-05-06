import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hasActiveChannelMembership } from "@/utils/creatorEmojis";

interface Props {
  creatorId: string;
  currentUserId: string;
  membersOnly: boolean;
  onCreatorClick?: (id: string) => void;
  children: React.ReactNode;
}

const MembersOnlyGate = ({ creatorId, currentUserId, membersOnly, onCreatorClick, children }: Props) => {
  const [allowed, setAllowed] = useState(!membersOnly);
  const [checked, setChecked] = useState(!membersOnly);

  useEffect(() => {
    if (!membersOnly) { setAllowed(true); setChecked(true); return; }
    hasActiveChannelMembership(currentUserId, creatorId).then(ok => {
      setAllowed(ok); setChecked(true);
    });
  }, [creatorId, currentUserId, membersOnly]);

  if (!checked) return null;
  if (allowed) return <>{children}</>;

  return (
    <div className="relative w-full aspect-video bg-card border border-border rounded-lg flex flex-col items-center justify-center gap-3 p-6 text-center">
      <Lock className="h-10 w-10 text-primary" />
      <h3 className="font-bold">Members Only</h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        This content is exclusive to channel members. Subscribe to unlock.
      </p>
      <Button size="sm" onClick={() => onCreatorClick?.(creatorId)}>View Memberships</Button>
    </div>
  );
};

export default MembersOnlyGate;
