import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ban, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  targetUserId: string;
  targetUsername?: string;
}

const PRESETS: Record<string, number | null> = {
  "1d": 1, "7d": 7, "30d": 30, "custom": 0, "permanent": null,
};

const BlockUserButton = ({ targetUserId, targetUsername }: Props) => {
  const [canManage, setCanManage] = useState(false);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [preset, setPreset] = useState<string>("7d");
  const [customDays, setCustomDays] = useState("3");
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState<{ expires_at: string | null; reason: string | null } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // Owners or staff (mod+) can manage content blocks (admin can do anything)
      const email = (user.email || "").toLowerCase();
      const isOwner = email === "cross.a.trix.owner@hotmail.com" || email === "moritz.loeseke7@gmail.com";
      if (isOwner) { setCanManage(true); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const ok = (roles || []).some(r => ["moderator", "elder_moderator", "admin"].includes(r.role));
      setCanManage(ok);
    })();
  }, []);

  useEffect(() => {
    if (!canManage) return;
    refresh();
  }, [canManage, targetUserId]);

  const refresh = async () => {
    const { data } = await (supabase as any).from("user_content_blocks")
      .select("expires_at, reason").eq("user_id", targetUserId).maybeSingle();
    if (!data) { setActive(null); return; }
    if (data.expires_at && new Date(data.expires_at) <= new Date()) { setActive(null); return; }
    setActive({ expires_at: data.expires_at, reason: data.reason });
  };

  if (!canManage) return null;

  const applyBlock = async () => {
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    let expires_at: string | null = null;
    if (preset !== "permanent") {
      const days = preset === "custom" ? Math.max(1, parseInt(customDays, 10) || 1) : (PRESETS[preset] as number);
      expires_at = new Date(Date.now() + days * 86_400_000).toISOString();
    }
    const { error } = await (supabase as any).from("user_content_blocks").upsert({
      user_id: targetUserId,
      blocked_by: user?.id ?? null,
      reason: reason.trim() || null,
      expires_at,
    }, { onConflict: "user_id" });
    setBusy(false);
    if (error) { toast.error("Failed to block: " + error.message); return; }
    toast.success(`Blocked ${targetUsername ? "@" + targetUsername : "user"}${expires_at ? "" : " permanently"}`);
    setOpen(false);
    refresh();
  };

  const unblock = async () => {
    setBusy(true);
    const { error } = await (supabase as any).from("user_content_blocks").delete().eq("user_id", targetUserId);
    setBusy(false);
    if (error) { toast.error("Failed to unblock"); return; }
    toast.success("User unblocked");
    refresh();
  };

  if (active) {
    return (
      <Button size="sm" variant="secondary" className="gap-1.5" onClick={unblock} disabled={busy} title={active.reason ?? undefined}>
        <ShieldCheck className="h-4 w-4" /> Unblock posting
      </Button>
    );
  }

  return (
    <>
      <Button size="sm" variant="outline" className="gap-1.5 border-destructive/50 text-destructive hover:bg-destructive/10" onClick={() => setOpen(true)}>
        <Ban className="h-4 w-4" /> Block posting
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Block {targetUsername ? `@${targetUsername}` : "user"} from posting</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Duration</Label>
              <Select value={preset} onValueChange={setPreset}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1d">1 day</SelectItem>
                  <SelectItem value="7d">7 days</SelectItem>
                  <SelectItem value="30d">30 days</SelectItem>
                  <SelectItem value="custom">Custom days…</SelectItem>
                  <SelectItem value="permanent">Permanent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {preset === "custom" && (
              <div>
                <Label className="text-xs">Days</Label>
                <Input type="number" min={1} value={customDays} onChange={(e) => setCustomDays(e.target.value)} />
              </div>
            )}
            <div>
              <Label className="text-xs">Reason (optional)</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={500} />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Blocked users can't post videos, livestreams, posts, Crossunity posts or comments — but can still chat and browse.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button variant="destructive" onClick={applyBlock} disabled={busy}>{busy ? "Applying..." : "Block"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BlockUserButton;
