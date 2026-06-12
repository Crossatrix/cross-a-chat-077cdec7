import { ShieldAlert } from "lucide-react";
import { useContentBlock } from "@/hooks/useContentBlock";

const ContentBlockBanner = ({ userId }: { userId: string | undefined }) => {
  const info = useContentBlock(userId);
  if (!info.blocked) return null;
  const when = info.expires_at
    ? `until ${new Date(info.expires_at).toLocaleString()}`
    : "permanently";
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-destructive/15 text-destructive border-b border-destructive/30 text-xs md:text-sm shrink-0">
      <ShieldAlert className="h-4 w-4 shrink-0" />
      <span className="truncate">
        You're blocked from posting and commenting {when}{info.reason ? ` — ${info.reason}` : ""}.
      </span>
    </div>
  );
};

export default ContentBlockBanner;
