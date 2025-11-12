import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MoreVertical, UserX, Flag } from "lucide-react";
import { z } from "zod";

const reportSchema = z.string().trim().min(10, "Please provide more details (min 10 characters)").max(1000, "Reason too long (max 1000 characters)");

interface UserActionsMenuProps {
  userId: string;
  username: string;
  currentUserId: string;
}

const UserActionsMenu = ({ userId, username, currentUserId }: UserActionsMenuProps) => {
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");

  const handleBlock = async () => {
    const { error } = await supabase
      .from("user_blocks")
      .insert({
        blocker_id: currentUserId,
        blocked_user_id: userId,
      });

    if (error) {
      if (error.code === "23505") {
        toast.error("User already blocked");
      } else {
        toast.error("Failed to block user");
      }
      return;
    }

    toast.success(`Blocked @${username}`);
  };

  const handleReport = async () => {
    const validation = reportSchema.safeParse(reportReason);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    const { error } = await supabase
      .from("user_reports")
      .insert({
        reporter_id: currentUserId,
        reported_user_id: userId,
        reason: validation.data,
      });

    if (error) {
      toast.error("Failed to submit report");
      return;
    }

    toast.success("Report submitted");
    setReportReason("");
    setReportOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleBlock}>
            <UserX className="h-4 w-4 mr-2" />
            Block User
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setReportOpen(true)}>
            <Flag className="h-4 w-4 mr-2" />
            Report User
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report @{username}</DialogTitle>
            <DialogDescription>
              Please describe why you're reporting this user
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="report-reason">Reason</Label>
              <Textarea
                id="report-reason"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Describe the issue..."
                rows={4}
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground text-right">
                {reportReason.length}/1000 (minimum 10 characters)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleReport} variant="destructive">
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserActionsMenu;