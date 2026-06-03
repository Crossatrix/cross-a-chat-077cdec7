import { useEffect, useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useBetaStatus } from "@/hooks/useBetaStatus";
import { buildInstantLink, getBetaLinkShareEnabled, InstantAction } from "@/utils/instantLinks";

interface Props {
  action: InstantAction;
  id: string;
  label?: string;
  size?: "sm" | "icon" | "default";
  variant?: "outline" | "ghost" | "secondary" | "default";
  className?: string;
  iconOnly?: boolean;
}

const ShareLinkButton = ({
  action,
  id,
  label,
  size = "sm",
  variant = "outline",
  className,
  iconOnly,
}: Props) => {
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const isBeta = useBetaStatus(userId);
  const [enabled, setEnabled] = useState(getBetaLinkShareEnabled());

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user?.id));
    const onStorage = () => setEnabled(getBetaLinkShareEnabled());
    window.addEventListener("storage", onStorage);
    const id = setInterval(() => setEnabled(getBetaLinkShareEnabled()), 2000);
    return () => {
      window.removeEventListener("storage", onStorage);
      clearInterval(id);
    };
  }, []);

  if (!isBeta || !enabled || !id) return null;

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = buildInstantLink(action, id);
    try {
      if (navigator.share) {
        await navigator.share({ url, title: "Cross Chat", text: `Open in Cross Chat` });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      } catch {
        toast.error("Failed to copy");
      }
    }
  };

  return (
    <Button
      type="button"
      size={iconOnly ? "icon" : size}
      variant={variant}
      className={className}
      onClick={handleShare}
      title="Share link"
    >
      <Share2 className={iconOnly ? "h-4 w-4" : "h-4 w-4"} />
      {!iconOnly && (label ?? "Share")}
    </Button>
  );
};

export default ShareLinkButton;
