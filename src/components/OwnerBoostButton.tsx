import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const OWNER_EMAILS = ["cross.a.trix.owner@hotmail.com", "moritz.loeseke7@gmail.com", "ben.froehleke@gmx.de"];

let cachedIsOwner: boolean | null = null;
export const useIsOwner = () => {
  const [isOwner, setIsOwner] = useState<boolean>(cachedIsOwner ?? false);
  useEffect(() => {
    if (cachedIsOwner !== null) {
      setIsOwner(cachedIsOwner);
      return;
    }
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) { cachedIsOwner = false; setIsOwner(false); return; }
      // Primary check: auth email matches an owner email
      const email = user.email?.toLowerCase();
      let owner = !!email && OWNER_EMAILS.includes(email);
      // Fallback: server-side is_app_owner RPC (handles non-standard auth)
      if (!owner) {
        const { data, error } = await (supabase as any).rpc("is_app_owner", { _user_id: user.id });
        if (!error) owner = !!data;
      }
      cachedIsOwner = owner;
      setIsOwner(owner);
    })();
  }, []);
  return isOwner;
};

export type BoostKind =
  | "followers"
  | "video_views" | "video_likes" | "video_dislikes"
  | "post_likes" | "post_dislikes"
  | "poll_vote";

interface Props {
  targetId: string;
  options: { kind: BoostKind; label: string; pollOptionIndex?: number }[];
  onBoosted?: () => void;
  title?: string;
  iconOnly?: boolean;
  className?: string;
  size?: "sm" | "icon";
}

const OwnerBoostButton = ({ targetId, options, onBoosted, title, iconOnly, className, size = "sm" }: Props) => {
  const isOwner = useIsOwner();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<string>("100");
  const [busy, setBusy] = useState<string | null>(null);

  if (!isOwner) return null;

  const run = async (kind: BoostKind, subKind?: string) => {
    const n = parseInt(amount, 10);
    if (!n || Math.abs(n) > 1_000_000) { toast.error("Enter a valid amount (≤ 1,000,000)"); return; }
    setBusy(kind + (subKind ?? ""));
    const { error } = await (supabase as any).rpc("owner_boost", {
      p_kind: kind,
      p_target_id: targetId,
      p_amount: n,
      p_sub_kind: subKind ?? null,
    });
    setBusy(null);
    if (error) { toast.error("Boost failed: " + error.message); return; }
    toast.success(`Boosted +${n}`);
    onBoosted?.();
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={size}
        className={className ?? "gap-1 border-amber-500/50 text-amber-400 hover:bg-amber-500/10"}
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        title="Owner boost"
      >
        <Sparkles className="h-4 w-4" />
        {!iconOnly && "Boost"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-400">
              <Sparkles className="h-4 w-4" /> {title ?? "Owner boost"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Amount (use negative to remove)</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 gap-2">
              {options.map((opt, i) => (
                <Button
                  key={i}
                  variant="secondary"
                  disabled={!!busy}
                  onClick={() => run(opt.kind, opt.pollOptionIndex !== undefined ? String(opt.pollOptionIndex) : undefined)}
                >
                  {busy === opt.kind + (opt.pollOptionIndex !== undefined ? String(opt.pollOptionIndex) : "") ? "..." : opt.label}
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default OwnerBoostButton;
