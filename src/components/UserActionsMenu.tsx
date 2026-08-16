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
import { useLanguage } from "@/contexts/LanguageContext";
import { emitModEvent } from "@/utils/modEvents";

const reportSchema = z.string().trim().min(10, "Please provide more details (min 10 characters)").max(1000, "Reason too long (max 1000 characters)");

interface UserActionsMenuProps {
  userId: string;
  username: string;
  currentUserId: string;
  conversationId: string;
}

const UserActionsMenu = ({ userId, username, currentUserId, conversationId }: UserActionsMenuProps) => {
  const { t } = useLanguage();
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  const handleBlock = async () => {
    const { error } = await supabase
      .from("user_blocks")
      .insert({
        blocker_id: currentUserId,
        blocked_user_id: userId,
      });

    if (error) {
      if (error.code === "23505") {
        toast.error(t("user.alreadyBlocked"));
      } else {
        toast.error(t("user.blockFailed"));
      }
      return;
    }

    toast.success(`${t("user.blocked")} @${username}`);
    emitModEvent("blockuser", { userId });
  };

  const handleReport = async () => {
    setSubmittingReport(true);
    try {
      const validation = reportSchema.safeParse(reportReason);
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        setSubmittingReport(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_reports")
        .insert({
          reporter_id: currentUserId,
          reported_user_id: userId,
          conversation_id: conversationId,
          reason: validation.data,
        })
        .select()
        .single();

      if (error) {
        toast.error(t("user.reportFailed"));
        setSubmittingReport(false);
        return;
      }

      toast.success(t("user.reportSubmitted"));
      setReportReason("");
      setReportOpen(false);
      emitModEvent("report", { userId, reportId: data?.id });

      // Trigger AI auto-moderation
      if (data?.id) {
        toast.info(t("ai.reviewing"));
        supabase.functions
          .invoke("ai-moderator", {
            body: { reportId: data.id },
          })
          .then(({ data: aiData, error: aiError }) => {
            if (aiError) {
              console.error("AI moderation error:", aiError);
            } else if (aiData?.success) {
              if (aiData.verdict === 'false_report' && aiData.reporterWarned) {
                toast.warning(t("ai.warningIssued"));
                if (aiData.reporterBanned) {
                  toast.error(t("ai.reporterBanned"));
                }
              } else if (aiData.banCreated) {
                toast.success(`${t("ai.autoBanned")} ${aiData.banDays} ${t("ban.days")}`);
              } else {
                toast.info(t("ai.reviewComplete"));
              }
            }
          });
      }
    } finally {
      setSubmittingReport(false);
    }
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
            {t("user.block")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setReportOpen(true)}>
            <Flag className="h-4 w-4 mr-2" />
            {t("user.report")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("user.reportTitle")} @{username}</DialogTitle>
            <DialogDescription>
              {t("user.reportDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="report-reason">{t("user.reportReason")}</Label>
              <Textarea
                id="report-reason"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder={t("user.reportPlaceholder")}
                rows={4}
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground text-right">
                {reportReason.length}/1000 ({t("user.reportMinChars")})
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleReport} variant="destructive" disabled={submittingReport}>
              {submittingReport ? t("common.submitting") : t("user.reportSubmit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserActionsMenu;