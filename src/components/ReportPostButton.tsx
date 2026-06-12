import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Flag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  postId?: string;
  subcrossPostId?: string;
  currentUserId: string;
  className?: string;
  iconOnly?: boolean;
}

const ReportPostButton = ({ postId, subcrossPostId, currentUserId, className, iconOnly }: Props) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const trimmed = reason.trim();
    if (trimmed.length < 5) { toast.error("Please describe the issue (5+ characters)"); return; }
    setBusy(true);
    const payload: any = {
      reporter_id: currentUserId,
      reason: trimmed,
    };
    if (postId) payload.post_id = postId;
    if (subcrossPostId) payload.subcross_post_id = subcrossPostId;
    const { error } = await (supabase as any).from("post_reports").insert(payload);
    setBusy(false);
    if (error) { toast.error("Failed to report: " + error.message); return; }
    toast.success("Report submitted. Staff will review it.");
    setReason("");
    setOpen(false);
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={className ?? "h-7 px-2 text-muted-foreground hover:text-destructive"}
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        title="Report post"
      >
        <Flag className="h-3.5 w-3.5" />
        {!iconOnly && <span className="ml-1 text-xs">Report</span>}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Flag className="h-4 w-4" /> Report post</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Why are you reporting this post?"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            maxLength={1000}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={submit} disabled={busy}>{busy ? "Submitting..." : "Submit report"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ReportPostButton;
