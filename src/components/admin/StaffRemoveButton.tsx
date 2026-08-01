import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ShieldX, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useIsStaff } from "@/hooks/useIsStaff";

type StaffRemovableTable = "videos" | "posts" | "subcrosses" | "livestreams" | "subcross_posts";

interface Props {
  table: StaffRemovableTable;
  id: string;
  label?: string;
  className?: string;
  onRemoved?: () => void;
}

const LABELS: Record<StaffRemovableTable, string> = {
  videos: "video",
  posts: "post",
  subcrosses: "subcross",
  livestreams: "livestream",
  subcross_posts: "post",
};

const StaffRemoveButton = ({ table, id, label, className, onRemoved }: Props) => {
  const isStaff = useIsStaff();
  const [busy, setBusy] = useState(false);

  if (!isStaff) return null;

  const what = label || LABELS[table];

  const handle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Remove this ${what} from Cross Chat? This cannot be undone.`)) return;
    setBusy(true);
    const { error } = await supabase.from(table as any).delete().eq("id", id);
    setBusy(false);
    if (error) {
      toast.error(error.message || `Failed to remove ${what}`);
      return;
    }
    toast.success(`${what.charAt(0).toUpperCase() + what.slice(1)} removed`);
    onRemoved?.();
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={busy}
      onClick={handle}
      title={`Staff: remove ${what}`}
      className={className || "h-7 w-7 text-destructive hover:bg-destructive/10"}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldX className="h-3.5 w-3.5" />}
    </Button>
  );
};

export default StaffRemoveButton;
