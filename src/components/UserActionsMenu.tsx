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
    if (!reportReason.trim()) {
      toast.error("Please provide a reason");
      return;
    }

    const { error } = await supabase
      .from("user_reports")
      .insert({
        reporter_id: currentUserId,
        reported_user_id: userId,
        reason: reportReason,
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
              />
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